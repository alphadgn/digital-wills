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
import { useIsMobile } from "@/hooks/use-mobile";
import RestartButton from "../RestartButton";

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
  const [currentStep, setCurrentStep] = useState(STEP.DONOR_WALLET);
  const [processedSteps, setProcessedSteps] = useState<Set<number>>(new Set());
  const isMobile = useIsMobile();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentStep, showConfirmation, showCongratulations]);
  
  const determineStep = () => {
    console.log("🧭 Determining current step based on application state");
    
    if (processedSteps.has(STEP.DONOR_WALLET) && !processedSteps.has(STEP.MULTISIG_WALLET)) {
      return STEP.MULTISIG_WALLET;
    }
    
    if (processedSteps.has(STEP.MULTISIG_WALLET) && !processedSteps.has(STEP.BENEFICIARY_SETUP)) {
      return STEP.BENEFICIARY_SETUP;
    }
    
    return currentStep;
  };
  
  useEffect(() => {
    if (!showConfirmation && !showCongratulations) {
      const newStep = determineStep();
      if (newStep !== currentStep) {
        console.log(`🔄 Updating current step to ${newStep}`);
        setCurrentStep(newStep);
        setVisitedSteps(prev => new Set(prev).add(newStep));
      }
    }
  }, [isAuthenticated, donorWallet, isMultisigCreated, beneficiaryWallet, showConfirmation, showCongratulations, processedSteps]);
  
  const calculateProgress = () => {
    if (currentStep === STEP.DONOR_WALLET) return 0;
    if (currentStep === STEP.MULTISIG_WALLET) return 25;
    if (currentStep === STEP.BENEFICIARY_SETUP) return 50;
    if (showConfirmation) return 75;
    if (showCongratulations) return 100;
    return 0;
  };
  
  const progressPercentage = calculateProgress();
  console.log(`📊 Current progress: ${progressPercentage}%`);

  const handleSuccessfulAuth = () => {
    console.log("✅ Authentication successful");
    setProcessedSteps(prev => new Set(prev).add(STEP.DONOR_WALLET));
    goToStep(STEP.MULTISIG_WALLET);
  };

  const handleMultisigComplete = () => {
    console.log("✅ Multisig wallet setup complete");
    setProcessedSteps(prev => new Set(prev).add(STEP.MULTISIG_WALLET));
    goToStep(STEP.BENEFICIARY_SETUP);
  };
  
  const handleBeneficiaryComplete = () => {
    console.log("✅ Beneficiary setup complete");
    setProcessedSteps(prev => new Set(prev).add(STEP.BENEFICIARY_SETUP));
    setShowConfirmation(true);
  };
  
  const handleEditFromConfirmation = () => {
    console.log("🔄 Editing from confirmation");
    setShowConfirmation(false);
    goToStep(STEP.BENEFICIARY_SETUP);
  };
  
  const handleFinalSubmission = () => {
    console.log("🎉 Final submission complete");
    setShowConfirmation(false);
    setShowCongratulations(true);
  };
  
  const goToStep = (step: number) => {
    console.log(`🔄 Moving to step ${step}`);
    setCurrentStep(step);
    setVisitedSteps(prev => new Set(prev).add(step));
    window.scrollTo(0, 0);
  };
  
  const goBack = () => {
    if (currentStep === STEP.MULTISIG_WALLET) {
      console.log("⬅️ Going back to donor wallet step");
      setCurrentStep(STEP.DONOR_WALLET);
    } else if (currentStep === STEP.BENEFICIARY_SETUP) {
      console.log("⬅️ Going back to multisig wallet step");
      setCurrentStep(STEP.MULTISIG_WALLET);
    }
    window.scrollTo(0, 0);
  };
  
  const goNext = () => {
    const nextStep = currentStep + 1;
    if (visitedSteps.has(nextStep)) {
      console.log(`➡️ Going to next step ${nextStep}`);
      setCurrentStep(nextStep);
      window.scrollTo(0, 0);
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
        <div className="relative">
          <div className="absolute top-0 right-0 z-10">
            <RestartButton />
          </div>
          <WillConfirmation 
            onEdit={handleEditFromConfirmation}
            onComplete={handleFinalSubmission}
          />
        </div>
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
          <div className="relative">
            <div className="absolute top-0 right-0 z-10">
              <RestartButton />
            </div>
            <BeneficiarySection 
              onProceedToConfirmation={handleBeneficiaryComplete}
            />
          </div>
        );
      default:
        return <WalletConnectSection onComplete={handleSuccessfulAuth} />;
    }
  };

  return (
    <div className="flex-1 py-8 px-4 sm:py-12 sm:px-6 md:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <h2 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-center`}>
            Digital Will Creation
          </h2>
          
          {!showCongratulations && currentStep > STEP.DONOR_WALLET && (
            <div className="hidden sm:block">
              <RestartButton />
            </div>
          )}
        </div>
        
        <div className="space-y-6 sm:space-y-8">
          <Progress 
            progressPercentage={calculateProgress()} 
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
          
          <div className="mt-6 sm:mt-8">
            {renderCurrentSection()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentContainer;
