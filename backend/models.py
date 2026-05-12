from sqlalchemy import Column, Integer, Float, DateTime, String
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(String)

class SensorData(Base):
    __tablename__ = "sensor_data"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    
    # Field Data
    temperature = Column(Float, nullable=True) # 溫濕度 -> 溫度
    humidity = Column(Float, nullable=True)    # 溫濕度 -> 濕度
    soil_ph = Column(Float, nullable=True)     # 土壤酸鹼值
    soil_moisture = Column(Float, nullable=True) # 土壤濕度
    electrical_conductivity = Column(Float, nullable=True) # 導電值
    nutrients = Column(Float, nullable=True)   # 養分感測
    
    # Weather Data
    weather_temperature = Column(Float, nullable=True) # 最近天氣溫度
    weather_humidity = Column(Float, nullable=True)    # 最近天氣濕度
    weather_condition = Column(Integer, nullable=True) # WMO weather code
