import { useState, useEffect } from 'react'
import { ageVerificationService } from '../../services/ageVerification'
import type { AgeVerificationData, AgeVerificationResult, ManagerOverride } from '../../services/ageVerification'

interface AgeVerificationModalProps {
  isOpen: boolean
  onComplete: (result: AgeVerificationResult) => void
  onCancel: () => void
  customerId?: string
  transactionId?: string
  employeeId: string
  storeId: string
}

export function AgeVerificationModal({
  isOpen,
  onComplete,
  onCancel,
  customerId,
  transactionId,
  employeeId,
  storeId
}: AgeVerificationModalProps) {
  const [step, setStep] = useState<'method' | 'manual' | 'scanner' | 'result' | 'override'>('method')
  const [verificationData, setVerificationData] = useState<Partial<AgeVerificationData>>({
    customerId,
    transactionId,
    employeeId,
    storeId,
    idType: 'drivers_license',
    verificationMethod: 'manual'
  })
  const [result, setResult] = useState<AgeVerificationResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [managerOverride, setManagerOverride] = useState<Partial<ManagerOverride>>({})
  const [errors, setErrors] = useState<string[]>([])

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('method')
      setResult(null)
      setErrors([])
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleMethodSelect = (method: 'manual' | 'scanner') => {
    setVerificationData(prev => ({ ...prev, verificationMethod: method }))
    setStep(method)
  }

  const handleManualEntry = (field: string, value: string) => {
    setVerificationData(prev => ({ ...prev, [field]: value }))
    
    // Auto-calculate age when DOB changes
    if (field === 'customerDob' && value) {
      const age = ageVerificationService.calculateAge(value)
      setVerificationData(prev => ({ ...prev, calculatedAge: age }))
    }
  }

  const handleScanId = async () => {
    setIsProcessing(true)
    try {
      const scanResult = await ageVerificationService.scanId('barcode')
      
      if (scanResult.success && scanResult.data) {
        setVerificationData(prev => ({
          ...prev,
          idNumber: scanResult.data!.idNumber,
          idIssuingState: scanResult.data!.issuingState,
          idExpirationDate: scanResult.data!.expirationDate,
          customerDob: scanResult.data!.dateOfBirth,
          calculatedAge: ageVerificationService.calculateAge(scanResult.data!.dateOfBirth),
          scannerData: {
            model: 'MockScanner v1.0',
            softwareVersion: '2.1.0',
            confidenceScore: 0.95
          }
        }))
        setStep('result')
      } else {
        setErrors([scanResult.error || 'Scanner failed to read ID'])
        setStep('manual')
      }
    } catch (error) {
      setErrors(['Scanner error occurred'])
      setStep('manual')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleVerify = async () => {
    setIsProcessing(true)
    setErrors([])

    try {
      // Validate required fields
      const requiredFields = ['idType', 'idNumber', 'idExpirationDate', 'customerDob']
      const missingFields = requiredFields.filter(field => !verificationData[field as keyof AgeVerificationData])
      
      if (missingFields.length > 0) {
        setErrors([`Missing required fields: ${missingFields.join(', ')}`])
        setIsProcessing(false)
        return
      }

      const verificationResult = await ageVerificationService.verifyAge(verificationData as AgeVerificationData)
      setResult(verificationResult)
      setStep('result')
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Verification failed'])
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManagerOverride = async () => {
    if (!result || !managerOverride.managerId || !managerOverride.reason) {
      setErrors(['Manager ID and reason are required for override'])
      return
    }

    setIsProcessing(true)
    try {
      const success = await ageVerificationService.processManagerOverride({
        verificationId: result.verificationId,
        managerId: managerOverride.managerId!,
        reason: managerOverride.reason!,
        notes: managerOverride.notes
      })

      if (success) {
        onComplete({
          ...result,
          isVerified: true,
          reasonForDenial: undefined
        })
      } else {
        setErrors(['Manager override failed'])
      }
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Override failed'])
    } finally {
      setIsProcessing(false)
    }
  }

  const getStepTitle = () => {
    switch (step) {
      case 'method': return 'Age Verification Method'
      case 'manual': return 'Manual ID Entry'
      case 'scanner': return 'ID Scanner'
      case 'result': return 'Verification Result'
      case 'override': return 'Manager Override'
      default: return 'Age Verification'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-90vh overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">{getStepTitle()}</h2>

        {/* Error Display */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
            <h3 className="text-red-800 font-medium text-sm mb-2">Errors:</h3>
            <ul className="text-red-700 text-sm list-disc pl-5">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Method Selection */}
        {step === 'method' && (
          <div className="space-y-4">
            <p className="text-gray-600">
              Age-restricted products require customer age verification. Choose a verification method:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleMethodSelect('scanner')}
                className="p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left"
              >
                <div className="font-medium mb-2">🔍 ID Scanner</div>
                <div className="text-sm text-gray-600">
                  Use barcode or magnetic stripe scanner for quick verification
                </div>
              </button>
              
              <button
                onClick={() => handleMethodSelect('manual')}
                className="p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left"
              >
                <div className="font-medium mb-2">✍️ Manual Entry</div>
                <div className="text-sm text-gray-600">
                  Manually enter customer ID information
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Scanner Step */}
        {step === 'scanner' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <p className="text-blue-800 font-medium">Scanner Ready</p>
              <p className="text-blue-700 text-sm">
                Please scan the customer's ID using the barcode or magnetic stripe scanner.
              </p>
            </div>

            <div className="text-center">
              <button
                onClick={handleScanId}
                disabled={isProcessing}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isProcessing ? 'Scanning...' : 'Scan ID'}
              </button>
            </div>

            <div className="text-center">
              <button
                onClick={() => setStep('manual')}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Enter information manually instead
              </button>
            </div>
          </div>
        )}

        {/* Manual Entry Step */}
        {step === 'manual' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">ID Type:</label>
                <select
                  value={verificationData.idType}
                  onChange={(e) => handleManualEntry('idType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  <option value="drivers_license">Driver's License</option>
                  <option value="state_id">State ID</option>
                  <option value="passport">Passport</option>
                  <option value="military_id">Military ID</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Issuing State:</label>
                <input
                  type="text"
                  value={verificationData.idIssuingState || ''}
                  onChange={(e) => handleManualEntry('idIssuingState', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="NY"
                  maxLength={2}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">ID Number:</label>
              <input
                type="text"
                value={verificationData.idNumber || ''}
                onChange={(e) => handleManualEntry('idNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                placeholder="Enter ID number"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Date of Birth:</label>
                <input
                  type="date"
                  value={verificationData.customerDob || ''}
                  onChange={(e) => handleManualEntry('customerDob', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
                {verificationData.calculatedAge && (
                  <p className="text-sm text-gray-600 mt-1">
                    Calculated age: {verificationData.calculatedAge}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">ID Expiration:</label>
                <input
                  type="date"
                  value={verificationData.idExpirationDate || ''}
                  onChange={(e) => handleManualEntry('idExpirationDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
                {verificationData.idExpirationDate && ageVerificationService.isIdExpired(verificationData.idExpirationDate) && (
                  <p className="text-sm text-red-600 mt-1">
                    ⚠️ ID is expired
                  </p>
                )}
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setStep('method')}
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleVerify}
                disabled={isProcessing || !verificationData.idNumber || !verificationData.customerDob}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isProcessing ? 'Verifying...' : 'Verify Age'}
              </button>
            </div>
          </div>
        )}

        {/* Result Step */}
        {step === 'result' && result && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${result.isVerified ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">
                  {result.isVerified ? '✅' : '❌'}
                </span>
                <h3 className={`font-bold ${result.isVerified ? 'text-green-800' : 'text-red-800'}`}>
                  {result.isVerified ? 'Age Verification PASSED' : 'Age Verification FAILED'}
                </h3>
              </div>
              
              <div className="text-sm">
                <p>Customer Age: {result.calculatedAge}</p>
                <p>Required Age: {result.minAge}</p>
                {result.reasonForDenial && (
                  <p className="text-red-700 font-medium mt-2">
                    Reason: {result.reasonForDenial}
                  </p>
                )}
              </div>
            </div>

            {/* Compliance Warnings */}
            {result.complianceWarnings && result.complianceWarnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <h4 className="text-yellow-800 font-medium text-sm mb-2">⚠️ Compliance Warnings:</h4>
                <ul className="text-yellow-700 text-sm list-disc pl-5">
                  {result.complianceWarnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              {result.isVerified ? (
                <>
                  <button
                    onClick={() => onComplete(result)}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Continue with Transaction
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onCancel}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancel Transaction
                  </button>
                  {result.requiresManagerOverride && (
                    <button
                      onClick={() => setStep('override')}
                      className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                    >
                      Manager Override
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Manager Override Step */}
        {step === 'override' && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <h3 className="text-yellow-800 font-medium mb-2">Manager Override Required</h3>
              <p className="text-yellow-700 text-sm">
                This transaction requires manager approval to proceed with age-restricted products.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Manager ID:</label>
              <input
                type="text"
                value={managerOverride.managerId || ''}
                onChange={(e) => setManagerOverride(prev => ({ ...prev, managerId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                placeholder="Enter manager employee ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Reason for Override:</label>
              <select
                value={managerOverride.reason || ''}
                onChange={(e) => setManagerOverride(prev => ({ ...prev, reason: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              >
                <option value="">Select reason...</option>
                <option value="Expired ID but customer verified over 21">Expired ID - Customer clearly over 21</option>
                <option value="System error with valid customer">System calculation error</option>
                <option value="Returning customer with history">Known customer with purchase history</option>
                <option value="Other">Other (specify in notes)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Additional Notes (Optional):</label>
              <textarea
                value={managerOverride.notes || ''}
                onChange={(e) => setManagerOverride(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                rows={3}
                placeholder="Additional details about the override..."
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setStep('result')}
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleManagerOverride}
                disabled={isProcessing || !managerOverride.managerId || !managerOverride.reason}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-400"
              >
                {isProcessing ? 'Processing Override...' : 'Approve Override'}
              </button>
            </div>
          </div>
        )}

        {/* Cancel Button (always visible) */}
        {step !== 'result' && (
          <div className="mt-6 pt-4 border-t">
            <button
              onClick={onCancel}
              className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel Verification
            </button>
          </div>
        )}
      </div>
    </div>
  )
}