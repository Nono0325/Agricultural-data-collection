from pydantic import BaseModel
from typing import Optional
import datetime

class SensorDataCreate(BaseModel):
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    soil_ph: Optional[float] = None
    soil_moisture: Optional[float] = None
    electrical_conductivity: Optional[float] = None
    nutrients: Optional[float] = None

class SensorDataResponse(SensorDataCreate):
    id: int
    timestamp: datetime.datetime
    weather_temperature: Optional[float] = None
    weather_humidity: Optional[float] = None
    weather_condition: Optional[int] = None

    class Config:
        orm_mode = True
        from_attributes = True
