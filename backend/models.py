from sqlalchemy import Column, Integer, Text, Float, String
from db import Base

class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, index=True)
    case_id = Column(Integer, index=True)
    chunk_index = Column(Integer)
    text = Column(Text, nullable=False)
    # store embedding as a JSON string for V0.1 (simple)
    embedding_json = Column(Text, nullable=False)
