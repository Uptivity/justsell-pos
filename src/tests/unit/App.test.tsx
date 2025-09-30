import { render, screen } from '@testing-library/react'
import App from '../../App'

// Mock React Router and React Query since we're testing the login flow
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Routes: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Route: () => <div />,
  Navigate: () => <div />,
  useLocation: () => ({ pathname: '/' }),
  Link: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

describe('App', () => {
  it('renders the login form when not authenticated', () => {
    render(<App />)
    const loginHeading = screen.getByText(/JustSell POS/i)
    expect(loginHeading).toBeInTheDocument()
  })

  it('renders sign in form', () => {
    render(<App />)
    const signInText = screen.getByText(/Sign in to your account/i)
    expect(signInText).toBeInTheDocument()
  })
})
