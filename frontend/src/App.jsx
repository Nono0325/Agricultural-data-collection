import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, subDays } from 'date-fns';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Thermometer, Droplets, FlaskConical, Sprout, Zap, Cloud, CloudRain, Download, Globe, Activity
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000/api';

const translations = {
  en: {
    title: "Smart Agriculture Dashboard",
    from: "From",
    to: "To",
    applyRange: "Apply Range",
    exportCsv: "Export CSV",
    loading: "Loading agricultural data...",
    temp: "Temperature",
    humidity: "Humidity",
    ph: "Soil pH",
    moisture: "Soil Moisture",
    ec: "Electrical Cond.",
    nutrients: "Nutrients",
    weather: "Local Weather (Current)",
    code: "Code",
    envChart: "Environment (Temp & Humidity)",
    soilChart: "Soil Metrics (pH & Moisture)",
    nutChart: "Nutrients & Conductivity",
    weatherChart: "Local Weather Trend",
    statusCard: "Agricultural Insights",
    statusGood: "✅ Optimal Conditions: Suitable for crop growth.",
    statusDry: "⚠️ Warning: Soil moisture is low. Consider watering.",
    statusHot: "🔥 High Temp Alert: Consider shading or cooling.",
    weatherCodes: {
      clear: 'Clear sky', cloudy: 'Cloudy', fog: 'Fog', drizzle: 'Drizzle',
      rain: 'Rain', snow: 'Snow', showers: 'Rain Showers', storm: 'Thunderstorm', unknown: 'Unknown'
    }
  },
  zh: {
    title: "智慧農業數據儀表板",
    from: "起始時間",
    to: "結束時間",
    applyRange: "套用時間範圍",
    exportCsv: "匯出 CSV",
    loading: "正在載入農田數據...",
    temp: "環境溫度",
    humidity: "環境濕度",
    ph: "土壤酸鹼值 (pH)",
    moisture: "土壤濕度",
    ec: "導電度 (EC)",
    nutrients: "土壤養分",
    weather: "當地天氣 (即時)",
    code: "代碼",
    envChart: "環境溫濕度趨勢",
    soilChart: "土壤酸鹼值與濕度趨勢",
    nutChart: "土壤養分與導電度趨勢",
    weatherChart: "當地氣溫趨勢",
    statusCard: "農田健康診斷",
    statusGood: "✅ 環境極佳：各項數值皆適合農作物生長。",
    statusDry: "⚠️ 警告：土壤過乾，建議立即啟動灌溉設備。",
    statusHot: "🔥 高溫警戒：請注意農田降溫或遮陽措施。",
    weatherCodes: {
      clear: '晴空', cloudy: '多雲', fog: '起霧', drizzle: '毛毛雨',
      rain: '下雨', snow: '下雪', showers: '陣雨', storm: '雷陣雨', unknown: '未知'
    }
  }
};

const getWeatherDescription = (code, lang) => {
  const tc = translations[lang].weatherCodes;
  if (code === null || code === undefined) return '--';
  if (code === 0) return tc.clear;
  if (code >= 1 && code <= 3) return tc.cloudy;
  if (code === 45 || code === 48) return tc.fog;
  if (code >= 51 && code <= 55) return tc.drizzle;
  if (code >= 61 && code <= 65) return tc.rain;
  if (code >= 71 && code <= 77) return tc.snow;
  if (code >= 80 && code <= 82) return tc.showers;
  if (code >= 95) return tc.storm;
  return `${translations[lang].code} ${code}`;
};

