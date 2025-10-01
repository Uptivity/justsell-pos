// Demo auth service for frontend demonstration
// This replaces the complex JWT implementation for demo purposes

export interface User {
  id: string
  username: string
  firstName: string
  lastName: string
  role: 'ADMIN' | 'MANAGER' | 'CASHIER'
  email?: string
}

export interface AuthState {
  isAuthenticated: boolean
  user: User | null
  token: string | null
}

// Demo user data
const DEMO_USERS: User[] = [
  {
    id: 'admin-1',
    username: 'admin',
    firstName: 'System',
    lastName: 'Administrator',
    role: 'ADMIN',
    email: 'admin@justsell.com'
  },
  {
    id: 'manager-1',
    username: 'manager',
    firstName: 'Store',
    lastName: 'Manager',
    role: 'MANAGER',
    email: 'manager@justsell.com'
  },
  {
    id: 'cashier-1',
    username: 'cashier',
    firstName: 'Store',
    lastName: 'Cashier',
    role: 'CASHIER',
    email: 'cashier@justsell.com'
  }
]

// Demo auth service
class DemoAuthService {
  private authState: AuthState = {
    isAuthenticated: false,
    user: null,
    token: null
  }

  async login(username: string, password: string): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500))

    // Demo authentication - accepts any password for demo users
    const user = DEMO_USERS.find(u => u.username === username)

    if (user) {
      const token = `demo-token-${user.id}-${Date.now()}`
      this.authState = {
        isAuthenticated: true,
        user,
        token
      }

      // Store in localStorage for persistence
      localStorage.setItem('auth-token', token)
      localStorage.setItem('auth-user', JSON.stringify(user))

      return { success: true, user, token }
    }

    return { success: false, error: 'Invalid credentials' }
  }

  async logout(): Promise<void> {
    this.authState = {
      isAuthenticated: false,
      user: null,
      token: null
    }

    localStorage.removeItem('auth-token')
    localStorage.removeItem('auth-user')
  }

  getCurrentUser(): User | null {
    return this.authState.user
  }

  isAuthenticated(): boolean {
    return this.authState.isAuthenticated
  }

  getToken(): string | null {
    return this.authState.token
  }

  // Initialize from localStorage on app start
  initializeFromStorage(): void {
    const token = localStorage.getItem('auth-token')
    const userStr = localStorage.getItem('auth-user')

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        this.authState = {
          isAuthenticated: true,
          user,
          token
        }
      } catch (error) {
        console.error('Failed to parse stored user data:', error)
        this.logout()
      }
    }
  }

  // Check if user has permission for a role
  hasRole(requiredRole: User['role']): boolean {
    if (!this.authState.user) return false

    const roleHierarchy = {
      'CASHIER': 1,
      'MANAGER': 2,
      'ADMIN': 3
    }

    const userLevel = roleHierarchy[this.authState.user.role]
    const requiredLevel = roleHierarchy[requiredRole]

    return userLevel >= requiredLevel
  }
}

export const authService = new DemoAuthService()

// Demo API functions
export const api = {
  async get(endpoint: string): Promise<any> {
    console.log(`Demo API GET ${endpoint}`)
    await new Promise(resolve => setTimeout(resolve, 300))
    return { data: [], message: 'Demo response' }
  },

  async post(endpoint: string, data: any): Promise<any> {
    console.log(`Demo API POST ${endpoint}`, data)
    await new Promise(resolve => setTimeout(resolve, 300))
    return { success: true, data: {}, message: 'Demo response' }
  },

  async put(endpoint: string, data: any): Promise<any> {
    console.log(`Demo API PUT ${endpoint}`, data)
    await new Promise(resolve => setTimeout(resolve, 300))
    return { success: true, data: {}, message: 'Demo response' }
  },

  async delete(endpoint: string): Promise<any> {
    console.log(`Demo API DELETE ${endpoint}`)
    await new Promise(resolve => setTimeout(resolve, 300))
    return { success: true, message: 'Demo response' }
  }
}