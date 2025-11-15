/**
 * API client for backend communication
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// Generic API request helper
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    console.log(`📡 API Request: ${options.method || 'GET'} ${API_URL}${endpoint}`);
    console.log(`   - Token present: ${!!token}`);

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    console.log(`📡 API Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      console.error(`❌ API Error:`, error);
      throw new Error(error.error || 'Request failed');
    }

    // Try to parse JSON with better error handling
    let data;
    try {
      const text = await response.text();
      console.log(`📄 API Response text:`, text);
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON response:', parseError);
      throw new Error('Invalid JSON response from server');
    }

    console.log(`✅ API Success - Raw data:`, data);
    console.log(`✅ API Success - Data type:`, typeof data);
    console.log(`✅ API Success - Data keys:`, data ? Object.keys(data) : 'null');

    // Check if response contains an error field (even with 200 status)
    if (data && data.error) {
      console.error(`❌ API returned error in response:`, data.error);
      throw new Error(data.error);
    }

    return data;
  } catch (error) {
    console.error('❌ API request error:', error);
    throw error;
  }
}

// Tasks API
export const tasksAPI = {
  getAll: () => apiRequest<{ tasks: any[] }>('/api/tasks'),
  search: (query: string) => apiRequest<{ tasks: any[] }>(`/api/tasks/search?query=${encodeURIComponent(query)}`),
  create: (task: any) => apiRequest<{ task: any }>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(task),
  }),
  update: (id: string, task: any) => apiRequest<{ task: any }>(`/api/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(task),
  }),
  delete: (id: string) => apiRequest<{ success: boolean }>(`/api/tasks/${id}`, {
    method: 'DELETE',
  }),
};

// Business API
export const businessAPI = {
  getOrders: () => apiRequest<{ orders: any[] }>('/api/business/orders'),
  createOrder: (order: any) => apiRequest<{ order: any }>('/api/business/orders', {
    method: 'POST',
    body: JSON.stringify(order),
  }),
  updateOrder: (id: string, order: any) => apiRequest<{ order: any }>(`/api/business/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(order),
  }),
  getReviews: () => apiRequest<{ reviews: any[] }>('/api/business/reviews'),
  createReview: (review: any) => apiRequest<{ review: any }>('/api/business/reviews', {
    method: 'POST',
    body: JSON.stringify(review),
  }),
};

// Challenges API
export const challengesAPI = {
  getAll: () => apiRequest<{ challenges: any[] }>('/api/challenges'),
  create: (challenge: any) => apiRequest<{ challenge: any }>('/api/challenges', {
    method: 'POST',
    body: JSON.stringify(challenge),
  }),
  update: (id: string, challenge: any) => apiRequest<{ challenge: any }>(`/api/challenges/${id}`, {
    method: 'PUT',
    body: JSON.stringify(challenge),
  }),
};

// Settings API
export const settingsAPI = {
  get: () => apiRequest<{ settings: any }>('/api/settings'),
  update: (settings: any) => apiRequest<{ settings: any }>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  }),
};
