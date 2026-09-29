import sys
import os
import pandas as pd
import numpy as np
from datetime import datetime
import pickle
import json
from xgboost import XGBClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.dummy import DummyClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, log_loss
import warnings
warnings.filterwarnings('ignore')

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.database import engine, SessionLocal
from app.models.domain import ModelMetric, ModelTrainingLog
from feature_engineering import generate_features

def load_data():
    query = "SELECT * FROM game_results ORDER BY id ASC"
    df = pd.read_sql(query, engine)
    # Convert value to integer since it is a string in DB
    df['result_number'] = df['value'].astype(int)
    return df

def time_series_split(X, y, test_size=0.2):
    n = len(X)
    train_size = int(n * (1 - test_size))
    return X.iloc[:train_size], X.iloc[train_size:], y.iloc[:train_size], y.iloc[train_size:]

def train_and_evaluate():
    print("Loading data...")
    df = load_data()
    
    if len(df) < 100:
        print("Not enough data to train.")
        return
        
    print("Generating features...")
    df_features = generate_features(df, num_classes=10)
    
    # Exclude non-feature columns
    exclude_cols = ['id', 'value', 'date_str', 'time_str', 'created_at', 'updated_at', 'result_number', 'target']
    feature_cols = [c for c in df_features.columns if c not in exclude_cols]
    
    X = df_features[feature_cols]
    y = df_features['target']
    
    X_train, X_test, y_train, y_test = time_series_split(X, y, test_size=0.2)
    
    models = {
        'Dummy': DummyClassifier(strategy='uniform'),
        'LogisticRegression': LogisticRegression(max_iter=1000, random_state=42),
        'XGBoost': XGBClassifier(n_estimators=100, learning_rate=0.1, random_state=42, eval_metric='mlogloss')
    }
    
    best_model = None
    best_log_loss = float('inf')
    best_model_name = ""
    metrics = {}
    
    print(f"Training on {len(X_train)} samples, testing on {len(X_test)} samples.")
    start_time = datetime.now()
    
    for name, model in models.items():
        print(f"Training {name}...")
        model.fit(X_train, y_train)
        
        # Eval
        preds = model.predict(X_test)
        probs = model.predict_proba(X_test)
        
        acc = accuracy_score(y_test, preds)
        ll = log_loss(y_test, probs)
        
        metrics[name] = {
            'accuracy': acc,
            'log_loss': ll
        }
        
        print(f"{name} - Accuracy: {acc:.4f}, Log Loss: {ll:.4f}")
        
        if ll < best_log_loss:
            best_log_loss = ll
            best_model = model
            best_model_name = name
            
    print(f"Best model: {best_model_name}")
    
    # Save model
    os.makedirs(os.path.join(os.path.dirname(__file__), 'artifacts'), exist_ok=True)
    model_path = os.path.join(os.path.dirname(__file__), 'artifacts', 'model.pkl')
    with open(model_path, 'wb') as f:
        pickle.dump({'model': best_model, 'features': feature_cols, 'name': best_model_name}, f)
        
    # Save log to DB
    end_time = datetime.now()
    db = SessionLocal()
    
    log = ModelTrainingLog(
        training_start_time=start_time,
        training_end_time=end_time,
        number_of_records=len(df),
        feature_count=len(feature_cols),
        model_name=best_model_name,
        model_version="v1.0",
        metrics=metrics,
    )
    db.add(log)
    db.commit()
    db.close()
    
    print("Training complete and model saved.")

if __name__ == "__main__":
    train_and_evaluate()
