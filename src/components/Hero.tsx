
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import TermsAndConditions from "./TermsAndConditions";
import RestartButton from "./RestartButton";

const Hero = () => {
  const { connectWallet, isConnecting, termsAccepted, setTermsAccepted } = useWallet();
  const [termsOpen, setTermsOpen] = useState(false);
  const [showWalletAnimation, setShowWalletAnimation] = useState(false);
  
  const handleOpenTerms = () => {
    setTermsOpen(true);
  };
  
  const handleAcceptTerms = () => {
    // Update the global terms acceptance state
    setTermsAccepted(true);
  };
  
  const handleConnectWallet = async () => {
    if (termsAccepted) {
      // Show wallet connection animation
      setShowWalletAnimation(true);
      
      // Simulate wallet connection animation for 2 seconds before actual connection
      setTimeout(() => {
        connectWallet().finally(() => {
          setShowWalletAnimation(false);
        });
      }, 2000);
    }
  };
  
  return (
    <section className="py-20 px-6 relative">
      <div className="absolute top-6 right-6">
        <RestartButton />
      </div>
      
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-digitalwill-primary to-digitalwill-secondary bg-clip-text text-transparent mb-6">
          Secure Your Digital Legacy
        </h1>
        <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          The true essence of decentralization is self custody so why would you leave the future of your hard earned assets to a court appointed probate process. Take control of the process. Ensure your loved ones receive full benefits of your empire. Create a digital will today.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button 
            size="lg" 
            onClick={handleConnectWallet}
            disabled={isConnecting || !termsAccepted || showWalletAnimation}
            className={`${termsAccepted ? 'bg-digitalwill-primary hover:bg-digitalwill-primary/90' : 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed'}`}
          >
            {showWalletAnimation ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting Web3 Wallet...
              </span>
            ) : isConnecting ? "Connecting..." : "Sign Up & Connect Wallet"}
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={handleOpenTerms}
            className="text-blue-600 border-blue-600 hover:bg-blue-50"
          >
            Terms & Conditions Consent
          </Button>
        </div>
        
        {!termsAccepted && (
          <p className="text-amber-600 mt-4 text-sm">
            Please review and accept the Terms & Conditions to continue
          </p>
        )}
      </div>
      
      <TermsAndConditions 
        open={termsOpen}
        onOpenChange={setTermsOpen}
        onAccept={handleAcceptTerms}
      />
    </section>
  );
};

export default Hero;
