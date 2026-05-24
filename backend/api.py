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

from database import engine, get_db, SessionLocal
from models import Base, QueryHistory, User
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


class SignupRequest(BaseModel):
    full_name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class QuestionRequest(BaseModel):
    question: str


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
client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)

DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)

UPLOADED_DB = os.path.join(
    DATA_DIR,
    "uploaded_data.db"
)

# No default demo database
current_db = None


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


def get_database_schema_text() -> str:

    global current_db

    if current_db is None:
        return ""

    try:

        conn = sqlite3.connect(current_db)

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


def generate_sql_with_ai(question: str) -> str:

    schema = get_database_schema_text()

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


def execute_sql(sql: str):

    global current_db

    if current_db is None:

        return {
            "success": False,
            "error": (
                "No dataset uploaded yet. "
                "Please upload a CSV first."
            ),
        }

    try:

        conn = sqlite3.connect(current_db)

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
        "database": current_db,
        "has_dataset": current_db is not None,
    }


@app.post("/generate-sql")
def generate_sql(
    request: QuestionRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):

    try:

        global current_db

        question = request.question

        if current_db is None:

            return {
                "success": False,
                "question": question,
                "sql": None,
                "error": (
                    "No dataset uploaded yet. "
                    "Please upload a CSV first."
                ),
            }

        logger.info(
            f"AI QUERY START | question={question}"
        )

        sql = generate_sql_with_ai(question)

        if "DATASET_MISMATCH" in sql:

            return {
                "success": False,
                "question": question,
                "sql": None,
                "error": (
                    "This question does not match "
                    "the uploaded dataset. "
                    "Please ask questions related "
                    "to your uploaded CSV data."
                ),
            }

        logger.info(
            f"SQL GENERATED | sql={sql}"
        )

        if not validate_sql(sql):

            logger.warning(
                f"UNSAFE SQL BLOCKED | sql={sql}"
            )

            return {
                "success": False,
                "question": question,
                "sql": sql,
                "error": (
                    "Only safe SELECT queries "
                    "are allowed"
                ),
            }

        result = execute_sql(sql)

        if not result["success"]:

            logger.error(
                f"QUERY FAILED | sql={sql} | "
                f"error={result['error']}"
            )

            return {
                "success": False,
                "question": question,
                "sql": sql,
                "error": result["error"],
            }

        if current_user.get("user_id"):

            history = QueryHistory(
                user_id=current_user["user_id"],
                question=question,
                generated_sql=sql,
                dataset_name=current_db,
            )

            db.add(history)

            db.commit()

            logger.info(
                f"HISTORY SAVED | "
                f"user_id={current_user['user_id']} | "
                f"question={question}"
            )

        logger.info(
            f"QUERY SUCCESS | "
            f"rows={len(result['rows'])} | "
            f"columns={result['columns']}"
        )

        return {
            "success": True,
            "question": question,
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


@app.post("/upload-csv")
async def upload_csv(
    file: UploadFile = File(...)
):

    global current_db

    try:

        logger.info(
            f"UPLOAD START | filename={file.filename}"
        )

        if not file.filename.lower().endswith(".csv"):

            logger.warning(
                f"UPLOAD REJECTED | invalid_file={file.filename}"
            )

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

        logger.info(
            f"CSV READ SUCCESS | "
            f"filename={file.filename} | "
            f"rows={len(df)} | "
            f"columns={list(df.columns)}"
        )

        table_name = clean_table_name(
            file.filename
        )

        if os.path.exists(UPLOADED_DB):
            os.remove(UPLOADED_DB)

        conn = sqlite3.connect(UPLOADED_DB)

        df.to_sql(
            table_name,
            conn,
            if_exists="replace",
            index=False,
        )

        conn.close()

        current_db = UPLOADED_DB

        logger.info(
            f"UPLOAD SUCCESS | "
            f"table_name={table_name} | "
            f"database={current_db} | "
            f"rows={len(df)}"
        )

        suggestions = generate_suggested_questions(
            table_name,
            list(df.columns)
        )

        return {
            "success": True,
            "message": "CSV uploaded successfully",
            "table_name": table_name,
            "database": current_db,
            "columns": list(df.columns),
            "rows_count": len(df),
            "suggested_questions": suggestions,
        }

    except Exception as e:

        logger.exception(
            f"UPLOAD ERROR | filename={file.filename} | "
            f"error={str(e)}"
        )

        return {
            "success": False,
            "error": str(e),
        }


@app.get("/dataset-insights")
def dataset_insights():

    global current_db

    try:

        if current_db is None:

            return {
                "success": False,
                "error": "No dataset uploaded yet"
            }

        conn = sqlite3.connect(current_db)

        cursor = conn.cursor()

        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table';"
        )

        table_name = cursor.fetchone()[0]

        df = pd.read_sql_query(
            f'SELECT * FROM "{table_name}"',
            conn
        )

        conn.close()

        rows_count = len(df)

        columns_count = len(df.columns)

        missing_values = (
            df.isnull()
            .sum()
            .to_dict()
        )

        column_types = {
            col: str(dtype)
            for col, dtype in df.dtypes.items()
        }

        numeric_summary = {}

        numeric_df = df.select_dtypes(
            include="number"
        )

        for column in numeric_df.columns:

            numeric_summary[column] = {
                "average": float(
                    numeric_df[column].mean()
                ),
                "min": float(
                    numeric_df[column].min()
                ),
                "max": float(
                    numeric_df[column].max()
                ),
            }

        top_values = {}

        categorical_df = df.select_dtypes(
            include="object"
        )

        for column in categorical_df.columns[:5]:

            values = (
                categorical_df[column]
                .value_counts()
                .head(3)
                .to_dict()
            )

            top_values[column] = values

        suggestions = generate_suggested_questions(
            table_name,
            list(df.columns)
        )

        return {
            "success": True,
            "table_name": table_name,
            "rows_count": rows_count,
            "columns_count": columns_count,
            "columns": list(df.columns),
            "column_types": column_types,
            "missing_values": missing_values,
            "numeric_summary": numeric_summary,
            "top_values": top_values,
            "suggested_questions": suggestions,
        }

    except Exception as e:

        logger.exception(
            f"DATASET INSIGHTS ERROR | error={str(e)}"
        )

        return {
            "success": False,
            "error": str(e),
        }


