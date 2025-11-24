const DEFAULT_BACKEND_URL = 'http://13.204.214.117/api';

const normalizeUrl = (url) => (url.endsWith('/') ? url.slice(0, -1) : url);

const shouldUseSameOriginProxy = () => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname || '';
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
  return host.endsWith('.vercel.app');
};

const resolveBaseUrl = () => {
  if (shouldUseSameOriginProxy()) {
    return '/api';
  }

  try {
    const configured = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL;
    if (configured) {
      return normalizeUrl(configured);
    }
  } catch (err) {
    // noop - fall back to defaults below
  }

  return DEFAULT_BACKEND_URL;
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
  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        return await response.json();
      } catch (jsonErr) {
        console.error('[API] Failed to parse JSON response', jsonErr);
        const text = await response.text();
        return text ? { message: text, parseError: true } : { message: 'Failed to parse response', parseError: true };
      }
    }
    const text = await response.text();
    return text ? { message: text } : {};
  } catch (err) {
    console.error('[API] Failed to parse response', err);
    return { message: 'Failed to parse response', parseError: true };
  }
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

  try {
    const url = buildUrl(path);
    // Log request (safely handle body serialization)
    try {
      const logBody = body ? (isFormData ? '[FormData]' : JSON.stringify(body)) : undefined;
      console.log(`[API] ${method} ${url}`, { body: logBody });
    } catch (logErr) {
      console.log(`[API] ${method} ${url}`, { body: '[Unable to serialize]' });
    }
    
    const response = await fetch(url, requestInit);
    const data = await parseResponse(response);
    
    console.log(`[API] Response ${response.status} for ${method} ${url}`, data);

    if (!response.ok || data?.success === false) {
      // Extract error message from various possible formats
      let errorMessage = data?.message || data?.error?.message || data?.error || 'Request failed';
      
      // Handle Express Validator format errors
      if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        const validationErrors = data.errors.map(e => {
          const field = e.path || e.field || e.param || e.location || 'Field';
          const msg = e.msg || e.message || e.value || 'Invalid value';
          return `${field}: ${msg}`;
        }).join('; ');
        errorMessage = validationErrors || errorMessage;
      }
      
      const error = new Error(errorMessage);
      // Attach full error data for detailed validation errors
      error.status = response.status;
      error.statusText = response.statusText;
      error.url = url;
      if (data?.errors) {
        error.errors = data.errors;
      }
      if (data?.error) {
        error.error = data.error;
      }
      if (data?.success === false) {
        error.success = false;
      }
      error.responseData = data;
      throw error;
    }

    return data;
  } catch (err) {
    // Handle network errors, CORS errors, etc.
    if (err.name === 'TypeError' || err.message.includes('fetch') || err.message.includes('network') || err.message.includes('Failed to fetch')) {
      const networkError = new Error(`Network error: Unable to connect to server. Please check your internet connection.`);
      networkError.isNetworkError = true;
      networkError.originalError = err;
      throw networkError;
    }
    // Re-throw if it's already our formatted error
    if (err.status || err.errors || err.error) {
      throw err;
    }
    // Handle other unexpected errors
    const unexpectedError = new Error(err.message || 'An unexpected error occurred');
    unexpectedError.originalError = err;
    throw unexpectedError;
  }
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
  getVisitHistory: (buildingId, limit = 100, startDate = null, endDate = null) => {
    if (!buildingId) {
      throw new Error('buildingId is required for getVisitHistory');
    }
    const params = new URLSearchParams();
    // Always include limit parameter as per endpoint requirement
    params.append('limit', limit.toString());
    // Only add optional date parameters if they have values
    if (startDate && typeof startDate === 'string' && startDate.trim()) {
      params.append('startDate', startDate.trim());
    }
    if (endDate && typeof endDate === 'string' && endDate.trim()) {
      params.append('endDate', endDate.trim());
    }
    const queryParams = params.toString();
    const endpoint = `/visits/${buildingId}${queryParams ? `?${queryParams}` : ''}`;
    console.log('[API] getVisitHistory endpoint:', endpoint, 'buildingId:', buildingId);
    return apiRequest(endpoint);
  },
  getAllUsers: (query = '') => apiRequest(`/auth/users${query}`),
  createAdmin: (payload) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: payload,
    }),
  getUpcomingVisitors: (buildingId, residentId) =>
    apiRequest(`/pre-approvals/${buildingId}/${residentId}`),
};