function App() {
  const [lang, setLang] = useState('zh');
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

  const t = (key) => translations[lang][key];

  let healthStatus = 'statusGood';
  let healthColor = '#10b981';
  if (latestData) {
    if (latestData.soil_moisture < 40) {
      healthStatus = 'statusDry';
      healthColor = '#f59e0b';
    } else if (latestData.temperature > 35) {
      healthStatus = 'statusHot';
      healthColor = '#ef4444';
    }
  }

  return (
    <div className="dashboard-container">
      <header>
        <h1>{t('title')}</h1>
        <div className="controls">
          <button className="btn-lang" onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 16px', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
            <Globe size={16} /> {lang === 'en' ? '中文' : 'EN'}
          </button>
          <div className="date-picker-group">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('from')}</span>
            <input 
              type="datetime-local" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="date-picker-group">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('to')}</span>
            <input 
              type="datetime-local" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button className="btn-fetch" onClick={handleFetchClick}>{t('applyRange')}</button>
          <button className="btn-fetch" onClick={handleExportCsv} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3b82f6' }}>
            <Download size={16} /> {t('exportCsv')}
          </button>
        </div>
      </header>

      {loading && !latestData ? (
        <div className="loading">{t('loading')}</div>
      ) : (
        <>
          <section className="grid-cards">
            {latestData && (
              <>
                <div className="metric-card" style={{ gridColumn: '1 / -1', borderLeft: `4px solid ${healthColor}` }}>
                  <div className="metric-title"><Activity size={18} color={healthColor} /> {t('statusCard')}</div>
                  <div style={{ fontSize: '1.2rem', color: '#f8fafc', marginTop: '0.5rem' }}>
                    {t(healthStatus)}
                  </div>
                </div>
                <div className={`metric-card temp ${latestData.temperature > 35 ? 'alert' : ''}`}>
                  <div className="metric-title"><Thermometer size={18} color="var(--danger)" /> {t('temp')}</div>
                  <div className="metric-value">{latestData.temperature}<span className="metric-unit">°C</span></div>
                </div>
                <div className="metric-card humid">
                  <div className="metric-title"><Droplets size={18} color="var(--info)" /> {t('humidity')}</div>
                  <div className="metric-value">{latestData.humidity}<span className="metric-unit">%</span></div>
                </div>
                <div className={`metric-card ph ${latestData.soil_ph < 5.5 || latestData.soil_ph > 7.5 ? 'alert' : ''}`}>
                  <div className="metric-title"><FlaskConical size={18} color="var(--warning)" /> {t('ph')}</div>
                  <div className="metric-value">{latestData.soil_ph}</div>
                </div>
                <div className={`metric-card ${latestData.soil_moisture < 40 ? 'alert' : ''}`}>
                  <div className="metric-title"><Droplets size={18} color="var(--accent)" /> {t('moisture')}</div>
                  <div className="metric-value">{latestData.soil_moisture}<span className="metric-unit">%</span></div>
                </div>
                <div className="metric-card">
                  <div className="metric-title"><Zap size={18} color="#a855f7" /> {t('ec')}</div>
                  <div className="metric-value">{latestData.electrical_conductivity}<span className="metric-unit">mS/cm</span></div>
                </div>
                <div className="metric-card">
                  <div className="metric-title"><Sprout size={18} color="#10b981" /> {t('nutrients')}</div>
                  <div className="metric-value">{latestData.nutrients}<span className="metric-unit">mg/kg</span></div>
                </div>
                <div className="metric-card" style={{ gridColumn: 'span 2' }}>
                  <div className="metric-title"><Cloud size={18} color="#cbd5e1" /> {t('weather')}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
                    <div className="metric-value">{latestData.weather_temperature ?? '--'}<span className="metric-unit">°C</span></div>
                    <div style={{ color: 'var(--text-secondary)' }}>{getWeatherDescription(latestData.weather_condition, lang)}</div>
                  </div>
                </div>
              </>
            )}
          </section>

          <section className="charts-container">
            <div className="chart-card">
              <div className="chart-title">{t('envChart')}</div>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="timeLabel" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <YAxis yAxisId="left" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ color: 'var(--text-secondary)' }} />
                    <Line yAxisId="left" type="monotone" dataKey="temperature" name={t('temp')} stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                    <Line yAxisId="right" type="monotone" dataKey="humidity" name={t('humidity')} stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-title">{t('soilChart')}</div>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="timeLabel" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <YAxis yAxisId="left" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ color: 'var(--text-secondary)' }} />
                    <Line yAxisId="left" type="monotone" dataKey="soil_ph" name={t('ph')} stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                    <Line yAxisId="right" type="monotone" dataKey="soil_moisture" name={t('moisture')} stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-title">{t('nutChart')}</div>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="timeLabel" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <YAxis yAxisId="left" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ color: 'var(--text-secondary)' }} />
                    <Line yAxisId="left" type="monotone" dataKey="nutrients" name={t('nutrients')} stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                    <Line yAxisId="right" type="monotone" dataKey="electrical_conductivity" name={t('ec')} stroke="#a855f7" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-title">{t('weatherChart')}</div>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="timeLabel" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ color: 'var(--text-secondary)' }} />
                    <Line type="monotone" dataKey="weather_temperature" name={t('temp')} stroke="#cbd5e1" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
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
