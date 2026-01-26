import os
import math
from typing import List

from fastapi import FastAPI, Depends

from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
from models import KnowledgeChunk

from sqlalchemy.orm import Session
from db import SessionLocal, engine, Base
from storage import save_chunk, list_chunks, load_embedding
import time

load_dotenv()

app = FastAPI()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
Base.metadata.create_all(bind=engine)

# -----------------------------
# Models
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

class AskResponse(BaseModel):
    answer: str
    used_refs: List[str]
    context_preview: str


# -----------------------------
# Helpers
# -----------------------------

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def embed_text(text: str) -> List[float]:
    """Creates an embedding vector for a given text"""
    # Keep it simple for V0.1: embed the whole text as one chunk
    resp = client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return resp.data[0].embedding


def preview(text: str, n: int = 80) -> str:
    """Short preview for list UI."""
    t = " ".join(text.split())
    return t[:n] + ("…" if len(t) > n else "")

def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    dot = sum(a * b for a, b in zip(vec1, vec2))
    mag1 = math.sqrt(sum(a * a for a in vec1))
    mag2 = math.sqrt(sum(b * b for b in vec2))
    return dot / (mag1 * mag2)

def retrieve_top_k(
    question: str,
    db: Session,
    k: int = 2,
    min_score: float = 0.25,
):    
    q_emb = embed_text(question)
    scored = []
    rows = list_chunks(db)  # <-- идва от SQLite

    for row in rows:
        chunk_embedding = load_embedding(row)
        score = cosine_similarity(q_emb, chunk_embedding)
        scored.append((score, row))

    # sort by similarity (high → low)
    scored.sort(key=lambda x: x[0], reverse=True)

    # FILTER by threshold
    filtered = [(s, it) for (s, it) in scored if s >= min_score]

    # return only the items (without scores)
    return [it for (s, it) in filtered[:k]]

def generate_answer(question: str, context: str) -> str:
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0,
        messages=[
            {
                "role": "system",
                "content": (
                    "Answer using ONLY the provided context.\n"
                    "- If the context is insufficient, reply: \"I don't have enough information in your knowledge.\"\n"
                    "- Keep the answer to 3-5 sentences.\n"
                    "- Do not invent facts.\n"
                    "- Cite sources using the exact bracket ids from the context, e.g. Sources: [1769013042324:0].\n"
                    "- If you used multiple context lines, list multiple bracket ids.\n"
                ),
            },
            {
                "role": "user",
                "content": f"Context:\n{context}\n\nQuestion:\n{question}",
            },
        ],
    )
    return resp.choices[0].message.content

def chunk_text(text: str, max_chars: int = 400) -> List[str]:
    """Split text into rough chunks by paragraphs, then by size."""
    # split by paragraphs first
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
# -----------------------------
# Routes
# -----------------------------

@app.get("/")
def health():
    return {"status": "ok"}

@app.post("/knowledge", response_model=AddKnowledgeResponse)
def add_knowledge(payload: AddKnowledgeRequest, db: Session = Depends(get_db)):
    text = payload.text.strip()
    if not text:
        return {"id": -1, "chars": 0}

    parent_id = int(time.time() * 1000)  # simple V0.1

    chunks = chunk_text(text, max_chars=400)

    for idx, chunk in enumerate(chunks):
        emb = embed_text(chunk)
        save_chunk(db, parent_id=parent_id, chunk_index=idx, text=chunk, embedding=emb)

    return {"id": parent_id, "chars": len(text)}


@app.get("/knowledge", response_model=ListKnowledgeResponse)
def list_knowledge_endpoint(db: Session = Depends(get_db)):
    rows = list_chunks(db)

    items = [
        {
            "id": r.id,
            "text_preview": preview(r.text),
            "chars": len(r.text),
        }
        for r in rows
    ]
    return {"items": items}

@app.post("/ask", response_model=AskResponse)
def ask(payload: AskRequest, db: Session = Depends(get_db)):
    question = payload.question.strip()
    if not question:
        return {"answer": "Please provide a question.", "used_refs": [], "context_preview": ""}

    top_rows = retrieve_top_k(question, db, k=3, min_score=0.25)

    if not top_rows:
        return {
            "answer": "I don't have enough information in your knowledge.",
            "used_refs": [],
            "context_preview": "",
        }

    context = "\n\n".join(
        [f"[{r.parent_id}:{r.chunk_index}] {r.text}" for r in top_rows]
    )

    answer = generate_answer(question, context)

    return {
        "answer": answer,
        "used_refs": [f"{r.parent_id}:{r.chunk_index}" for r in top_rows],
        "context_preview": preview(context, 200),
    }

@app.post("/debug/reset")
def debug_reset(db: Session = Depends(get_db)):
    if os.getenv("DEBUG", "false").lower() != "true":
        return {"ok": False, "error": "Not allowed"}

    db.query(KnowledgeChunk).delete()
    db.commit()
    return {"ok": True}
