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
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler

import models, schemas, database, mock_data
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi.security import APIKeyHeader, OAuth2PasswordBearer
from dotenv import load_dotenv

load_dotenv()

# Security Config
SECRET_KEY = os.getenv("SECRET_KEY", "agri_secure_random_key_998877")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))
API_KEY = os.getenv("X_API_KEY", "AGRI_SECRET_KEY_123")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login", auto_error=False)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

api_key_header = APIKeyHeader(name="X-API-Key")

def get_db_api_key(db: Session):
    setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == "api_key").first()
    return setting.value if setting else API_KEY

def get_api_key(api_key: str = Depends(api_key_header), db: Session = Depends(database.get_db)):
    if api_key != get_db_api_key(db):
        raise HTTPException(status_code=401, detail="Invalid API Key")
    return api_key

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

# Create database tables
models.Base.metadata.create_all(bind=database.engine)

scheduler = BackgroundScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize historical data
    db = database.SessionLocal()
    try:
        mock_data.initialize_historical_data(db)
        
        # Ensure Admin User exists
        admin_user = os.getenv("ADMIN_USERNAME", "admin")
        admin_pass = os.getenv("ADMIN_PASSWORD", "admin123")
        existing_user = db.query(models.User).filter(models.User.username == admin_user).first()
        if not existing_user:
            hashed_p = get_password_hash(admin_pass)
            db.add(models.User(username=admin_user, hashed_password=hashed_p))
            db.commit()
            logger.info(f"Initial admin user '{admin_user}' created.")
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

@app.post("/api/login", response_model=schemas.Token)
def login_for_access_token(login_data: schemas.UserLogin, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.username == login_data.username).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/verify-token")
def verify_token(current_user: models.User = Depends(get_current_user)):
    return {"status": "ok", "username": current_user.username}

@app.get("/api/sensor-data", response_model=List[schemas.SensorDataResponse])
def get_sensor_data(
    start: datetime.datetime = Query(None, description="Start datetime (ISO 8601)"),
    end: datetime.datetime = Query(None, description="End datetime (ISO 8601)"),
    limit: int = 100,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.SensorData)
    if start:
        query = query.filter(models.SensorData.timestamp >= start)
    if end:
        query = query.filter(models.SensorData.timestamp <= end)
        
    return query.order_by(models.SensorData.timestamp.asc()).limit(limit).all()

@app.get("/api/settings", response_model=schemas.SettingsResponse)
def get_settings(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    return {"api_key": get_db_api_key(db)}

@app.post("/api/settings/password")
def change_password(data: schemas.PasswordChange, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    if not verify_password(data.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect old password")
    current_user.hashed_password = get_password_hash(data.new_password)
    db.commit()
    return {"status": "success"}

@app.post("/api/settings/api-key")
def update_api_key(data: schemas.ApiKeyUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == "api_key").first()
    if setting:
        setting.value = data.api_key
    else:
        db.add(models.SystemSetting(key="api_key", value=data.api_key))
    db.commit()
    return {"status": "success"}

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
def get_latest_data(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    data = db.query(models.SensorData).order_by(models.SensorData.timestamp.desc()).first()
    if not data:
        raise HTTPException(status_code=404, detail="No data found")
    return data

@app.get("/api/export")
def export_csv(
    start: datetime.datetime = Query(None),
    end: datetime.datetime = Query(None),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
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
