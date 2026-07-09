import React from 'react';
import CameraCapture from './components/CameraCapture';
import AIAnalyzer from './components/AIAnalyzer';
import NutritionCard from './components/NutritionCard';
import HistoryList from './components/HistoryList';
import BottomNav from './components/BottomNav';
import Settings from './components/Settings';
import Auth from './components/Auth';
import InstallPrompt from './components/InstallPrompt';
import { useApp } from './context/AppContext.jsx';
import './index.css';

function App() {
  const {
    currentTab, setCurrentTab,
    appState,
    currentImage,
    analysisResult,
    isSaving,
    token,
    username,
    tokenInfo,
    goal,
    timezone,
    handleAuthSuccess,
    handleLogout,
    handleSavePreferences,
    handleCapture,
    handleReset,
    handleSaveMeal
  } = useApp();

  if (!token) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="app-wrapper">
      <InstallPrompt />
      {/* 顶部简单的状态栏 */}
      <div style={{ padding: '40px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
          <h1 style={{ margin: 0, fontSize: '28px', color: 'var(--text-primary)', fontWeight: '800', lineHeight: 1.2 }}>WeightHelper</h1>
          <div style={{ fontSize: '12px', color: 'var(--accent-green)', fontWeight: '600', lineHeight: 1 }}>v2.4.6</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexShrink: 1, maxWidth: '55%' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
            {username}
          </span>
          <span onClick={handleLogout} style={{ color: 'var(--accent-green)', fontWeight: '600', cursor: 'pointer', fontSize: '14px', flexShrink: 0, whiteSpace: 'nowrap' }}>退出</span>
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
              isSaving={isSaving}
              goal={goal}
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
