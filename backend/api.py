from fastapi import FastAPI, UploadFile, File, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI

import sqlite3
import pandas as pd
import os
import shutil
import re
import logging
import time
import json

from database import engine, get_db, SessionLocal
from models import Base, QueryHistory, User, Dataset
from sqlalchemy.orm import Session

from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv


load_dotenv()

app = FastAPI(title="AI SQL Assistant API")

# =========================
# Logging / Monitoring
# =========================

LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.FileHandler(os.path.join(LOG_DIR, "app.log"), encoding="utf-8"),
        logging.StreamHandler(),
    ],
)

logger = logging.getLogger("ai_sql_assistant")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()

    logger.info(
        f"REQUEST START | {request.method} {request.url.path}"
    )

    try:
        response = await call_next(request)

        duration = round(time.time() - start_time, 3)

        logger.info(
            f"REQUEST END | {request.method} {request.url.path} | "
            f"status={response.status_code} | duration={duration}s"
        )

        return response

    except Exception as e:

        logger.exception(
            f"REQUEST ERROR | {request.method} {request.url.path} | "
            f"error={str(e)}"
        )

        raise e


# =========================
# App Config
# =========================

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

SECRET_KEY = "my-super-secret-key-change-later"

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 60

security = HTTPBearer(auto_error=False)

Base.metadata.create_all(bind=engine)

DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)

# =========================
# Models
# =========================

class SignupRequest(BaseModel):
    full_name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class QuestionRequest(BaseModel):
    question: str
    dataset_id: int


# =========================
# CORS
# =========================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://ai-sql-assistant-orpin.vercel.app",
        "https://ai-sql-assistant-git-main-saja-abdalla-s-projects.vercel.app",
        "https://ai-sql-assistant-b6z9gg0la-saja-abdalla-s-projects.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# Helpers
# =========================

def clean_table_name(filename: str) -> str:

    name = os.path.splitext(filename)[0]

    name = name.strip().lower()

    name = re.sub(
        r"[^a-zA-Z0-9_]",
        "_",
        name
    )

    name = re.sub(
        r"_+",
        "_",
        name
    )

    if not name:
        name = "uploaded_data"

    if name[0].isdigit():
        name = f"table_{name}"

    return name


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    try:

        if credentials is None:
            return {"guest": True}

        token = credentials.credentials

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        return {
            "guest": False,
            "user_id": payload.get("user_id"),
            "email": payload.get("email"),
        }

    except JWTError:
        return {"guest": True}


def get_database_path(user_id: int):

    return os.path.join(
        DATA_DIR,
        f"user_{user_id}.db"
    )


def get_database_schema_text(database_path: str) -> str:

    try:

        conn = sqlite3.connect(database_path)

        cursor = conn.cursor()

        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table';"
        )

        tables = cursor.fetchall()

        schema_lines = []

        for table in tables:

            table_name = table[0]

            cursor.execute(
                f'PRAGMA table_info("{table_name}")'
            )

            columns = cursor.fetchall()

            column_names = [col[1] for col in columns]

            schema_lines.append(
                f"{table_name}({', '.join(column_names)})"
            )

        conn.close()

        return "\n".join(schema_lines)

    except Exception as e:

        logger.exception(
            f"SCHEMA TEXT ERROR | error={str(e)}"
        )

        return ""


def generate_sql_with_ai(
    question: str,
    schema: str
) -> str:

    if not schema:
        return (
            "SELECT 'No dataset uploaded yet. "
            "Please upload a CSV first.' AS message;"
        )

    prompt = f"""
You are an expert SQLite assistant.

Convert the user question into SQL.

The user may ask in:
- English
- Hebrew
- Arabic

Database schema:
{schema}

Rules:
- Return ONLY SQL.
- Use SQLite syntax.
- ONLY SELECT queries are allowed.
- Do not guess meanings from similar column names.
- If the user question is completely unrelated to the dataset,
  return:
  SELECT 'DATASET_MISMATCH' AS message;
- Only use columns that clearly match the user intent.
- Never use DELETE, DROP, UPDATE, INSERT, ALTER, CREATE.
- Do not explain.
- Do not use markdown.
- Use the table names exactly as they appear in the schema.
- Always fully qualify column names when using JOINs.
- When using JOINs, avoid ambiguous column names.
- If the question does not match the uploaded dataset schema,
  return exactly:
  SELECT 'DATASET_MISMATCH' AS message;

User question:
{question}
"""

    response = client.responses.create(
        model="gpt-4.1-mini",
        input=prompt,
    )

    sql_query = response.output_text.strip()

    sql_query = (
        sql_query
        .replace("```sql", "")
        .replace("```", "")
        .strip()
    )

    return sql_query


def validate_sql(sql: str) -> bool:

    forbidden = [
        "DELETE",
        "DROP",
        "UPDATE",
        "INSERT",
        "ALTER",
        "CREATE",
    ]

    sql_upper = sql.upper().strip()

    if not sql_upper.startswith("SELECT"):
        return False

    for word in forbidden:

        if word in sql_upper:
            return False

    return True


