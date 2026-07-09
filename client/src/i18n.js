import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 极简多语言配置（中/英）
const resources = {
  zh: {
    translation: {
      appName: "WeightHelper",
      tabs: {
        camera: "相机",
        history: "历史",
        settings: "设置"
      },
      common: {
        logout: "退出",
        save: "保存",
        success: "成功",
        failed: "失败",
        confirm: "确定",
        cancel: "取消",
        delete: "删除"
      },
      auth: {
        title: "欢迎体验 WeightHelper",
        desc: "极简智能饮食卡路里记录工具",
        usernamePlaceholder: "用户名",
        passwordPlaceholder: "密码",
        login: "登录",
        register: "注册",
        noAccount: "还没有账号？立即注册",
        hasAccount: "已有账号？去登录"
      },
      settings: {
        title: "偏好设置",
        langLabel: "多语言 (Language)",
        goalLabel: "每日摄入目标 (kcal)",
        goalDesc: "根据您的减脂或增肌需求，设定一个卡路里上限。",
        goalUnit: "大卡",
        timezoneLabel: "时区设置",
        timezoneDesc: "选择您所在的时区，确保三餐记录日期准确。",
        saveBtn: "保存偏好",
        dangerZone: "危险区域",
        deleteDesc: "注销账号将永久删除您的所有个人信息与饮食记录，此操作不可撤销。",
        deleteBtn: "注销并删除账号"
      },
      history: {
        title: "历史记录",
        total: "总计",
        calories: "热量",
        protein: "蛋白质",
        carbs: "碳水",
        fats: "脂肪",
        empty: "今天还没有饮食记录，快去拍照识别吧！",
        exportCsv: "导出数据",
        analysisTitle: "AI 营养师周报与建议",
        analyzeBtn: "获取 AI 营养点评",
        feedbackBtn: "反馈",
        feedbackTitle: "饮食分析意见反馈",
        ratingLabel: "您对本次 AI 估算的满意度：",
        commentPlaceholder: "输入您的纠偏卡路里数，或者其他修正建议...",
        feedbackSuccess: "感谢您的反馈，这有助于我们持续提升模型精度！"
      }
    }
  },
  en: {
    translation: {
      appName: "WeightHelper",
      tabs: {
        camera: "Camera",
        history: "History",
        settings: "Settings"
      },
      common: {
        logout: "Logout",
        save: "Save",
        success: "Success",
        failed: "Failed",
        confirm: "Confirm",
        cancel: "Cancel",
        delete: "Delete"
      },
      auth: {
        title: "Welcome to WeightHelper",
        desc: "Minimalist AI-Powered Calorie Tracker",
        usernamePlaceholder: "Username",
        passwordPlaceholder: "Password",
        login: "Login",
        register: "Register",
        noAccount: "No account? Register now",
        hasAccount: "Have an account? Go to Login"
      },
      settings: {
        title: "Preferences",
        langLabel: "Language",
        goalLabel: "Daily Calorie Goal (kcal)",
        goalDesc: "Set a calorie intake limit based on your fitness goals.",
        goalUnit: "kcal",
        timezoneLabel: "Timezone",
        timezoneDesc: "Choose your local timezone to ensure accurate log dates.",
        saveBtn: "Save Preferences",
        dangerZone: "Danger Zone",
        deleteDesc: "Deleting your account is permanent. All your data and logs will be lost forever.",
        deleteBtn: "Delete Account"
      },
      history: {
        title: "History Logs",
        total: "Total",
        calories: "Cals",
        protein: "Prot",
        carbs: "Carbs",
        fats: "Fats",
        empty: "No logs today. Snap a photo to recognize!",
        exportCsv: "Export Data",
        analysisTitle: "AI Nutritionist Weekly advice",
        analyzeBtn: "Get AI Advice",
        feedbackBtn: "Feedback",
        feedbackTitle: "Calorie Accuracy Feedback",
        ratingLabel: "How satisfied are you with this AI estimation?",
        commentPlaceholder: "Enter your corrected calorie estimate or suggestions...",
        feedbackSuccess: "Thank you! Your feedback helps us continuously improve the model accuracy."
      }
    }
  }
};

// 自动读取用户上一次保存的语言
const savedLang = localStorage.getItem('weighthelper_lang') || 'zh';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLang,
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
