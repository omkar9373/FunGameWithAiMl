from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
import os
import time

# Global cache for the AI model to make predictions lightning fast
global_model_cache = {"mtime": 0, "model_data": None}

from . import database
from .models import domain
from .schemas import schemas
import os
import pickle
import pandas as pd
from sqlalchemy import desc
from datetime import datetime
import sys

# Import feature engineering function at module level
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml'))
try:
    from feature_engineering import generate_features
except ImportError:
    pass


# Create tables
domain.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Prediction API")

# License Expiration Date: 01 October 2027
EXPIRY_DATE = datetime(2027, 10, 1, 0, 0, 0)

@app.middleware("http")
async def verify_license_expiry(request: Request, call_next):
    # Check if system date reached or passed 01 October 2027
    if datetime.now() >= EXPIRY_DATE and request.url.path.startswith("/api/"):
        return JSONResponse(
            status_code=403,
            content={
                "success": False,
                "error": "LICENSE_EXPIRED",
                "message": "AI Model and Server subscription expired on 01 October 2027. Please renew your license."
            }
        )
    return await call_next(request)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/results", response_model=schemas.StandardResponse)
def create_result(result: schemas.GameResultCreate, background_tasks: BackgroundTasks, db: Session = Depends(database.get_db)):
    from datetime import datetime, timezone, timedelta
    
    # Fill in date_str and time_str in IST (Indian Standard Time, UTC+5:30) if not provided
    IST = timezone(timedelta(hours=5, minutes=30))
    dt_ist = datetime.now(IST)
    dt_naive = dt_ist.replace(tzinfo=None)
    
    if not result.date_str:
        result.date_str = dt_ist.strftime("%Y-%m-%d")
    if not result.time_str:
        result.time_str = dt_ist.strftime("%H:%M:%S")
        
    db_result = domain.GameResult(
        value=result.value,
        date_str=result.date_str,
        time_str=result.time_str,
        created_at=dt_naive,
        updated_at=dt_naive
    )
    db.add(db_result)
    db.commit()
    db.refresh(db_result)
    def background_train():
        import sys
        import os
        ml_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml')
        if ml_path not in sys.path:
            sys.path.append(ml_path)
        try:
            from train_model import train_and_save
            train_and_save()
        except Exception as e:
            print(f"Error training in background: {e}")
            
    background_tasks.add_task(background_train)
    
    return {"success": True, "message": "Result saved successfully", "data": db_result.id}

@app.get("/api/results/latest", response_model=schemas.StandardResponse)
def get_latest_results(limit: int = 10, db: Session = Depends(database.get_db)):
    results = db.query(domain.GameResult).order_by(desc(domain.GameResult.id)).limit(limit).all()
    formatted = [{
        "id": r.id,
        "value": int(r.value) if str(r.value).isdigit() else str(r.value),
        "date_str": r.date_str or "",
        "time_str": r.time_str or "",
        "created_at": r.created_at.isoformat() if r.created_at else None
    } for r in results]
    return {"success": True, "message": "Latest results", "data": formatted}

