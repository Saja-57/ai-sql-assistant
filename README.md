# AI SQL Assistant - Full Stack Project

## Project Overview

AI SQL Assistant is a full-stack AI-powered platform designed to transform natural language questions into executable SQL queries.

The system enables users to upload datasets, analyze database schemas, generate SQL queries using OpenAI APIs, execute queries on connected databases, and interact with data through an intuitive dashboard interface.

The project combines modern frontend technologies with scalable backend architecture, providing a seamless AI-driven data exploration experience.

### Key Capabilities

- Natural Language to SQL generation
- Interactive dashboard interface
- Dataset upload and schema analysis
- User authentication and session management
- Query execution and history tracking
- RESTful API architecture
- Dockerized development environment

---

## Tech Stack

### Frontend
- React
- Vite
- TypeScript

### Backend
- FastAPI
- Python
- PostgreSQL
- REST APIs

### Infrastructure
- Docker
- Redis

### AI Integration
- OpenAI API
- NLP-based Text-to-SQL generation

---

## Project Structure

```text
ai-sql-full-project/
├── frontend/   # React/Vite frontend application
└── backend/    # FastAPI backend services
```

---

## Run Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn api:app --reload --host 127.0.0.1 --port 8001
```

Backend API documentation:

```text
http://127.0.0.1:8001/docs
```

---

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

---

## Important

Do not upload sensitive or generated folders/files to GitHub:

```text
node_modules/
__pycache__/
.venv/
.env
```

These files are ignored using `.gitignore`.

---

## Future Improvements

- CI/CD pipeline integration
- Advanced schema analysis
- AI-powered query explanations
- Query optimization suggestions
- Data visualization dashboards
- Role-based authentication
- Cloud deployment with AWS
