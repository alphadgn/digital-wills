
import React from "react";
import { useWallet } from "@/contexts/WalletContext";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Footer from "@/components/Footer";
import WalletConnectSection from "@/components/WalletConnectSection";
import WalletSelectionSection from "@/components/WalletSelectionSection";
import MultisigWalletSection from "@/components/MultisigWalletSection";
import CompletionBanner from "@/components/CompletionBanner";
import { Loader2, CheckCircle2 } from "lucide-react";

// Define constants for background configuration
const BACKGROUND_OPACITY = 0.35; // Opacity value for background image
const FALLBACK_BG_COLOR = "rgba(59, 76, 222, 0.05)"; // Fallback background color

// Step definitions for clarity - no magic numbers
const STEP = {
  DONOR_WALLET: 1,
  MULTISIG_WALLET: 2,
  BENEFICIARY_SETUP: 3
};

const Index = () => {
  const { 
    address, 
    isAuthenticated, 
    donorWallet, 
    showCompletionBanner,
    setShowCompletionBanner,
    isMultisigCreated,
    beneficiaryWallet
  } = useWallet();
  
  // Determine the current active step based on state
  const currentStep = React.useMemo(() => {
    if (!donorWallet) return STEP.DONOR_WALLET;
    if (!isMultisigCreated) return STEP.MULTISIG_WALLET;
    return STEP.BENEFICIARY_SETUP;
  }, [donorWallet, isMultisigCreated]);

  // Log the current step for debugging
  React.useEffect(() => {
    console.log("🔄 Current Step:", currentStep, {
      donorWallet: !!donorWallet,
      isMultisigCreated,
      beneficiaryWallet: !!beneficiaryWallet
    });
  }, [currentStep, donorWallet, isMultisigCreated, beneficiaryWallet]);
  
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background image with fixed positioning and opacity */}
      <div 
        className="fixed inset-0 z-0 bg-center bg-cover bg-no-repeat"
        style={{
          backgroundImage: `url('/images/background.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: BACKGROUND_OPACITY,
          backgroundColor: FALLBACK_BG_COLOR, // Fallback color if image fails
        }}
      />
      
      {/* Content container with relative positioning to appear above the background */}
      <div className="relative z-10 flex flex-col flex-1">
        <Header />
        
        {/* Completion Banner */}
        {showCompletionBanner && (
          <CompletionBanner />
        )}
        
        {/* If not connected to wallet, show landing page */}
        {!address && !showCompletionBanner && (
          <>
            <Hero />
            <Features />
            <div className="text-center py-10">
              <p className="text-gray-600 mb-4">Are you a beneficiary looking to recover assets?</p>
              <Link 
                to="/asset-recovery" 
                className="text-digitalwill-primary hover:text-digitalwill-primary/80 underline"
              >
                Go to Asset Recovery
              </Link>
            </div>
          </>
        )}
        
        {/* If connected to wallet and not showing completion banner, show the appropriate section based on state */}
        {address && !showCompletionBanner && (
          <div className="flex-1 py-12 px-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">
                Digital Will Creation
              </h2>
              
              <div className="space-y-8">
                {/* Process Timeline with clearer visual indicators */}
                <div className="flex justify-between items-center mb-12">
                  {/* Step 1: Donor Wallet */}
                  <div className={`flex flex-col items-center ${
                    donorWallet ? 'text-green-500' : 
                    currentStep === STEP.DONOR_WALLET ? 'text-digitalwill-primary' : 
                    'text-gray-400'
                  }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
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
                    <span className="text-sm mt-2">Connect Wallet</span>
                  </div>
                  
                  {/* Progress line 1-2 */}
                  <div className="flex-1 h-1 mx-2 bg-gray-200">
                    <div 
                      className={`h-full ${donorWallet ? 'bg-green-500' : 'bg-gray-200'}`} 
                      style={{ 
                        width: donorWallet ? '100%' : '0%', 
                        transition: 'width 0.5s' 
                      }}
                    ></div>
                  </div>
                  
                  {/* Step 2: Multi-Sig Wallet */}
                  <div className={`flex flex-col items-center ${
                    isMultisigCreated ? 'text-green-500' : 
                    currentStep === STEP.MULTISIG_WALLET ? 'text-digitalwill-primary' : 
                    'text-gray-400'
                  }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
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
                    <span className="text-sm mt-2">Multi-Sig Wallet</span>
                  </div>
                  
                  {/* Progress line 2-3 */}
                  <div className="flex-1 h-1 mx-2 bg-gray-200">
                    <div 
                      className={`h-full ${isMultisigCreated ? 'bg-green-500' : 'bg-gray-200'}`} 
                      style={{ 
                        width: isMultisigCreated ? '100%' : '0%', 
                        transition: 'width 0.5s' 
                      }}
                    ></div>
                  </div>
                  
                  {/* Step 3: Beneficiary Setup */}
                  <div className={`flex flex-col items-center ${
                    beneficiaryWallet ? 'text-green-500' : 
                    currentStep === STEP.BENEFICIARY_SETUP ? 'text-digitalwill-primary' : 
                    'text-gray-400'
                  }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
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
                    <span className="text-sm mt-2">Beneficiary Setup</span>
                  </div>
                </div>
                
                {/* Step sections - Only show the current active step component */}
                <div className="mt-8">
                  {/* Step 1: Donor Wallet Selection - Only show if current step is donor wallet */}
                  {currentStep === STEP.DONOR_WALLET && (
                    <div>
                      <h3 className="text-xl font-semibold text-center mb-6">Select Donor Wallet</h3>
                      <p className="text-center text-gray-600 mb-8">
                        Choose the wallet containing assets you wish to assign to your successor.
                      </p>
                      <WalletSelectionSection />
                    </div>
                  )}
                  
                  {/* Step 2: Multi-Sig Wallet - Only show if current step is multisig wallet */}
                  {currentStep === STEP.MULTISIG_WALLET && (
                    <div>
                      <h3 className="text-xl font-semibold text-center mb-6">Create Multi-Sig Wallet</h3>
                      <p className="text-center text-gray-600 mb-8">
                        Set up a multi-signature wallet and configure security settings.
                      </p>
                      <MultisigWalletSection />
                    </div>
                  )}
                  
                  {/* Step 3: Beneficiary Setup - Only show if current step is beneficiary setup */}
                  {currentStep === STEP.BENEFICIARY_SETUP && (
                    <div>
                      <h3 className="text-xl font-semibold text-center mb-6">Configure Beneficiary</h3>
                      <p className="text-center text-gray-600 mb-8">
                        Designate a beneficiary to receive your assets when conditions are met.
                      </p>
                      <MultisigWalletSection />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        <Footer />
      </div>
    </div>
  );
};

export default Index;
