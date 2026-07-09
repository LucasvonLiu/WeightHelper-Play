const BASE_URL = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  
  // 默认头部设置
  const headers = {
    ...options.headers,
  };

  // 自动注入 JWT Token
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 自动处理 JSON 格式 Content-Type
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // 处理 401 登录态失效，自动清理本地缓存并跳转或重新加载
  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    // 如果页面需要，可以通过触发自定义事件或者重新刷新来重定向到 Auth
    window.dispatchEvent(new Event('auth_failed'));
  }

  if (!response.ok) {
    let errMsg = `请求失败: ${response.status}`;
    try {
      const errData = await response.json();
      errMsg = errData.error || errMsg;
    } catch (e) {}
    throw new Error(errMsg);
  }

  // 区分 text/csv 等非 JSON 格式响应
  const contentType = response.headers.get('Content-Type') || '';
  if (contentType.includes('text/csv')) {
    return response.text();
  }

  // 默认返回 JSON 格式
  try {
    return await response.json();
  } catch (e) {
    return null;
  }
}

export const apiClient = {
  get(path, options = {}) {
    return request(path, { ...options, method: 'GET' });
  },

  post(path, body, options = {}) {
    return request(path, { ...options, method: 'POST', body });
  },

  put(path, body, options = {}) {
    return request(path, { ...options, method: 'PUT', body });
  },

  delete(path, options = {}) {
    return request(path, { ...options, method: 'DELETE' });
  }
};
