from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI

import sqlite3
import pandas as pd
import os
import shutil


app = FastAPI(title="AI SQL Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://ai-sql-assistant.sajaabdalla1313.workers.dev",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI()

DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)

DEFAULT_DB = os.path.join(DATA_DIR, "Chinook_Sqlite.sqlite")
UPLOADED_DB = os.path.join(DATA_DIR, "uploaded_data.db")

current_db = DEFAULT_DB


class QuestionRequest(BaseModel):
    question: str


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
def generate_sql(request: QuestionRequest):
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