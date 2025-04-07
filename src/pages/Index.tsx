
import React from "react";
import { useWallet } from "@/contexts/WalletContext";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CompletionBanner from "@/components/CompletionBanner";
import Background from "@/components/DigitalWill/Background";
import LandingPage from "@/components/DigitalWill/LandingPage";
import ContentContainer from "@/components/DigitalWill/ContentContainer";
import FinalConfirmation from "@/components/DigitalWill/FinalConfirmation";
import { STEP } from "@/components/DigitalWill/StepIndicator";

const Index = () => {
  const { 
    address, 
    donorWallet, 
    showCompletionBanner,
    setShowCompletionBanner,
    isMultisigCreated,
    beneficiaryWallet
  } = useWallet();
  
  // State for final submission confirmation
  const [showFinalConfirmation, setShowFinalConfirmation] = React.useState(false);
  
  // Track the visibility of each section (improved step flow control)
  const [visibleSection, setVisibleSection] = React.useState<string | null>("donor");
  
  // Determine the current active step based on state
  const currentStep = React.useMemo(() => {
    if (!donorWallet) return STEP.DONOR_WALLET;
    if (!isMultisigCreated) return STEP.MULTISIG_WALLET;
    return STEP.BENEFICIARY_SETUP;
  }, [donorWallet, isMultisigCreated]);

  // Calculate progress percentage
  const progressPercentage = React.useMemo(() => {
    if (beneficiaryWallet) return 100;
    if (isMultisigCreated) return 66;
    if (donorWallet) return 33;
    return 0;
  }, [donorWallet, isMultisigCreated, beneficiaryWallet]);

  // Update visible section whenever the current step changes
  React.useEffect(() => {
    // Automatically set visible section based on current step
    switch (currentStep) {
      case STEP.DONOR_WALLET:
        setVisibleSection("donor");
        break;
      case STEP.MULTISIG_WALLET:
        setVisibleSection("multisig");
        break;
      case STEP.BENEFICIARY_SETUP:
        setVisibleSection("beneficiary");
        break;
      default:
        setVisibleSection("donor");
    }
    
    console.log("🔄 Current Step:", currentStep, {
      donorWallet: !!donorWallet,
      isMultisigCreated,
      beneficiaryWallet: !!beneficiaryWallet,
      showFinalConfirmation,
      visibleSection
    });
  }, [currentStep, donorWallet, isMultisigCreated, beneficiaryWallet, showFinalConfirmation, visibleSection]);
  
  // Function to handle final submission
  const handleFinalSubmission = () => {
    setShowCompletionBanner(true);
    setShowFinalConfirmation(false);
    toast.success("Digital Will setup completed successfully!");
  };

  // Function to move to the next step after completing donor wallet setup
  const handleDonorWalletComplete = () => {
    console.log("Moving to multisig section after donor wallet completion");
    setVisibleSection("multisig");
  };

  // Function to move to the next step after completing multisig setup
  const handleMultisigComplete = () => {
    console.log("Moving to beneficiary section after multisig completion");
    setVisibleSection("beneficiary");
  };

  // Function to show final confirmation after completing beneficiary setup
  const handleBeneficiaryComplete = () => {
    console.log("Showing final confirmation after beneficiary completion");
    setShowFinalConfirmation(true);
  };
  
  return (
    <Background>
      <Header />
      
      {/* Completion Banner */}
      {showCompletionBanner && (
        <CompletionBanner />
      )}
      
      {/* If not connected to wallet, show landing page */}
      {!address && !showCompletionBanner && (
        <LandingPage />
      )}
      
      {/* If connected to wallet and not showing completion banner, show the appropriate section based on state */}
      {address && !showCompletionBanner && !showFinalConfirmation && (
        <ContentContainer 
          currentStep={currentStep}
          progressPercentage={progressPercentage}
          donorWallet={donorWallet}
          isMultisigCreated={isMultisigCreated}
          beneficiaryWallet={beneficiaryWallet}
          visibleSection={visibleSection}
          handleDonorWalletComplete={handleDonorWalletComplete}
          handleMultisigComplete={handleMultisigComplete}
          handleBeneficiaryComplete={handleBeneficiaryComplete}
        />
      )}
      
      {/* Final Confirmation Banner */}
      {showFinalConfirmation && (
        <FinalConfirmation 
          onMakeChanges={() => setShowFinalConfirmation(false)}
          onSubmit={handleFinalSubmission}
        />
      )}
      
      <Footer />
    </Background>
  );
};

export default Index;
