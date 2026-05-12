from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import datetime
import logging
import os
import csv
from io import StringIO
from fastapi.responses import StreamingResponse
from fastapi.security import APIKeyHeader
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler

import models, schemas, database, mock_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

API_KEY = os.getenv("API_KEY", "AGRI_SECRET_KEY_123")
api_key_header = APIKeyHeader(name="X-API-Key")

def get_api_key(api_key: str = Depends(api_key_header)):
    if api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")
    return api_key

# Create database tables
models.Base.metadata.create_all(bind=database.engine)

scheduler = BackgroundScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize historical data
    db = database.SessionLocal()
    try:
        mock_data.initialize_historical_data(db)
    finally:
        db.close()

    # Startup: start mock data scheduler
    def job():
        db = database.SessionLocal()
        try:
            mock_data.generate_mock_data(db)
        finally:
            db.close()
            
    scheduler.add_job(job, 'interval', minutes=1)
    scheduler.start()
    logger.info("Mock data scheduler started.")
    
    yield
    
    # Shutdown
    scheduler.shutdown()
    logger.info("Scheduler shutdown.")

app = FastAPI(title="Agricultural Data API", lifespan=lifespan)

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/sensor-data", response_model=List[schemas.SensorDataResponse])
def get_sensor_data(
    start: datetime.datetime = Query(None, description="Start datetime (ISO 8601)"),
    end: datetime.datetime = Query(None, description="End datetime (ISO 8601)"),
    limit: int = 100,
    db: Session = Depends(database.get_db)
):
    query = db.query(models.SensorData)
    if start:
        query = query.filter(models.SensorData.timestamp >= start)
    if end:
        query = query.filter(models.SensorData.timestamp <= end)
        
    return query.order_by(models.SensorData.timestamp.asc()).limit(limit).all()

@app.post("/api/sensor-data", response_model=schemas.SensorDataResponse)
def create_sensor_data(
    data: schemas.SensorDataCreate, 
    db: Session = Depends(database.get_db),
    api_key: str = Depends(get_api_key)
):
    db_data = models.SensorData(**data.dict())
    db.add(db_data)
    db.commit()
    db.refresh(db_data)
    return db_data

@app.get("/api/latest", response_model=schemas.SensorDataResponse)
def get_latest_data(db: Session = Depends(database.get_db)):
    data = db.query(models.SensorData).order_by(models.SensorData.timestamp.desc()).first()
    if not data:
        raise HTTPException(status_code=404, detail="No data found")
    return data

@app.get("/api/export")
def export_csv(
    start: datetime.datetime = Query(None),
    end: datetime.datetime = Query(None),
    db: Session = Depends(database.get_db)
):
    query = db.query(models.SensorData)
    if start:
        query = query.filter(models.SensorData.timestamp >= start)
    if end:
        query = query.filter(models.SensorData.timestamp <= end)
    
    data = query.order_by(models.SensorData.timestamp.desc()).all()
    
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Timestamp", "Temperature(C)", "Humidity(%)", "Soil pH", "Soil Moisture(%)", "EC(mS/cm)", "Nutrients(mg/kg)", "Weather Temp(C)", "Weather Code"])
    
    for record in data:
        writer.writerow([
            record.timestamp.isoformat(), record.temperature, record.humidity, 
            record.soil_ph, record.soil_moisture, record.electrical_conductivity, 
            record.nutrients, record.weather_temperature, record.weather_condition
        ])
        
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]), 
        media_type="text/csv", 
        headers={"Content-Disposition": f"attachment; filename=agricultural_data_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
    )
