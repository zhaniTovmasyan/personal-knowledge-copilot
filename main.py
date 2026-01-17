# import os
# from fastapi import FastAPI
# from dotenv import load_dotenv
# from openai import OpenAI

# load_dotenv()

# app = FastAPI()
# client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# @app.get("/")

# def health():
#     return {"status": "ok"}

# @app.post("/ask")

# def ask_knowledge(question: str):
#     return {
#         "question": question,
#         "answer": "Coming next: RAG logic"
#     }
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

    emb = embed_text(text)

    item = {"id": NEXT_ID, "text": text, "embedding": emb}
    KNOWLEDGE.append(item)

    created_id = NEXT_ID
    NEXT_ID +=1

    return {"id": created_id, "chars": len(text)}

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

@app.post("/ask")
def ask_knowledge(question: str):
    # Placeholder: tomorrow (Day 3) we’ll do semantic search + RAG
    return {"question": question, "answer": "Coming next: semantic search + RAG"}    