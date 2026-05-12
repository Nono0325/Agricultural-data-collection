# Agricultural Data Collection Dashboard

This is a full-stack agricultural data collection dashboard that runs completely in Docker.
It features a high-performance Python FastAPI backend, an SQLite database for simple persistence, and a beautiful, modern React frontend.

## Features
- **Data Collection:** Collects temperature, humidity, soil pH, moisture, conductivity, and nutrients.
- **Weather Integration:** Automatically fetches current weather based on latitude/longitude via Open-Meteo API.
- **Mock Data Generation:** Generates realistic fake data every minute so the dashboard looks alive immediately.
- **Dynamic Frontend:** Custom dark-mode UI with Recharts for historical data visualization.
- **Time Range Query:** Built-in date picker to filter historical records.

## One-Click Installation

To start the entire system, simply run:

```bash
docker-compose up -d --build
```

- The **Frontend Dashboard** will be available at: `http://localhost:3000`
- The **Backend API** will be available at: `http://localhost:8000/docs` (Swagger UI)

## For Real Hardware

You can upload your real sensor data via a simple `POST` request to `http://localhost:8000/api/sensor-data`:

```json
POST /api/sensor-data
{
  "temperature": 25.4,
  "humidity": 60.1,
  "soil_ph": 6.8,
  "soil_moisture": 45.2,
  "electrical_conductivity": 1.2,
  "nutrients": 40.5
}
```
