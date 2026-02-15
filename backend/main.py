import math
import os
import time
from functools import lru_cache
from typing import List

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query
from openai import OpenAI
from pydantic import BaseModel
from sqlalchemy.orm import Session

# ✅ package-safe imports
from backend.db import Base, SessionLocal, engine
from backend.storage import list_chunks, load_embedding, save_chunk

load_dotenv()

# -----------------------------
# App + config
# -----------------------------

app = FastAPI()

EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-3-small")
CHAT_MODEL = os.getenv("CHAT_MODEL", "gpt-4o-mini")

DEFAULT_MIN_SCORE = float(os.getenv("MIN_SCORE", "0.25"))
DEFAULT_TOP_K = int(os.getenv("TOP_K", "3"))
CHUNK_MAX_CHARS = int(os.getenv("CHUNK_MAX_CHARS", "400"))


@app.on_event("startup")
def _startup() -> None:
    # Create tables on startup (not at import time)
    Base.metadata.create_all(bind=engine)


@lru_cache(maxsize=1)
def get_openai_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set.")
    return OpenAI(api_key=api_key)


# -----------------------------
# Pydantic models
# -----------------------------

class AddKnowledgeRequest(BaseModel):
    text: str


class AddKnowledgeResponse(BaseModel):
    id: int
    chars: int


class ListKnowledgeItem(BaseModel):
    id: int
    text_preview: str
    chars: int


class ListKnowledgeResponse(BaseModel):
    items: List[ListKnowledgeItem]


class AskRequest(BaseModel):
    question: str


class SourceItem(BaseModel):
    id: int
    parent_id: int
    chunk_index: int
    text_preview: str


class AskResponse(BaseModel):
    answer: str
    used_ids: List[int]
    context_preview: str
    sources: List[SourceItem]


# -----------------------------
# DB dependency
# -----------------------------

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# -----------------------------
# Helpers
# -----------------------------

def preview(text: str, n: int = 80) -> str:
    t = " ".join(text.split())
    return t[:n] + ("…" if len(t) > n else "")


def chunk_text(text: str, max_chars: int = 400) -> List[str]:
    parts = [p.strip() for p in text.split("\n") if p.strip()]

    chunks: List[str] = []
    buffer = ""

    for p in parts:
        if not buffer:
            buffer = p
        elif len(buffer) + 1 + len(p) <= max_chars:
            buffer = buffer + " " + p
        else:
            chunks.append(buffer)
            buffer = p

    if buffer:
        chunks.append(buffer)

    return chunks


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    n = min(len(vec1), len(vec2))
    if n == 0:
        return 0.0

    dot = 0.0
    mag1 = 0.0
    mag2 = 0.0
    for i in range(n):
        a = float(vec1[i])
        b = float(vec2[i])
        dot += a * b
        mag1 += a * a
        mag2 += b * b

    denom = math.sqrt(mag1) * math.sqrt(mag2)
    if denom == 0.0:
        return 0.0
    return dot / denom


def embed_text(text: str) -> List[float]:
    client = get_openai_client()
    try:
        resp = client.embeddings.create(
            model=EMBED_MODEL,
            input=text,
        )
        return resp.data[0].embedding
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Embedding provider error: {type(e).__name__}")


def retrieve_top_k(
    question: str,
    db: Session,
    case_id: int,
    k: int = 2,
    min_score: float = 0.25,
):
    q_emb = embed_text(question)
    rows = list_chunks(db, case_id=case_id)

    scored = []
    for row in rows:
        try:
            chunk_embedding = load_embedding(row)
        except Exception:
            continue
        score = cosine_similarity(q_emb, chunk_embedding)
        scored.append((score, row))

    scored.sort(key=lambda x: x[0], reverse=True)
    filtered = [(s, it) for (s, it) in scored if s >= min_score]
    return [it for (s, it) in filtered[:k]]


def generate_answer(question: str, context: str) -> str:
    system_prompt = (
        "You are an elite legal strategy copilot assisting a practising lawyer on a specific case.\n"
        "Use ONLY the provided case notes as factual support.\n"
        "If something is missing, treat it as unknown and ask clarifying questions.\n"
    )

    client = get_openai_client()
    try:
        resp = client.chat.completions.create(
            model=CHAT_MODEL,
            temperature=0,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": f"CASE_NOTES (with ids):\n{context}\n\nUSER_QUESTION:\n{question}",
                },
            ],
        )
        return resp.choices[0].message.content or ""
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM provider error: {type(e).__name__}")


# -----------------------------
# Routes
# -----------------------------

@app.get("/")
def health():
    return {"status": "ok"}


@app.post("/knowledge", response_model=AddKnowledgeResponse)
def add_knowledge(
    payload: AddKnowledgeRequest,
    db: Session = Depends(get_db),
    case_id: int = Query(...),
):
    text = (payload.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required.")

    parent_id = int(time.time() * 1000)
    chunks = chunk_text(text, max_chars=CHUNK_MAX_CHARS)

    if not chunks:
        raise HTTPException(status_code=400, detail="No usable text content.")

    for idx, chunk in enumerate(chunks):
        emb = embed_text(chunk)
        save_chunk(
            db,
            case_id=case_id,
            parent_id=parent_id,
            chunk_index=idx,
            text=chunk,
            embedding=emb,
        )

    return {"id": parent_id, "chars": len(text)}


@app.get("/knowledge", response_model=ListKnowledgeResponse)
def list_knowledge_endpoint(
    case_id: int = Query(...),
    db: Session = Depends(get_db),
):
    rows = list_chunks(db, case_id=case_id)
    items = [
        {"id": r.id, "text_preview": preview(r.text), "chars": len(r.text)}
        for r in rows
    ]
    return {"items": items}


@app.post("/ask", response_model=AskResponse)
def ask(
    payload: AskRequest,
    case_id: int = Query(...),
    db: Session = Depends(get_db),
):
    question = (payload.question or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is required.")

    top_rows = retrieve_top_k(question, db, case_id=case_id, k=DEFAULT_TOP_K, min_score=DEFAULT_MIN_SCORE)

    if not top_rows:
        return {
            "answer": "I don't have enough information in your knowledge.",
            "used_ids": [],
            "context_preview": "",
            "sources": [],
        }

    context = "\n\n".join([f"[{r.parent_id}:{r.chunk_index}] {r.text}" for r in top_rows])
    answer = generate_answer(question, context)

    sources = [
        {
            "id": r.id,
            "parent_id": r.parent_id,
            "chunk_index": r.chunk_index,
            "text_preview": preview(r.text, 120),
        }
        for r in top_rows
    ]

    return {
        "answer": answer,
        "used_ids": [r.id for r in top_rows],
        "context_preview": preview(context, 200),
        "sources": sources,
    }
