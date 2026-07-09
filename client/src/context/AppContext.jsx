import React, { createContext, useState, useEffect, useContext } from 'react';
import { apiClient } from '../services/apiClient.js';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [currentTab, setCurrentTab] = useState('camera'); // camera, history, settings
  const [appState, setAppState] = useState('capture'); // capture, analyzing, result
  const [currentImage, setCurrentImage] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentFoodData, setCurrentFoodData] = useState({});

  const [token, setToken] = useState(localStorage.getItem('token'));
  const [username, setUsername] = useState(localStorage.getItem('username'));
  const [tokenInfo, setTokenInfo] = useState({ model: 'gemini-3.1-flash-lite' });

  const [goal, setGoal] = useState(() => {
    return Number(localStorage.getItem('weighthelper_goal')) || 2000;
  });

  const [timezone, setTimezone] = useState(() => {
    return localStorage.getItem('weighthelper_timezone') || 'Asia/Shanghai';
  });

  // 获取后端模型和 Token 消耗情况
  const fetchTokenStatus = async () => {
    if (!token) return;
    try {
      const data = await apiClient.get('/api/user/status');
      if (data && data.model) {
        setTokenInfo({ model: data.model });
      }
    } catch (e) {
      console.error('Failed to fetch token status:', e);
    }
  };

  useEffect(() => {
    fetchTokenStatus();
  }, [token, currentTab, appState]);

  // 获取偏好设置
  const fetchUserPreferences = async () => {
    if (!token) return;
    try {
      const data = await apiClient.get('/api/user/preferences');
      if (data) {
        if (data.goal) setGoal(data.goal);
        if (data.timezone) setTimezone(data.timezone);
        localStorage.setItem('weighthelper_goal', data.goal);
        localStorage.setItem('weighthelper_timezone', data.timezone);
      }
    } catch (e) {
      console.error('Failed to fetch preferences:', e);
    }
  };

  useEffect(() => {
    fetchUserPreferences();
  }, [token]);

  // 监听 Token 失效的自定义事件
  useEffect(() => {
    const handleAuthFailed = () => {
      handleLogout();
    };
    window.addEventListener('auth_failed', handleAuthFailed);
    return () => {
      window.removeEventListener('auth_failed', handleAuthFailed);
    };
  }, []);

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
    handleReset();
  };

  const handleSavePreferences = async (newGoal, newTz) => {
    setGoal(newGoal);
    setTimezone(newTz);
    localStorage.setItem('weighthelper_goal', newGoal);
    localStorage.setItem('weighthelper_timezone', newTz);

    try {
      await apiClient.put('/api/user/preferences', { goal: newGoal, timezone: newTz });
    } catch (e) {
      console.error('Failed to sync preferences', e);
    }
  };

  // 触发 AI 分析
  useEffect(() => {
    if (appState !== 'analyzing' || !currentImage) return;

    let isMounted = true;

    async function startAIAnalysis() {
      try {
        const result = await apiClient.post('/api/analyze', { 
          image: currentImage, 
          foodName: currentFoodData.foodName,
          quantity: currentFoodData.quantity,
          unit: currentFoodData.unit
        });
        
        if (isMounted) {
          setAnalysisResult(result);
          setAppState('result');
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          alert(`分析失败: ${err.message || '未知错误'}\n请确保后端服务正常启动且配置了正确的 API Key。`);
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
      setIsSaving(true);
      await apiClient.post('/api/meals', { 
        ...mealData, 
        image: currentImage,
        details: mealData.details || []
      });
      handleReset();
      setCurrentTab('history');
    } catch (err) {
      console.error(err);
      alert(`保存失败: ${err.message || '未知错误'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 一键销户功能（前后端合规，第五步合规功能）
  const handleDeleteAccount = async () => {
    if (!window.confirm('🚨 警告：此操作不可逆！您的所有账号信息和饮食记录将被永久删除。确定要注销账号吗？')) {
      return;
    }
    try {
      // 获取用户自己的 ID 并在后端删除。后端我们支持了 DELETE /api/admin/users/:id，
      // 等等，用户可以自注销吗？我们应该提供一个用户自注销接口！
      // 我们可以让用户发起 DELETE /api/user/account。
      // 或者是通过调用 DELETE /api/admin/users/:id？但那是管理员接口。
      // 我们可以在 usersRouter 中新增一个 DELETE /api/user/account 接口！
      await apiClient.delete('/api/user/account');
      alert('您的账号已成功注销。再见！');
      handleLogout();
    } catch (err) {
      console.error('Failed to delete account', err);
      alert(`注销失败: ${err.message || '未知错误'}`);
    }
  };

  return (
    <AppContext.Provider value={{
      currentTab, setCurrentTab,
      appState, setAppState,
      currentImage, setCurrentImage,
      analysisResult, setAnalysisResult,
      isSaving, setIsSaving,
      currentFoodData, setCurrentFoodData,
      token, setToken,
      username, setUsername,
      tokenInfo, setTokenInfo,
      goal, setGoal,
      timezone, setTimezone,
      handleAuthSuccess,
      handleLogout,
      handleSavePreferences,
      handleCapture,
      handleReset,
      handleSaveMeal,
      handleDeleteAccount
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
export { AppContext };
