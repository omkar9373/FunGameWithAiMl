from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List, Dict, Any

class GameResultBase(BaseModel):
    value: str
    date_str: Optional[str] = None
    time_str: Optional[str] = None

class GameResultCreate(GameResultBase):
    pass

class GameResultResponse(GameResultBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class StandardResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None

class PredictionItem(BaseModel):
    number: int
    probability: float

class PredictionData(BaseModel):
    top_number: int
    probability: float

class PredictionResponseData(BaseModel):
    model: str
    model_version: str
    prediction: PredictionData
    top_3: List[PredictionItem]
    confidence: float
    message: Optional[str] = None

class StatisticsResponse(BaseModel):
    total_results: int
    number_frequency: Dict[str, int]
    odd_even_distribution: Dict[str, float]
    recent_frequency: Dict[str, int]
    repeated_numbers: int