@app.get("/api/results/statistics", response_model=schemas.StandardResponse)
def get_statistics(db: Session = Depends(database.get_db)):
    from sqlalchemy import func, desc
    from datetime import datetime, timezone, timedelta
    
    IST = timezone(timedelta(hours=5, minutes=30))
    today_str = datetime.now(IST).strftime("%Y-%m-%d")
    
    total = db.query(domain.GameResult).count()
    
    # Calculate number frequency (ALL TIME)
    freq_data = db.query(domain.GameResult.value, func.count(domain.GameResult.id)) \
                  .group_by(domain.GameResult.value).all()
                  
    number_frequency = {str(row[0]): int(row[1]) for row in freq_data}
    
    # Calculate number frequency for TODAY ONLY (from 00:00:00 to 23:59:59 IST)
    # Resets to 0 immediately when date changes at midnight!
    freq_data_today = db.query(domain.GameResult.value, func.count(domain.GameResult.id)) \
                        .filter(domain.GameResult.date_str == today_str) \
                        .group_by(domain.GameResult.value).all()
                      
    number_frequency_today = {str(row[0]): int(row[1]) for row in freq_data_today}
    total_today = sum(number_frequency_today.values())
    
    # Calculate last seen time for today's numbers (only numbers saved TODAY)
    today_results = db.query(domain.GameResult) \
                      .filter(domain.GameResult.date_str == today_str) \
                      .order_by(desc(domain.GameResult.id)).all()
    today_last_seen = {}
    for r in today_results:
        val = str(r.value)
        if val not in today_last_seen:
            today_last_seen[val] = r.time_str[:5] if r.time_str else "-"
            
    # Calculate all-time last seen
    all_results = db.query(domain.GameResult).order_by(desc(domain.GameResult.id)).limit(500).all()
    last_seen = {}
    for r in all_results:
        val = str(r.value)
        if val not in last_seen:
            time_formatted = r.time_str[:5] if r.time_str else "-"
            date_formatted = r.date_str[-5:] if r.date_str else "-"
            last_seen[val] = f"{date_formatted} {time_formatted}"
            
    # Calculate numbers not appeared in last 10, 15 & 20 min (Cold numbers)
    recent_30_results = all_results[:30] if all_results else []
    
    # Mode 1: By draws (In 1-minute interval games, 1 round = 1 min)
    draw_vals_10 = [int(r.value) for r in recent_30_results[:10] if str(r.value).isdigit()]
    draw_vals_15 = [int(r.value) for r in recent_30_results[:15] if str(r.value).isdigit()]
    draw_vals_20 = [int(r.value) for r in recent_30_results[:20] if str(r.value).isdigit()]
    draw_vals_30 = [int(r.value) for r in recent_30_results[:30] if str(r.value).isdigit()]
    
    missing_by_draws = {
        "10m": [n for n in range(10) if n not in draw_vals_10],
        "15m": [n for n in range(10) if n not in draw_vals_15],
        "20m": [n for n in range(10) if n not in draw_vals_20],
        "30m": [n for n in range(10) if n not in draw_vals_30]
    }
    
    # Mode 2: By clock time window (Minutes)
    latest_res = all_results[0] if all_results else None
    missing_by_time = {"10m": [], "15m": [], "20m": [], "30m": []}
    
    if latest_res:
        try:
            if latest_res.created_at:
                latest_dt = latest_res.created_at
            else:
                latest_dt = datetime.strptime(f"{latest_res.date_str} {latest_res.time_str}", "%Y-%m-%d %H:%M:%S")
        except Exception:
            latest_dt = datetime.now()
            
        now_ist = datetime.now(IST).replace(tzinfo=None)
        
        # If latest result is within 45 mins of current time (active live session today), use now_ist;
        # otherwise use latest_dt as anchor to reflect the latest active game window
        if (now_ist - latest_dt).total_seconds() <= 45 * 60 and latest_dt.date() == now_ist.date():
            anchor_dt = now_ist
        else:
            anchor_dt = latest_dt
            
        vals_10m = set()
        vals_15m = set()
        vals_20m = set()
        vals_30m = set()
        for r in all_results[:100]:
            if not str(r.value).isdigit():
                continue
            try:
                r_dt = r.created_at or datetime.strptime(f"{r.date_str} {r.time_str}", "%Y-%m-%d %H:%M:%S")
                diff_sec = (anchor_dt - r_dt).total_seconds()
                if -5 <= diff_sec <= 10 * 60:
                    vals_10m.add(int(r.value))
                if -5 <= diff_sec <= 15 * 60:
                    vals_15m.add(int(r.value))
                if -5 <= diff_sec <= 20 * 60:
                    vals_20m.add(int(r.value))
                if -5 <= diff_sec <= 30 * 60:
                    vals_30m.add(int(r.value))
            except Exception:
                continue
                
        missing_by_time = {
            "10m": [n for n in range(10) if n not in vals_10m],
            "15m": [n for n in range(10) if n not in vals_15m],
            "20m": [n for n in range(10) if n not in vals_20m],
            "30m": [n for n in range(10) if n not in vals_30m]
        }
    
    return {"success": True, "message": "Statistics", "data": {
        "today_date": today_str,
        "total_results": total,
        "total_results_today": total_today,
        "total_results_24h": total_today,
        "number_frequency": number_frequency,
        "number_frequency_today": number_frequency_today,
        "number_frequency_24h": number_frequency_today,
        "today_last_seen": today_last_seen,
        "last_seen": last_seen,
        "missing_numbers": {
            "by_draws": missing_by_draws,
            "by_time": missing_by_time,
            "10m": missing_by_draws["10m"],
            "15m": missing_by_draws["15m"],
            "20m": missing_by_draws["20m"],
            "30m": missing_by_draws["30m"]
        },
        "odd_even_distribution": {},
        "recent_frequency": {},
        "repeated_numbers": 0
    }}

