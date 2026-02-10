import os
import math
from typing import List, Dict, Any

from fastapi import FastAPI, Depends, Query

from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI

from sqlalchemy.orm import Session
from db import SessionLocal, engine, Base
from models import KnowledgeChunk
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
    case_id: int,
    k: int = 2,
    min_score: float = 0.25,
):    
    q_emb = embed_text(question)
    scored = []
    rows = list_chunks(db, case_id=case_id)

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
    """Generate a structured 'legal copilot' style answer based on the retrieved context."""
    system_prompt = (
    "You are a careful legal copilot assisting a lawyer with a specific case.\n"
    "\n"
    "GENERAL PRINCIPLES\n"
    "- You are a reasoning assistant, not the lawyer of record.\n"
    "- Be explicit about uncertainty, assumptions, and what is supported by the provided notes.\n"
    "- NEVER invent laws, cases, facts, or evidence not contained in the case notes.\n"
    "- If something is unknown, clearly mark it as unknown.\n"
    "\n"
    "AVAILABLE MATERIAL\n"
    "You are given:\n"
    "- A USER QUESTION about a specific legal case.\n"
    "- CASE NOTES (knowledge chunks) belonging only to this case.\n"
    "\n"
    "You MUST:\n"
    "- Base your reasoning primarily on the provided case notes.\n"
    "- Prefer asking clarifying questions over making assumptions when key facts are missing.\n"
    "- Treat anything not explicitly in the notes as unknown unless stated as an assumption.\n"
    "\n"
    "COMMONLY CRITICAL INFORMATION (often missing)\n"
    "- Jurisdiction / applicable law\n"
    "- Parties and their roles\n"
    "- Timeline of events\n"
    "- Procedural posture (investigation, trial, appeal, settlement, etc.)\n"
    "- Key documents, contracts, or evidence\n"
    "\n"
    "WHEN INFORMATION IS INSUFFICIENT\n"
    "- If the notes do not contain enough information to analyze reliably:\n"
    "  - Ask focused clarifying questions first.\n"
    "  - Explain briefly why analysis is limited.\n"
    "\n"
    "OUTPUT FORMAT (ALWAYS USE THIS STRUCTURE)\n"
    "\n"
    "0) Clarifying questions (if any are needed)\n"
    "- Bullet list of missing facts that would materially affect the analysis.\n"
    "\n"
    "1) Issues\n"
    "- Bullet list of the main legal and factual issues identified.\n"
    "\n"
    "2) Arguments\n"
    "- For each key issue:\n"
    "  - Arguments supporting the client’s position.\n"
    "  - Arguments supporting the opposing position.\n"
    "\n"
    "3) Risks\n"
    "- Main uncertainties, weaknesses, and exposure points.\n"
    "\n"
    "4) Next steps\n"
    "- Practical investigative, procedural, or strategic steps.\n"
    "\n"
    "5) Assumptions\n"
    "- Explicit list of every assumption made that is NOT directly supported by the case notes.\n"
    "\n"
    "STYLE\n"
    "- Audience: practising lawyer.\n"
    "- Clear, structured, concise.\n"
    "- Use careful language: likely, uncertain, depends on, suggests.\n"
    "\n"
    "SAFETY\n"
    "- Do not hallucinate legal authorities.\n"
    "- Do not overstate conclusions when facts are incomplete.\n"
    "\n"
    "If the provided notes are clearly insufficient to say anything meaningful, respond with:\n"
    "\"I don't have enough information in your knowledge.\" and briefly list what is missing."
)
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0,
        messages=[
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": f"CASE_NOTES (with ids):\n{context}\n\nUSER_QUESTION:\n{question}",
            },
        ],
    )
    return resp.choices[0].message.content or ""

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
def add_knowledge(payload: AddKnowledgeRequest, db: Session = Depends(get_db),  case_id: int = Query(...)):
    text = payload.text.strip()
    if not text:
        return {"id": -1, "chars": 0}

    parent_id = int(time.time() * 1000)  # simple V0.1
    chunks = chunk_text(text, max_chars=400)

    for idx, chunk in enumerate(chunks):
        emb = embed_text(chunk)
        save_chunk(db, case_id=case_id, parent_id=parent_id, chunk_index=idx, text=chunk, embedding=emb)

    return {"id": parent_id, "chars": len(text)}

@app.get("/knowledge", response_model=ListKnowledgeResponse)
def list_knowledge_endpoint(
    case_id: int = Query(...),
    db: Session = Depends(get_db),
):
    rows = list_chunks(db, case_id=case_id)

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
def ask(
    payload: AskRequest,
    case_id: int = Query(...),
    db: Session = Depends(get_db),
):
    question = payload.question.strip()
    if not question:
        return {
            "answer": "Please provide a question.",
            "used_ids": [],
            "context_preview": "",
            "sources": [],
        }

    top_rows = retrieve_top_k(question, db, case_id=case_id, k=3, min_score=0.25)

    if not top_rows:
        return {
            "answer": "I don't have enough information in your knowledge.",
            "used_ids": [],
            "context_preview": "",
            "sources": [],
        }

    context = "\n\n".join(
        [f"[{r.parent_id}:{r.chunk_index}] {r.text}" for r in top_rows]
    )

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