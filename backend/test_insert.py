import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app.database import SessionLocal
from app.models.domain import GameResult
from datetime import datetime
import traceback

try:
    db = SessionLocal()
    res = GameResult(value='5', date_str='2026-09-28', time_str='16:00:00', created_at=datetime.now(), updated_at=datetime.now())
    db.add(res)
    db.commit()
    print('Success inserting GameResult')
except Exception as e:
    print('Error:')
    traceback.print_exc()
