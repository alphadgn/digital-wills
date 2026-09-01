
import React from "react";
import { CheckCircle2 } from "lucide-react";

// Step definitions for clarity - no magic numbers
export const STEP = {
  DONOR_WALLET: 1,
  MULTISIG_WALLET: 2,
  BENEFICIARY_SETUP: 3
};

interface StepIndicatorProps {
  currentStep: number;
  donorWallet: string | null;
  isMultisigCreated: boolean;
  beneficiaryWallet: string | null;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  donorWallet,
  isMultisigCreated,
  beneficiaryWallet
}) => {
  return (
    <div className="flex justify-between items-start mb-8 sm:mb-12">
      {/* Step 1: Donor Wallet */}
      <div className={`flex w-16 sm:w-28 shrink-0 flex-col items-center ${
        donorWallet ? 'text-green-500' : 
        currentStep === STEP.DONOR_WALLET ? 'text-digitalwill-primary' : 
        'text-gray-400'
      }`}>
        <div className={`w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full flex items-center justify-center border-2 ${
          donorWallet ? 'border-green-500 bg-green-50' : 
          currentStep === STEP.DONOR_WALLET ? 'border-digitalwill-primary bg-digitalwill-primary/5' : 
          'border-gray-300'
        }`}>
          {donorWallet ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : currentStep === STEP.DONOR_WALLET ? (
            <span className="text-lg font-bold">1</span>
          ) : (
            <span className="text-lg font-bold">1</span>
          )}
        </div>
        <span className="text-[11px] sm:text-sm leading-tight text-center mt-2">Donor Information</span>
      </div>
      
      {/* Progress line 1-2 */}
      <div className="flex-1 h-1 mx-1 sm:mx-2 mt-4 sm:mt-5 bg-gray-200">
        <div 
          className={`h-full ${donorWallet ? 'bg-green-500' : 'bg-gray-200'}`} 
          style={{ 
            width: donorWallet ? '100%' : '0%', 
            transition: 'width 0.5s' 
          }}
        ></div>
      </div>
      
      {/* Step 2: Multi-Sig Wallet */}
      <div className={`flex w-16 sm:w-28 shrink-0 flex-col items-center ${
        isMultisigCreated ? 'text-green-500' : 
        currentStep === STEP.MULTISIG_WALLET ? 'text-digitalwill-primary' : 
        'text-gray-400'
      }`}>
        <div className={`w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full flex items-center justify-center border-2 ${
          isMultisigCreated ? 'border-green-500 bg-green-50' : 
          currentStep === STEP.MULTISIG_WALLET ? 'border-digitalwill-primary bg-digitalwill-primary/5' : 
          'border-gray-300'
        }`}>
          {isMultisigCreated ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : currentStep === STEP.MULTISIG_WALLET && donorWallet ? (
            <span className="text-lg font-bold">2</span>
          ) : (
            <span className="text-lg font-bold text-gray-400">2</span>
          )}
        </div>
        <span className="text-[11px] sm:text-sm leading-tight text-center mt-2">Multi-Sig Wallet</span>
      </div>
      
      {/* Progress line 2-3 */}
      <div className="flex-1 h-1 mx-1 sm:mx-2 mt-4 sm:mt-5 bg-gray-200">
        <div 
          className={`h-full ${isMultisigCreated ? 'bg-green-500' : 'bg-gray-200'}`} 
          style={{ 
            width: isMultisigCreated ? '100%' : '0%', 
            transition: 'width 0.5s' 
          }}
        ></div>
      </div>
      
      {/* Step 3: Beneficiary Setup */}
      <div className={`flex w-16 sm:w-28 shrink-0 flex-col items-center ${
        beneficiaryWallet ? 'text-green-500' : 
        currentStep === STEP.BENEFICIARY_SETUP ? 'text-digitalwill-primary' : 
        'text-gray-400'
      }`}>
        <div className={`w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full flex items-center justify-center border-2 ${
          beneficiaryWallet ? 'border-green-500 bg-green-50' : 
          currentStep === STEP.BENEFICIARY_SETUP ? 'border-digitalwill-primary bg-digitalwill-primary/5' : 
          'border-gray-300'
        }`}>
          {beneficiaryWallet ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : currentStep === STEP.BENEFICIARY_SETUP && isMultisigCreated ? (
            <span className="text-lg font-bold">3</span>
          ) : (
            <span className="text-lg font-bold text-gray-400">3</span>
          )}
        </div>
        <span className="text-[11px] sm:text-sm leading-tight text-center mt-2">Beneficiary Setup</span>
      </div>
    </div>
  );
};

export default StepIndicator;
