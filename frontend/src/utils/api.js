import { useAuth } from '@clerk/clerk-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export function useApi() {
  const { getToken } = useAuth();

  const makeRequest = async (endpoint, options = {}) => {
    try {
      // Get auth token from Clerk
      const token = await getToken();

      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      // Add auth token if available
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Make the request
      const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
        ...options,
        headers,
      });

      // Handle non-OK responses
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `HTTP ${response.status}`;
        let errorDetail = null;
        
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || errorData.message;
          errorMessage = errorDetail || errorMessage;
        } catch {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }

        // Create error object with status and detail
        const error = new Error(errorMessage);
        error.status = response.status;
        error.statusText = response.statusText;
        error.detail = errorDetail;
        throw error;
      }

      // Parse JSON response
      const data = await response.json();
      return data;

    } catch (error) {
      // Re-throw the error with context
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  };

  return { makeRequest };
}