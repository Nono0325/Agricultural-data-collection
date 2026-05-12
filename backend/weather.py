import requests
import logging

logger = logging.getLogger(__name__)

# Default location (e.g., Taipei, Taiwan)
DEFAULT_LAT = 25.0330
DEFAULT_LON = 121.5654

def fetch_current_weather(lat=DEFAULT_LAT, lon=DEFAULT_LON):
    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true"
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()
        current = data.get("current_weather", {})
        return {
            "temperature": current.get("temperature"),
            "weathercode": current.get("weathercode")
        }
    except Exception as e:
        logger.error(f"Error fetching weather: {e}")
        return None
