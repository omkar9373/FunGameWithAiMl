from app.main import predict
from app.database import SessionLocal

db = SessionLocal()
result = predict(db)
print(result)