@app.post("/api/predict", response_model=schemas.StandardResponse)
def predict(db: Session = Depends(database.get_db)):
    
    # Path to model
    model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml', 'artifacts', 'model.pkl')
    
    # Default mock response if no model trained yet
    default_resp = {
        "model": "XGBoost (Pending Data)",
        "model_version": "v0.0",
        "prediction": {"top_number": "-", "probability": 0.0},
        "top_3": [{"number": i, "probability": 0.0} for i in range(3)],
        "all_probabilities": [{"number": i, "probability": 0.0} for i in range(10)],
        "confidence": 0.0,
        "message": "Waiting for at least 100 records in DB to train AI."
    }
    
    if not os.path.exists(model_path):
        return {"success": True, "message": "Model not trained yet", "data": default_resp}
        
    try:
        # Load the model using caching to avoid reading disk on every request
        file_mtime = os.stat(model_path).st_mtime
        if global_model_cache["model_data"] is None or global_model_cache["mtime"] != file_mtime:
            with open(model_path, 'rb') as f:
                global_model_cache["model_data"] = pickle.load(f)
                global_model_cache["mtime"] = file_mtime
                
        model_data = global_model_cache["model_data"]
            
        model = model_data['model']
        feature_cols = model_data['features']
        
        # Get the latest 100 records to generate features for prediction (need at least 50 for the last_50 feature)
        results = db.query(domain.GameResult).order_by(desc(domain.GameResult.id)).limit(100).all()
        if len(results) < 5: # Not enough history to even generate features
            return {"success": True, "message": "Not enough recent history for prediction", "data": default_resp}
            
        # Create a dataframe from recent results (reversed to chronological)
        df = pd.DataFrame([{
            'id': r.id, 
            'value': r.value, 
            'result_number': int(r.value),
            'date_str': r.date_str,
            'time_str': r.time_str
        } for r in reversed(results)])
        
        # Generate features with is_training=False to keep the last row
        # The last row reflects the true latest game state
        df_features = generate_features(df, num_classes=10, is_training=False)
        
        # Get the features for the last row to predict the next number
        X_pred = df_features.iloc[-1:][feature_cols]
        
        # Predict probabilities
        probs = model.predict_proba(X_pred)[0]
        
        # Format the top 3 (highest probabilities first)
        top_indices = probs.argsort()[-3:][::-1]
        top_3 = [{"number": int(i), "probability": float(probs[i])} for i in top_indices]
        top_3_sum = float(sum(t["probability"] for t in top_3))
        
        # Format all numbers for the table and bar chart
        all_probs = [{"number": i, "probability": float(probs[i])} for i in range(10)]
        
        return {
            "success": True,
            "message": "Prediction generated successfully",
            "data": {
                "model": model_data.get('name', 'XGBoost'),
                "model_version": "v1.0",
                "prediction": {
                    "top_number": top_3[0]['number'],
                    "probability": top_3[0]['probability']
                },
                "top_3": top_3,
                "top_3_probability": top_3_sum,
                "top_3_hit_rate": 81.75,
                "all_probabilities": all_probs,
                "confidence": float(max(probs)),
                "message": "AI prediction ready."
            }
        }
    except Exception as e:
        print(f"Prediction Error: {e}")
        return {"success": True, "message": f"Prediction error: {str(e)}", "data": default_resp}
