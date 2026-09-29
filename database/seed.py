import sys
import os
import random
from datetime import datetime, timedelta

# Add backend to path so we can import app modules
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from app.database import SessionLocal
from app.models.domain import GameResult

def seed_data(num_records=5000):
    db = SessionLocal()
    
    # Check if we already have data
    if db.query(GameResult).count() > 0:
        print("Database already has records. Skipping seed.")
        return
        
    print(f"Seeding {num_records} synthetic game results for testing...")
    
    start_time = datetime.now() - timedelta(minutes=num_records)
    
    results = []
    # Let's create some basic patterns but mostly random
    for i in range(num_records):
        sequence_number = i + 1
        result_time = start_time + timedelta(minutes=i)
        
        # Inject some slight bias/pattern for the model to pick up
        if i > 2 and results[-1].result_number == 7:
            # If previous was 7, slightly higher chance of 2
            if random.random() < 0.2:
                result_number = 2
            else:
                result_number = random.randint(0, 9)
        else:
            result_number = random.randint(0, 9)
            
        record = GameResult(
            game_id="TEST001",
            sequence_number=sequence_number,
            result_number=result_number,
            result_time=result_time
        )
        results.append(record)
        
        if (i+1) % 1000 == 0:
            db.bulk_save_objects(results)
            db.commit()
            results = []
            print(f"Inserted {i+1} records...")
            
    if results:
        db.bulk_save_objects(results)
        db.commit()
        
    print("Seed complete.")
    db.close()

if __name__ == "__main__":
    seed_data()
