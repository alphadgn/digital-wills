
import React, { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import StepIndicator, { STEP } from "./StepIndicator";
import Progress from "./Progress";
import WalletConnectSection from "@/components/WalletConnectSection";
import MultisigWalletSection from "@/components/MultisigWalletSection";
import BeneficiarySection from "./BeneficiarySection";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ContentContainerProps {
  currentStep?: number;
  progressPercentage?: number;
}

const ContentContainer: React.FC<ContentContainerProps> = () => {
  const { 
    donorWallet, 
    isMultisigCreated, 
    beneficiaryWallet,
    address,
    isAuthenticated
  } = useWallet();
  
  // Determine current step based on completion status
  const determineStep = () => {
    if (!donorWallet) return STEP.DONOR_WALLET;
    if (!isMultisigCreated) return STEP.MULTISIG_WALLET;
    return STEP.BENEFICIARY_SETUP;
  };
  
  const currentStep = determineStep();
  
  // Calculate progress percentage
  const calculateProgress = () => {
    if (!donorWallet) return 0;
    if (!isMultisigCreated) return 33;
    if (!beneficiaryWallet) return 66;
    return 100;
  };
  
  const progressPercentage = calculateProgress();

  // Authentication error handling
  const [showAuthError, setShowAuthError] = useState(false);
  
  // Show appropriate section based on current step
  const renderCurrentSection = () => {
    if (showAuthError) {
      return (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Failed</AlertTitle>
          <AlertDescription>
            Please gather necessary information and try again. Without authentication, you will not be able to proceed.
          </AlertDescription>
        </Alert>
      );
    }
    
    switch (currentStep) {
      case STEP.DONOR_WALLET:
        return <WalletConnectSection />;
      case STEP.MULTISIG_WALLET:
        return (
          <MultisigWalletSection 
            onComplete={() => {}}
          />
        );
      case STEP.BENEFICIARY_SETUP:
        return (
          <BeneficiarySection />
        );
      default:
        return <WalletConnectSection />;
    }
  };

  return (
    <div className="flex-1 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8">
          Digital Will Creation
        </h2>
        
        <div className="space-y-8">
          {/* Progress indicator */}
          <Progress 
            progressPercentage={progressPercentage} 
            currentStep={
              currentStep === STEP.DONOR_WALLET ? "Donor Information" :
              currentStep === STEP.MULTISIG_WALLET ? "Multisig Setup" :
              "Beneficiary Setup"
            }
          />
          
          {/* Step indicator */}
          <StepIndicator 
            currentStep={currentStep} 
            donorWallet={donorWallet}
            isMultisigCreated={isMultisigCreated}
            beneficiaryWallet={beneficiaryWallet}
          />
          
          {/* Current section content */}
          <div className="mt-8">
            {renderCurrentSection()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentContainer;
