import random
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app import database
from app.models import domain

def seed_db():
    db = database.SessionLocal()
    
    # Check if we already have enough data
    count = db.query(domain.GameResult).count()
    if count >= 10:
        print(f"Database already has {count} records. No need to seed.")
        return
        
    print("Seeding database with 50 random historical records for AI training...")
    now = datetime.now()
    
    for i in range(50):
        past_time = now - timedelta(minutes=(50 - i) * 10)
        db_result = domain.GameResult(
            value=str(random.randint(0, 9)),
            date_str=past_time.strftime("%Y-%m-%d"),
            time_str=past_time.strftime("%H:%M:%S"),
            created_at=past_time,
            updated_at=past_time
        )
        db.add(db_result)
        
    db.commit()
    print("Seeding complete!")

if __name__ == "__main__":
    seed_db()
