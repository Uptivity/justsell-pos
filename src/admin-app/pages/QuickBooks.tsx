import { useState, useEffect } from 'react'
import { 
  useQuickBooksSyncStatus,
  useQuickBooksCompany,
  useChartOfAccounts,
  useAccountMapping,
  useUpdateAccountMapping,
  useSyncAllItems,
  useForceSyncAll,
  useDisconnectQuickBooks,
  useExportTransactions
} from '../../shared/hooks/useQuickBooks'
import { quickBooksService } from '../../shared/services/quickbooks'

export function QuickBooksPage() {
  const [isConnecting, setIsConnecting] = useState(false)
  const [showAccountMapping, setShowAccountMapping] = useState(false)
  const [exportDateRange, setExportDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })

  const { data: syncStatus, isLoading: statusLoading } = useQuickBooksSyncStatus()
  const { data: companyInfo, isLoading: companyLoading } = useQuickBooksCompany()
  const { data: accounts, isLoading: accountsLoading } = useChartOfAccounts()
  const { data: accountMapping } = useAccountMapping()
  
  const updateAccountMapping = useUpdateAccountMapping()
  const syncAllItems = useSyncAllItems()
  const forceSyncAll = useForceSyncAll()
  const disconnectQB = useDisconnectQuickBooks()
  const exportTransactions = useExportTransactions()

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const authUrl = await quickBooksService.getAuthUrl('connection_setup')
      window.open(authUrl, 'quickbooks_auth', 'width=600,height=700,scrollbars=yes,resizable=yes')
    } catch (error) {
      console.error('Failed to start QuickBooks connection:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (window.confirm('Are you sure you want to disconnect from QuickBooks? This will stop all synchronization.')) {
      try {
        await disconnectQB.mutateAsync()
        alert('Successfully disconnected from QuickBooks')
      } catch (error) {
        alert('Failed to disconnect from QuickBooks')
      }
    }
  }

  const handleSyncAll = async () => {
    if (window.confirm('This will sync all customers, products, and recent transactions. This may take a few minutes. Continue?')) {
      try {
        await forceSyncAll.mutateAsync()
        alert('Sync completed successfully')
      } catch (error) {
        alert('Sync failed. Please check the sync status for details.')
      }
    }
  }

  const handleExport = async () => {
    try {
      await exportTransactions.mutateAsync(exportDateRange)
    } catch (error) {
      alert('Export failed. Please try again.')
    }
  }

  if (statusLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading QuickBooks status...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">QuickBooks Integration</h1>
        {syncStatus?.connected && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-green-600 font-medium">Connected</span>
          </div>
        )}
      </div>

      {!syncStatus?.connected ? (
        // Connection Setup
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-4">Connect to QuickBooks</h2>
          <div className="space-y-4">
            <p className="text-gray-600">
              Connect your POS system to QuickBooks Online for seamless accounting and inventory management.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">What gets synchronized:</h3>
              <ul className="list-disc pl-5 text-blue-800 text-sm space-y-1">
                <li>Sales transactions and receipts</li>
                <li>Customer information and purchases</li>
                <li>Product inventory and pricing</li>
                <li>Tax calculations and reporting</li>
                <li>Payment methods and deposits</li>
              </ul>
            </div>
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isConnecting ? 'Connecting...' : 'Connect to QuickBooks'}
            </button>
          </div>
        </div>
      ) : (
        // Connected Dashboard
        <div className="space-y-6">
          {/* Company Information */}
          {companyInfo && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium mb-4">Company Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company Name</label>
                  <p className="mt-1 text-gray-900">{companyInfo.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <p className="mt-1 text-gray-900">{companyInfo.address}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="mt-1 text-gray-900">{companyInfo.phone}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-gray-900">{companyInfo.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Sync Status Dashboard */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">Synchronization Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{syncStatus?.customerCount || 0}</div>
                <div className="text-sm text-blue-800">Customers Synced</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{syncStatus?.itemCount || 0}</div>
                <div className="text-sm text-green-800">Products Synced</div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{syncStatus?.transactionCount || 0}</div>
                <div className="text-sm text-purple-800">Transactions Synced</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSyncAll}
                disabled={forceSyncAll.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {forceSyncAll.isPending ? 'Syncing...' : 'Sync All Data'}
              </button>
              
              <button
                onClick={() => syncAllItems.mutate()}
                disabled={syncAllItems.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {syncAllItems.isPending ? 'Syncing...' : 'Sync Inventory Only'}
              </button>

              <button
                onClick={() => setShowAccountMapping(!showAccountMapping)}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                {showAccountMapping ? 'Hide' : 'Show'} Account Mapping
              </button>
            </div>

            {syncStatus?.lastSync && (
              <p className="mt-4 text-sm text-gray-600">
                Last sync: {new Date(syncStatus.lastSync).toLocaleString()}
              </p>
            )}

            {syncStatus?.errors && syncStatus.errors.length > 0 && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-medium text-red-800 mb-2">Sync Errors:</h3>
                <ul className="list-disc pl-5 text-red-700 text-sm space-y-1">
                  {syncStatus.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Account Mapping */}
          {showAccountMapping && accounts && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium mb-4">Chart of Accounts Mapping</h2>
              <p className="text-gray-600 mb-4">
                Map your POS transactions to the correct QuickBooks accounts:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'salesAccount', label: 'Sales Revenue Account' },
                  { key: 'taxAccount', label: 'Sales Tax Payable' },
                  { key: 'cashAccount', label: 'Cash Account' },
                  { key: 'cardAccount', label: 'Credit Card Clearing' },
                  { key: 'giftCardAccount', label: 'Gift Cards Outstanding' },
                  { key: 'inventoryAccount', label: 'Inventory Asset' },
                  { key: 'cogsAccount', label: 'Cost of Goods Sold' },
                  { key: 'tobaccoTaxAccount', label: 'Tobacco Tax Payable' }
                ].map((mapping) => (
                  <div key={mapping.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {mapping.label}
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500">
                      <option value="">Select account...</option>
                      {accounts.map((account: any) => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.type})
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <button
                onClick={() => updateAccountMapping.mutate(accountMapping || {})}
                disabled={updateAccountMapping.isPending}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {updateAccountMapping.isPending ? 'Saving...' : 'Save Account Mapping'}
              </button>
            </div>
          )}

          {/* Export and Reporting */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">Export & Reporting</h2>
            <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={exportDateRange.startDate}
                    onChange={(e) => setExportDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={exportDateRange.endDate}
                    onChange={(e) => setExportDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleExport}
                  disabled={exportTransactions.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                >
                  {exportTransactions.isPending ? 'Exporting...' : 'Export Transactions'}
                </button>
              </div>
            </div>
          </div>

          {/* Connection Management */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">Connection Management</h2>
            <button
              onClick={handleDisconnect}
              disabled={disconnectQB.isPending}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
            >
              {disconnectQB.isPending ? 'Disconnecting...' : 'Disconnect QuickBooks'}
            </button>
            <p className="mt-2 text-sm text-gray-600">
              This will stop all synchronization between your POS and QuickBooks.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}