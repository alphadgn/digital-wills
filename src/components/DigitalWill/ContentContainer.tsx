import React, { useState, useEffect } from "react";
import { useWallet } from "@/contexts/WalletContext";
import StepIndicator, { STEP } from "./StepIndicator";
import Progress from "./Progress";
import WalletConnectSection from "@/components/WalletConnectSection";
import MultisigWalletSection from "@/components/MultisigWalletSection";
import BeneficiarySection from "./BeneficiarySection";
import WillConfirmation from "./WillConfirmation";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import CongratulationsScreen from "../CongratulationsScreen";

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
    isAuthenticated,
    showCompletionBanner,
    setShowCompletionBanner
  } = useWallet();
  
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showCongratulations, setShowCongratulations] = useState(false);
  
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([STEP.DONOR_WALLET]));
  
  const determineStep = () => {
    if (!isAuthenticated) return STEP.DONOR_WALLET;
    if (!isMultisigCreated) return STEP.MULTISIG_WALLET;
    return STEP.BENEFICIARY_SETUP;
  };
  
  const [currentStep, setCurrentStep] = useState(determineStep());
  
  useEffect(() => {
    if (!showConfirmation && !showCongratulations) {
      const newStep = determineStep();
      setCurrentStep(newStep);
      
      setVisitedSteps(prev => new Set(prev).add(newStep));
    }
  }, [isAuthenticated, donorWallet, isMultisigCreated, beneficiaryWallet, showConfirmation, showCongratulations]);
  
  const calculateProgress = () => {
    if (!isAuthenticated) return 0;
    if (!isMultisigCreated) return 25;
    if (!beneficiaryWallet) return 50;
    if (!showConfirmation) return 75;
    if (!showCongratulations) return 90;
    return 100;
  };
  
  const progressPercentage = calculateProgress();

  const [showAuthError, setShowAuthError] = useState(false);
  
  const handleSuccessfulAuth = () => {
    setShowAuthError(false);
    goToStep(STEP.MULTISIG_WALLET);
  };

  const handleMultisigComplete = () => {
    goToStep(STEP.BENEFICIARY_SETUP);
  };
  
  const handleBeneficiaryComplete = () => {
    setShowConfirmation(true);
  };
  
  const handleEditFromConfirmation = () => {
    setShowConfirmation(false);
    goToStep(STEP.BENEFICIARY_SETUP);
  };
  
  const handleFinalSubmission = () => {
    setShowConfirmation(false);
    setShowCongratulations(true);
  };
  
  const goToStep = (step: number) => {
    setCurrentStep(step);
    setVisitedSteps(prev => new Set(prev).add(step));
  };
  
  const goBack = () => {
    if (currentStep === STEP.MULTISIG_WALLET) {
      setCurrentStep(STEP.DONOR_WALLET);
    } else if (currentStep === STEP.BENEFICIARY_SETUP) {
      setCurrentStep(STEP.MULTISIG_WALLET);
    }
  };
  
  const goNext = () => {
    const nextStep = currentStep + 1;
    if (visitedSteps.has(nextStep)) {
      setCurrentStep(nextStep);
    }
  };
  
  const isNextEnabled = () => {
    const nextStep = currentStep + 1;
    return visitedSteps.has(nextStep);
  };
  
  const getCurrentStepName = () => {
    if (showCongratulations) return "Completed";
    if (showConfirmation) return "Final Review";
    if (currentStep === STEP.DONOR_WALLET) return "Donor Information";
    if (currentStep === STEP.MULTISIG_WALLET) return "Multisig Setup";
    return "Beneficiary Setup";
  };
  
  const renderCurrentSection = () => {
    if (showCompletionBanner) {
      return null;
    }
    
    if (showCongratulations) {
      return <CongratulationsScreen />;
    }
    
    if (showConfirmation) {
      return (
        <WillConfirmation 
          onEdit={handleEditFromConfirmation}
          onComplete={handleFinalSubmission}
        />
      );
    }
    
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
        return <WalletConnectSection 
          onComplete={handleSuccessfulAuth} 
          onNext={() => isNextEnabled() && goNext()}
        />;
      case STEP.MULTISIG_WALLET:
        return (
          <MultisigWalletSection 
            onComplete={handleMultisigComplete}
            onBack={goBack}
          />
        );
      case STEP.BENEFICIARY_SETUP:
        return (
          <BeneficiarySection 
            onProceedToConfirmation={handleBeneficiaryComplete}
          />
        );
      default:
        return <WalletConnectSection onComplete={handleSuccessfulAuth} />;
    }
  };

  return (
    <div className="flex-1 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8">
          Digital Will Creation
        </h2>
        
        <div className="space-y-8">
          <Progress 
            progressPercentage={progressPercentage} 
            currentStep={getCurrentStepName()}
          />
          
          {!showCongratulations && (
            <StepIndicator 
              currentStep={currentStep} 
              donorWallet={donorWallet}
              isMultisigCreated={isMultisigCreated}
              beneficiaryWallet={beneficiaryWallet}
            />
          )}
          
          <div className="mt-8">
            {renderCurrentSection()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentContainer;
