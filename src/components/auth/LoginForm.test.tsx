// LoginForm Component Tests
// Tests authentication form validation, submission, and error handling

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, userEvent, mockFetch, cleanupMocks } from '../../test/utils'
import { LoginForm } from './LoginForm'

// Mock the auth hooks
vi.mock('../../hooks/useAuth', () => ({
  useLogin: () => ({
    mutate: vi.fn(),
    loading: false,
    error: null,
  }),
}))

describe('LoginForm Component', () => {
  beforeEach(() => {
    cleanupMocks()
  })

  it('renders login form elements', () => {
    renderWithProviders(<LoginForm />)
    
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /remember me/i })).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginForm />)
    
    // Try to submit empty form
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/username is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('validates username format', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginForm />)
    
    const usernameInput = screen.getByLabelText(/username/i)
    await user.type(usernameInput, 'ab') // Too short
    await user.tab() // Trigger validation
    
    await waitFor(() => {
      expect(screen.getByText(/username must be at least 3 characters/i)).toBeInTheDocument()
    })
  })

  it('validates password strength', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginForm />)
    
    const passwordInput = screen.getByLabelText(/password/i)
    await user.type(passwordInput, '123') // Too weak
    await user.tab()
    
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument()
    })
  })

  it('shows password when toggle is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginForm />)
    
    const passwordInput = screen.getByLabelText(/password/i)
    const toggleButton = screen.getByRole('button', { name: /show password/i })
    
    expect(passwordInput).toHaveAttribute('type', 'password')
    
    await user.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'text')
    
    await user.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('submits valid form data', async () => {
    const mockLogin = vi.fn()
    vi.mocked(useLogin).mockReturnValue({
      mutate: mockLogin,
      loading: false,
      error: null,
    })
    
    const user = userEvent.setup()
    renderWithProviders(<LoginForm />)
    
    // Fill form with valid data
    await user.type(screen.getByLabelText(/username/i), 'testuser')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('checkbox', { name: /remember me/i }))
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
        rememberMe: true,
      })
    })
  })

  it('handles authentication errors', () => {
    vi.mocked(useLogin).mockReturnValue({
      mutate: vi.fn(),
      loading: false,
      error: { message: 'Invalid credentials' },
    })
    
    renderWithProviders(<LoginForm />)
    
    expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('shows loading state during submission', () => {
    vi.mocked(useLogin).mockReturnValue({
      mutate: vi.fn(),
      loading: true,
      error: null,
    })
    
    renderWithProviders(<LoginForm />)
    
    const submitButton = screen.getByRole('button', { name: /signing in/i })
    expect(submitButton).toBeDisabled()
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('focuses username input on mount', () => {
    renderWithProviders(<LoginForm />)
    
    const usernameInput = screen.getByLabelText(/username/i)
    expect(usernameInput).toHaveFocus()
  })

  it('allows Enter key to submit form', async () => {
    const mockLogin = vi.fn()
    vi.mocked(useLogin).mockReturnValue({
      mutate: mockLogin,
      loading: false,
      error: null,
    })
    
    const user = userEvent.setup()
    renderWithProviders(<LoginForm />)
    
    await user.type(screen.getByLabelText(/username/i), 'testuser')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.keyboard('{Enter}')
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(1)
    })
  })

  it('maintains form state during validation', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginForm />)
    
    const usernameInput = screen.getByLabelText(/username/i)
    const passwordInput = screen.getByLabelText(/password/i)
    
    await user.type(usernameInput, 'testuser')
    await user.type(passwordInput, 'short')
    await user.tab()
    
    // Form should show validation error but maintain input values
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument()
    })
    
    expect(usernameInput).toHaveValue('testuser')
    expect(passwordInput).toHaveValue('short')
  })
})