import random
import logging
from sqlalchemy.orm import Session
import models
import weather

logger = logging.getLogger(__name__)

def generate_mock_data(db: Session):
    try:
        # Generate some realistic agricultural data
        temperature = round(random.uniform(20.0, 35.0), 2)
        humidity = round(random.uniform(40.0, 90.0), 2)
        soil_ph = round(random.uniform(5.5, 7.5), 2)
        soil_moisture = round(random.uniform(30.0, 80.0), 2)
        ec = round(random.uniform(0.5, 2.5), 2)
        nutrients = round(random.uniform(10.0, 100.0), 2)

        current_weather = weather.fetch_current_weather()
        
        w_temp = None
        w_code = None
        if current_weather:
            w_temp = current_weather.get("temperature")
            w_code = current_weather.get("weathercode")

        new_data = models.SensorData(
            temperature=temperature,
            humidity=humidity,
            soil_ph=soil_ph,
            soil_moisture=soil_moisture,
            electrical_conductivity=ec,
            nutrients=nutrients,
            weather_temperature=w_temp,
            weather_condition=w_code
        )

        db.add(new_data)
        db.commit()
        logger.info("Mock data generated and inserted.")
    except Exception as e:
        logger.error(f"Error generating mock data: {e}")

def initialize_historical_data(db: Session):
    try:
        count = db.query(models.SensorData).count()
        if count > 0:
            logger.info("Database already contains data, skipping historical generation.")
            return

        logger.info("Generating 7 days of historical mock data...")
        import datetime
        now = datetime.datetime.utcnow()
        
        historical_records = []
        for i in range(168): # 7 days * 24 hours
            past_time = now - datetime.timedelta(hours=168-i)
            # Add some sine wave trends to make it look realistic
            import math
            temp_trend = 25 + 5 * math.sin(i / 12 * math.pi)
            
            record = models.SensorData(
                timestamp=past_time,
                temperature=round(temp_trend + random.uniform(-2, 2), 2),
                humidity=round(60 + 20 * math.cos(i / 24 * math.pi) + random.uniform(-5, 5), 2),
                soil_ph=round(random.uniform(6.0, 7.0), 2),
                soil_moisture=round(50 + 10 * math.sin(i / 48 * math.pi) + random.uniform(-5, 5), 2),
                electrical_conductivity=round(random.uniform(1.0, 2.0), 2),
                nutrients=round(random.uniform(30.0, 60.0), 2),
                weather_temperature=round(temp_trend + random.uniform(-3, 3), 2),
                weather_condition=0 # clear
            )
            historical_records.append(record)
            
        db.bulk_save_objects(historical_records)
        db.commit()
        logger.info("Historical mock data successfully generated.")
    except Exception as e:
        logger.error(f"Error initializing historical data: {e}")
