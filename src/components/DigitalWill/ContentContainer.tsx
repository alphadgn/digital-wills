
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
  
  // Add a new state for the confirmation step
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Track user's navigation history to enable/disable next button
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([STEP.DONOR_WALLET]));
  
  // Determine current step based on completion status
  const determineStep = () => {
    if (!isAuthenticated) return STEP.DONOR_WALLET;
    if (!isMultisigCreated) return STEP.MULTISIG_WALLET;
    return STEP.BENEFICIARY_SETUP;
  };
  
  const [currentStep, setCurrentStep] = useState(determineStep());
  
  // Update current step when wallet status changes
  useEffect(() => {
    if (!showConfirmation) {
      const newStep = determineStep();
      setCurrentStep(newStep);
      
      // Mark this step as visited
      setVisitedSteps(prev => new Set(prev).add(newStep));
    }
  }, [isAuthenticated, donorWallet, isMultisigCreated, beneficiaryWallet, showConfirmation]);
  
  // Calculate progress percentage
  const calculateProgress = () => {
    if (!isAuthenticated) return 0;
    if (!isMultisigCreated) return 25;
    if (!beneficiaryWallet) return 50;
    if (!showConfirmation) return 75;
    return 100;
  };
  
  const progressPercentage = calculateProgress();

  // Authentication error handling
  const [showAuthError, setShowAuthError] = useState(false);
  
  // Handle successful authentication
  const handleSuccessfulAuth = () => {
    setShowAuthError(false);
    goToStep(STEP.MULTISIG_WALLET);
  };

  // Handle multisig wallet creation completion
  const handleMultisigComplete = () => {
    goToStep(STEP.BENEFICIARY_SETUP);
  };
  
  // Handle beneficiary setup completion
  const handleBeneficiaryComplete = () => {
    setShowConfirmation(true);
  };
  
  // Handle editing from confirmation page
  const handleEditFromConfirmation = () => {
    setShowConfirmation(false);
    goToStep(STEP.BENEFICIARY_SETUP);
  };
  
  // Handle final submission
  const handleFinalSubmission = () => {
    setShowCompletionBanner(true);
  };
  
  // Navigation functions
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
    // Only allow going next if the user has previously visited the next step
    const nextStep = currentStep + 1;
    if (visitedSteps.has(nextStep)) {
      setCurrentStep(nextStep);
    }
  };
  
  // Check if next button should be enabled
  const isNextEnabled = () => {
    const nextStep = currentStep + 1;
    return visitedSteps.has(nextStep);
  };
  
  // Get current step name for progress indicator
  const getCurrentStepName = () => {
    if (showConfirmation) return "Final Review";
    if (currentStep === STEP.DONOR_WALLET) return "Donor Information";
    if (currentStep === STEP.MULTISIG_WALLET) return "Multisig Setup";
    return "Beneficiary Setup";
  };
  
  // Show appropriate section based on current step
  const renderCurrentSection = () => {
    if (showCompletionBanner) {
      return null; // CompletionBanner will be shown by the app
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
          {/* Progress indicator */}
          <Progress 
            progressPercentage={progressPercentage} 
            currentStep={getCurrentStepName()}
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
