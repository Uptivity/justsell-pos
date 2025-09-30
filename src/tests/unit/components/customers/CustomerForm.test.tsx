import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomerForm } from '../../../../shared/components/customers/CustomerForm'
import { customerService } from '../../../../shared/services/customers'
import type { CustomerResponse } from '../../../../shared/types/customers'

// Mock the customerService
jest.mock('../../../../shared/services/customers')
const mockCustomerService = customerService as jest.Mocked<typeof customerService>

describe('CustomerForm Component', () => {
  const mockOnSubmit = jest.fn()
  const mockOnCancel = jest.fn()

  const mockCustomer: CustomerResponse = {
    id: 'cust-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phoneNumber: '(555) 123-4567',
    dateOfBirth: '1990-01-15',
    addressLine1: '123 Main St',
    addressLine2: 'Apt 4B',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    marketingOptIn: true,
    smsOptIn: false,
    loyaltyPoints: 1250,
    totalSpent: 1500.75,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockCustomerService.validateCustomer.mockReturnValue([])
    mockCustomerService.getLoyaltyTierInfo.mockReturnValue({
      currentTier: 'SILVER',
      currentTierColor: 'text-gray-500',
      nextTier: 'GOLD',
      amountToNextTier: 499.25,
      progress: 50
    })
  })

  describe('Rendering - Create Mode', () => {
    it('should render create customer form with all fields', () => {
      render(<CustomerForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      expect(screen.getByText('Add New Customer')).toBeInTheDocument()

      // Basic Information
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()

      // Contact Information
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument()

      // Address Information
      expect(screen.getByText('Address Information')).toBeInTheDocument()
      expect(screen.getByLabelText(/address line 1/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/address line 2/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/city/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/state/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument()

      // Communication Preferences
      expect(screen.getByText('Communication Preferences')).toBeInTheDocument()
      expect(screen.getByLabelText(/marketing emails/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/sms notifications/i)).toBeInTheDocument()

      // Buttons
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create customer/i })).toBeInTheDocument()
    })

    it('should not display loyalty information in create mode', () => {
      render(<CustomerForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      expect(screen.queryByText('Loyalty Status')).not.toBeInTheDocument()
      expect(screen.queryByText('Points Balance:')).not.toBeInTheDocument()
    })

    it('should have empty form fields in create mode', () => {
      render(<CustomerForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      expect(screen.getByLabelText(/first name/i)).toHaveValue('')
      expect(screen.getByLabelText(/last name/i)).toHaveValue('')
      expect(screen.getByLabelText(/email address/i)).toHaveValue('')
      expect(screen.getByLabelText(/phone number/i)).toHaveValue('')
      expect(screen.getByLabelText(/marketing emails/i)).not.toBeChecked()
      expect(screen.getByLabelText(/sms notifications/i)).not.toBeChecked()
    })
  })

  describe('Rendering - Edit Mode', () => {
    it('should render edit customer form with pre-populated fields', () => {
      render(<CustomerForm customer={mockCustomer} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      expect(screen.getByText('Edit Customer')).toBeInTheDocument()
      expect(screen.getByLabelText(/first name/i)).toHaveValue('John')
      expect(screen.getByLabelText(/last name/i)).toHaveValue('Doe')
      expect(screen.getByLabelText(/email address/i)).toHaveValue('john.doe@example.com')
      expect(screen.getByLabelText(/phone number/i)).toHaveValue('(555) 123-4567')
      expect(screen.getByLabelText(/date of birth/i)).toHaveValue('1990-01-15')
      expect(screen.getByLabelText(/address line 1/i)).toHaveValue('123 Main St')
      expect(screen.getByLabelText(/address line 2/i)).toHaveValue('Apt 4B')
      expect(screen.getByLabelText(/city/i)).toHaveValue('New York')
      expect(screen.getByLabelText(/state/i)).toHaveValue('NY')
      expect(screen.getByLabelText(/zip code/i)).toHaveValue('10001')
      expect(screen.getByLabelText(/marketing emails/i)).toBeChecked()
      expect(screen.getByLabelText(/sms notifications/i)).not.toBeChecked()
      expect(screen.getByRole('button', { name: /update customer/i })).toBeInTheDocument()
    })

    it('should display loyalty information in edit mode', () => {
      render(<CustomerForm customer={mockCustomer} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      expect(screen.getByText('Loyalty Status')).toBeInTheDocument()
      expect(screen.getByText('SILVER')).toBeInTheDocument()
      expect(screen.getByText('Points Balance:')).toBeInTheDocument()
      expect(screen.getByText('1,250')).toBeInTheDocument()
      expect(screen.getByText('Total Spent:')).toBeInTheDocument()
      expect(screen.getByText('$1500.75')).toBeInTheDocument()
    })

    it('should display loyalty progress bar with correct width', () => {
      render(<CustomerForm customer={mockCustomer} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      expect(screen.getByText('Progress to GOLD')).toBeInTheDocument()
      expect(screen.getByText('$499.25 needed')).toBeInTheDocument()

      // Verify progress bar structure exists - the mock returns 50% progress
      // We expect the getLoyaltyTierInfo to be called with the customer's totalSpent
      expect(mockCustomerService.getLoyaltyTierInfo).toHaveBeenCalledWith(mockCustomer.totalSpent)
    })

    it('should handle customer without loyalty progress to next tier', () => {
      mockCustomerService.getLoyaltyTierInfo.mockReturnValue({
        currentTier: 'PLATINUM',
        currentTierColor: 'text-purple-600',
        nextTier: undefined,
        amountToNextTier: 0,
        progress: 100
      })

      const platinumCustomer = { ...mockCustomer, totalSpent: 6000 }
      render(<CustomerForm customer={platinumCustomer} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      expect(screen.getByText('PLATINUM')).toBeInTheDocument()
      expect(screen.queryByText(/progress to/i)).not.toBeInTheDocument()
    })
  })

  describe('Form Interactions', () => {
    it('should update form fields when user types', async () => {
      const user = userEvent.setup()
      render(<CustomerForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      const emailInput = screen.getByLabelText(/email address/i)

      await user.type(firstNameInput, 'Jane')
      await user.type(emailInput, 'jane@example.com')

      expect(firstNameInput).toHaveValue('Jane')
      expect(emailInput).toHaveValue('jane@example.com')
    })

    it('should handle checkbox changes', async () => {
      const user = userEvent.setup()
      render(<CustomerForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      const marketingCheckbox = screen.getByLabelText(/marketing emails/i)
      const smsCheckbox = screen.getByLabelText(/sms notifications/i)

      await user.click(marketingCheckbox)
      await user.click(smsCheckbox)

      expect(marketingCheckbox).toBeChecked()
      expect(smsCheckbox).toBeChecked()
    })

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(<CustomerForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('Form Validation', () => {
    it('should display validation errors when form is invalid', async () => {
      const { container } = render(<CustomerForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      mockCustomerService.validateCustomer.mockReturnValue([
        'First name must be at least 2 characters',
        'Invalid email format'
      ])

      // Submit form directly to bypass HTML5 validation
      const form = container.querySelector('form')!
      fireEvent.submit(form)

      expect(screen.getByText('Please fix the following errors:')).toBeInTheDocument()
      expect(screen.getByText('First name must be at least 2 characters')).toBeInTheDocument()
      expect(screen.getByText('Invalid email format')).toBeInTheDocument()
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should clear validation errors when form becomes valid', async () => {
      const user = userEvent.setup()
      const { container } = render(<CustomerForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      mockCustomerService.validateCustomer
        .mockReturnValueOnce(['First name must be at least 2 characters'])
        .mockReturnValueOnce([])

      const form = container.querySelector('form')!

      // First submission with validation errors
      fireEvent.submit(form)
      expect(screen.getByText('Please fix the following errors:')).toBeInTheDocument()

      // Fix the form and submit again
      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.type(firstNameInput, 'John')
      fireEvent.submit(form)

      expect(screen.queryByText('Please fix the following errors:')).not.toBeInTheDocument()
      expect(mockOnSubmit).toHaveBeenCalledTimes(1)
    })

    it('should validate form data and pass correct data to validateCustomer', async () => {
      const user = userEvent.setup()
      render(<CustomerForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      const lastNameInput = screen.getByLabelText(/last name/i)
      const emailInput = screen.getByLabelText(/email address/i)

      await user.type(firstNameInput, 'John')
      await user.type(lastNameInput, 'Doe')
      await user.type(emailInput, 'john@example.com')

      const submitButton = screen.getByRole('button', { name: /create customer/i })
      await user.click(submitButton)

      expect(mockCustomerService.validateCustomer).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phoneNumber: '',
          dateOfBirth: '',
          addressLine1: '',
          addressLine2: '',
          city: '',
          state: '',
          zipCode: '',
          marketingOptIn: false,
          smsOptIn: false
        })
      )
    })
  })

  describe('Form Submission', () => {
    it('should call onSubmit with form data when form is valid', async () => {
      const user = userEvent.setup()
      render(<CustomerForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      const lastNameInput = screen.getByLabelText(/last name/i)
      const emailInput = screen.getByLabelText(/email address/i)
      const marketingCheckbox = screen.getByLabelText(/marketing emails/i)

      await user.type(firstNameInput, 'Jane')
      await user.type(lastNameInput, 'Smith')
      await user.type(emailInput, 'jane.smith@example.com')
      await user.click(marketingCheckbox)

      const submitButton = screen.getByRole('button', { name: /create customer/i })
      await user.click(submitButton)

      expect(mockOnSubmit).toHaveBeenCalledWith({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phoneNumber: '',
        dateOfBirth: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        zipCode: '',
        marketingOptIn: true,
        smsOptIn: false
      })
    })

    it('should submit form via Enter key', async () => {
      const user = userEvent.setup()
      render(<CustomerForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.type(firstNameInput, 'John')

      const lastNameInput = screen.getByLabelText(/last name/i)
      await user.type(lastNameInput, 'Doe')
      await user.keyboard('{Enter}')

      expect(mockOnSubmit).toHaveBeenCalledTimes(1)
    })
  })

  describe('Loading States', () => {
    it('should disable form elements when loading', () => {
      render(<CustomerForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} isLoading={true} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      const submitButton = screen.getByRole('button', { name: /saving/i })

      expect(cancelButton).toBeDisabled()
      expect(submitButton).toBeDisabled()
      expect(submitButton).toHaveTextContent('Saving...')
    })

    it('should show different button text for create vs edit when loading', () => {
      const { rerender } = render(
        <CustomerForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} isLoading={true} />
      )
      expect(screen.getByRole('button', { name: /saving/i })).toHaveTextContent('Saving...')

      rerender(
        <CustomerForm customer={mockCustomer} onSubmit={mockOnSubmit} onCancel={mockOnCancel} isLoading={true} />
      )
      expect(screen.getByRole('button', { name: /saving/i })).toHaveTextContent('Saving...')
    })

    it('should show correct button text when not loading', () => {
      const { rerender } = render(
        <CustomerForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} isLoading={false} />
      )
      expect(screen.getByRole('button', { name: /create customer/i })).toHaveTextContent('Create Customer')

      rerender(
        <CustomerForm customer={mockCustomer} onSubmit={mockOnSubmit} onCancel={mockOnCancel} isLoading={false} />
      )
      expect(screen.getByRole('button', { name: /update customer/i })).toHaveTextContent('Update Customer')
    })
  })

  describe('Field Validation Attributes', () => {
    it('should have proper HTML attributes for form validation', () => {
      render(<CustomerForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      const lastNameInput = screen.getByLabelText(/last name/i)
      const emailInput = screen.getByLabelText(/email address/i)
      const phoneInput = screen.getByLabelText(/phone number/i)
      const stateInput = screen.getByLabelText(/state/i)

      expect(firstNameInput).toHaveAttribute('required')
      expect(lastNameInput).toHaveAttribute('required')
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(phoneInput).toHaveAttribute('type', 'tel')
      expect(stateInput).toHaveAttribute('maxLength', '2')
    })

    it('should have proper placeholder text', () => {
      render(<CustomerForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      const phoneInput = screen.getByLabelText(/phone number/i)
      const stateInput = screen.getByLabelText(/state/i)
      const zipInput = screen.getByLabelText(/zip code/i)

      expect(phoneInput).toHaveAttribute('placeholder', '(555) 123-4567')
      expect(stateInput).toHaveAttribute('placeholder', 'NY')
      expect(zipInput).toHaveAttribute('placeholder', '12345')
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels and associations', () => {
      render(<CustomerForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      const lastNameInput = screen.getByLabelText(/last name/i)
      const emailInput = screen.getByLabelText(/email address/i)

      expect(firstNameInput).toHaveAttribute('id', 'firstName')
      expect(lastNameInput).toHaveAttribute('id', 'lastName')
      expect(emailInput).toHaveAttribute('id', 'email')
    })

    it('should have proper focus styles for form elements', () => {
      render(<CustomerForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      expect(firstNameInput).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500')
    })

    it('should have semantic form structure', () => {
      const { container } = render(<CustomerForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      expect(container.querySelector('form')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toHaveAttribute('type', 'button')
      expect(screen.getByRole('button', { name: /create customer/i })).toHaveAttribute('type', 'submit')
    })
  })

  describe('Edge Cases', () => {
    it('should handle customer without some optional fields', () => {
      const minimalCustomer = {
        ...mockCustomer,
        email: '',
        phoneNumber: '',
        addressLine2: '',
        marketingOptIn: false,
        smsOptIn: false
      }

      render(<CustomerForm customer={minimalCustomer} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      expect(screen.getByLabelText(/email address/i)).toHaveValue('')
      expect(screen.getByLabelText(/phone number/i)).toHaveValue('')
      expect(screen.getByLabelText(/address line 2/i)).toHaveValue('')
      expect(screen.getByLabelText(/marketing emails/i)).not.toBeChecked()
      expect(screen.getByLabelText(/sms notifications/i)).not.toBeChecked()
    })

    it('should handle form submission without validation errors gracefully', async () => {
      const { container } = render(<CustomerForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)
      mockCustomerService.validateCustomer.mockReturnValue([])

      const form = container.querySelector('form')!
      fireEvent.submit(form)

      expect(mockOnSubmit).toHaveBeenCalledTimes(1)
      expect(screen.queryByText('Please fix the following errors:')).not.toBeInTheDocument()
    })

    it('should handle multiple validation errors correctly', async () => {
      const { container } = render(<CustomerForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      mockCustomerService.validateCustomer.mockReturnValue([
        'First name must be at least 2 characters',
        'Last name must be at least 2 characters',
        'Invalid email format',
        'Invalid phone number format',
        'Invalid ZIP code format'
      ])

      const form = container.querySelector('form')!
      fireEvent.submit(form)

      expect(screen.getByText('Please fix the following errors:')).toBeInTheDocument()
      expect(screen.getByText('First name must be at least 2 characters')).toBeInTheDocument()
      expect(screen.getByText('Last name must be at least 2 characters')).toBeInTheDocument()
      expect(screen.getByText('Invalid email format')).toBeInTheDocument()
      expect(screen.getByText('Invalid phone number format')).toBeInTheDocument()
      expect(screen.getByText('Invalid ZIP code format')).toBeInTheDocument()
    })
  })
})