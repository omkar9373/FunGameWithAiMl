import os
import pickle
import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app import database
from app.models import domain
from ml.probability_model import NumberProbabilityModel

def train_and_save():
    # 1. Fetch data from DB
    db = database.SessionLocal()
    try:
        results = db.query(domain.GameResult).order_by(domain.GameResult.id.asc()).all()
    finally:
        db.close()
    
    if len(results) < 5:
        print("Not enough data in DB to train (need at least 5 records).")
        return
        
    df = pd.DataFrame([{
        'id': r.id, 
        'value': r.value, 
        'result_number': int(r.value),
        'date_str': r.date_str,
        'time_str': r.time_str,
        'sequence_number': i
    } for i, r in enumerate(results)])
    
    # 2. Train the model
    model_wrapper = NumberProbabilityModel()
    print("Training model...")
    model_wrapper.train(df)
    
    # 3. Save to artifacts
    artifacts_dir = os.path.join(os.path.dirname(__file__), 'artifacts')
    os.makedirs(artifacts_dir, exist_ok=True)
    model_path = os.path.join(artifacts_dir, 'model.pkl')
    
    model_data = {
        'model': model_wrapper.model,
        'features': model_wrapper.feature_columns,
        'name': 'XGBoost NumberProbabilityModel'
    }
    
    with open(model_path, 'wb') as f:
        pickle.dump(model_data, f)
        
    print(f"Model successfully saved to {model_path}")

if __name__ == "__main__":
    train_and_save()
