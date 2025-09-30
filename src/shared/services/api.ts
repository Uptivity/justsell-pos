import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosError } from 'axios'
import { useAuthStore } from '../hooks/useAuth'

// API base URL - would normally come from environment
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api'

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds
})

// Flag to prevent multiple refresh attempts
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: any) => void
}> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else {
      resolve(token!)
    }
  })

  failedQueue = []
}

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore.getState()
    const token = authStore.tokens?.accessToken

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Another request is already refreshing tokens, wait for it
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers!.Authorization = `Bearer ${token}`
            return apiClient(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true

      const authStore = useAuthStore.getState()

      if (authStore.tokens?.refreshToken) {
        try {
          await authStore.refreshTokens()
          const newToken = useAuthStore.getState().tokens?.accessToken

          if (newToken) {
            processQueue(null, newToken)
            originalRequest.headers!.Authorization = `Bearer ${newToken}`
            return apiClient(originalRequest)
          }
        } catch (refreshError) {
          processQueue(refreshError, null)
          authStore.logout()
          return Promise.reject(refreshError)
        } finally {
          isRefreshing = false
        }
      } else {
        // No refresh token available, logout
        authStore.logout()
        isRefreshing = false
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  },
)

// Helper functions for common API operations
export const api = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) => apiClient.get<T>(url, config),

  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.post<T>(url, data, config),

  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.put<T>(url, data, config),

  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.patch<T>(url, data, config),

  delete: <T = any>(url: string, config?: AxiosRequestConfig) => apiClient.delete<T>(url, config),
}

// Utility function to handle API errors consistently
export function handleApiError(error: any): string {
  if (!error) {
    return 'An unexpected error occurred'
  }

  if (axios.isAxiosError(error)) {
    if (error.response?.data?.error) {
      return error.response.data.error
    }
    if (error.response?.data?.message) {
      return error.response.data.message
    }
    if (error.response?.status) {
      switch (error.response.status) {
        case 400:
          return 'Bad request'
        case 401:
          return 'Authentication required'
        case 403:
          return 'Access denied'
        case 404:
          return 'Resource not found'
        case 409:
          return 'Resource already exists'
        case 422:
          return 'Validation failed'
        case 500:
          return 'Server error'
        default:
          return `Request failed with status ${error.response.status}`
      }
    }
    if (error.request) {
      return 'Network error - please check your connection'
    }
  }

  return error?.message || 'An unexpected error occurred'
}

export default apiClient
