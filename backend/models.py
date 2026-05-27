from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime

from database import Base


class QueryHistory(Base):
    __tablename__ = "query_history"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(Text, nullable=False)
    generated_sql = Column(Text, nullable=True)
    result_summary = Column(Text, nullable=True)
    dataset_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, nullable=True)

class User(Base):
      __tablename__ = "users"

      id = Column(Integer, primary_key=True, index=True)
      full_name = Column(String(255), nullable=True)
      email = Column(String(255), unique=True, index=True, nullable=False)
      password_hash = Column(Text, nullable=False)
      created_at = Column(DateTime, default=datetime.utcnow)

class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    table_name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)