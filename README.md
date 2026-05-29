# AI SQL Assistant - Full Stack AI Data Platform

## Overview

AI SQL Assistant is a full-stack AI-powered platform that enables users to interact with their datasets using natural language.

Users can upload CSV datasets, explore schemas, generate SQL queries using AI, execute queries safely on uploaded data, and analyze results through an interactive dashboard.

The platform supports multilingual querying in English, Hebrew, and Arabic, while validating generated SQL queries against the uploaded dataset structure to reduce invalid or hallucinated queries.

This project combines modern frontend technologies, scalable backend services, AI integration, authentication systems, and containerized infrastructure into a unified data exploration platform.

---

## Live Demo

Frontend:
https://ai-sql-assistant-orpin.vercel.app/

---

## Main Features

* AI-powered Text-to-SQL generation
* Dynamic CSV upload & schema extraction
* Dataset-aware SQL validation
* Prevention of hallucinated SQL generation
* English / Hebrew / Arabic query support
* JWT-based authentication system
* Login / Signup + Guest mode
* Query execution & history tracking
* Interactive dashboard interface
* Dataset selector & schema viewer
* RESTful API architecture
* Dockerized full-stack environment
* Redis integration
* Logging & monitoring support

---

## Tech Stack

### Frontend

* React
* TypeScript
* Vite
* TanStack Router

### Backend

* FastAPI
* Python
* PostgreSQL
* SQLite
* REST APIs
* JWT Authentication

### Infrastructure

* Docker
* Docker Compose
* Redis

### AI Integration

* OpenAI API
* NLP-based Text-to-SQL generation

---

## Project Structure

```text
ai-sql-full-project/
├── frontend/   # React frontend application
├── backend/    # FastAPI backend services
└── docker-compose.yml
```

---

## Architecture Overview

```text
Frontend (React + TypeScript)
        ↓
REST API Requests
        ↓
Backend (FastAPI + Python)
        ↓
OpenAI API + SQL Validation Layer
        ↓
PostgreSQL / SQLite Databases
        ↓
Redis Cache & Session Storage
```

---

## Running the Backend

```bash
cd backend

pip install -r requirements.txt

python -m uvicorn api:app --reload --host 127.0.0.1 --port 8001
```

Backend API Documentation:

```text
http://127.0.0.1:8001/docs
```

---

## Running the Frontend

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

## Environment Variables

Example `.env` variables:

```env
OPENAI_API_KEY=your_key
DATABASE_URL=your_database_url
SECRET_KEY=your_secret
REDIS_URL=redis://localhost:6379
```

---

## Git Ignore

Do not upload sensitive or generated files to GitHub:

```text
node_modules/
__pycache__/
.venv/
.env
dist/
```

These files should remain inside `.gitignore`.

---

## Future Improvements

* Persistent dataset storage
* AI-generated visualizations
* Advanced analytics dashboard
* Query optimization suggestions
* CI/CD pipeline integration
* Production-grade monitoring
* Role-based authentication
* Cloud deployment with AWS
* Elasticsearch integration
* Kubernetes orchestration

---

## Author

Saja Abdalla

B.Sc. Information Systems (AI Track)
University of Haifa
