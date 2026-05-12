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

## Native Installation (Without Docker)

If you don't want to use Docker, you can run the backend and frontend natively on your machine.
You will need **Python (3.9+)** and **Node.js (18+)** installed.

### 1. Start the Backend API (Python)
Open a terminal in the `backend` folder and run:
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```
*The API will start at http://localhost:8000*

### 2. Start the Frontend Dashboard (React)
Open **another new terminal** in the `frontend` folder and run:
```bash
cd frontend
npm install
npm run dev
```
*The Dashboard will start at http://localhost:5173 (or similar, check terminal output)*

## For Real Hardware

You can upload your real sensor data via a simple `POST` request to `http://localhost:8000/api/sensor-data`. 
For security, you must include the API key in the headers.

```json
POST /api/sensor-data
Headers: 
  "X-API-Key": "AGRI_SECRET_KEY_123"
  "Content-Type": "application/json"

{
  "temperature": 25.4,
  "humidity": 60.1,
  "soil_ph": 6.8,
  "soil_moisture": 45.2,
  "electrical_conductivity": 1.2,
  "nutrients": 40.5
}
```
