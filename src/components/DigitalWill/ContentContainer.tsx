
import React, { useEffect } from "react";
import { Loader2 } from "lucide-react";
import StepIndicator, { STEP } from "./StepIndicator";
import Progress from "./Progress";
import WalletSelectionSection from "@/components/WalletSelectionSection";
import MultisigWalletSection from "@/components/MultisigWalletSection";

interface ContentContainerProps {
  currentStep: number;
  progressPercentage: number;
  donorWallet: string | null;
  isMultisigCreated: boolean; 
  beneficiaryWallet: string | null;
  visibleSection: string | null;
  handleDonorWalletComplete: () => void;
  handleMultisigComplete: () => void;
  handleBeneficiaryComplete: () => void;
}

const ContentContainer: React.FC<ContentContainerProps> = ({
  currentStep,
  progressPercentage,
  donorWallet,
  isMultisigCreated,
  beneficiaryWallet,
  visibleSection,
  handleDonorWalletComplete,
  handleMultisigComplete,
  handleBeneficiaryComplete
}) => {
  // Set up step labels for progress display
  const currentStepLabel = React.useMemo(() => {
    if (currentStep === STEP.BENEFICIARY_SETUP) return "Beneficiary Setup";
    if (currentStep === STEP.MULTISIG_WALLET) return "Multi-Sig Wallet";
    return "Donor Information";
  }, [currentStep]);

  // Additional logging for debugging the flow
  useEffect(() => {
    console.log("ContentContainer rendered with:", { 
      visibleSection,
      currentStep,
      hasDonorWallet: !!donorWallet,
      isMultisigCreated,
      hasBeneficiary: !!beneficiaryWallet
    });
  }, [visibleSection, currentStep, donorWallet, isMultisigCreated, beneficiaryWallet]);

  return (
    <div className="flex-1 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8">
          Digital Will Creation
        </h2>
        
        {/* Overall Progress Bar - Now with current step label */}
        <Progress 
          progressPercentage={progressPercentage} 
          currentStep={currentStepLabel} 
        />
        
        <div className="space-y-8">
          {/* Process Timeline with clearer visual indicators */}
          <StepIndicator 
            currentStep={currentStep} 
            donorWallet={donorWallet}
            isMultisigCreated={isMultisigCreated}
            beneficiaryWallet={beneficiaryWallet}
          />
          
          {/* Step sections - Show sections based on visibleSection state */}
          <div className="mt-8">
            {/* Step 1: Donor Wallet Selection */}
            {visibleSection === "donor" && (
              <div>
                <WalletSelectionSection 
                  onComplete={() => {
                    console.log("WalletSelectionSection onComplete triggered - proceeding to multisig");
                    handleDonorWalletComplete();
                  }}
                />
              </div>
            )}
            
            {/* Step 2: Multi-Sig Wallet */}
            {visibleSection === "multisig" && (
              <div>
                <h3 className="text-xl font-semibold text-center mb-6">Create Multi-Sig Wallet</h3>
                <p className="text-center text-gray-600 mb-8">
                  Set up a multi-signature wallet and configure security settings.
                </p>
                <MultisigWalletSection 
                  onComplete={() => {
                    console.log("MultisigWalletSection onComplete triggered - proceeding to beneficiary");
                    handleMultisigComplete();
                  }}
                />
              </div>
            )}
            
            {/* Step 3: Beneficiary Setup */}
            {visibleSection === "beneficiary" && (
              <div>
                <h3 className="text-xl font-semibold text-center mb-6">Configure Beneficiary</h3>
                <p className="text-center text-gray-600 mb-8">
                  Designate a beneficiary to receive your assets when conditions are met.
                </p>
                <MultisigWalletSection 
                  onCompleteBeneficiary={() => {
                    console.log("MultisigWalletSection onCompleteBeneficiary triggered - proceeding to final step");
                    handleBeneficiaryComplete();
                  }} 
                />
              </div>
            )}

            {/* Loading indicator if no section is visible */}
            {!visibleSection && (
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-digitalwill-primary" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentContainer;
