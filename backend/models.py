from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from datetime import datetime

from database import Base


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

    # כל קובץ שייך למשתמש מסוים
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # שם הקובץ המקורי שהמשתמש העלה
    original_file_name = Column(String(255), nullable=False)

    # שם הטבלה בתוך SQLite
    table_name = Column(String(255), nullable=False)

    # כמה שורות יש בקובץ
    rows_count = Column(Integer, nullable=True)

    # רשימת עמודות כ־JSON
    columns_json = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)


class QueryHistory(Base):
    __tablename__ = "query_history"

    id = Column(Integer, primary_key=True, index=True)

    # כל היסטוריה שייכת למשתמש מסוים
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # לא חובה אבל מומלץ: לחבר היסטוריה לקובץ מסוים
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True)

    question = Column(Text, nullable=False)
    generated_sql = Column(Text, nullable=True)
    result_summary = Column(Text, nullable=True)

    # שם הקובץ/הטבלה עבור תצוגה
    dataset_name = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)