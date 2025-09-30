/**
 * @jest-environment jsdom
 */

// Mock axios BEFORE any imports
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  }
}

const mockedAxiosCreate = jest.fn(() => mockAxiosInstance)
const mockedIsAxiosError = jest.fn()

jest.mock('axios', () => ({
  create: mockedAxiosCreate,
  isAxiosError: mockedIsAxiosError
}))

// Clear mocks before each test to ensure clean state
beforeEach(() => {
  mockedAxiosCreate.mockClear()
  mockAxiosInstance.interceptors.request.use.mockClear()
  mockAxiosInstance.interceptors.response.use.mockClear()
})

// Mock useAuthStore BEFORE imports
const mockAuthStore = {
  getState: jest.fn(),
  refreshTokens: jest.fn(),
  logout: jest.fn()
}

jest.mock('../../../shared/hooks/useAuth', () => ({
  useAuthStore: mockAuthStore
}))

// Mock console to avoid noise
const originalConsoleError = console.error
const originalConsoleWarn = console.warn
beforeAll(() => {
  console.error = jest.fn()
  console.warn = jest.fn()
})

afterAll(() => {
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
})

// Import the API module AFTER mocks are set up
import { apiClient, api, handleApiError } from '../../../shared/services/api'

describe('API Service - CRITICAL NETWORK LAYER', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('API Client Configuration', () => {
    it('should have axios instance properly configured', () => {
      // Check that apiClient is properly defined with expected methods
      expect(apiClient).toBeDefined()
      expect(typeof apiClient.get).toBe('function')
      expect(typeof apiClient.post).toBe('function')
      expect(typeof apiClient.put).toBe('function')
      expect(typeof apiClient.patch).toBe('function')
      expect(typeof apiClient.delete).toBe('function')
      expect(apiClient.interceptors).toBeDefined()
    })

    it('should have working API interface', () => {
      // Test that the api object has the expected helper methods
      expect(api).toBeDefined()
      expect(typeof api.get).toBe('function')
      expect(typeof api.post).toBe('function')
      expect(typeof api.put).toBe('function')
      expect(typeof api.patch).toBe('function')
      expect(typeof api.delete).toBe('function')
    })
  })

  describe('API Request Processing', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should handle successful responses', async () => {
      const mockResponse = { data: { test: 'success' }, status: 200 }
      mockAxiosInstance.get.mockResolvedValue(mockResponse)

      const result = await api.get('/test')
      expect(result.data).toEqual({ test: 'success' })
    })

    it('should handle all HTTP methods', async () => {
      const mockResponse = { data: { success: true } }

      mockAxiosInstance.get.mockResolvedValue(mockResponse)
      mockAxiosInstance.post.mockResolvedValue(mockResponse)
      mockAxiosInstance.put.mockResolvedValue(mockResponse)
      mockAxiosInstance.patch.mockResolvedValue(mockResponse)
      mockAxiosInstance.delete.mockResolvedValue(mockResponse)

      await api.get('/test')
      await api.post('/test', { data: 'test' })
      await api.put('/test', { data: 'test' })
      await api.patch('/test', { data: 'test' })
      await api.delete('/test')

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', undefined)
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', { data: 'test' }, undefined)
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test', { data: 'test' }, undefined)
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/test', { data: 'test' }, undefined)
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test', undefined)
    })

    it('should pass config options correctly', async () => {
      const mockResponse = { data: { success: true } }
      const config = { headers: { 'X-Custom': 'test' } }

      mockAxiosInstance.get.mockResolvedValue(mockResponse)

      await api.get('/test', config)

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', config)
    })

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error')
      mockAxiosInstance.get.mockRejectedValue(networkError)

      await expect(api.get('/test')).rejects.toThrow('Network Error')
    })

    it('should handle HTTP error responses', async () => {
      const httpError = {
        response: { status: 404, data: { message: 'Not found' } },
        isAxiosError: true
      }
      mockAxiosInstance.get.mockRejectedValue(httpError)

      await expect(api.get('/test')).rejects.toMatchObject({
        response: { status: 404 }
      })
    })
  })

  describe('API Helper Methods', () => {
    it('should make GET requests', async () => {
      const mockResponse = { data: { id: 1, name: 'Test' } }
      mockAxiosInstance.get.mockResolvedValue(mockResponse)

      const result = await api.get('/users/1')

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/users/1', undefined)
      expect(result).toEqual(mockResponse)
    })

    it('should make POST requests', async () => {
      const mockData = { name: 'New User', email: 'test@example.com' }
      const mockResponse = { data: { id: 2, ...mockData } }
      mockAxiosInstance.post.mockResolvedValue(mockResponse)

      const result = await api.post('/users', mockData)

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/users', mockData, undefined)
      expect(result).toEqual(mockResponse)
    })

    it('should make PUT requests', async () => {
      const mockData = { id: 1, name: 'Updated User' }
      const mockResponse = { data: mockData }
      mockAxiosInstance.put.mockResolvedValue(mockResponse)

      const result = await api.put('/users/1', mockData)

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/users/1', mockData, undefined)
      expect(result).toEqual(mockResponse)
    })

    it('should make PATCH requests', async () => {
      const mockData = { name: 'Patched User' }
      const mockResponse = { data: { id: 1, ...mockData } }
      mockAxiosInstance.patch.mockResolvedValue(mockResponse)

      const result = await api.patch('/users/1', mockData)

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/users/1', mockData, undefined)
      expect(result).toEqual(mockResponse)
    })

    it('should make DELETE requests', async () => {
      const mockResponse = { data: { success: true } }
      mockAxiosInstance.delete.mockResolvedValue(mockResponse)

      const result = await api.delete('/users/1')

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/users/1', undefined)
      expect(result).toEqual(mockResponse)
    })

    it('should pass config options to axios methods', async () => {
      const config = { timeout: 5000, headers: { 'Custom-Header': 'value' } }
      mockAxiosInstance.get.mockResolvedValue({ data: {} })

      await api.get('/test', config)

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', config)
    })

    it('should handle request errors gracefully', async () => {
      const error = new Error('Network error')
      mockAxiosInstance.get.mockRejectedValue(error)

      await expect(api.get('/fail')).rejects.toThrow('Network error')
    })

    it('should handle timeout errors', async () => {
      const timeoutError = { code: 'ECONNABORTED', message: 'timeout of 10000ms exceeded' }
      mockAxiosInstance.post.mockRejectedValue(timeoutError)

      await expect(api.post('/timeout', {})).rejects.toMatchObject(timeoutError)
    })
  })

  describe('handleApiError', () => {
    beforeEach(() => {
      mockedIsAxiosError.mockClear()
    })

    it('should handle axios errors with response data error field', () => {
      mockedIsAxiosError.mockReturnValue(true)

      const error = {
        response: {
          data: { error: 'Custom error message' }
        }
      }

      expect(handleApiError(error)).toBe('Custom error message')
    })

    it('should handle axios errors with response data message field', () => {
      mockedIsAxiosError.mockReturnValue(true)

      const error = {
        response: {
          data: { message: 'API error message' }
        }
      }

      expect(handleApiError(error)).toBe('API error message')
    })

    it('should handle different HTTP status codes', () => {
      mockedIsAxiosError.mockReturnValue(true)

      const testCases = [
        { status: 400, expected: 'Bad request' },
        { status: 401, expected: 'Authentication required' },
        { status: 403, expected: 'Access denied' },
        { status: 404, expected: 'Resource not found' },
        { status: 409, expected: 'Resource already exists' },
        { status: 422, expected: 'Validation failed' },
        { status: 500, expected: 'Server error' },
        { status: 418, expected: 'Request failed with status 418' },
        { status: 502, expected: 'Request failed with status 502' },
        { status: 503, expected: 'Request failed with status 503' }
      ]

      testCases.forEach(({ status, expected }) => {
        const error = {
          response: {
            status,
            data: {}
          }
        }
        expect(handleApiError(error)).toBe(expected)
      })
    })

    it('should handle network errors', () => {
      mockedIsAxiosError.mockReturnValue(true)

      const error = {
        request: {},
        response: undefined
      }

      expect(handleApiError(error)).toBe('Network error - please check your connection')
    })

    it('should handle non-axios errors', () => {
      mockedIsAxiosError.mockReturnValue(false)

      const error = new Error('Generic error')
      expect(handleApiError(error)).toBe('Generic error')

      const unknownError = { someProperty: 'value' }
      expect(handleApiError(unknownError)).toBe('An unexpected error occurred')
    })

    it('should prioritize error field over message field', () => {
      mockedIsAxiosError.mockReturnValue(true)

      const error = {
        response: {
          data: {
            error: 'Priority error message',
            message: 'Secondary message'
          }
        }
      }

      expect(handleApiError(error)).toBe('Priority error message')
    })

    it('should prioritize response data over status code messages', () => {
      mockedIsAxiosError.mockReturnValue(true)

      const error = {
        response: {
          status: 404,
          data: { message: 'Custom not found message' }
        }
      }

      expect(handleApiError(error)).toBe('Custom not found message')
    })

    it('should handle undefined error objects safely', () => {
      mockedIsAxiosError.mockReturnValue(false)

      expect(handleApiError(undefined)).toBe('An unexpected error occurred')
      expect(handleApiError(null)).toBe('An unexpected error occurred')
    })

    it('should handle axios errors without response or request', () => {
      mockedIsAxiosError.mockReturnValue(true)

      const error = {
        message: 'Request setup error'
      }

      expect(handleApiError(error)).toBe('Request setup error')
    })

    it('should handle malformed response data', () => {
      mockedIsAxiosError.mockReturnValue(true)

      const error = {
        response: {
          status: 500,
          data: null
        }
      }

      expect(handleApiError(error)).toBe('Server error')
    })

    it('should handle empty error messages gracefully', () => {
      mockedIsAxiosError.mockReturnValue(true)

      const error = {
        response: {
          data: { error: '' }
        }
      }

      expect(handleApiError(error)).toBe('An unexpected error occurred')
    })

    it('should handle errors with no message or error fields', () => {
      mockedIsAxiosError.mockReturnValue(true)

      const error = {
        response: {
          status: 400,
          data: { someField: 'value' }
        }
      }

      expect(handleApiError(error)).toBe('Bad request')
    })

    it('should handle connection timeout errors', () => {
      mockedIsAxiosError.mockReturnValue(true)

      const error = {
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded'
      }

      expect(handleApiError(error)).toBe('timeout of 5000ms exceeded')
    })

    it('should handle DNS resolution errors', () => {
      mockedIsAxiosError.mockReturnValue(true)

      const error = {
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND example.com'
      }

      expect(handleApiError(error)).toBe('getaddrinfo ENOTFOUND example.com')
    })

    it('should handle string errors', () => {
      mockedIsAxiosError.mockReturnValue(false)

      expect(handleApiError('String error')).toBe('An unexpected error occurred')
    })

    it('should handle errors with nested error objects', () => {
      mockedIsAxiosError.mockReturnValue(true)

      const error = {
        response: {
          data: {
            error: {
              message: 'Nested error message'
            }
          }
        }
      }

      // Function returns the nested error object when found
      const result = handleApiError(error)
      expect(result).toEqual({ message: 'Nested error message' })
    })
  })
})