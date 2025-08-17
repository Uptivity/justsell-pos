import { quickBooksController } from '../../../api/controllers/quickbooks'

describe('QuickBooks Controller - Simple Tests', () => {
  it('should have getAuthUrl method', () => {
    expect(typeof quickBooksController.getAuthUrl).toBe('function')
  })

  it('should have handleOAuthCallback method', () => {
    expect(typeof quickBooksController.handleOAuthCallback).toBe('function')
  })

  it('should have getSyncStatus method', () => {
    expect(typeof quickBooksController.getSyncStatus).toBe('function')
  })

  it('should have syncCustomer method', () => {
    expect(typeof quickBooksController.syncCustomer).toBe('function')
  })

  it('should have syncAllItems method', () => {
    expect(typeof quickBooksController.syncAllItems).toBe('function')
  })

  it('should have forceSyncAll method', () => {
    expect(typeof quickBooksController.forceSyncAll).toBe('function')
  })

  it('should have disconnect method', () => {
    expect(typeof quickBooksController.disconnect).toBe('function')
  })
})