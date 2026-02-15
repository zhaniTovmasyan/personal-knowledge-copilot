# swarm/agent_loop.py
import os
import re
import subprocess
from pathlib import Path
from typing import Optional

import ollama

REPO = Path(os.getenv("REPO", "..")).absolute()
MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5-coder:7b")
DRY_RUN = os.getenv("SWARM_DRY_RUN", "0") == "1"

NUM_CTX = int(os.getenv("SWARM_NUM_CTX", "4096"))
NUM_PREDICT = int(os.getenv("SWARM_NUM_PREDICT", "1200"))
MAX_ITERS = int(os.getenv("SWARM_MAX_ITERS", "3"))

PATCH_FILE = (REPO / "swarm" / ".patch.tmp")

# IMPORTANT: do NOT .resolve() here (it resolves the symlink to system python on macOS)
VENV_PY = (REPO / "backend" / ".venv" / "bin" / "python")

SKIP_DIRS = {
    ".git", "node_modules", ".venv", "venv", "__pycache__", "dist", "build",
    ".pytest_cache", ".mypy_cache", ".ruff_cache",
}
SKIP_FILES = {".env", "copilot.db", ".DS_Store"}

# HARD GUARDRAIL: allow patching ONLY these files (expand intentionally)
ALLOWED_FILES = {
    "backend/tests/test_main.py",
}


def sh(cmd, cwd: Path | None = None) -> tuple[int, str]:
    banned = [
        "rm ", "sudo", "shutdown", "reboot", "mkfs", "dd ", ">:",
        "chmod -R", "chown -R", "killall", "pkill",
    ]
    if isinstance(cmd, str):
        if any(b in cmd for b in banned):
            return 1, "Refused: dangerous command."
        p = subprocess.run(cmd, shell=True, cwd=cwd or REPO, capture_output=True, text=True)
    else:
        joined = " ".join(cmd)
        if any(b in joined for b in banned):
            return 1, "Refused: dangerous command."
        p = subprocess.run(cmd, shell=False, cwd=cwd or REPO, capture_output=True, text=True)

    out = (p.stdout + "\n" + p.stderr).strip()
    return p.returncode, out


def safe_tree(root: Path, max_depth=3, max_files=350) -> str:
    lines: list[str] = []
    count = 0

    def walk(d: Path, depth: int):
        nonlocal count
        if depth > max_depth or count >= max_files:
            return
        try:
            for p in sorted(d.iterdir()):
                if count >= max_files:
                    return
                if p.name in SKIP_FILES:
                    continue
                if p.is_dir() and p.name in SKIP_DIRS:
                    continue

                rel = p.relative_to(root)
                if p.is_dir():
                    lines.append(f"{rel}/")
                    count += 1
                    walk(p, depth + 1)
                else:
                    lines.append(str(rel))
                    count += 1
        except PermissionError:
            return

    walk(root, 0)
    return f"=== TREE (maxdepth={max_depth}, maxfiles={max_files}) ===\n" + "\n".join(lines)


def read_file(p: Path, max_lines=220) -> str:
    txt = p.read_text(errors="ignore")
    return "\n".join(txt.splitlines()[:max_lines])


def run_pytest() -> tuple[int, str]:
    if not VENV_PY.exists():
        return 1, f"Venv python not found at: {VENV_PY}"
    return sh([str(VENV_PY), "-m", "pytest", "-q"], cwd=REPO)


def backend_bundle(pytest_out: str) -> str:
    parts: list[str] = []
    parts.append(safe_tree(REPO, max_depth=3, max_files=350))

    key = [
        REPO / "backend" / "main.py",
        REPO / "backend" / "db.py",
        REPO / "backend" / "models.py",
        REPO / "backend" / "storage.py",
        REPO / "backend" / "tests" / "test_main.py",
    ]
    for f in key:
        if f.exists() and f.is_file():
            rel = f.relative_to(REPO)
            parts.append(f"\n=== FILE: {rel} (head) ===\n{read_file(f)}")

    parts.append("\n=== PYTEST ===\n" + pytest_out[-6000:])
    bundle = "\n".join(parts)
    return bundle[:30000]


