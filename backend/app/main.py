from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
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
    from datetime import datetime
    
    # Fill in date_str and time_str if not provided
    dt = datetime.now()
    if not result.date_str:
        result.date_str = dt.strftime("%Y-%m-%d")
    if not result.time_str:
        result.time_str = dt.strftime("%H:%M:%S")
        
    db_result = domain.GameResult(
        value=result.value,
        date_str=result.date_str,
        time_str=result.time_str,
        created_at=dt,
        updated_at=dt
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
    return {"success": True, "message": "Latest results", "data": results}

@app.get("/api/results/statistics", response_model=schemas.StandardResponse)
def get_statistics(db: Session = Depends(database.get_db)):
    from sqlalchemy import func, desc
    
    total = db.query(domain.GameResult).count()
    
    # Calculate number frequency (ALL TIME)
    freq_data = db.query(domain.GameResult.value, func.count(domain.GameResult.id)) \
                  .group_by(domain.GameResult.value).all()
                  
    number_frequency = {str(row[0]): row[1] for row in freq_data}
    
    # Calculate last seen time for each number (Limit to last 500 to save memory/time)
    all_results = db.query(domain.GameResult).order_by(desc(domain.GameResult.id)).limit(500).all()
    last_seen = {}
    for r in all_results:
        val = str(r.value)
        if val not in last_seen:
            # We can format it as "DD/MM HH:MM" or just time
            time_formatted = r.time_str[:5] if r.time_str else "-"
            date_formatted = r.date_str[-5:] if r.date_str else "-"
            last_seen[val] = f"{date_formatted} {time_formatted}"
    
    return {"success": True, "message": "Statistics", "data": {
        "total_results": total,
        "number_frequency": number_frequency,
        "last_seen": last_seen,
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
        "top_3": [{"number": i, "probability": 0.0} for i in range(10)],
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
        
        # Add a dummy row to represent the "next" prediction we want to make
        dummy_row = pd.DataFrame({'id': [-1], 'value': ['0'], 'result_number': [0], 'date_str': [''], 'time_str': ['']})
        df = pd.concat([df, dummy_row], ignore_index=True)
        
        # Generate features with is_training=False to keep the last row
        df_features = generate_features(df, num_classes=10, is_training=False)
        
        # Get the features for the last row (the one we want to predict)
        X_pred = df_features.iloc[-1:][feature_cols]
        
        # Predict probabilities
        probs = model.predict_proba(X_pred)[0]
        
        # Format the top 3
        top_indices = probs.argsort()[-3:][::-1]
        top_3 = [{"number": int(i), "probability": float(probs[i])} for i in top_indices]
        
        # Format all numbers for the table
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
                "top_3": all_probs, # Send all 10 probabilities to UI
                "confidence": float(max(probs)),
                "message": "AI prediction ready."
            }
        }
    except Exception as e:
        print(f"Prediction Error: {e}")
        return {"success": True, "message": f"Prediction error: {str(e)}", "data": default_resp}
