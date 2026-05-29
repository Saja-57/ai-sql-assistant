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

from database import engine, get_db
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

    logger.info(f"REQUEST START | {request.method} {request.url.path}")

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

SECRET_KEY = os.getenv("SECRET_KEY", "my-super-secret-key-change-later")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

security = HTTPBearer(auto_error=False)

Base.metadata.create_all(bind=engine)

# ✅ Migration אוטומטי — מוסיף עמודות חסרות
from sqlalchemy import text
with engine.connect() as conn:
    conn.execute(text("""
        ALTER TABLE query_history 
        ADD COLUMN IF NOT EXISTS dataset_id INTEGER REFERENCES datasets(id);
    """))
    conn.commit()

DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)


# =========================
# Request Models
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
    name = re.sub(r"[^a-zA-Z0-9_]", "_", name)
    name = re.sub(r"_+", "_", name)

    if not name:
        name = "uploaded_data"

    if name[0].isdigit():
        name = f"table_{name}"

    return name


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

        user_id = payload.get("user_id")
        email = payload.get("email")

        if user_id is None:
            return {"guest": True}

        return {
            "guest": False,
            "user_id": user_id,
            "email": email,
        }

    except JWTError:
        return {"guest": True}


def require_login(current_user: dict):
    if current_user.get("guest"):
        return {
            "success": False,
            "error": "Please login first"
        }

    return None


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


def generate_sql_with_ai(question: str, schema: str) -> str:
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
- Never use DELETE, DROP, UPDATE, INSERT, ALTER, CREATE, TRUNCATE.
- Do not explain.
- Do not use markdown.
- Use the table names exactly as they appear in the schema.
- Always fully qualify column names when using JOINs.
- When using JOINs, avoid ambiguous column names.
- Do not invent tables or columns that do not exist in the schema.
- The user is asking about the currently selected uploaded dataset.
- Do NOT require the user to mention the table name.
- If the user asks how many rows, records, items, entries, cars, products, users, people, or objects exist, use COUNT(*).
- If the user asks to show data, list data, preview data, sample rows, first rows, or all rows, use SELECT *.
- Use LIMIT when appropriate for previews or examples.
- If the question sounds related to the uploaded dataset, generate the safest valid SELECT query.
- Only return DATASET_MISMATCH if the question is clearly unrelated to any possible dataset content.
- General dataset questions like "how many rows", "show data", "preview", "what columns exist", or "average value" are considered valid dataset questions.
- If the user asks about columns, use the schema to identify the closest matching valid columns.
- Prefer safe simple queries over returning DATASET_MISMATCH.
- If the query cannot be answered exactly, generate the closest safe SELECT query using existing schema columns.
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


def execute_sql(database_path: str, sql: str):
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


def build_result_summary(columns, rows):
    return json.dumps(
        {
            "columns": columns,
            "rows": rows[:20],
            "rows_count": len(rows),
        },
        ensure_ascii=False,
    )


# =========================
# Routes
# =========================

@app.get("/")
def root():
    return {
        "message": "AI Text-to-SQL API Running",
    }


@app.post("/signup")
def signup(
    request: SignupRequest,
    db: Session = Depends(get_db),
):
    existing_user = (
        db.query(User)
        .filter(User.email == request.email)
        .first()
    )

    if existing_user:
        return {
            "success": False,
            "error": "Email already exists"
        }

    password_hash = pwd_context.hash(request.password)

    user = User(
        full_name=request.full_name,
        email=request.email,
        password_hash=password_hash,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(
        {
            "user_id": user.id,
            "email": user.email,
        }
    )

    return {
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
        }
    }


@app.post("/login")
def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.email == request.email)
        .first()
    )

    if not user:
        return {
            "success": False,
            "error": "Invalid email or password"
        }

    if not pwd_context.verify(request.password, user.password_hash):
        return {
            "success": False,
            "error": "Invalid email or password"
        }

    token = create_access_token(
        {
            "user_id": user.id,
            "email": user.email,
        }
    )

    return {
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
        }
    }


