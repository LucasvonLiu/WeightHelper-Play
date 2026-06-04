import React, { useState, useEffect } from 'react';
import CameraCapture from './components/CameraCapture';
import AIAnalyzer from './components/AIAnalyzer';
import NutritionCard from './components/NutritionCard';
import HistoryList from './components/HistoryList';
import BottomNav from './components/BottomNav';
import Settings from './components/Settings';
import Auth from './components/Auth';
import './index.css';

function App() {
  const [currentTab, setCurrentTab] = useState('camera'); // camera, history, settings
  const [appState, setAppState] = useState('capture'); // capture, analyzing, result
  const [currentImage, setCurrentImage] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [username, setUsername] = useState(localStorage.getItem('username'));
  const [tokenInfo, setTokenInfo] = useState({ model: 'gemini-3.1-flash-lite' });

  const fetchTokenStatus = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/user/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTokenInfo({ model: data.model });
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchTokenStatus();
  }, [token, currentTab, appState]);

  const fetchUserPreferences = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/user/preferences', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.goal) setGoal(data.goal);
        if (data.timezone) setTimezone(data.timezone);
        localStorage.setItem('weighthelper_goal', data.goal);
        localStorage.setItem('weighthelper_timezone', data.timezone);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchUserPreferences();
  }, [token]);

  const handleAuthSuccess = (newToken, newUsername) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('username', newUsername);
    setToken(newToken);
    setUsername(newUsername);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setUsername(null);
    setCurrentTab('camera');
  };

  const [goal, setGoal] = useState(() => {
    return Number(localStorage.getItem('weighthelper_goal')) || 2000;
  });

  const [timezone, setTimezone] = useState(() => {
    return localStorage.getItem('weighthelper_timezone') || 'Asia/Shanghai';
  });

  const handleSavePreferences = async (newGoal, newTz) => {
    setGoal(newGoal);
    setTimezone(newTz);
    localStorage.setItem('weighthelper_goal', newGoal);
    localStorage.setItem('weighthelper_timezone', newTz);

    try {
      await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ goal: newGoal, timezone: newTz })
      });
    } catch (e) {
      console.error('Failed to sync preferences', e);
    }
  };

  const [currentFoodData, setCurrentFoodData] = useState({});

  // 当进入分析状态时，触发真实的后端 API 请求
  useEffect(() => {
    if (appState !== 'analyzing' || !currentImage) return;

    let isMounted = true;

    async function startAIAnalysis() {
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            image: currentImage, 
            foodName: currentFoodData.foodName,
            quantity: currentFoodData.quantity,
            unit: currentFoodData.unit
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || '服务器请求失败');
        }

        const result = await response.json();
        
        if (isMounted) {
          setAnalysisResult(result);
          setAppState('result');
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          alert(`分析失败: ${err.message}\n请确保后端服务正常启动且配置了正确的 API Key。`);
          handleReset();
        }
      }
    }

    startAIAnalysis();

    return () => {
      isMounted = false;
    };
  }, [appState, currentImage, currentFoodData]);

  const handleCapture = (base64Image, foodData = {}) => {
    setCurrentImage(base64Image);
    setCurrentFoodData(foodData);
    setAppState('analyzing');
  };

  const handleReset = () => {
    setCurrentImage(null);
    setCurrentFoodData({});
    setAnalysisResult(null);
    setAppState('capture');
  };

  const handleSaveMeal = async (mealData) => {
    try {
      const response = await fetch('/api/meals', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(mealData),
      });
      if (response.ok) {
        handleReset();
        setCurrentTab('history');
      } else {
        alert("保存失败，请重试");
      }
    } catch (err) {
      console.error(err);
      alert("保存出错");
    }
  };

  if (!token) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="app-wrapper">
      {/* 顶部简单的状态栏 */}
      <div style={{ padding: '40px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: '800', fontSize: '20px', color: 'var(--text-primary)' }}>WeightHelper <span style={{fontSize: '12px', color: 'var(--accent-green)', marginLeft: '4px'}}>v2.1.2</span></div>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          {username} 
          <span onClick={handleLogout} style={{ color: 'var(--accent-green)', marginLeft: '12px', fontWeight: '600', cursor: 'pointer' }}>退出</span>
        </div>
      </div>

      {currentTab === 'camera' && (
        <>
          {appState === 'capture' && <CameraCapture onCapture={handleCapture} modelName={tokenInfo.model} token={token} />}
          
          {appState === 'analyzing' && (
            <AIAnalyzer 
              imageUrl={currentImage} 
              onAnalysisComplete={() => {}} 
            />
          )}
          
          {appState === 'result' && (
            <NutritionCard 
              imageUrl={currentImage}
              data={analysisResult} 
              onReset={handleReset} 
              onSave={handleSaveMeal}
            />
          )}
        </>
      )}
      
      {currentTab === 'history' && <HistoryList goal={goal} token={token} timezone={timezone} />}
      
      {currentTab === 'settings' && (
        <Settings 
          currentGoal={goal} 
          currentTimezone={timezone}
          onSavePreferences={handleSavePreferences}
        />
      )}

      <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
    </div>
  );
}

export default App;
