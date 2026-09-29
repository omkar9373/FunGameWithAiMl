# Number Prediction & Probability Analysis System

A full-stack, production-ready system for predicting numbers and generating probabilities using Machine Learning, FastAPI, React, and MySQL.

## Project Structure
```
Number-Probability/
├── backend/                  # FastAPI + Python ML Backend
│   ├── app/                  # FastAPI Application
│   │   ├── models/           # SQLAlchemy Models
│   │   ├── schemas/          # Pydantic Schemas
│   │   ├── main.py           # Application Entrypoint
│   │   ├── config.py         # App Configuration
│   │   └── database.py       # Database Connection
│   └── ml/                   # Machine Learning Pipeline
│       ├── artifacts/        # Trained Models
│       ├── feature_engineering.py
│       └── train.py          # Model Training Script
├── frontend/                 # React + Vite + Tailwind Frontend
│   ├── src/
│   │   ├── App.jsx           # Dashboard UI
│   │   └── index.css         # Styling
│   ├── package.json
│   └── tailwind.config.js
├── database/                 # Database Schema & Seeding
│   ├── schema.sql
│   └── seed.py
└── README.md
```

## Setup & Installation

### 1. Database Setup
1. Ensure MySQL 8+ is running.
2. Create the database and tables:
   ```bash
   mysql -u root -p < database/schema.sql
   ```

### 2. Backend Setup
1. Navigate to the backend directory and activate your virtual environment:
   ```bash
   cd backend
   python -m venv venv
   # Windows:
   .\venv\Scripts\activate
   # Linux/Mac:
   # source venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install fastapi uvicorn sqlalchemy pymysql pandas numpy scikit-learn xgboost pydantic python-dotenv python-multipart
   ```
3. Set environment variables (e.g., create a `.env` file in `backend/app/`):
   ```env
   DATABASE_HOST=localhost
   DATABASE_PORT=3306
   DATABASE_NAME=game_prediction_db
   DATABASE_USER=root
   DATABASE_PASSWORD=your_password
   ```

### 3. Generate Seed Data
Generate 5,000 sample records for testing:
```bash
python database/seed.py
```

### 4. Train the Machine Learning Model
Train baseline models and save the best one:
```bash
cd backend
python ml/train.py
```

### 5. Start the FastAPI Server
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation available at: `http://localhost:8000/docs`

### 6. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   npm install axios recharts lucide-react
   npm install -D tailwindcss postcss autoprefixer
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

## Important ML Notes
- **No Data Leakage**: The system carefully uses `shift()` and rolling window techniques to ensure only information *prior* to a sequence is used to predict the next number.
- **Probability != Certainty**: The dashboard explicitly displays that these are probabilities, not guaranteed outcomes. If data is mostly random, confidence metrics will reflect this properly without artificially inflating numbers.

## Known Limitations
- The provided model is currently trained on synthetically seeded data with minimal patterns. Real accuracy heavily depends on the actual sequence data you feed into the database.
- Production deployment will require setting up Gunicorn/Uvicorn workers, PM2/Nginx for the frontend, and a cron job or Celery worker for automatic retraining.
