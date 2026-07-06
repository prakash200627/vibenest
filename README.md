# VibeNest
Real-time chat platform with WebSocket messaging.

## Local Access
- **Frontend App:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:8000](http://localhost:8000)


## Tech Stack
- Backend: Python FastAPI 0.135
- Database: PostgreSQL 15 (Production), SQLite (Development)
- Frontend: React 19, Tailwind CSS

## Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+

## Getting Started

### Backend
```bash
cd backend
cp .env.example .env
# fill in .env values
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
cp .env.example .env
# fill in .env values
npm install
npm run dev
```

## Environment Variables

### Backend
| Variable | Description | Example |
|---|---|---|
| DATABASE_URL | DB connection string | postgresql://... |
| SECRET_KEY | JWT secret key | your-secret-key |
| ALLOWED_ORIGINS | CORS allowed origins | http://localhost:3000 |

### Frontend
| Variable | Description | Example |
|---|---|---|
| VITE_API_URL | API Base URL | http://localhost:8000/api/v1 |
| VITE_WS_URL | WebSocket URL | ws://localhost:8000/api/v1/chat/ws |

## API Endpoints
| Method | Route | Description | Auth |
|---|---|---|---|
| GET | /health | Health check | No |
| GET | /health/ws | WebSocket health | No |
| POST | /api/v1/auth/register | Register | No |
| POST | /api/v1/auth/login | Login | No |

## Running Tests
```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

## Folder Structure
```
vibenest/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── utils/
│   ├── tests/
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── main.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── constants/
│   └── package.json
└── README.md
```

## Production Notes

The WebSocket connection registry is stored in memory. This means the app cannot be horizontally scaled (multiple replicas) without refactoring to use Redis pub/sub for the connection registry. Keep replicas at 1 until this is addressed.

