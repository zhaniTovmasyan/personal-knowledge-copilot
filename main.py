import os
import math
from typing import List, Dict, Any

from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

app = FastAPI()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# -----------------------------
# In-memory store (V0.1)
# -----------------------------
# Each item: {"id": int, "text": str, "embedding": List[float]}
KNOWLEDGE: List[Dict[str, Any]] = []
NEXT_ID = 1

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
    used_ids: List[int]
    context_preview: str


# -----------------------------
# Helpers
# -----------------------------

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

def retrieve_top_k(question: str, k: int = 2, min_score: float = 0.25):
    q_emb = embed_text(question)

    scored = []
    for it in KNOWLEDGE:
        score = cosine_similarity(q_emb, it["embedding"])
        scored.append((score, it))


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
                    "- Cite the sources you used at the end in this format: Sources: [id].\n"
                    "- Use ONLY the ids that appear in the context.\n"
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
def add_knowledge(payload: AddKnowledgeRequest):
    global NEXT_ID

    text = payload.text.strip()
    if not text:
        return {"id": -1, "chars": 0}

    parent_id = NEXT_ID
    NEXT_ID += 1

    chunks = chunk_text(text, max_chars=400)

    for idx, chunk in enumerate(chunks):
        emb = embed_text(chunk)

        KNOWLEDGE.append(
            {
                "id": NEXT_ID,
                "parent_id": parent_id,
                "chunk_index": idx,
                "text": chunk,
                "embedding": emb,
            }
        )
        NEXT_ID += 1

    return {"id": parent_id, "chars": len(text)}


@app.get("/knowledge", response_model=ListKnowledgeResponse)
def list_knowledge():
    items = [
        {
            "id": it["id"],
            "text_preview": preview(it["text"]),
            "chars": len(it["text"]),
        }
        for it in KNOWLEDGE
    ]
    return {"items": items}

@app.post("/ask", response_model=AskResponse)
def ask(payload: AskRequest):
    question = payload.question.strip()
    if not question:
        return {"answer": "Please provide a question.", "used_ids": [], "context_preview": ""}

    if not KNOWLEDGE:
        return {"answer": "I don't have any knowledge yet.", "used_ids": [], "context_preview": ""}

    top_items = retrieve_top_k(question, k=2)
    context = "\n\n".join([f"[{it['id']}] {it['text']}" for it in top_items])

    answer = generate_answer(question, context)

    return {
        "answer": answer,
        "used_ids": [it["id"] for it in top_items],
        "context_preview": preview(context, 200),
    }
