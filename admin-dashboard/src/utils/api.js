export const fetchApi = async (endpoint, options = {}) => {
  const token = localStorage.getItem('adminToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  const response = await fetch(`/api/admin${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    throw new Error(data.error || '请求失败');
  }
  return data;
};