@app.get("/datasets")
def get_datasets(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    login_error = require_login(current_user)

    if login_error:
        return []

    datasets = (
        db.query(Dataset)
        .filter(Dataset.user_id == current_user["user_id"])
        .order_by(Dataset.created_at.desc())
        .all()
    )

    return [
        {
            "id": item.id,
            "table_name": item.table_name,
            "file_name": item.original_file_name,
            "rows_count": item.rows_count,
            "columns": json.loads(item.columns_json or "[]"),
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
    temp_csv_path = None

    try:
        is_guest = current_user.get("guest", False)
        user_id = current_user.get("user_id")

        logger.info(
            f"UPLOAD START | guest={is_guest} | user_id={user_id} | filename={file.filename}"
        )

        if not file.filename.lower().endswith(".csv"):
            return {
                "success": False,
                "error": "Only CSV files are allowed",
            }

        if is_guest:
           user_dir = os.path.join(DATA_DIR, "guest_temp")
           table_prefix = "guest"
           database_path = os.path.join(DATA_DIR, "guest_temp.db")

           conn = sqlite3.connect(database_path)

           cursor = conn.cursor()

           cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
           tables = cursor.fetchall()

           for table in tables:
             cursor.execute(f'DROP TABLE IF EXISTS "{table[0]}"')

           conn.commit()
           conn.close()
        else:
            user_dir = os.path.join(DATA_DIR, f"user_{user_id}")
            table_prefix = f"user_{user_id}"
            database_path = get_database_path(user_id)


        os.makedirs(user_dir, exist_ok=True)

        temp_csv_path = os.path.join(user_dir, file.filename)

        with open(temp_csv_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        df = pd.read_csv(temp_csv_path)

        safe_name = clean_table_name(file.filename)
        table_name = f"{table_prefix}_{safe_name}"

        conn = sqlite3.connect(database_path)


        df.to_sql(
            table_name,
            conn,
            if_exists="replace",
            index=False,
        )

        conn.close()

        dataset_id = None

        if not is_guest:
            dataset = (
                db.query(Dataset)
                .filter(
                    Dataset.user_id == current_user["user_id"],
                    Dataset.original_file_name == file.filename,
                )
                .first()
            )

            if dataset:
                dataset.table_name = table_name
                dataset.rows_count = len(df)
                dataset.columns_json = json.dumps(list(df.columns), ensure_ascii=False)
            else:
                dataset = Dataset(
                    user_id=current_user["user_id"],
                    original_file_name=file.filename,
                    table_name=table_name,
                    rows_count=len(df),
                    columns_json=json.dumps(list(df.columns), ensure_ascii=False),
                )
                db.add(dataset)

            db.commit()
            db.refresh(dataset)
            dataset_id = dataset.id

        suggestions = generate_suggested_questions(
            file.filename,
            list(df.columns),
        )

        return {
            "success": True,
            "dataset_id": dataset_id,
            "table_name": table_name,
            "file_name": file.filename,
            "columns": list(df.columns),
            "rows_count": len(df),
            "suggested_questions": suggestions,
        }

    except Exception as e:
        logger.exception(f"UPLOAD ERROR | error={str(e)}")

        return {
            "success": False,
            "error": str(e),
        }

    finally:
        if temp_csv_path and os.path.exists(temp_csv_path):
            os.remove(temp_csv_path)



@app.post("/generate-sql")
def generate_sql(
    request: QuestionRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        is_guest = current_user.get("guest", False)
        user_id = current_user.get("user_id")

        if is_guest:
            dataset_id = None
            dataset_name = "Guest uploaded dataset"
            database_path = os.path.join(DATA_DIR, "guest_temp.db")
        else:
            dataset = (
                db.query(Dataset)
                .filter(
                    Dataset.id == request.dataset_id,
                    Dataset.user_id == user_id,
                )
                .first()
            )

            if not dataset:
                return {
                    "success": False,
                    "error": "Dataset not found for this user"
                }

            dataset_id = dataset.id
            dataset_name = dataset.original_file_name
            database_path = get_database_path(user_id)

        schema = get_database_schema_text(database_path)

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

        history_id = None

        if not is_guest:
            result_summary = build_result_summary(
                result["columns"],
                result["rows"]
            )

            history = QueryHistory(
                user_id=user_id,
                dataset_id=dataset_id,
                question=request.question,
                generated_sql=sql,
                result_summary=result_summary,
                dataset_name=dataset_name,
            )

            db.add(history)
            db.commit()
            db.refresh(history)

            history_id = history.id

        display_sql = sql

        if not is_guest and user_id is not None:
          display_sql = display_sql.replace(f"user_{user_id}_", "")

        if is_guest:
         display_sql = display_sql.replace("guest_", "")

        return {
            "success": True,
            "history_id": history_id,
            "question": request.question,
            "dataset_id": dataset_id,
            "dataset_name": dataset_name,
            "sql": display_sql,
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


@app.get("/history")
def get_history(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    login_error = require_login(current_user)

    if login_error:
        return []

    history_items = (
        db.query(QueryHistory)
        .filter(QueryHistory.user_id == current_user["user_id"])
        .order_by(QueryHistory.created_at.desc())
        .all()
    )

    return [
        {
            "id": item.id,
            "dataset_id": item.dataset_id,
            "dataset_name": item.dataset_name,
            "question": item.question,
            "generated_sql": item.generated_sql,
            "result_summary": json.loads(item.result_summary or "{}"),
            "created_at": item.created_at,
        }
        for item in history_items
    ]


@app.get("/history/{history_id}")
def get_history_item(
    history_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    login_error = require_login(current_user)

    if login_error:
        return login_error

    item = (
        db.query(QueryHistory)
        .filter(
            QueryHistory.id == history_id,
            QueryHistory.user_id == current_user["user_id"],
        )
        .first()
    )

    if not item:
        return {
            "success": False,
            "error": "History item not found"
        }

    return {
        "success": True,
        "id": item.id,
        "dataset_id": item.dataset_id,
        "dataset_name": item.dataset_name,
        "question": item.question,
        "generated_sql": item.generated_sql,
        "result_summary": json.loads(item.result_summary or "{}"),
        "created_at": item.created_at,
    }


@app.get("/dataset-insights")
def dataset_insights(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        is_guest = current_user.get("guest", False)
        user_id = current_user.get("user_id")

        if is_guest:
            database_path = os.path.join(DATA_DIR, "guest_temp.db")

            if not os.path.exists(database_path):
                return {
                    "success": False,
                    "error": "Guest database not found",
                }

            conn = sqlite3.connect(database_path)

            tables_df = pd.read_sql_query(
                "SELECT name FROM sqlite_master WHERE type='table'",
                conn,
            )

            if tables_df.empty:
                conn.close()
                return {
                    "success": False,
                    "error": "No guest dataset found",
                }

            table_name = tables_df.iloc[0]["name"]

            df = pd.read_sql_query(
                f'SELECT * FROM "{table_name}"',
                conn,
            )

            conn.close()

            file_name = table_name.replace("guest_", "", 1)

        else:
            login_error = require_login(current_user)

            if login_error:
                return login_error

            dataset = (
                db.query(Dataset)
                .filter(
                    Dataset.id == dataset_id,
                    Dataset.user_id == user_id,
                )
                .first()
            )

            if not dataset:
                return {
                    "success": False,
                    "error": "Dataset not found for this user",
                }

            database_path = get_database_path(user_id)

            conn = sqlite3.connect(database_path)

            df = pd.read_sql_query(
                f'SELECT * FROM "{dataset.table_name}"',
                conn,
            )

            conn.close()

            table_name = dataset.table_name
            file_name = dataset.original_file_name

        columns = list(df.columns)

        column_types = {
            col: str(df[col].dtype)
            for col in columns
        }

        missing_values = {
            col: int(df[col].isna().sum())
            for col in columns
        }

        numeric_summary = {}

        numeric_df = df.select_dtypes(include=["number"])

        for col in numeric_df.columns:
            numeric_summary[col] = {
                "average": float(numeric_df[col].mean()),
                "min": float(numeric_df[col].min()),
                "max": float(numeric_df[col].max()),
            }

        top_values = {}

        for col in columns:
            values = df[col].value_counts(dropna=True).head(5)
            top_values[col] = {
                str(k): int(v)
                for k, v in values.items()
            }

        suggested_questions = generate_suggested_questions(
            file_name,
            columns,
        )

        return {
            "success": True,
            "dataset_id": None if is_guest else dataset.id,
            "table_name": table_name,
            "file_name": file_name,
            "rows_count": int(len(df)),
            "columns_count": int(len(columns)),
            "columns": columns,
            "column_types": column_types,
            "missing_values": missing_values,
            "numeric_summary": numeric_summary,
            "top_values": top_values,
            "suggested_questions": suggested_questions,
        }

    except Exception as e:
        logger.exception(f"DATASET INSIGHTS ERROR | error={str(e)}")

        return {
            "success": False,
            "error": str(e),
        }
    
@app.delete("/datasets/{dataset_id}")
def delete_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
 ):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.user_id == current_user["user_id"]
    ).first()

    if not dataset:
        return {
            "success": False,
            "error": "Dataset not found"
        }

    db.delete(dataset)
    db.commit()

    return {
        "success": True,
        "message": "Dataset deleted successfully"
    }

@app.get("/datasets/{dataset_id}/schema")
def get_dataset_schema(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    is_guest = current_user.get("guest", False)
    user_id = current_user.get("user_id")

    if is_guest:
        database_path = os.path.join(DATA_DIR, "guest_temp.db")

        if not os.path.exists(database_path):
            return {"success": False, "error": "Guest database not found"}

        conn = sqlite3.connect(database_path)
        cursor = conn.cursor()

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]

        schema = {}

        for table in tables:
            cursor.execute(f'PRAGMA table_info("{table}")')
            schema[table] = [
                {
                    "column_name": row[1],
                    "data_type": row[2] or "unknown",
                }
                for row in cursor.fetchall()
            ]

        conn.close()

        return {
            "success": True,
            "dataset_id": None,
            "file_name": "Guest dataset",
            "table_name": tables[0] if tables else None,
            "schema": schema,
        }

    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.user_id == user_id
    ).first()

    if not dataset:
        return {"success": False, "error": "Dataset not found"}

    columns = []
    if dataset.columns_json:
        try:
            columns = json.loads(dataset.columns_json)
        except Exception:
            columns = []

    return {
        "success": True,
        "dataset_id": dataset.id,
        "file_name": dataset.original_file_name,
        "table_name": dataset.table_name,
        "schema": {
            dataset.table_name: [
                {
                    "column_name": col,
                    "data_type": "unknown"
                }
                for col in columns
            ]
        }
    }