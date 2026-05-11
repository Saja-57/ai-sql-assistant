# AI SQL Assistant - Full Stack Project

## Project structure

```text
ai-sql-full-project/
├── frontend/   # React/Vite UI from Lovable
└── backend/    # FastAPI API + SQLite database
```

## Run Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn api:app --reload --host 127.0.0.1 --port 8001
```

Backend docs:

```text
http://127.0.0.1:8001/docs
```

## Run Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend usually runs on:

```text
http://localhost:8080
```

## Important

Do not upload these folders to GitHub:

```text
node_modules/
__pycache__/
.venv/
```

They are ignored by `.gitignore`.
