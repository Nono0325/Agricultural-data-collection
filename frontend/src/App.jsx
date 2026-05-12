import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, subDays } from 'date-fns';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Thermometer, Droplets, FlaskConical, Sprout, Zap, Cloud, CloudRain, Download
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000/api';

function App() {
  const [data, setData] = useState([]);
  const [latestData, setLatestData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Default time range: last 7 days to now
  const [startDate, setStartDate] = useState(
    format(subDays(new Date(), 7), "yyyy-MM-dd'T'HH:mm")
  );
  const [endDate, setEndDate] = useState(
    format(new Date(), "yyyy-MM-dd'T'HH:mm")
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch historical data with range
      const startIso = new Date(startDate).toISOString();
      const endIso = new Date(endDate).toISOString();
      const historyRes = await axios.get(`${API_BASE_URL}/sensor-data`, {
        params: { start: startIso, end: endIso, limit: 1000 }
      });
      
      const formattedHistory = historyRes.data.map(item => ({
        ...item,
        timeLabel: format(new Date(item.timestamp), 'MM/dd HH:mm')
      }));
      setData(formattedHistory);

      // 2. Fetch latest data for current metrics
      const latestRes = await axios.get(`${API_BASE_URL}/latest`);
      setLatestData(latestRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh every minute
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleFetchClick = () => {
    fetchData();
  };

  const handleExportCsv = async () => {
    try {
      const startIso = new Date(startDate).toISOString();
      const endIso = new Date(endDate).toISOString();
      const response = await axios.get(`${API_BASE_URL}/export`, {
        params: { start: startIso, end: endIso },
        responseType: 'blob', // Important for downloading files
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `agricultural_data_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert("Failed to export CSV. Please try again.");
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'rgba(30, 41, 59, 0.9)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px' }}>
          <p style={{ margin: '0 0 5px 0', color: '#f8fafc', fontWeight: 'bold' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={`item-${index}`} style={{ margin: 0, color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dashboard-container">
      <header>
        <h1>Smart Agriculture Dashboard</h1>
        <div className="controls">
          <div className="date-picker-group">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>From</span>
            <input 
              type="datetime-local" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="date-picker-group">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>To</span>
            <input 
              type="datetime-local" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button className="btn-fetch" onClick={handleFetchClick}>Apply Range</button>
          <button className="btn-fetch" onClick={handleExportCsv} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3b82f6' }}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </header>

      {loading && !latestData ? (
        <div className="loading">Loading agricultural data</div>
      ) : (
        <>
          <section className="grid-cards">
            {latestData && (
              <>
                <div className="metric-card temp">
                  <div className="metric-title"><Thermometer size={18} color="var(--danger)" /> Temperature</div>
                  <div className="metric-value">{latestData.temperature}<span className="metric-unit">°C</span></div>
                </div>
                <div className="metric-card humid">
                  <div className="metric-title"><Droplets size={18} color="var(--info)" /> Humidity</div>
                  <div className="metric-value">{latestData.humidity}<span className="metric-unit">%</span></div>
                </div>
                <div className="metric-card ph">
                  <div className="metric-title"><FlaskConical size={18} color="var(--warning)" /> Soil pH</div>
                  <div className="metric-value">{latestData.soil_ph}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-title"><Droplets size={18} color="var(--accent)" /> Soil Moisture</div>
                  <div className="metric-value">{latestData.soil_moisture}<span className="metric-unit">%</span></div>
                </div>
                <div className="metric-card">
                  <div className="metric-title"><Zap size={18} color="#a855f7" /> Electrical Cond.</div>
                  <div className="metric-value">{latestData.electrical_conductivity}<span className="metric-unit">mS/cm</span></div>
                </div>
                <div className="metric-card">
                  <div className="metric-title"><Sprout size={18} color="#10b981" /> Nutrients</div>
                  <div className="metric-value">{latestData.nutrients}<span className="metric-unit">mg/kg</span></div>
                </div>
                <div className="metric-card" style={{ gridColumn: 'span 2' }}>
                  <div className="metric-title"><Cloud size={18} color="#cbd5e1" /> Local Weather (Current)</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
                    <div className="metric-value">{latestData.weather_temperature ?? '--'}<span className="metric-unit">°C</span></div>
                    <div style={{ color: 'var(--text-secondary)' }}>Code: {latestData.weather_condition ?? '--'}</div>
                  </div>
                </div>
              </>
            )}
          </section>

          <section className="charts-container">
            <div className="chart-card">
              <div className="chart-title">Environment (Temp & Humidity)</div>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="timeLabel" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <YAxis yAxisId="left" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ color: 'var(--text-secondary)' }} />
                    <Line yAxisId="left" type="monotone" dataKey="temperature" name="Temp (°C)" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                    <Line yAxisId="right" type="monotone" dataKey="humidity" name="Humidity (%)" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-title">Soil Metrics (pH & Moisture)</div>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="timeLabel" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <YAxis yAxisId="left" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ color: 'var(--text-secondary)' }} />
                    <Line yAxisId="left" type="monotone" dataKey="soil_ph" name="Soil pH" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                    <Line yAxisId="right" type="monotone" dataKey="soil_moisture" name="Moisture (%)" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-title">Nutrients & Conductivity</div>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="timeLabel" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <YAxis yAxisId="left" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ color: 'var(--text-secondary)' }} />
                    <Line yAxisId="left" type="monotone" dataKey="nutrients" name="Nutrients (mg/kg)" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                    <Line yAxisId="right" type="monotone" dataKey="electrical_conductivity" name="EC (mS/cm)" stroke="#a855f7" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default App;