SYSTEM = (
    "You are a senior backend engineer in an autonomous coding loop.\n"
    "You MUST output a unified diff patch ONLY.\n"
    "No explanations. No markdown. No code fences.\n"
    "Rules:\n"
    "- Only modify files under backend/.\n"
    "- Do not touch .env or any .db.\n"
    "- Keep changes minimal and safe.\n"
    "- Patch must apply cleanly with `git apply`.\n"
    "- Output must start with 'diff --git'.\n"
    "- Do NOT invent endpoints, response bodies, or file paths.\n"
    "- If you add/modify tests, they MUST match existing behavior.\n"
    "- IMPORTANT: Only touch files explicitly requested in the Goal.\n"
)

TASK_TEMPLATE = """Goal: {goal}

Repository bundle:
{bundle}

Your job:
1) Produce ONE unified diff patch that moves toward the goal.
2) Patch must be valid and apply cleanly.
3) Only backend/ files.
Output ONLY the patch.
"""


def ask_patch(goal: str, bundle: str) -> str:
    prompt = TASK_TEMPLATE.format(goal=goal, bundle=bundle)
    resp = ollama.chat(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": prompt},
        ],
        options={"num_ctx": NUM_CTX, "num_predict": NUM_PREDICT, "temperature": 0.2},
    )
    return resp["message"]["content"]


def extract_diff(text: str) -> str:
    t = text.replace("\r\n", "\n").strip()
    t = re.sub(r"^```(?:diff|patch)?\s*\n", "", t, flags=re.I)
    t = re.sub(r"\n```$", "", t, flags=re.M)

    idx = t.find("diff --git")
    if idx == -1:
        return ""

    diff = t[idx:].strip()
    lines = diff.splitlines()

    ok_prefixes = (
        "diff --git ",
        "index ",
        "--- ",
        "+++ ",
        "@@ ",
        " ",
        "+",
        "-",
        "\\ No newline at end of file",
        "new file mode ",
        "deleted file mode ",
        "similarity index ",
        "rename from ",
        "rename to ",
    )

    out: list[str] = []
    for line in lines:
        if line.startswith(ok_prefixes) or line.strip() == "":
            out.append(line)
            continue
        break

    return "\n".join(out).strip() + "\n"


def looks_like_unified_diff(diff: str) -> bool:
    return (
        diff.startswith("diff --git ")
        and "\n--- " in diff
        and "\n+++ " in diff
        and "\n@@ " in diff
    )


def validate_diff_headers(diff: str) -> tuple[bool, str]:
    lines = diff.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.startswith("diff --git "):
            i += 1
            continue

        m = re.match(r"^diff --git a/(.*?) b/(.*?)$", line)
        if not m:
            return False, f"Invalid diff --git line: {line}"
        a_path, b_path = m.group(1), m.group(2)

        j = i + 1
        old_line: Optional[str] = None
        new_line: Optional[str] = None
        while j < len(lines) and not lines[j].startswith("diff --git "):
            if lines[j].startswith("--- "):
                old_line = lines[j]
            elif lines[j].startswith("+++ "):
                new_line = lines[j]
                break
            j += 1

        if old_line is None or new_line is None:
            return False, f"Missing ---/+++ headers for a/{a_path} b/{b_path}"

        if old_line not in (f"--- a/{a_path}", "--- /dev/null"):
            return False, f"Inconsistent old filename. Expected '--- a/{a_path}' or '--- /dev/null', got '{old_line}'"

        if new_line not in (f"+++ b/{b_path}", "+++ /dev/null"):
            return False, f"Inconsistent new filename. Expected '+++ b/{b_path}' or '+++ /dev/null', got '{new_line}'"

        i = j + 1

    return True, "OK"


def patch_touches_only_backend(diff: str) -> bool:
    pairs = re.findall(r"^diff --git a/(.*?) b/(.*?)$", diff, flags=re.M)
    if not pairs:
        return False
    for a, b in pairs:
        if not (a.startswith("backend/") and b.startswith("backend/")):
            return False
        if a.endswith(".env") or b.endswith(".env") or a.endswith(".db") or b.endswith(".db"):
            return False
    return True


def patch_touches_only_allowed_files(diff: str) -> tuple[bool, str]:
    pairs = re.findall(r"^diff --git a/(.*?) b/(.*?)$", diff, flags=re.M)
    if not pairs:
        return False, "No diff headers found."

    touched: set[str] = set()
    for a, b in pairs:
        touched.add(a)
        touched.add(b)

    bad = sorted([p for p in touched if p != "/dev/null" and p not in ALLOWED_FILES])
    if bad:
        return False, f"Patch touches disallowed files: {bad}"
    return True, "OK"


