const API_BASE_URL = 'http://localhost:5000/api';

// Generic API wrapper with offline handling
export const api = {
  async get(endpoint) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`);
      if (!response.ok) throw new Error('API network response was not ok');
      return await response.json();
    } catch (error) {
      console.warn(`API GET failed for ${endpoint}. Falling back to local storage.`, error);
      return null;
    }
  },

  async post(endpoint, data) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('API post failed');
      return await response.json();
    } catch (error) {
      console.warn(`API POST failed for ${endpoint}. Saved locally.`, error);
      throw error;
    }
  },

  async put(endpoint, data) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('API put failed');
      return await response.json();
    } catch (error) {
      console.warn(`API PUT failed for ${endpoint}.`, error);
      throw error;
    }
  }
};