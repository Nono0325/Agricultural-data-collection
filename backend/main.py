from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import datetime
import logging
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler

import models, schemas, database, mock_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
models.Base.metadata.create_all(bind=database.engine)

scheduler = BackgroundScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
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
    allow_origins=["*"],
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
def create_sensor_data(data: schemas.SensorDataCreate, db: Session = Depends(database.get_db)):
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