@app.get("/schema")
def get_schema():

    global current_db

    try:

        logger.info(
            f"SCHEMA REQUEST | database={current_db}"
        )

        if current_db is None:

            return {
                "success": True,
                "database": None,
                "has_dataset": False,
                "schema": {},
                "message": "No dataset uploaded yet",
            }

        conn = sqlite3.connect(current_db)

        cursor = conn.cursor()

        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table';"
        )

        tables = cursor.fetchall()

        schema = {}

        for table in tables:

            table_name = table[0]

            cursor.execute(
                f'PRAGMA table_info("{table_name}")'
            )

            columns = cursor.fetchall()

            schema[table_name] = [
                {
                    "column_name": col[1],
                    "data_type": col[2],
                }
                for col in columns
            ]

        conn.close()

        logger.info(
            f"SCHEMA SUCCESS | tables={list(schema.keys())}"
        )

        return {
            "success": True,
            "database": current_db,
            "has_dataset": True,
            "schema": schema,
        }

    except Exception as e:

        logger.exception(
            f"SCHEMA ERROR | error={str(e)}"
        )

        return {
            "success": False,
            "error": str(e),
        }


@app.get("/health")
def health_check():

    logger.info("HEALTH CHECK")

    return {
        "status": "healthy",
        "backend": "running",
        "database": (
            "waiting_for_upload"
            if current_db is None
            else "connected"
        ),
        "redis": "connected",
    }


@app.get("/history")
def get_history(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):

    if not current_user.get("user_id"):

        logger.info(
            "HISTORY REQUEST | guest user"
        )

        return []

    history = (
        db.query(QueryHistory)
        .filter(
            QueryHistory.user_id
            == current_user["user_id"]
        )
        .all()
    )

    logger.info(
        f"HISTORY REQUEST | "
        f"user_id={current_user['user_id']} | "
        f"count={len(history)}"
    )

    return [
        {
            "id": item.id,
            "question": item.question,
            "generated_sql": item.generated_sql,
            "dataset_name": item.dataset_name,
            "created_at": item.created_at,
        }
        for item in history
    ]


@app.post("/signup")
def signup(request: SignupRequest):

    db: Session = SessionLocal()

    try:

        logger.info(
            f"SIGNUP START | email={request.email}"
        )

        existing_user = (
            db.query(User)
            .filter(User.email == request.email)
            .first()
        )

        if existing_user:

            logger.warning(
                f"SIGNUP FAILED | "
                f"email already exists | "
                f"email={request.email}"
            )

            return {
                "error": "Email already exists"
            }

        new_user = User(
            full_name=request.full_name,
            email=request.email,
            password_hash=pwd_context.hash(
                request.password
            ),
        )

        db.add(new_user)

        db.commit()

        logger.info(
            f"SIGNUP SUCCESS | email={request.email}"
        )

        return {
            "message": "User created successfully"
        }

    except Exception as e:

        logger.exception(
            f"SIGNUP ERROR | "
            f"email={request.email} | "
            f"error={str(e)}"
        )

        return {
            "error": str(e)
        }

    finally:
        db.close()


@app.post("/login")
def login(request: LoginRequest):

    db: Session = SessionLocal()

    try:

        logger.info(
            f"LOGIN START | email={request.email}"
        )

        user = (
            db.query(User)
            .filter(User.email == request.email)
            .first()
        )

        if not user:

            logger.warning(
                f"LOGIN FAILED | "
                f"user not found | "
                f"email={request.email}"
            )

            return {
                "error": "User not found"
            }

        if not pwd_context.verify(
            request.password,
            user.password_hash
        ):

            logger.warning(
                f"LOGIN FAILED | "
                f"incorrect password | "
                f"email={request.email}"
            )

            return {
                "error": "Incorrect password"
            }

        access_token = create_access_token(
            data={
                "user_id": user.id,
                "email": user.email,
            }
        )

        logger.info(
            f"LOGIN SUCCESS | "
            f"user_id={user.id} | "
            f"email={user.email}"
        )

        return {
            "message": "Login successful",
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
            },
        }

    except Exception as e:

        logger.exception(
            f"LOGIN ERROR | "
            f"email={request.email} | "
            f"error={str(e)}"
        )

        return {
            "error": str(e)
        }

    finally:
        db.close()


@app.get("/me")
def me(
    current_user: dict = Depends(get_current_user)
):

    logger.info(
        f"ME REQUEST | user={current_user}"
    )

    return current_user
