import json
from typing import List
from sqlalchemy.orm import Session
from models import KnowledgeChunk

def save_chunk(db: Session, parent_id: int, chunk_index: int, text: str, embedding: List[float]):
    row = KnowledgeChunk(
        parent_id=parent_id,
        chunk_index=chunk_index,
        text=text,
        embedding_json=json.dumps(embedding),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

def list_chunks(db: Session):
    return db.query(KnowledgeChunk).order_by(KnowledgeChunk.id.asc()).all()

def load_embedding(row: KnowledgeChunk) -> List[float]:
    return json.loads(row.embedding_json)