def is_noop_patch(diff: str) -> bool:
    added = 0
    removed = 0
    for line in diff.splitlines():
        if line.startswith(("diff --git", "index ", "--- ", "+++ ", "@@ ")):
            continue
        if line.startswith("+"):
            added += 1
        elif line.startswith("-"):
            removed += 1
    return added == 0 and removed == 0


def apply_patch(diff: str) -> tuple[bool, str]:
    PATCH_FILE.parent.mkdir(parents=True, exist_ok=True)
    PATCH_FILE.write_text(diff)

    if DRY_RUN:
        return True, "DRY_RUN=1 (skipping git apply)."

    code, out = sh(["git", "apply", "--check", str(PATCH_FILE)], cwd=REPO)
    if code != 0:
        return False, "git apply --check failed:\n" + out

    code, out = sh(["git", "apply", str(PATCH_FILE)], cwd=REPO)
    if code != 0:
        return False, "git apply failed:\n" + out

    return True, "Patch applied."


def main():
    goal = os.getenv(
        "GOAL",
        "Only modify backend/tests/test_main.py. Ensure it asserts GET / returns {\"status\":\"ok\"}. "
        "If it already does, output an empty patch (or a patch with real changes only). "
        "Do not touch any other file."
    )

    for i in range(1, MAX_ITERS + 1):
        print(f"\n=== ITERATION {i}/{MAX_ITERS} ===")

        # Run tests ONCE per iteration using venv python
        code, pytest_out = run_pytest()
        if code == 0:
            print(pytest_out[-4000:])
            print("\n✅ Already green. Nothing to do.")
            return

        bundle = backend_bundle(pytest_out)

        patch = ask_patch(goal, bundle)
        print("\n--- RAW MODEL OUTPUT (first 60 lines) ---")
        print("\n".join(patch.splitlines()[:60]))
        print("--- END RAW PREVIEW ---\n")

        diff = extract_diff(patch)

        if not diff:
            print("Model did not return a unified diff. Retrying...")
            goal = goal + "\nReturn ONLY unified diff starting with 'diff --git'."
            continue

        if not looks_like_unified_diff(diff):
            print("Not a valid unified diff. Retrying...")
            goal = goal + "\nOutput a VALID unified diff with ---/+++ and @@ hunks. No code fences."
            continue

        if is_noop_patch(diff):
            print("No-op patch. Retrying...")
            goal = goal + "\nDo not output a no-op patch."
            continue

        if not patch_touches_only_backend(diff):
            print("Invalid scope (must be backend/* only). Retrying...")
            goal = goal + "\nOutput ONLY backend/* unified diff."
            continue

        ok_headers, header_msg = validate_diff_headers(diff)
        if not ok_headers:
            print("Invalid diff headers: " + header_msg)
            goal = goal + "\nFix diff headers. Output a valid git unified diff."
            continue

        ok_allowed, msg_allowed = patch_touches_only_allowed_files(diff)
        if not ok_allowed:
            print("Patch rejected: " + msg_allowed)
            goal = goal + "\nPatch MUST touch ONLY backend/tests/test_main.py."
            continue

        if DRY_RUN:
            print("\n=== DRY RUN PATCH (validated) ===\n")
            print(diff)
            print("\n✅ DRY RUN done (no files changed).")
            return

        ok, msg = apply_patch(diff)
        print(msg)
        if not ok:
            print("\n--- PATCH PREVIEW (first 80 lines) ---")
            print("\n".join(diff.splitlines()[:80]))
            print("--- END PATCH PREVIEW ---\n")
            goal = goal + "\nFix patch so it applies cleanly with git apply."
            continue

        # Re-run tests after applying patch
        code2, out2 = run_pytest()
        print(out2[-4000:])
        if code2 == 0:
            print("\n✅ Tests passing. Done.")
            return

        goal = (
            "Fix failing tests and keep changes minimal. "
            "Only modify backend/tests/test_main.py. "
            "Current failures are in pytest output above."
        )

    print("\n❌ Reached MAX_ITERS without green tests. Check `git diff` and pytest output.")


if __name__ == "__main__":
    main()
