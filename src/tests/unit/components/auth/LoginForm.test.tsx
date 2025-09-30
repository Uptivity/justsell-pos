import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '../../../../shared/components/auth/LoginForm'
import { useAuth } from '../../../../shared/hooks/useAuth'

// Mock the useAuth hook
jest.mock('../../../../shared/hooks/useAuth')
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

describe('LoginForm Component', () => {
  const mockLogin = jest.fn()
  const mockOnSuccess = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isLoading: false,
      user: null,
      isAuthenticated: false,
      logout: jest.fn(),
      error: null
    })
  })

  describe('Rendering', () => {
    it('should render login form with all required elements', () => {
      render(<LoginForm />)

      expect(screen.getByText('JustSell POS')).toBeInTheDocument()
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('should render default credentials information', () => {
      render(<LoginForm />)

      expect(screen.getByText('Default credentials:')).toBeInTheDocument()
      expect(screen.getByText(/admin \/ admin123 \(ADMIN\)/)).toBeInTheDocument()
      expect(screen.getByText(/manager \/ manager123 \(MANAGER\)/)).toBeInTheDocument()
      expect(screen.getByText(/cashier \/ cashier123 \(CASHIER\)/)).toBeInTheDocument()
    })

    it('should apply custom className when provided', () => {
      const { container } = render(<LoginForm className="custom-class" />)

      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('should render loading state correctly', () => {
      mockUseAuth.mockReturnValue({
        login: mockLogin,
        isLoading: true,
        user: null,
        isAuthenticated: false,
        logout: jest.fn(),
        error: null
      })

      render(<LoginForm />)

      expect(screen.getByText('Signing in...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
      expect(screen.getByLabelText(/username/i)).toBeDisabled()
      expect(screen.getByLabelText(/password/i)).toBeDisabled()
    })
  })

  describe('Form Interaction', () => {
    it('should update username field on input change', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const usernameInput = screen.getByLabelText(/username/i)
      await user.type(usernameInput, 'testuser')

      expect(usernameInput).toHaveValue('testuser')
    })

    it('should update password field on input change', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const passwordInput = screen.getByLabelText(/password/i)
      await user.type(passwordInput, 'testpass')

      expect(passwordInput).toHaveValue('testpass')
    })

    it('should clear error message when user starts typing', async () => {
      const user = userEvent.setup()
      const { container } = render(<LoginForm />)

      // Submit form to trigger error (bypass HTML5 validation)
      const form = container.querySelector('form')!
      fireEvent.submit(form)

      expect(screen.getByText('Please enter both username and password')).toBeInTheDocument()

      // Type in username to clear error
      const usernameInput = screen.getByLabelText(/username/i)
      await user.type(usernameInput, 'test')

      expect(screen.queryByText('Please enter both username and password')).not.toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should show error when submitting empty form', async () => {
      const { container } = render(<LoginForm />)

      // Submit form directly to bypass HTML5 validation
      const form = container.querySelector('form')!
      fireEvent.submit(form)

      expect(screen.getByText('Please enter both username and password')).toBeInTheDocument()
      expect(mockLogin).not.toHaveBeenCalled()
    })

    it('should show error when submitting with only username', async () => {
      const user = userEvent.setup()
      const { container } = render(<LoginForm />)

      const usernameInput = screen.getByLabelText(/username/i)
      await user.type(usernameInput, 'testuser')

      // Submit form directly to bypass HTML5 validation
      const form = container.querySelector('form')!
      fireEvent.submit(form)

      expect(screen.getByText('Please enter both username and password')).toBeInTheDocument()
      expect(mockLogin).not.toHaveBeenCalled()
    })

    it('should show error when submitting with only password', async () => {
      const user = userEvent.setup()
      const { container } = render(<LoginForm />)

      const passwordInput = screen.getByLabelText(/password/i)
      await user.type(passwordInput, 'testpass')

      // Submit form directly to bypass HTML5 validation
      const form = container.querySelector('form')!
      fireEvent.submit(form)

      expect(screen.getByText('Please enter both username and password')).toBeInTheDocument()
      expect(mockLogin).not.toHaveBeenCalled()
    })

    it('should show error when submitting with whitespace-only credentials', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const usernameInput = screen.getByLabelText(/username/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(usernameInput, '   ')
      await user.type(passwordInput, '   ')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      expect(screen.getByText('Please enter both username and password')).toBeInTheDocument()
      expect(mockLogin).not.toHaveBeenCalled()
    })
  })

  describe('Form Submission', () => {
    it('should call login with correct credentials on valid submission', async () => {
      const user = userEvent.setup()
      mockLogin.mockResolvedValue(undefined)

      render(<LoginForm onSuccess={mockOnSuccess} />)

      const usernameInput = screen.getByLabelText(/username/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(usernameInput, 'admin')
      await user.type(passwordInput, 'admin123')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      expect(mockLogin).toHaveBeenCalledWith({
        username: 'admin',
        password: 'admin123'
      })
    })

    it('should call onSuccess callback after successful login', async () => {
      const user = userEvent.setup()
      mockLogin.mockResolvedValue(undefined)

      render(<LoginForm onSuccess={mockOnSuccess} />)

      const usernameInput = screen.getByLabelText(/username/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(usernameInput, 'admin')
      await user.type(passwordInput, 'admin123')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('should not call onSuccess callback if not provided', async () => {
      const user = userEvent.setup()
      mockLogin.mockResolvedValue(undefined)

      render(<LoginForm />)

      const usernameInput = screen.getByLabelText(/username/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(usernameInput, 'admin')
      await user.type(passwordInput, 'admin123')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      // Should not throw error when onSuccess is not provided
      expect(mockLogin).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should display error message when login fails with Error object', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Invalid credentials'
      mockLogin.mockRejectedValue(new Error(errorMessage))

      render(<LoginForm />)

      const usernameInput = screen.getByLabelText(/username/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(usernameInput, 'admin')
      await user.type(passwordInput, 'wrongpassword')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })

    it('should display generic error message when login fails with non-Error object', async () => {
      const user = userEvent.setup()
      mockLogin.mockRejectedValue('Something went wrong')

      render(<LoginForm />)

      const usernameInput = screen.getByLabelText(/username/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(usernameInput, 'admin')
      await user.type(passwordInput, 'wrongpassword')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Login failed')).toBeInTheDocument()
      })
    })

    it('should clear previous error before new submission', async () => {
      const user = userEvent.setup()
      mockLogin.mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce(undefined)

      render(<LoginForm />)

      const usernameInput = screen.getByLabelText(/username/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      // First failed attempt
      await user.type(usernameInput, 'admin')
      await user.type(passwordInput, 'wrong')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument()
      })

      // Second successful attempt
      await user.clear(passwordInput)
      await user.type(passwordInput, 'correct')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument()
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('should submit form when Enter key is pressed in password field', async () => {
      const user = userEvent.setup()
      mockLogin.mockResolvedValue(undefined)

      render(<LoginForm />)

      const usernameInput = screen.getByLabelText(/username/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(usernameInput, 'admin')
      await user.type(passwordInput, 'admin123')
      await user.keyboard('{Enter}')

      expect(mockLogin).toHaveBeenCalledWith({
        username: 'admin',
        password: 'admin123'
      })
    })

    it('should prevent form submission when inputs are disabled', async () => {
      const user = userEvent.setup()
      mockUseAuth.mockReturnValue({
        login: mockLogin,
        isLoading: true,
        user: null,
        isAuthenticated: false,
        logout: jest.fn(),
        error: null
      })

      render(<LoginForm />)

      const submitButton = screen.getByRole('button', { name: /signing in/i })
      await user.click(submitButton)

      expect(mockLogin).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels and attributes', () => {
      render(<LoginForm />)

      const usernameInput = screen.getByLabelText(/username/i)
      const passwordInput = screen.getByLabelText(/password/i)

      expect(usernameInput).toHaveAttribute('type', 'text')
      expect(usernameInput).toHaveAttribute('autoComplete', 'username')
      expect(usernameInput).toBeRequired()

      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password')
      expect(passwordInput).toBeRequired()
    })

    it('should have proper error message accessibility', async () => {
      const user = userEvent.setup()
      const { container } = render(<LoginForm />)

      // Find the form and submit it directly to bypass HTML5 validation
      const form = container.querySelector('form')!

      // Trigger form submission with empty fields
      fireEvent.submit(form)

      // Wait for error message to appear
      const errorElement = await screen.findByText('Please enter both username and password')
      expect(errorElement).toBeInTheDocument()
      expect(errorElement).toHaveClass('text-red-800')
    })

    it('should have proper button states for screen readers', () => {
      mockUseAuth.mockReturnValue({
        login: mockLogin,
        isLoading: true,
        user: null,
        isAuthenticated: false,
        logout: jest.fn(),
        error: null
      })

      render(<LoginForm />)

      const submitButton = screen.getByRole('button', { name: /signing in/i })
      expect(submitButton).toBeDisabled()
      expect(submitButton).toHaveTextContent('Signing in...')
    })
  })
})