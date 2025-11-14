const DEFAULT_REMOTE_BASE_URL = 'https://securityapp-backend.vercel.app/api';

const normalizeBase = (value) => (value.endsWith('/') ? value.slice(0, -1) : value);

const resolveBaseUrl = () => {
  try {
    const configured = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL;
    if (configured) {
      return normalizeBase(configured);
    }
  } catch (err) {
    // noop - fall back to defaults below
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location?.hostname || '';
    const isLocalhost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]' ||
      hostname.endsWith('.local');

    if (isLocalhost) {
      return '/api';
    }
  }

  return DEFAULT_REMOTE_BASE_URL;
};

const BASE_URL = resolveBaseUrl();

const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('authToken');
};

const buildUrl = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (BASE_URL === '/') {
    return normalizedPath;
  }
  if (BASE_URL.endsWith('/')) {
    return `${BASE_URL.slice(0, -1)}${normalizedPath}`;
  }
  return `${BASE_URL}${normalizedPath}`;
};

const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  return text ? { message: text } : {};
};

export async function apiRequest(path, { method = 'GET', headers = {}, body, isFormData = false } = {}) {
  const token = getAuthToken();

  const finalHeaders = { ...headers };

  if (!isFormData) {
    finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json';
  }

  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  const requestInit = {
    method,
    headers: finalHeaders,
  };

  if (body !== undefined && body !== null) {
    requestInit.body = isFormData ? body : JSON.stringify(body);
  }

  const url = buildUrl(path);
  const response = await fetch(url, requestInit);
  const data = await parseResponse(response);

  if (!response.ok || data?.success === false) {
    const errorMessage = data?.message || response.statusText || 'Request failed';
    const error = new Error(
      response.status ? `${errorMessage} (status ${response.status})` : errorMessage
    );
    error.status = response.status;
    error.url = url;
    throw error;
  }

  return data;
}

export const api = {
  login: (payload) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: payload,
    }),
  getBuildings: () => apiRequest('/buildings'),
  getBuildingById: (buildingId) => apiRequest(`/buildings/${buildingId}`),
  createBuilding: (payload) =>
    apiRequest('/buildings', {
      method: 'POST',
      body: payload,
      isFormData: payload instanceof FormData,
    }),
  updateBuilding: (buildingId, payload) =>
    apiRequest(`/buildings/${buildingId}`, {
      method: 'PUT',
      body: payload,
      isFormData: payload instanceof FormData,
    }),
  getTodayVisits: (buildingId) => apiRequest(`/admin-dashboard/${buildingId}/today-visits`),
  getAllUsers: (query = '') => apiRequest(`/auth/users${query}`),
  createAdmin: (payload) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: payload,
    }),
};