def execute_sql(
    database_path: str,
    sql: str
):

    try:

        conn = sqlite3.connect(database_path)

        cursor = conn.cursor()

        cursor.execute(sql)

        rows = cursor.fetchall()

        columns = []

        if cursor.description:
            columns = [
                desc[0]
                for desc in cursor.description
            ]

        conn.close()

        return {
            "success": True,
            "columns": columns,
            "rows": rows,
        }

    except Exception as e:

        logger.exception(
            f"SQL EXECUTION ERROR | sql={sql} | error={str(e)}"
        )

        return {
            "success": False,
            "error": str(e),
        }


def create_access_token(data: dict):

    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return encoded_jwt


def generate_suggested_questions(
    table_name: str,
    columns: list[str],
) -> list[str]:

    suggestions = [
        f"Show all rows from {table_name}",
        f"Show the first 10 rows from {table_name}",
        f"How many rows are in {table_name}?",
        f"Show the columns in {table_name}",
    ]

    numeric_keywords = [
        "price",
        "cost",
        "amount",
        "total",
        "salary",
        "age",
        "year",
        "mpg",
        "horsepower",
        "weight",
    ]

    numeric_columns = [
        col
        for col in columns
        if any(
            keyword in col.lower()
            for keyword in numeric_keywords
        )
    ]

    if numeric_columns:

        col = numeric_columns[0]

        suggestions.append(
            f"What is the average {col}?"
        )

        suggestions.append(
            f"Show the top 5 rows by {col}"
        )

    return suggestions[:6]

# =========================
# Routes
# =========================

@app.get("/")
def root():

    return {
        "message": "AI Text-to-SQL API Running",
    }


@app.get("/datasets")
def get_datasets(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):

    if current_user.get("guest"):

        return []

    datasets = (
        db.query(Dataset)
        .filter(
            Dataset.user_id == current_user["user_id"]
        )
        .order_by(Dataset.created_at.desc())
        .all()
    )

    return [
        {
            "id": item.id,
            "table_name": item.table_name,
            "file_name": item.original_file_name,
            "rows_count": item.rows_count,
            "created_at": item.created_at,
        }
        for item in datasets
    ]


@app.post("/upload-csv")
async def upload_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):

    try:

        if current_user.get("guest"):

            return {
                "success": False,
                "error": "Please login first"
            }

        logger.info(
            f"UPLOAD START | filename={file.filename}"
        )

        if not file.filename.lower().endswith(".csv"):

            return {
                "success": False,
                "error": "Only CSV files are allowed",
            }

        temp_csv_path = os.path.join(
            DATA_DIR,
            file.filename
        )

        with open(temp_csv_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        df = pd.read_csv(temp_csv_path)

        safe_name = clean_table_name(file.filename)

        table_name = (
            f"user_{current_user['user_id']}_{safe_name}"
        )

        database_path = get_database_path(
            current_user["user_id"]
        )

        conn = sqlite3.connect(database_path)

        df.to_sql(
            table_name,
            conn,
            if_exists="replace",
            index=False,
        )
        

        conn.close()

        dataset = Dataset(
            user_id=current_user["user_id"],
            table_name=table_name,
            original_file_name=file.filename,
            rows_count=len(df),
            columns_json=json.dumps(list(df.columns)),
        )

        db.add(dataset)
        db.commit()
        db.refresh(dataset)

        suggestions = generate_suggested_questions(
            table_name,
            list(df.columns)
        )

        return {
            "success": True,
            "dataset_id": dataset.id,
            "table_name": table_name,
            "database": database_path,
            "columns": list(df.columns),
            "rows_count": len(df),
            "suggested_questions": suggestions,
        }

    except Exception as e:

        logger.exception(
            f"UPLOAD ERROR | error={str(e)}"
        )

        return {
            "success": False,
            "error": str(e),
        }


@app.post("/generate-sql")
def generate_sql(
    request: QuestionRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):

    try:

        dataset = (
            db.query(Dataset)
            .filter(
                Dataset.id == request.dataset_id,
                Dataset.user_id == current_user["user_id"]
            )
            .first()
        )

        if not dataset:

            return {
                "success": False,
                "error": "Dataset not found"
            }

        database_path = get_database_path(
            current_user["user_id"]
        )

        schema = get_database_schema_text(
            database_path
        )

        sql = generate_sql_with_ai(
            request.question,
            schema
        )

        if not validate_sql(sql):

            return {
                "success": False,
                "error": "Unsafe SQL blocked"
            }

        result = execute_sql(
            database_path,
            sql
        )

        if not result["success"]:

            return {
                "success": False,
                "error": result["error"],
            }

        history = QueryHistory(
            user_id=current_user["user_id"],
            question=request.question,
            generated_sql=sql,
            dataset_name=dataset.table_name,
        )

        db.add(history)
        db.commit()

        return {
            "success": True,
            "question": request.question,
            "sql": sql,
            "columns": result["columns"],
            "rows": result["rows"],
        }

    except Exception as e:

        logger.exception(
            f"GENERATE SQL ERROR | error={str(e)}"
        )

        return {
            "success": False,
            "error": str(e),
        }
    
    