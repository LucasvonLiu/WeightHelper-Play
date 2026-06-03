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

  const handleSaveGoal = (newGoal) => {
    setGoal(newGoal);
    localStorage.setItem('weighthelper_goal', newGoal);
  };

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
          },
          body: JSON.stringify({ image: currentImage }),
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
  }, [appState, currentImage]);

  const handleCapture = (base64Image) => {
    setCurrentImage(base64Image);
    setAppState('analyzing');
  };

  const handleReset = () => {
    setCurrentImage(null);
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
      <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: '800', fontSize: '20px', color: 'var(--text-primary)' }}>WeightHelper</div>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          {username} 
          <span onClick={handleLogout} style={{ color: 'var(--accent-green)', marginLeft: '12px', fontWeight: '600', cursor: 'pointer' }}>退出</span>
        </div>
      </div>

      {currentTab === 'camera' && (
        <>
          {appState === 'capture' && <CameraCapture onCapture={handleCapture} />}
          
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
      
      {currentTab === 'history' && <HistoryList goal={goal} token={token} />}
      
      {currentTab === 'settings' && <Settings currentGoal={goal} onSaveGoal={handleSaveGoal} />}

      <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
    </div>
  );
}

export default App;
