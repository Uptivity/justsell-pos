import { api } from './api'
import type { Receipt } from '../types/transactions'

export const receiptService = {
  // Generate receipt data from transaction
  async generateReceipt(transactionId: string): Promise<Receipt> {
    const response = await api.get(`/api/transactions/${transactionId}/receipt`)
    return response.data
  },

  // Print receipt (would integrate with POS printer)
  async printReceipt(transactionId: string): Promise<void> {
    await api.post(`/api/transactions/${transactionId}/print`)
  },

  // Format receipt for display/printing
  formatReceiptText(receipt: Receipt): string {
    const lines: string[] = []
    
    // Store Header
    lines.push('='.repeat(40))
    lines.push(receipt.storeInfo.name.toUpperCase().padStart((40 + receipt.storeInfo.name.length) / 2))
    lines.push(receipt.storeInfo.address.padStart((40 + receipt.storeInfo.address.length) / 2))
    if (receipt.storeInfo.phone) {
      lines.push(receipt.storeInfo.phone.padStart((40 + receipt.storeInfo.phone.length) / 2))
    }
    lines.push('='.repeat(40))
    lines.push('')

    // Transaction Info
    lines.push(`Receipt: ${receipt.receiptNumber}`)
    lines.push(`Date: ${new Date(receipt.transactionDate).toLocaleString()}`)
    lines.push(`Cashier: ${receipt.employee}`)
    if (receipt.customer) {
      lines.push(`Customer: ${receipt.customer}`)
    }
    lines.push('')
    lines.push('-'.repeat(40))

    // Line Items
    lines.push('QTY  ITEM                    PRICE   TOTAL')
    lines.push('-'.repeat(40))
    
    receipt.lineItems.forEach(item => {
      const qtyStr = item.quantity.toString().padStart(3)
      const nameStr = item.name.length > 20 ? item.name.substring(0, 17) + '...' : item.name.padEnd(20)
      const priceStr = `$${item.unitPrice.toFixed(2)}`.padStart(7)
      const totalStr = `$${item.lineTotal.toFixed(2)}`.padStart(8)
      
      lines.push(`${qtyStr}  ${nameStr} ${priceStr} ${totalStr}`)
      
      if (item.name.length > 20) {
        lines.push(`     SKU: ${item.sku}`)
      }
    })

    lines.push('-'.repeat(40))

    // Totals
    lines.push(`Subtotal:${`$${receipt.subtotal.toFixed(2)}`.padStart(32)}`)
    lines.push(`Tax:${`$${receipt.taxAmount.toFixed(2)}`.padStart(36)}`)
    lines.push(`TOTAL:${`$${receipt.totalAmount.toFixed(2)}`.padStart(34)}`)
    lines.push('')

    // Payment Info
    lines.push(`Payment: ${receipt.paymentMethod}`)
    if (receipt.cashTendered && receipt.changeGiven) {
      lines.push(`Cash Tendered: $${receipt.cashTendered.toFixed(2)}`)
      lines.push(`Change: $${receipt.changeGiven.toFixed(2)}`)
    }
    lines.push('')

    // Loyalty Info
    if (receipt.loyaltyPoints) {
      lines.push('LOYALTY PROGRAM')
      lines.push('-'.repeat(40))
      if (receipt.loyaltyPoints.earned > 0) {
        lines.push(`Points Earned: ${receipt.loyaltyPoints.earned}`)
      }
      if (receipt.loyaltyPoints.redeemed > 0) {
        lines.push(`Points Redeemed: ${receipt.loyaltyPoints.redeemed}`)
      }
      lines.push(`Current Balance: ${receipt.loyaltyPoints.balance}`)
      lines.push('')
    }

    // Footer
    lines.push('='.repeat(40))
    lines.push('Thank you for your business!')
    lines.push('Please come again!')
    lines.push('')
    lines.push('No returns without receipt')
    lines.push('All sales final on tobacco products')
    lines.push('='.repeat(40))

    return lines.join('\n')
  },

  // Generate receipt HTML for email/web display
  formatReceiptHTML(receipt: Receipt): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Receipt ${receipt.receiptNumber}</title>
          <style>
            body { font-family: 'Courier New', monospace; max-width: 400px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
            .store-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
            .transaction-info { margin-bottom: 15px; }
            .line-items { margin-bottom: 15px; }
            .line-items table { width: 100%; border-collapse: collapse; }
            .line-items th, .line-items td { text-align: left; padding: 2px; border-bottom: 1px solid #ccc; }
            .line-items th { border-bottom: 2px solid #000; }
            .totals { border-top: 2px solid #000; padding-top: 10px; margin-bottom: 15px; }
            .totals .total { font-weight: bold; font-size: 16px; }
            .loyalty { background: #f0f8ff; padding: 10px; border: 1px solid #0066cc; margin-bottom: 15px; }
            .footer { text-align: center; border-top: 2px solid #000; padding-top: 10px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="store-name">${receipt.storeInfo.name}</div>
            <div>${receipt.storeInfo.address}</div>
            ${receipt.storeInfo.phone ? `<div>${receipt.storeInfo.phone}</div>` : ''}
          </div>

          <div class="transaction-info">
            <div><strong>Receipt:</strong> ${receipt.receiptNumber}</div>
            <div><strong>Date:</strong> ${new Date(receipt.transactionDate).toLocaleString()}</div>
            <div><strong>Cashier:</strong> ${receipt.employee}</div>
            ${receipt.customer ? `<div><strong>Customer:</strong> ${receipt.customer}</div>` : ''}
          </div>

          <div class="line-items">
            <table>
              <thead>
                <tr>
                  <th>QTY</th>
                  <th>ITEM</th>
                  <th>PRICE</th>
                  <th>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                ${receipt.lineItems.map(item => `
                  <tr>
                    <td>${item.quantity}</td>
                    <td>${item.name}<br><small>SKU: ${item.sku}</small></td>
                    <td>$${item.unitPrice.toFixed(2)}</td>
                    <td>$${item.lineTotal.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="totals">
            <div>Subtotal: $${receipt.subtotal.toFixed(2)}</div>
            <div>Tax: $${receipt.taxAmount.toFixed(2)}</div>
            <div class="total">TOTAL: $${receipt.totalAmount.toFixed(2)}</div>
          </div>

          <div class="transaction-info">
            <div><strong>Payment:</strong> ${receipt.paymentMethod}</div>
            ${receipt.cashTendered ? `<div>Cash Tendered: $${receipt.cashTendered.toFixed(2)}</div>` : ''}
            ${receipt.changeGiven ? `<div>Change: $${receipt.changeGiven.toFixed(2)}</div>` : ''}
          </div>

          ${receipt.loyaltyPoints ? `
            <div class="loyalty">
              <strong>LOYALTY PROGRAM</strong><br>
              ${receipt.loyaltyPoints.earned > 0 ? `Points Earned: ${receipt.loyaltyPoints.earned}<br>` : ''}
              ${receipt.loyaltyPoints.redeemed > 0 ? `Points Redeemed: ${receipt.loyaltyPoints.redeemed}<br>` : ''}
              Current Balance: ${receipt.loyaltyPoints.balance}
            </div>
          ` : ''}

          <div class="footer">
            <div>Thank you for your business!</div>
            <div>Please come again!</div>
            <br>
            <div style="font-size: 10px;">
              No returns without receipt<br>
              All sales final on tobacco products
            </div>
          </div>
        </body>
      </html>
    `
  },

  // Email receipt to customer
  async emailReceipt(transactionId: string, customerEmail: string): Promise<void> {
    await api.post(`/api/transactions/${transactionId}/email`, { 
      email: customerEmail 
    })
  }
}