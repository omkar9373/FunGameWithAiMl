from sqlalchemy import Column, Integer, String, BigInteger, DateTime, DECIMAL, Enum, JSON, Text
from sqlalchemy.sql import func
from ..database import Base
import enum

class PredictionStatus(str, enum.Enum):
    PENDING = "PENDING"
    CORRECT = "CORRECT"
    INCORRECT = "INCORRECT"

class GameResult(Base):
    __tablename__ = "game_results"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    value = Column(String(50), nullable=False)
    date_str = Column(String(50), nullable=True)
    time_str = Column(String(50), nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)

class PredictionResult(Base):
    __tablename__ = "prediction_results"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    prediction_for_sequence = Column(BigInteger, nullable=False, index=True)
    predicted_number = Column(Integer, nullable=False)
    probability = Column(DECIMAL(8,5), nullable=False)
    model_name = Column(String(100), nullable=False)
    confidence = Column(DECIMAL(8,5), nullable=False)
    actual_number = Column(Integer, nullable=True)
    prediction_status = Column(Enum(PredictionStatus), default=PredictionStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ModelMetric(Base):
    __tablename__ = "model_metrics"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    model_name = Column(String(100), nullable=False)
    training_samples = Column(Integer, nullable=False)
    testing_samples = Column(Integer, nullable=False)
    accuracy = Column(DECIMAL(8,5), nullable=False)
    precision_score = Column(DECIMAL(8,5), nullable=False)
    recall_score = Column(DECIMAL(8,5), nullable=False)
    f1_score = Column(DECIMAL(8,5), nullable=False)
    log_loss = Column(DECIMAL(8,5), nullable=True)
    trained_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ModelTrainingLog(Base):
    __tablename__ = "model_training_logs"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    training_start_time = Column(DateTime, nullable=False)
    training_end_time = Column(DateTime, nullable=False)
    number_of_records = Column(Integer, nullable=False)
    feature_count = Column(Integer, nullable=False)
    model_name = Column(String(100), nullable=False)
    model_version = Column(String(50), nullable=False)
    metrics = Column(JSON, nullable=False)
    errors = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
