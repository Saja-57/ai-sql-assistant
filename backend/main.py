import sqlite3
from openai import OpenAI

# OpenAI client
client = OpenAI()

# Database path
DB_PATH = ""


def generate_sql_with_ai(question):

    schema = """
    Artist(ArtistId, Name)

    Album(AlbumId, Title, ArtistId)

    Customer(CustomerId, FirstName, LastName, Country, Email)

    Invoice(InvoiceId, CustomerId, InvoiceDate, BillingCountry, Total)

    InvoiceLine(InvoiceLineId, InvoiceId, TrackId, UnitPrice, Quantity)

    Track(TrackId, Name, AlbumId, GenreId, UnitPrice)

    Genre(GenreId, Name)
    """

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
    - Return ONLY SQL
    - Use SQLite syntax
    - ONLY SELECT queries allowed
    - Do not guess meanings from similar column names.
- - If the user question is completely unrelated to the dataset,
  return:
  SELECT 'DATASET_MISMATCH' AS message;
- Only use columns that clearly match the user intent.
    - Never use DELETE, DROP, UPDATE, INSERT, ALTER
- If the question does not match the uploaded dataset schema,
  return exactly:
  SELECT 'DATASET_MISMATCH' AS message;
    User question:
    {question}
    """

    response = client.responses.create(
        model="gpt-4.1-mini",
        input=prompt
    )

    sql_query = response.output_text.strip()

    return sql_query


def is_safe_sql(sql_query):

    forbidden = [
        "DELETE",
        "DROP",
        "UPDATE",
        "INSERT",
        "ALTER",
        "CREATE"
    ]

    upper_sql = sql_query.upper()

    for word in forbidden:
        if word in upper_sql:
            return False

    return upper_sql.strip().startswith("SELECT")


def run_query(sql_query):

    conn = sqlite3.connect(DB_PATH)

    cursor = conn.cursor()

    cursor.execute(sql_query)

    rows = cursor.fetchall()

    conn.close()

    return rows


# =========================

question = input("Ask your question: ")

sql_query = generate_sql_with_ai(question)

print("\nGenerated SQL:")
print(sql_query)

if not is_safe_sql(sql_query):

    print("\nUnsafe SQL detected!")

else:

    try:

        results = run_query(sql_query)

        print("\nResults:")

        for row in results:
            print(row)

    except Exception as e:

        print("\nSQL Error:")
        print(e)
        