import os
from pathlib import Path
import ollama

# -------- COOL PATCH-PLAN RUNNER --------
REPO = Path(os.getenv("REPO", "..")).resolve()
MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5-coder:7b")

NUM_CTX = int(os.getenv("SWARM_NUM_CTX", "2048"))
NUM_PREDICT = int(os.getenv("SWARM_NUM_PREDICT", "250"))
MAX_FILES = int(os.getenv("SWARM_MAXFILES", "120"))
MAX_DEPTH = int(os.getenv("SWARM_MAXDEPTH", "2"))

SKIP_DIRS = {
    ".git", "node_modules", ".venv", "venv", "__pycache__",
    "dist", "build", ".next", ".expo", ".idea", ".vscode",
    ".pytest_cache", ".mypy_cache", ".ruff_cache",
}
SKIP_FILES = {".env", "copilot.db", ".DS_Store"}


def safe_tree(root: Path) -> str:
    lines: list[str] = []
    count = 0

    def walk(dir_path: Path, depth: int):
        nonlocal count
        if depth > MAX_DEPTH or count >= MAX_FILES:
            return
        try:
            for p in sorted(dir_path.iterdir()):
                if count >= MAX_FILES:
                    return

                if p.is_file() and p.name in SKIP_FILES:
                    continue
                if p.is_dir() and p.name in SKIP_DIRS:
                    continue

                rel = p.relative_to(root)

                if p.is_dir():
                    lines.append(f"{rel}/")
                    count += 1
                    walk(p, depth + 1)
                else:
                    # keep it small: include only backend files in listing
                    # (still show other folders minimally)
                    lines.append(str(rel))
                    count += 1
        except PermissionError:
            return

    walk(root, 0)
    return f"=== TREE (maxdepth={MAX_DEPTH}, maxfiles={MAX_FILES}) ===\n" + "\n".join(lines)


def read_head(relpath: str, max_lines: int = 200) -> str:
    p = (REPO / relpath).resolve()
    if not str(p).startswith(str(REPO)):
        return ""
    if not p.exists() or p.is_dir():
        return ""
    if p.name in SKIP_FILES:
        return ""
    txt = p.read_text(errors="ignore")
    return "\n".join(txt.splitlines()[:max_lines])


def build_bundle() -> str:
    parts = [safe_tree(REPO)]
    key_files = [
        "backend/main.py",
        "backend/db.py",
        "backend/models.py",
        "backend/storage.py",
    ]
    for f in key_files:
        fp = REPO / f
        if fp.exists() and fp.is_file():
            parts.append(
                f"\n=== FILE: {f} (first 200 lines) ===\n{read_head(f, 200)}")
    bundle = "\n".join(parts)
    return bundle[:25000]


SYSTEM = (
    "You are a senior backend engineer.\n"
    "You MUST follow the required output format.\n"
    "Do NOT explain code. Do NOT summarize. Do NOT describe technologies.\n"
    "Output ONLY a PATCH PLAN.\n"
    "\n"
    "OUTPUT FORMAT (MANDATORY):\n"
    "PATCH PLAN\n"
    "- FILE: <path>\n"
    "  WHAT TO CHANGE:\n"
    "  - bullet\n"
    "  - bullet\n"
    "  WHY: <one short sentence>\n"
    "\n"
    "Rules:\n"
    "- Minimal realistic changes (no big rewrites)\n"
    "- backend/*.py only\n"
    "- Focus on safety, structure, performance, testability\n"
)

TASK = (
    "Return ONLY the PATCH PLAN in the exact format.\n"
    "Provide 6–8 patches.\n"
    "No explanations.\n"
)


def ollama_call(messages: list[dict]) -> str:
    resp = ollama.chat(
        model=MODEL,
        messages=messages,
        options={
            "num_ctx": NUM_CTX,
            "num_predict": NUM_PREDICT,
            "temperature": 0.2,
        },
    )
    return (resp.get("message", {}) or {}).get("content", "") or ""


def ensure_patch_plan(raw: str, bundle: str) -> str:
    # If already ok:
    if raw.strip().startswith("PATCH PLAN"):
        return raw.strip()

    # Second pass: force rewrite
    rewrite_prompt = (
        "Rewrite the following BAD OUTPUT into the REQUIRED PATCH PLAN format.\n"
        "IMPORTANT: Output ONLY the PATCH PLAN. No other text.\n"
        "You may ONLY reference files that appear in the TREE section. If a file is not in TREE, do not mention it.\n"
        "Provide 6–8 patches, backend/*.py only.\n\n"
        "REPO BUNDLE:\n"
        f"{bundle}\n\n"
        "BAD OUTPUT:\n"
        f"{raw}\n"
    )
    fixed = ollama_call([
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content": rewrite_prompt},
    ])

    # If it still fails, do a hard minimal fallback instruction
    if not fixed.strip().startswith("PATCH PLAN"):
        hard = ollama_call([
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": "OUTPUT ONLY: 'PATCH PLAN' + 6 bullet entries in the required format. NOTHING ELSE."},
        ])
        return hard.strip()

    return fixed.strip()


def main():
    print("Building small repo bundle...")
    bundle = build_bundle()
    print("Bundle ready. Asking model...")

    raw = ollama_call([
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content": f"{TASK}\n\nREPO BUNDLE:\n{bundle}"},
    ])

    out = ensure_patch_plan(raw, bundle)
    print("\n[Architect]\n" + out + "\n")


if __name__ == "__main__":
    main()
