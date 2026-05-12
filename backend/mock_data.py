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
