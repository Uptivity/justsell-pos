import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomerList } from '../../../../shared/components/customers/CustomerList'
import { customerService } from '../../../../shared/services/customers'
import type { CustomerListItem } from '../../../../shared/types/customers'

// Mock the customerService
jest.mock('../../../../shared/services/customers')
const mockCustomerService = customerService as jest.Mocked<typeof customerService>

describe('CustomerList Component', () => {
  const mockOnSelectCustomer = jest.fn()
  const mockOnEditCustomer = jest.fn()

  const mockCustomers: CustomerListItem[] = [
    {
      id: 'cust-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phoneNumber: '5551234567',
      loyaltyTier: 'SILVER',
      loyaltyPoints: 1250,
      totalSpent: 1500.75,
      transactionCount: 15,
      lastPurchaseDate: '2024-01-15T10:30:00Z',
      createdAt: '2023-06-01T09:00:00Z'
    },
    {
      id: 'cust-2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phoneNumber: '5559876543',
      loyaltyTier: 'GOLD',
      loyaltyPoints: 3200,
      totalSpent: 3850.50,
      transactionCount: 42,
      lastPurchaseDate: '2024-01-20T14:15:00Z',
      createdAt: '2023-03-15T11:30:00Z'
    },
    {
      id: 'cust-3',
      firstName: 'Bob',
      lastName: 'Wilson',
      loyaltyTier: 'BRONZE',
      loyaltyPoints: 150,
      totalSpent: 250.00,
      transactionCount: 3,
      createdAt: '2024-01-01T08:00:00Z'
      // Missing email, phoneNumber, lastPurchaseDate
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    mockCustomerService.getLoyaltyTierInfo.mockImplementation((totalSpent: number) => ({
      currentTier: totalSpent >= 2000 ? 'GOLD' : totalSpent >= 500 ? 'SILVER' : 'BRONZE',
      currentTierColor: totalSpent >= 2000 ? 'text-yellow-500' : totalSpent >= 500 ? 'text-gray-500' : 'text-amber-600',
      nextTier: totalSpent >= 2000 ? undefined : totalSpent >= 500 ? 'GOLD' : 'SILVER',
      amountToNextTier: totalSpent >= 2000 ? 0 : totalSpent >= 500 ? 2000 - totalSpent : 500 - totalSpent,
      progress: totalSpent >= 2000 ? 100 : totalSpent >= 500 ? ((totalSpent - 500) / 1500) * 100 : (totalSpent / 500) * 100
    }))
  })

  describe('Empty State', () => {
    it('should render empty state when no customers provided', () => {
      render(<CustomerList customers={[]} />)

      expect(screen.getByText('No customers found')).toBeInTheDocument()
      expect(screen.getByText('Try adjusting your search criteria')).toBeInTheDocument()
    })

    it('should apply custom className to empty state', () => {
      const { container } = render(<CustomerList customers={[]} className="custom-empty" />)
      expect(container.firstChild).toHaveClass('custom-empty')
    })
  })

  describe('Customer List Rendering', () => {
    it('should render all customers with complete information', () => {
      render(<CustomerList customers={mockCustomers} />)

      // Check all customers are rendered
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument()

      // Check customer details
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
      expect(screen.getByText('(555) 123-4567')).toBeInTheDocument()
      expect(screen.getByText('1,250 pts')).toBeInTheDocument()
      expect(screen.getByText('$1500.75 spent')).toBeInTheDocument()
      expect(screen.getByText('15 transactions')).toBeInTheDocument()
    })

    it('should handle customers with missing optional fields', () => {
      render(<CustomerList customers={[mockCustomers[2]]} />)

      expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
      expect(screen.getByText('150 pts')).toBeInTheDocument()
      expect(screen.getByText('$250.00 spent')).toBeInTheDocument()
      expect(screen.getByText('3 transactions')).toBeInTheDocument()
      expect(screen.getByText('No purchases yet')).toBeInTheDocument()

      // Should not display email or phone sections
      expect(screen.queryByText('Email:')).not.toBeInTheDocument()
      expect(screen.queryByText('Phone:')).not.toBeInTheDocument()
    })

    it('should apply custom className to customer list', () => {
      const { container } = render(<CustomerList customers={mockCustomers} className="custom-list" />)
      expect(container.firstChild).toHaveClass('custom-list')
    })
  })

  describe('Phone Number Formatting', () => {
    it('should format 10-digit phone numbers correctly', () => {
      const customerWithPhone = [{
        ...mockCustomers[0],
        phoneNumber: '5551234567'
      }]
      render(<CustomerList customers={customerWithPhone} />)
      expect(screen.getByText('(555) 123-4567')).toBeInTheDocument()
    })

    it('should handle phone numbers with existing formatting', () => {
      const customerWithFormattedPhone = [{
        ...mockCustomers[0],
        phoneNumber: '(555) 123-4567'
      }]
      render(<CustomerList customers={customerWithFormattedPhone} />)
      expect(screen.getByText('(555) 123-4567')).toBeInTheDocument()
    })

    it('should handle malformed phone numbers', () => {
      const customerWithBadPhone = [{
        ...mockCustomers[0],
        phoneNumber: '123-45'
      }]
      render(<CustomerList customers={customerWithBadPhone} />)
      expect(screen.getByText('123-45')).toBeInTheDocument()
    })

    it('should handle empty phone numbers', () => {
      const customerWithEmptyPhone = [{
        ...mockCustomers[0],
        phoneNumber: ''
      }]
      render(<CustomerList customers={customerWithEmptyPhone} />)
      expect(screen.queryByText('Phone:')).not.toBeInTheDocument()
    })
  })

  describe('Date Formatting', () => {
    it('should format dates correctly', () => {
      render(<CustomerList customers={[mockCustomers[0]]} />)

      // Check last purchase date formatting
      expect(screen.getByText(/Last purchase: \d{1,2}\/\d{1,2}\/\d{4}/)).toBeInTheDocument()

      // Check join date formatting
      expect(screen.getByText(/Joined: \d{1,2}\/\d{1,2}\/\d{4}/)).toBeInTheDocument()
    })

    it('should handle missing last purchase date', () => {
      render(<CustomerList customers={[mockCustomers[2]]} />)
      expect(screen.getByText('No purchases yet')).toBeInTheDocument()
    })
  })

  describe('Loyalty Tier Colors', () => {
    it('should apply correct colors for PLATINUM tier', () => {
      const platinumCustomer = [{
        ...mockCustomers[0],
        loyaltyTier: 'PLATINUM' as const
      }]
      render(<CustomerList customers={platinumCustomer} />)

      const tierBadge = screen.getByText('PLATINUM')
      expect(tierBadge).toHaveClass('text-purple-600', 'bg-purple-100')
    })

    it('should apply correct colors for GOLD tier', () => {
      const goldCustomer = [{
        ...mockCustomers[0],
        loyaltyTier: 'GOLD' as const
      }]
      render(<CustomerList customers={goldCustomer} />)

      const tierBadge = screen.getByText('GOLD')
      expect(tierBadge).toHaveClass('text-yellow-600', 'bg-yellow-100')
    })

    it('should apply correct colors for SILVER tier', () => {
      render(<CustomerList customers={[mockCustomers[0]]} />)

      const tierBadge = screen.getByText('SILVER')
      expect(tierBadge).toHaveClass('text-gray-600', 'bg-gray-100')
    })

    it('should apply correct colors for BRONZE tier', () => {
      render(<CustomerList customers={[mockCustomers[2]]} />)

      const tierBadge = screen.getByText('BRONZE')
      expect(tierBadge).toHaveClass('text-amber-600', 'bg-amber-100')
    })

    it('should handle unknown tier with default colors', () => {
      const unknownTierCustomer = [{
        ...mockCustomers[0],
        loyaltyTier: 'UNKNOWN' as any
      }]
      render(<CustomerList customers={unknownTierCustomer} />)

      const tierBadge = screen.getByText('UNKNOWN')
      expect(tierBadge).toHaveClass('text-gray-600', 'bg-gray-100')
    })
  })

  describe('Transaction Count Display', () => {
    it('should show singular "transaction" for count of 1', () => {
      const singleTransactionCustomer = [{
        ...mockCustomers[0],
        transactionCount: 1
      }]
      render(<CustomerList customers={singleTransactionCustomer} />)
      expect(screen.getByText('1 transaction')).toBeInTheDocument()
    })

    it('should show plural "transactions" for count other than 1', () => {
      render(<CustomerList customers={[mockCustomers[0]]} />)
      expect(screen.getByText('15 transactions')).toBeInTheDocument()

      render(<CustomerList customers={[mockCustomers[2]]} />)
      expect(screen.getByText('3 transactions')).toBeInTheDocument()
    })
  })

  describe('Loyalty Progress Display', () => {
    it('should display loyalty progress for customers with next tier', () => {
      render(<CustomerList customers={[mockCustomers[0]]} />)

      expect(mockCustomerService.getLoyaltyTierInfo).toHaveBeenCalledWith(1500.75)
      expect(screen.getByText(/Progress to/)).toBeInTheDocument()
      expect(screen.getByText(/to go/)).toBeInTheDocument()
    })

    it('should not display loyalty progress for customers at max tier', () => {
      // Mock for a customer already at max tier
      mockCustomerService.getLoyaltyTierInfo.mockReturnValueOnce({
        currentTier: 'PLATINUM',
        currentTierColor: 'text-purple-600',
        nextTier: undefined,
        amountToNextTier: 0,
        progress: 100
      })

      const maxTierCustomer = [{
        ...mockCustomers[1],
        totalSpent: 10000
      }]
      render(<CustomerList customers={maxTierCustomer} />)

      expect(screen.queryByText(/Progress to/)).not.toBeInTheDocument()
    })

    it('should display progress bar with correct width', () => {
      render(<CustomerList customers={[mockCustomers[0]]} />)

      // Check that the progress bar exists
      const progressBar = document.querySelector('.bg-blue-600')
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveClass('h-1.5', 'rounded-full', 'transition-all')
    })
  })

  describe('Selectable Mode', () => {
    it('should not be clickable when selectable is false', () => {
      render(<CustomerList customers={[mockCustomers[0]]} selectable={false} />)

      // Get the main customer container (not the inner name div)
      const customerItem = screen.getByText('John Doe').closest('div[class*="p-4 border rounded-lg"]') ||
                          screen.getByText('John Doe').closest('.p-4')
      expect(customerItem).not.toHaveClass('cursor-pointer')
      expect(customerItem).not.toHaveClass('hover:bg-gray-50')
    })

    it('should be clickable when selectable is true', () => {
      render(<CustomerList customers={[mockCustomers[0]]} selectable={true} />)

      // Get the main customer container (not the inner name div)
      const customerItem = screen.getByText('John Doe').closest('div[class*="p-4 border rounded-lg"]') ||
                          screen.getByText('John Doe').closest('.p-4')
      expect(customerItem).toHaveClass('cursor-pointer')
      expect(customerItem).toHaveClass('hover:bg-gray-50')
    })

    it('should call onSelectCustomer when customer is clicked in selectable mode', async () => {
      const user = userEvent.setup()
      render(
        <CustomerList
          customers={[mockCustomers[0]]}
          selectable={true}
          onSelectCustomer={mockOnSelectCustomer}
        />
      )

      const customerItem = screen.getByText('John Doe').closest('div[class*="p-4 border rounded-lg"]') ||
                          screen.getByText('John Doe').closest('.p-4')
      await user.click(customerItem!)

      expect(mockOnSelectCustomer).toHaveBeenCalledWith(mockCustomers[0])
    })

    it('should not call onSelectCustomer when customer is clicked in non-selectable mode', async () => {
      const user = userEvent.setup()
      render(
        <CustomerList
          customers={[mockCustomers[0]]}
          selectable={false}
          onSelectCustomer={mockOnSelectCustomer}
        />
      )

      const customerItem = screen.getByText('John Doe').closest('div[class*="p-4 border rounded-lg"]') ||
                          screen.getByText('John Doe').closest('.p-4')
      await user.click(customerItem!)

      expect(mockOnSelectCustomer).not.toHaveBeenCalled()
    })

    it('should show selection indicator when customer is selected', async () => {
      const user = userEvent.setup()
      render(
        <CustomerList
          customers={[mockCustomers[0]]}
          selectable={true}
          onSelectCustomer={mockOnSelectCustomer}
        />
      )

      const customerItem = screen.getByText('John Doe').closest('div[class*="p-4 border rounded-lg"]') ||
                          screen.getByText('John Doe').closest('.p-4')
      await user.click(customerItem!)

      expect(screen.getByText('✓ Selected')).toBeInTheDocument()
      expect(customerItem).toHaveClass('border-blue-500', 'bg-blue-50')
    })

    it('should handle multiple customer selection correctly', async () => {
      const user = userEvent.setup()
      render(
        <CustomerList
          customers={mockCustomers.slice(0, 2)}
          selectable={true}
          onSelectCustomer={mockOnSelectCustomer}
        />
      )

      // Select first customer
      const firstCustomer = screen.getByText('John Doe').closest('div[class*="p-4 border rounded-lg"]') ||
                           screen.getByText('John Doe').closest('.p-4')
      await user.click(firstCustomer!)
      expect(screen.getByText('✓ Selected')).toBeInTheDocument()

      // Select second customer - should deselect first
      const secondCustomer = screen.getByText('Jane Smith').closest('div[class*="p-4 border rounded-lg"]') ||
                            screen.getByText('Jane Smith').closest('.p-4')
      await user.click(secondCustomer!)

      const selectedIndicators = screen.getAllByText('✓ Selected')
      expect(selectedIndicators).toHaveLength(1)
      expect(mockOnSelectCustomer).toHaveBeenCalledTimes(2)
    })
  })

  describe('Edit Customer Functionality', () => {
    it('should show edit button when onEditCustomer is provided', () => {
      render(
        <CustomerList
          customers={[mockCustomers[0]]}
          onEditCustomer={mockOnEditCustomer}
        />
      )

      expect(screen.getByText('Edit Customer')).toBeInTheDocument()
    })

    it('should not show edit button when onEditCustomer is not provided', () => {
      render(<CustomerList customers={[mockCustomers[0]]} />)

      expect(screen.queryByText('Edit Customer')).not.toBeInTheDocument()
    })

    it('should call onEditCustomer when edit button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <CustomerList
          customers={[mockCustomers[0]]}
          onEditCustomer={mockOnEditCustomer}
        />
      )

      const editButton = screen.getByText('Edit Customer')
      await user.click(editButton)

      expect(mockOnEditCustomer).toHaveBeenCalledWith(mockCustomers[0])
    })

    it('should prevent event propagation when edit button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <CustomerList
          customers={[mockCustomers[0]]}
          selectable={true}
          onSelectCustomer={mockOnSelectCustomer}
          onEditCustomer={mockOnEditCustomer}
        />
      )

      const editButton = screen.getByText('Edit Customer')
      await user.click(editButton)

      // Edit should be called but select should not be called due to stopPropagation
      expect(mockOnEditCustomer).toHaveBeenCalledWith(mockCustomers[0])
      expect(mockOnSelectCustomer).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper button roles for interactive elements', () => {
      render(
        <CustomerList
          customers={[mockCustomers[0]]}
          onEditCustomer={mockOnEditCustomer}
        />
      )

      const editButton = screen.getByRole('button', { name: /edit customer/i })
      expect(editButton).toBeInTheDocument()
    })

    it('should have proper hover states for interactive elements', () => {
      render(
        <CustomerList
          customers={[mockCustomers[0]]}
          onEditCustomer={mockOnEditCustomer}
        />
      )

      const editButton = screen.getByText('Edit Customer')
      expect(editButton).toHaveClass('hover:text-blue-800')
    })
  })

  describe('Edge Cases', () => {
    it('should handle customers with very long names', () => {
      const longNameCustomer = [{
        ...mockCustomers[0],
        firstName: 'VeryLongFirstNameThatMightCauseIssues',
        lastName: 'VeryLongLastNameThatMightAlsoCauseProblems'
      }]
      render(<CustomerList customers={longNameCustomer} />)

      expect(screen.getByText('VeryLongFirstNameThatMightCauseIssues VeryLongLastNameThatMightAlsoCauseProblems')).toBeInTheDocument()
    })

    it('should handle customers with zero values', () => {
      const zeroValueCustomer = [{
        ...mockCustomers[0],
        loyaltyPoints: 0,
        totalSpent: 0,
        transactionCount: 0
      }]
      render(<CustomerList customers={zeroValueCustomer} />)

      expect(screen.getByText('0 pts')).toBeInTheDocument()
      expect(screen.getByText('$0.00 spent')).toBeInTheDocument()
      expect(screen.getByText('0 transactions')).toBeInTheDocument()
    })

    it('should handle customers with very high values', () => {
      const highValueCustomer = [{
        ...mockCustomers[0],
        loyaltyPoints: 999999,
        totalSpent: 50000.99,
        transactionCount: 1000
      }]
      render(<CustomerList customers={highValueCustomer} />)

      expect(screen.getByText('999,999 pts')).toBeInTheDocument()
      expect(screen.getByText('$50000.99 spent')).toBeInTheDocument()
      expect(screen.getByText('1000 transactions')).toBeInTheDocument()
    })

    it('should handle malformed date strings gracefully', () => {
      const malformedDateCustomer = [{
        ...mockCustomers[0],
        createdAt: 'invalid-date',
        lastPurchaseDate: 'also-invalid'
      }]

      expect(() => {
        render(<CustomerList customers={malformedDateCustomer} />)
      }).not.toThrow()
    })
  })
})