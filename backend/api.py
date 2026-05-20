from fastapi import FastAPI, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI

import sqlite3
import pandas as pd
import os
import shutil

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

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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
        "http://localhost:8080",
        "http://localhost:8081",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://ai-sql-assistant.sajaabdalla1313.workers.dev",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)

DEFAULT_DB = os.path.join(DATA_DIR, "Chinook_Sqlite.sqlite")
UPLOADED_DB = os.path.join(DATA_DIR, "uploaded_data.db")

current_db = DEFAULT_DB


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    try:
        if credentials is None:
            return {"guest": True}

        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        return {
            "guest": False,
            "user_id": payload.get("user_id"),
            "email": payload.get("email"),
        }

    except JWTError:
        return {"guest": True}


def get_database_schema_text() -> str:
    global current_db

    try:
        conn = sqlite3.connect(current_db)
        cursor = conn.cursor()

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()

        schema_lines = []

        for table in tables:
            table_name = table[0]

            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = cursor.fetchall()

            column_names = [col[1] for col in columns]
            schema_lines.append(f"{table_name}({', '.join(column_names)})")

        conn.close()
        return "\n".join(schema_lines)

    except Exception:
        return """
Artist(ArtistId, Name)
Album(AlbumId, Title, ArtistId)
Customer(CustomerId, FirstName, LastName, Country, Email)
Invoice(InvoiceId, CustomerId, InvoiceDate, BillingCountry, Total)
InvoiceLine(InvoiceLineId, InvoiceId, TrackId, UnitPrice, Quantity)
Track(TrackId, Name, AlbumId, GenreId, UnitPrice)
Genre(GenreId, Name)
"""


def generate_sql_with_ai(question: str) -> str:
    schema = get_database_schema_text()

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
- Never use DELETE, DROP, UPDATE, INSERT, ALTER, CREATE.
- Do not explain.
- Do not use markdown.
- Always fully qualify column names when using JOINs, for example Customer.CustomerId.
- When using JOINs, avoid ambiguous column names.
- If calculating totals per customer, use Customer.CustomerId and Invoice.CustomerId correctly.
- If unclear return:
  SELECT 'Question unclear' AS message;

User question:
{question}
"""

    response = client.responses.create(
        model="gpt-4.1-mini",
        input=prompt,
    )

    sql_query = response.output_text.strip()
    sql_query = sql_query.replace("```sql", "").replace("```", "").strip()

    return sql_query


def validate_sql(sql: str) -> bool:
    forbidden = ["DELETE", "DROP", "UPDATE", "INSERT", "ALTER", "CREATE"]
    sql_upper = sql.upper().strip()

    if not sql_upper.startswith("SELECT"):
        return False

    for word in forbidden:
        if word in sql_upper:
            return False

    return True


def execute_sql(sql: str):
    global current_db

    try:
        conn = sqlite3.connect(current_db)
        cursor = conn.cursor()

        cursor.execute(sql)

        rows = cursor.fetchall()
        columns = []

        if cursor.description:
            columns = [desc[0] for desc in cursor.description]

        conn.close()

        return {
            "success": True,
            "columns": columns,
            "rows": rows,
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }


@app.get("/")
def root():
    return {
        "message": "AI Text-to-SQL API Running",
        "database": current_db,
    }


@app.post("/generate-sql")
def generate_sql(
    request: QuestionRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        question = request.question

        sql = generate_sql_with_ai(question)

        if not validate_sql(sql):
            return {
                "success": False,
                "question": question,
                "sql": sql,
                "error": "Only safe SELECT queries are allowed",
            }

        result = execute_sql(sql)

        if not result["success"]:
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

        return {
            "success": True,
            "question": question,
            "sql": sql,
            "columns": result["columns"],
            "rows": result["rows"],
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }


@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    global current_db

    try:
        temp_csv_path = os.path.join(DATA_DIR, file.filename)

        with open(temp_csv_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        df = pd.read_csv(temp_csv_path)

        conn = sqlite3.connect(UPLOADED_DB)

        df.to_sql(
            "uploaded_data",
            conn,
            if_exists="replace",
            index=False,
        )

        conn.close()

        current_db = UPLOADED_DB

        return {
            "success": True,
            "message": "CSV uploaded successfully",
            "table_name": "uploaded_data",
            "columns": list(df.columns),
            "rows_count": len(df),
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }


@app.get("/schema")
def get_schema():
    global current_db

    try:
        conn = sqlite3.connect(current_db)
        cursor = conn.cursor()

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()

        schema = {}

        for table in tables:
            table_name = table[0]

            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = cursor.fetchall()

            schema[table_name] = [
                {
                    "column_name": col[1],
                    "data_type": col[2],
                }
                for col in columns
            ]

        conn.close()

        return {
            "success": True,
            "database": current_db,
            "schema": schema,
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "backend": "running",
        "database": "connected",
        "redis": "connected",
    }


@app.get("/history")
def get_history(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if not current_user.get("user_id"):
        return []

    history = (
        db.query(QueryHistory)
        .filter(QueryHistory.user_id == current_user["user_id"])
        .all()
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

    existing_user = db.query(User).filter(User.email == request.email).first()

    if existing_user:
        db.close()
        return {"error": "Email already exists"}

    new_user = User(
        full_name=request.full_name,
        email=request.email,
        password_hash=pwd_context.hash(request.password),
    )

    db.add(new_user)
    db.commit()
    db.close()

    return {"message": "User created successfully"}


@app.post("/login")
def login(request: LoginRequest):
    db: Session = SessionLocal()

    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        db.close()
        return {"error": "User not found"}

    if not pwd_context.verify(request.password, user.password_hash):
        db.close()
        return {"error": "Incorrect password"}

    access_token = create_access_token(
        data={
            "user_id": user.id,
            "email": user.email,
        }
    )

    db.close()

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


def create_access_token(data: dict):
    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return encoded_jwt


@app.get("/me")
def me(current_user: dict = Depends(get_current_user)):
    return current_user