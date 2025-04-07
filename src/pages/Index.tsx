
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
  
  // IMPORTANT: Always start with "donor" as the visible section to ensure flow begins properly
  const [visibleSection, setVisibleSection] = React.useState<string>("donor");
  
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

  // Debug log for tracking component state
  React.useEffect(() => {
    console.log("🔄 Index.tsx: Current Step:", currentStep, {
      donorWallet: !!donorWallet,
      isMultisigCreated,
      beneficiaryWallet: !!beneficiaryWallet,
      visibleSection,
      showFinalConfirmation
    });
  }, [currentStep, donorWallet, isMultisigCreated, beneficiaryWallet, visibleSection, showFinalConfirmation]);
  
  // Function to handle final submission
  const handleFinalSubmission = () => {
    setShowCompletionBanner(true);
    setShowFinalConfirmation(false);
    toast.success("Digital Will setup completed successfully!");
  };

  // Function to move to the next step after completing donor wallet setup
  const handleDonorWalletComplete = () => {
    console.log("Donor wallet setup complete - moving to multisig section");
    setVisibleSection("multisig");
  };

  // Function to move to the next step after completing multisig setup
  const handleMultisigComplete = () => {
    console.log("Multisig wallet setup complete - moving to beneficiary section");
    setVisibleSection("beneficiary");
  };

  // Function to show final confirmation after completing beneficiary setup
  const handleBeneficiaryComplete = () => {
    console.log("Beneficiary setup complete - showing final confirmation");
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
