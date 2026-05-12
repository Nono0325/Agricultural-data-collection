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
    },
    login: "System Login",
    username: "Username",
    password: "Password",
    loginBtn: "Sign In",
    logoutBtn: "Logout",
    loginError: "Invalid credentials",
    unauthorized: "Session expired. Please re-login.",
    settings: "Settings",
    dashboard: "Dashboard",
    oldPassword: "Old Password",
    newPassword: "New Password",
    confirmPassword: "Confirm New Password",
    updatePassword: "Update Password",
    apiKey: "Hardware API Key",
    updateApiKey: "Update API Key",
    saveSuccess: "Settings saved successfully!",
    saveError: "Failed to save settings.",
    passMismatch: "New passwords do not match."
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
    },
    login: "管理系統登入",
    username: "帳號",
    password: "密碼",
    loginBtn: "登入系統",
    logoutBtn: "登出系統",
    loginError: "帳號或密碼錯誤",
    unauthorized: "連線已過期，請重新登入",
    settings: "系統設定",
    dashboard: "數據儀表板",
    oldPassword: "舊密碼",
    newPassword: "新密碼",
    confirmPassword: "確認新密碼",
    updatePassword: "更新密碼",
    apiKey: "硬體 API 金鑰",
    updateApiKey: "更新金鑰",
    saveSuccess: "設定已成功儲存！",
    saveError: "儲存失敗，請重試。",
    passMismatch: "新密碼輸入不一致。"
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
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [data, setData] = useState([]);
  const [latestData, setLatestData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [view, setView] = useState('dashboard'); // 'dashboard' or 'settings'
  
  // Settings state
  const [settings, setSettings] = useState({ api_key: '' });
  const [passForm, setPassForm] = useState({ old_password: '', new_password: '', confirm: '' });

  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` }
  };
  
  // Default time range: last 7 days to now
  const [startDate, setStartDate] = useState(
    format(subDays(new Date(), 7), "yyyy-MM-dd'T'HH:mm")
  );
  const [endDate, setEndDate] = useState(
    format(new Date(), "yyyy-MM-dd'T'HH:mm")
  );

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const startIso = new Date(startDate).toISOString();
      const endIso = new Date(endDate).toISOString();
      const historyRes = await axios.get(`${API_BASE_URL}/sensor-data`, {
        params: { start: startIso, end: endIso, limit: 1000 },
        ...axiosConfig
      });
      
      const formattedHistory = historyRes.data.map(item => ({
        ...item,
        timeLabel: format(new Date(item.timestamp), 'MM/dd HH:mm')
      }));
      setData(formattedHistory);

      const latestRes = await axios.get(`${API_BASE_URL}/latest`, axiosConfig);
      setLatestData(latestRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await axios.post(`${API_BASE_URL}/login`, loginForm);
      const newToken = res.data.access_token;
      localStorage.setItem('token', newToken);
      setToken(newToken);
    } catch (error) {
      setLoginError(translations[lang].loginError);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setData([]);
    setLatestData(null);
    setView('dashboard');
  };

  const fetchSettings = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/settings`, axiosConfig);
      setSettings(res.data);
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passForm.new_password !== passForm.confirm) {
      alert(t('passMismatch'));
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/settings/password`, {
        old_password: passForm.old_password,
        new_password: passForm.new_password
      }, axiosConfig);
      alert(t('saveSuccess'));
      setPassForm({ old_password: '', new_password: '', confirm: '' });
    } catch (error) {
      alert(t('saveError'));
    }
  };

  const handleUpdateApiKey = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/settings/api-key`, {
        api_key: settings.api_key
      }, axiosConfig);
      alert(t('saveSuccess'));
    } catch (error) {
      alert(t('saveError'));
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
      fetchSettings();
      const interval = setInterval(fetchData, 60000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const handleFetchClick = () => {
    fetchData();
  };

  const handleExportCsv = async () => {
    try {
      const startIso = new Date(startDate).toISOString();
      const endIso = new Date(endDate).toISOString();
      const response = await axios.get(`${API_BASE_URL}/export`, {
        params: { start: startIso, end: endIso },
        responseType: 'blob',
        ...axiosConfig
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

  if (!token) {
    return (
      <div className="dashboard-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="metric-card" style={{ maxWidth: '400px', width: '100%', padding: '2.5rem' }}>
          <h2 style={{ marginBottom: '2rem', textAlign: 'center', color: 'var(--accent)' }}>{t('login')}</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('username')}</label>
              <input 
                type="text" 
                className="date-picker-group" 
                style={{ width: '100%', border: '1px solid var(--border)' }}
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('password')}</label>
              <input 
                type="password" 
                className="date-picker-group" 
                style={{ width: '100%', border: '1px solid var(--border)' }}
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                required
              />
            </div>
            {loginError && <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{loginError}</div>}
            <button className="btn-fetch" type="submit" style={{ marginTop: '1rem', height: '45px' }}>{t('loginBtn')}</button>
          </form>
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <button className="btn-lang" onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              🌐 {lang === 'en' ? '切換至中文' : 'Switch to EN'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <h1 onClick={() => setView('dashboard')} style={{ cursor: 'pointer' }}>{t('title')}</h1>
          <nav style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className={`btn-lang ${view === 'dashboard' ? 'active' : ''}`} 
              onClick={() => setView('dashboard')}
              style={{ background: view === 'dashboard' ? 'rgba(59, 130, 246, 0.2)' : 'transparent', borderColor: view === 'dashboard' ? '#3b82f6' : 'rgba(255,255,255,0.2)' }}
            >
              {t('dashboard')}
            </button>
            <button 
              className={`btn-lang ${view === 'settings' ? 'active' : ''}`} 
              onClick={() => setView('settings')}
              style={{ background: view === 'settings' ? 'rgba(59, 130, 246, 0.2)' : 'transparent', borderColor: view === 'settings' ? '#3b82f6' : 'rgba(255,255,255,0.2)' }}
            >
              {t('settings')}
            </button>
          </nav>
        </div>
        <div className="controls">
          <button className="btn-lang" onClick={handleLogout} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)' }}>
             {t('logoutBtn')}
          </button>
          <button className="btn-lang" onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 16px', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
            <Globe size={16} /> {lang === 'en' ? '中文' : 'EN'}
          </button>
        </div>
      </header>

      {view === 'settings' ? (
        <section className="charts-container" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', display: 'grid', gap: '2rem', marginTop: '2rem' }}>
          <div className="chart-card">
            <h2 style={{ marginBottom: '1.5rem', color: 'var(--accent)' }}>{t('updatePassword')}</h2>
            <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>{t('oldPassword')}</label>
                <input type="password" value={passForm.old_password} onChange={e => setPassForm({...passForm, old_password: e.target.value})} className="date-picker-group" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: 'white' }} required />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>{t('newPassword')}</label>
                <input type="password" value={passForm.new_password} onChange={e => setPassForm({...passForm, new_password: e.target.value})} className="date-picker-group" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: 'white' }} required />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>{t('confirmPassword')}</label>
                <input type="password" value={passForm.confirm} onChange={e => setPassForm({...passForm, confirm: e.target.value})} className="date-picker-group" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: 'white' }} required />
              </div>
              <button className="btn-fetch" type="submit" style={{ marginTop: '1rem' }}>{t('updatePassword')}</button>
            </form>
          </div>

          <div className="chart-card">
            <h2 style={{ marginBottom: '1.5rem', color: 'var(--accent)' }}>{t('apiKey')}</h2>
            <form onSubmit={handleUpdateApiKey} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>{t('apiKey')}</label>
                <input type="text" value={settings.api_key} onChange={e => setSettings({...settings, api_key: e.target.value})} className="date-picker-group" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: 'white' }} required />
              </div>
              <button className="btn-fetch" type="submit" style={{ marginTop: '1rem' }}>{t('updateApiKey')}</button>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                ⚠️ 修改此金鑰後，所有硬體端設備皆須更新金鑰才能繼續上傳數據。
              </p>
            </form>
          </div>
        </section>
      ) : (
        <>
          {loading && !latestData ? (
            <div className="loading">{t('loading')}</div>
          ) : (
            <>
              <section className="grid-cards">
                <div className="date-picker-group" style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className="date-picker-group">
                    <span>{t('from')}</span>
                    <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div className="date-picker-group">
                    <span>{t('to')}</span>
                    <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                  <button className="btn-fetch" onClick={handleFetchClick}>{t('applyRange')}</button>
                  <button className="btn-fetch" onClick={handleExportCsv} style={{ background: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Download size={16} /> {t('exportCsv')}
                  </button>
                </div>
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
        </>
      )}
    </div>
  );
}

export default App;
