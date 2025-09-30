import { useQuery } from '@tanstack/react-query'
import { receiptService } from '../../services/receipts'

interface ReceiptDisplayProps {
  transactionId: string
  onClose?: () => void
  onPrint?: () => void
  className?: string
}

export function ReceiptDisplay({ 
  transactionId, 
  onClose, 
  onPrint,
  className = ""
}: ReceiptDisplayProps) {
  const { data: receipt, isLoading, error } = useQuery({
    queryKey: ['receipt', transactionId],
    queryFn: () => receiptService.generateReceipt(transactionId),
    enabled: !!transactionId
  })

  const handlePrint = async () => {
    try {
      if (receipt) {
        // Open print dialog with formatted receipt
        const printWindow = window.open('', '_blank', 'width=400,height=600')
        if (printWindow) {
          printWindow.document.write(receiptService.formatReceiptHTML(receipt))
          printWindow.document.close()
          printWindow.print()
        }
      }
      onPrint?.()
    } catch (error) {
      console.error('Print failed:', error)
      alert('Failed to print receipt')
    }
  }

  const handlePOSPrint = async () => {
    try {
      await receiptService.printReceipt(transactionId)
      alert('Receipt sent to POS printer')
    } catch (error) {
      console.error('POS print failed:', error)
      alert('Failed to send receipt to printer')
    }
  }

  if (isLoading) {
    return (
      <div className={`bg-white p-6 rounded-lg shadow ${className}`}>
        <div className="text-center">
          <p>Loading receipt...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white p-6 rounded-lg shadow ${className}`}>
        <div className="text-center text-red-600">
          <p>Error loading receipt</p>
          <p className="text-sm">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    )
  }

  if (!receipt) {
    return (
      <div className={`bg-white p-6 rounded-lg shadow ${className}`}>
        <div className="text-center text-gray-500">
          <p>Receipt not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header with Actions */}
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="text-lg font-medium">Receipt {receipt.receiptNumber}</h3>
        <div className="flex space-x-2">
          <button
            onClick={handlePrint}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Print
          </button>
          <button
            onClick={handlePOSPrint}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            POS Print
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Receipt Content */}
      <div className="p-6">
        <div className="max-w-sm mx-auto font-mono text-sm">
          {/* Store Header */}
          <div className="text-center border-b-2 border-gray-800 pb-3 mb-4">
            <div className="font-bold text-lg">{receipt.storeInfo.name}</div>
            <div className="text-sm">{receipt.storeInfo.address}</div>
            {receipt.storeInfo.phone && (
              <div className="text-sm">{receipt.storeInfo.phone}</div>
            )}
          </div>

          {/* Transaction Info */}
          <div className="mb-4 text-xs">
            <div>Receipt: {receipt.receiptNumber}</div>
            <div>Date: {new Date(receipt.transactionDate).toLocaleString()}</div>
            <div>Cashier: {receipt.employee}</div>
            {receipt.customer && (
              <div>Customer: {receipt.customer}</div>
            )}
          </div>

          {/* Line Items */}
          <div className="border-t border-gray-400 pt-2 mb-3">
            <div className="flex justify-between text-xs font-medium mb-1">
              <span>QTY ITEM</span>
              <span>PRICE   TOTAL</span>
            </div>
            <div className="border-b border-gray-400 mb-2"></div>
            
            {receipt.lineItems.map((item, index) => (
              <div key={index} className="mb-2">
                <div className="flex justify-between text-xs">
                  <span>{item.quantity} {item.name.length > 15 ? item.name.substring(0, 12) + '...' : item.name}</span>
                  <span>${item.unitPrice.toFixed(2)} ${item.lineTotal.toFixed(2)}</span>
                </div>
                <div className="text-xs text-gray-600 pl-2">
                  SKU: {item.sku}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-gray-400 pt-2 mb-3 text-xs">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${receipt.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax:</span>
              <span>${receipt.taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm border-t border-gray-400 pt-1">
              <span>TOTAL:</span>
              <span>${receipt.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Info */}
          <div className="mb-3 text-xs">
            <div>Payment: {receipt.paymentMethod}</div>
            {receipt.cashTendered && (
              <div>Cash Tendered: ${receipt.cashTendered.toFixed(2)}</div>
            )}
            {receipt.changeGiven && (
              <div>Change: ${receipt.changeGiven.toFixed(2)}</div>
            )}
          </div>

          {/* Loyalty Info */}
          {receipt.loyaltyPoints && (
            <div className="border border-blue-200 bg-blue-50 p-2 mb-3 text-xs">
              <div className="font-medium">LOYALTY PROGRAM</div>
              {receipt.loyaltyPoints.earned > 0 && (
                <div>Points Earned: {receipt.loyaltyPoints.earned}</div>
              )}
              {receipt.loyaltyPoints.redeemed > 0 && (
                <div>Points Redeemed: {receipt.loyaltyPoints.redeemed}</div>
              )}
              <div>Current Balance: {receipt.loyaltyPoints.balance}</div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t-2 border-gray-800 pt-3 text-center text-xs">
            <div className="font-medium">Thank you for your business!</div>
            <div>Please come again!</div>
            <div className="mt-2 text-xs text-gray-600">
              <div>No returns without receipt</div>
              <div>All sales final on tobacco products</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}