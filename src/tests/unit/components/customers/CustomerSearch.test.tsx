import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomerSearch } from '../../../../shared/components/customers/CustomerSearch'
import { useSearchCustomers } from '../../../../shared/hooks/useCustomers'
import type { CustomerSearchResult } from '../../../../shared/types/customers'

// Mock the useSearchCustomers hook
jest.mock('../../../../shared/hooks/useCustomers')
const mockUseSearchCustomers = useSearchCustomers as jest.MockedFunction<typeof useSearchCustomers>

describe('CustomerSearch Component', () => {
  const mockOnSelectCustomer = jest.fn()
  const mockOnClearCustomer = jest.fn()

  const mockSearchResults: CustomerSearchResult[] = [
    {
      id: 'cust-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phoneNumber: '5551234567',
      loyaltyTier: 'SILVER',
      loyaltyPoints: 1250
    },
    {
      id: 'cust-2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phoneNumber: '5559876543',
      loyaltyTier: 'GOLD',
      loyaltyPoints: 3200
    },
    {
      id: 'cust-3',
      firstName: 'Bob',
      lastName: 'Wilson',
      loyaltyTier: 'BRONZE',
      loyaltyPoints: 150
      // Missing email and phoneNumber
    }
  ]

  const mockSelectedCustomer: CustomerSearchResult = mockSearchResults[0]

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSearchCustomers.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    } as any)
  })

  describe('Initial Rendering', () => {
    it('should render search input with default placeholder', () => {
      render(<CustomerSearch onSelectCustomer={mockOnSelectCustomer} />)

      const searchInput = screen.getByPlaceholderText('Search customers by name, email, or phone...')
      expect(searchInput).toBeInTheDocument()
      expect(searchInput).toHaveValue('')
    })

    it('should render search input with custom placeholder', () => {
      render(
        <CustomerSearch
          onSelectCustomer={mockOnSelectCustomer}
          placeholder="Find a customer..."
        />
      )

      expect(screen.getByPlaceholderText('Find a customer...')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(
        <CustomerSearch
          onSelectCustomer={mockOnSelectCustomer}
          className="custom-search"
        />
      )

      expect(container.firstChild).toHaveClass('custom-search')
    })

    it('should show search icon when input is empty', () => {
      const { container } = render(<CustomerSearch onSelectCustomer={mockOnSelectCustomer} />)

      const searchIcon = container.querySelector('svg[viewBox="0 0 24 24"]')
      expect(searchIcon).toBeInTheDocument()
    })
  })

  describe('Search Input Interaction', () => {
    it('should update input value when user types', async () => {
      const user = userEvent.setup()
      render(<CustomerSearch onSelectCustomer={mockOnSelectCustomer} />)

      const searchInput = screen.getByPlaceholderText(/search customers/i)
      await user.type(searchInput, 'John')

      expect(searchInput).toHaveValue('John')
    })

    it('should call useSearchCustomers with query when typing', async () => {
      const user = userEvent.setup()
      render(<CustomerSearch onSelectCustomer={mockOnSelectCustomer} />)

      const searchInput = screen.getByPlaceholderText(/search customers/i)
      await user.type(searchInput, 'John')

      expect(mockUseSearchCustomers).toHaveBeenCalledWith('John')
    })

    it('should show clear button when input has value', async () => {
      const user = userEvent.setup()
      render(<CustomerSearch onSelectCustomer={mockOnSelectCustomer} />)

      const searchInput = screen.getByPlaceholderText(/search customers/i)
      await user.type(searchInput, 'John')

      expect(screen.getByRole('button')).toBeInTheDocument()
      expect(screen.getByRole('button').querySelector('svg')).toBeInTheDocument()
    })

    it('should clear input when clear button is clicked', async () => {
      const user = userEvent.setup()
      render(<CustomerSearch onSelectCustomer={mockOnSelectCustomer} />)

      const searchInput = screen.getByPlaceholderText(/search customers/i)
      await user.type(searchInput, 'John')

      const clearButton = screen.getByRole('button')
      await user.click(clearButton)

      expect(searchInput).toHaveValue('')
      expect(searchInput).toHaveFocus()
    })

    it('should call onClearCustomer when typing and customer is selected', async () => {
      const user = userEvent.setup()
      render(
        <CustomerSearch
          onSelectCustomer={mockOnSelectCustomer}
          onClearCustomer={mockOnClearCustomer}
          selectedCustomer={mockSelectedCustomer}
        />
      )

      const searchInput = screen.getByPlaceholderText(/search customers/i)
      await user.type(searchInput, 'Jane')

      expect(mockOnClearCustomer).toHaveBeenCalled()
    })
  })

  describe('Search Results Dropdown', () => {
    beforeEach(() => {
      mockUseSearchCustomers.mockReturnValue({
        data: mockSearchResults,
        isLoading: false,
        error: null,
        refetch: jest.fn()
      } as any)
    })

    it('should show dropdown when input is focused and has results', async () => {
      const user = userEvent.setup()
      render(<CustomerSearch onSelectCustomer={mockOnSelectCustomer} />)

      const searchInput = screen.getByPlaceholderText(/search customers/i)
      await user.type(searchInput, 'John')
      await user.click(searchInput) // Focus input

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
    })

    it('should display customer information correctly in dropdown', async () => {
      const user = userEvent.setup()
      render(<CustomerSearch onSelectCustomer={mockOnSelectCustomer} />)

      const searchInput = screen.getByPlaceholderText(/search customers/i)
      await user.type(searchInput, 'John')

      // Check first customer details
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
      expect(screen.getByText('(555) 123-4567')).toBeInTheDocument()
      expect(screen.getByText('SILVER')).toBeInTheDocument()
      expect(screen.getByText('1,250 pts')).toBeInTheDocument()

      // Check customer without optional fields
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
      expect(screen.getByText('150 pts')).toBeInTheDocument()
    })

    it('should apply correct tier colors in dropdown', async () => {
      const user = userEvent.setup()
      render(<CustomerSearch onSelectCustomer={mockOnSelectCustomer} />)

      const searchInput = screen.getByPlaceholderText(/search customers/i)
      await user.type(searchInput, 'test')

      const silverTier = screen.getByText('SILVER')
      expect(silverTier).toHaveClass('text-gray-600')

      const goldTier = screen.getByText('GOLD')
      expect(goldTier).toHaveClass('text-yellow-600')

      const bronzeTier = screen.getByText('BRONZE')
      expect(bronzeTier).toHaveClass('text-amber-600')
    })

    it('should format phone numbers correctly in dropdown', async () => {
      const user = userEvent.setup()
      render(<CustomerSearch onSelectCustomer={mockOnSelectCustomer} />)

      const searchInput = screen.getByPlaceholderText(/search customers/i)
      await user.type(searchInput, 'test')

      expect(screen.getByText('(555) 123-4567')).toBeInTheDocument()
      expect(screen.getByText('(555) 987-6543')).toBeInTheDocument()
    })

    it('should not show dropdown when query is less than 2 characters', async () => {
      const user = userEvent.setup()
      render(<CustomerSearch onSelectCustomer={mockOnSelectCustomer} />)

      const searchInput = screen.getByPlaceholderText(/search customers/i)
      await user.type(searchInput, 'J')

      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    })

    it('should not show dropdown when input is not focused', () => {
      render(<CustomerSearch onSelectCustomer={mockOnSelectCustomer} />)

      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    })
  })

  describe('Customer Selection', () => {
    beforeEach(() => {
      mockUseSearchCustomers.mockReturnValue({
        data: mockSearchResults,
        isLoading: false,
        error: null,
        refetch: jest.fn()
      } as any)
    })

    it('should call onSelectCustomer when customer is clicked', async () => {
      const user = userEvent.setup()
      render(<CustomerSearch onSelectCustomer={mockOnSelectCustomer} />)

      const searchInput = screen.getByPlaceholderText(/search customers/i)
      await user.type(searchInput, 'John')

      const customerOption = screen.getByText('John Doe')
      await user.click(customerOption)

      expect(mockOnSelectCustomer).toHaveBeenCalledWith(mockSearchResults[0])
    })

    it('should update input value with selected customer name', async () => {
      const user = userEvent.setup()
      render(<CustomerSearch onSelectCustomer={mockOnSelectCustomer} />)

      const searchInput = screen.getByPlaceholderText(/search customers/i)
      await user.type(searchInput, 'John')

      const customerOption = screen.getByText('John Doe')
      await user.click(customerOption)

      expect(searchInput).toHaveValue('John Doe')
    })

    it('should close dropdown and blur input after selection', async () => {
      const user = userEvent.setup()
      render(<CustomerSearch onSelectCustomer={mockOnSelectCustomer} />)

      const searchInput = screen.getByPlaceholderText(/search customers/i)
      await user.type(searchInput, 'John')

      const customerOption = screen.getByText('John Doe')
      await user.click(customerOption)

      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
      expect(searchInput).not.toHaveFocus()
    })
  })

  describe('No Results State', () => {
    beforeEach(() => {
      mockUseSearchCustomers.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn()
      } as any)
    })

    it('should show no results message when no customers found', async () => {
      const user = userEvent.setup()
      render(<CustomerSearch onSelectCustomer={mockOnSelectCustomer} />)

      const searchInput = screen.getByPlaceholderText(/search customers/i)
      await user.type(searchInput, 'NonExistent')

      expect(screen.getByText('No customers found')).toBeInTheDocument()
      expect(screen.getByText('Try a different search term')).toBeInTheDocument()
    })

    it('should not show no results for queries less than 2 characters', async () => {
      const user = userEvent.setup()
      render(<CustomerSearch onSelectCustomer={mockOnSelectCustomer} />)

      const searchInput = screen.getByPlaceholderText(/search customers/i)
      await user.type(searchInput, 'X')

      expect(screen.queryByText('No customers found')).not.toBeInTheDocument()
    })
  })

  describe('Selected Customer Display', () => {
    it('should show selected customer when provided', () => {
      render(
        <CustomerSearch
          onSelectCustomer={mockOnSelectCustomer}
          selectedCustomer={mockSelectedCustomer}
        />
      )

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('SILVER Member')).toBeInTheDocument()
      expect(screen.getByText('1,250 points')).toBeInTheDocument()
      expect(screen.getByText('Change')).toBeInTheDocument()
    })

    it('should not show selected customer display when none selected', () => {
      render(<CustomerSearch onSelectCustomer={mockOnSelectCustomer} />)

      expect(screen.queryByText('SILVER Member')).not.toBeInTheDocument()
      expect(screen.queryByText('Change')).not.toBeInTheDocument()
    })

    it('should apply correct tier color for selected customer', () => {
      const platinumCustomer = { ...mockSelectedCustomer, loyaltyTier: 'PLATINUM' as const }
      render(
        <CustomerSearch
          onSelectCustomer={mockOnSelectCustomer}
          selectedCustomer={platinumCustomer}
        />
      )

      const tierText = screen.getByText('PLATINUM Member')
      expect(tierText).toHaveClass('text-purple-600')
    })

    it('should call onClearCustomer when Change button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <CustomerSearch
          onSelectCustomer={mockOnSelectCustomer}
          onClearCustomer={mockOnClearCustomer}
          selectedCustomer={mockSelectedCustomer}
        />
      )

      const changeButton = screen.getByText('Change')
      await user.click(changeButton)

      expect(mockOnClearCustomer).toHaveBeenCalled()
    })

    it('should show clear button when customer is selected', () => {
      render(
        <CustomerSearch
          onSelectCustomer={mockOnSelectCustomer}
          selectedCustomer={mockSelectedCustomer}
        />
      )

      // Should have clear button and change button
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(2)
    })
  })

  describe('Click Outside Behavior', () => {
    beforeEach(() => {
      mockUseSearchCustomers.mockReturnValue({
        data: mockSearchResults,
        isLoading: false,
        error: null,
        refetch: jest.fn()
      } as any)
    })

    it('should close dropdown when clicking outside', async () => {
      const user = userEvent.setup()
      render(
        <div>
          <CustomerSearch onSelectCustomer={mockOnSelectCustomer} />
          <div data-testid="outside">Outside element</div>
        </div>
      )

      const searchInput = screen.getByPlaceholderText(/search customers/i)
      await user.type(searchInput, 'John')

      // Dropdown should be open
      expect(screen.getByText('John Doe')).toBeInTheDocument()

      // Click outside
      const outsideElement = screen.getByTestId('outside')
      fireEvent.mouseDown(outsideElement)

      // Dropdown should close
      await waitFor(() => {
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
      })
    })

    it('should not close dropdown when clicking inside dropdown', async () => {
      const user = userEvent.setup()
      render(<CustomerSearch onSelectCustomer={mockOnSelectCustomer} />)

      const searchInput = screen.getByPlaceholderText(/search customers/i)
      await user.type(searchInput, 'John')

      const dropdown = screen.getByText('John Doe').closest('div')
      fireEvent.mouseDown(dropdown!)

      // Dropdown should remain open
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper input attributes', () => {
      render(<CustomerSearch onSelectCustomer={mockOnSelectCustomer} />)

      const searchInput = screen.getByPlaceholderText(/search customers/i)
      expect(searchInput).toHaveAttribute('type', 'text')
    })

    it('should have proper focus styles', () => {
      render(<CustomerSearch onSelectCustomer={mockOnSelectCustomer} />)

      const searchInput = screen.getByPlaceholderText(/search customers/i)
      expect(searchInput).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500')
    })

    it('should have proper button roles for interactive elements', () => {
      render(
        <CustomerSearch
          onSelectCustomer={mockOnSelectCustomer}
          selectedCustomer={mockSelectedCustomer}
        />
      )

      // Check for clear button (X icon) and change button
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(2)

      // Change button should have text content
      const changeButton = screen.getByRole('button', { name: /change/i })
      expect(changeButton).toBeInTheDocument()
    })

    it('should have proper hover states', async () => {
      const user = userEvent.setup()
      mockUseSearchCustomers.mockReturnValue({
        data: mockSearchResults,
        isLoading: false,
        error: null,
        refetch: jest.fn()
      } as any)

      render(<CustomerSearch onSelectCustomer={mockOnSelectCustomer} />)

      const searchInput = screen.getByPlaceholderText(/search customers/i)
      await user.type(searchInput, 'John')

      // Find the customer option with hover classes
      const customerOption = screen.getByText('John Doe').closest('.hover\\:bg-gray-50')
      expect(customerOption).toHaveClass('hover:bg-gray-50', 'cursor-pointer')
    })
  })

  describe('Edge Cases', () => {
    it('should handle customers with missing optional fields', async () => {
      const user = userEvent.setup()
      const customersWithMissingFields: CustomerSearchResult[] = [
        {
          id: 'cust-1',
          firstName: 'John',
          lastName: 'Doe',
          loyaltyTier: 'BRONZE',
          loyaltyPoints: 100
          // Missing email and phoneNumber
        }
      ]

      mockUseSearchCustomers.mockReturnValue({
        data: customersWithMissingFields,
        isLoading: false,
        error: null,
        refetch: jest.fn()
      } as any)

      render(<CustomerSearch onSelectCustomer={mockOnSelectCustomer} />)

      const searchInput = screen.getByPlaceholderText(/search customers/i)
      await user.type(searchInput, 'John')

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('100 pts')).toBeInTheDocument()
      expect(screen.queryByText('@')).not.toBeInTheDocument() // No email shown
      expect(screen.queryByText('(')).not.toBeInTheDocument() // No phone shown
    })

    it('should handle malformed phone numbers', async () => {
      const user = userEvent.setup()
      const customersWithBadPhone: CustomerSearchResult[] = [
        {
          id: 'cust-1',
          firstName: 'John',
          lastName: 'Doe',
          phoneNumber: '123-45', // Malformed
          loyaltyTier: 'BRONZE',
          loyaltyPoints: 100
        }
      ]

      mockUseSearchCustomers.mockReturnValue({
        data: customersWithBadPhone,
        isLoading: false,
        error: null,
        refetch: jest.fn()
      } as any)

      render(<CustomerSearch onSelectCustomer={mockOnSelectCustomer} />)

      const searchInput = screen.getByPlaceholderText(/search customers/i)
      await user.type(searchInput, 'John')

      expect(screen.getByText('123-45')).toBeInTheDocument() // Shows as-is
    })

    it('should handle very high loyalty points correctly', async () => {
      const user = userEvent.setup()
      const highPointsCustomer: CustomerSearchResult[] = [
        {
          id: 'cust-1',
          firstName: 'VIP',
          lastName: 'Customer',
          loyaltyTier: 'PLATINUM',
          loyaltyPoints: 999999
        }
      ]

      mockUseSearchCustomers.mockReturnValue({
        data: highPointsCustomer,
        isLoading: false,
        error: null,
        refetch: jest.fn()
      } as any)

      render(<CustomerSearch onSelectCustomer={mockOnSelectCustomer} />)

      const searchInput = screen.getByPlaceholderText(/search customers/i)
      await user.type(searchInput, 'VIP')

      expect(screen.getByText('999,999 pts')).toBeInTheDocument()
    })

    it('should handle unknown loyalty tiers with default color', async () => {
      const user = userEvent.setup()
      const unknownTierCustomer: CustomerSearchResult[] = [
        {
          id: 'cust-1',
          firstName: 'Test',
          lastName: 'Customer',
          loyaltyTier: 'UNKNOWN' as any,
          loyaltyPoints: 100
        }
      ]

      mockUseSearchCustomers.mockReturnValue({
        data: unknownTierCustomer,
        isLoading: false,
        error: null,
        refetch: jest.fn()
      } as any)

      render(<CustomerSearch onSelectCustomer={mockOnSelectCustomer} />)

      const searchInput = screen.getByPlaceholderText(/search customers/i)
      await user.type(searchInput, 'Test')

      const tierElement = screen.getByText('UNKNOWN')
      expect(tierElement).toHaveClass('text-gray-600')
    })

    it('should not break with null or undefined customer data', () => {
      expect(() => {
        render(
          <CustomerSearch
            onSelectCustomer={mockOnSelectCustomer}
            selectedCustomer={null}
          />
        )
      }).not.toThrow()
    })
  })
})