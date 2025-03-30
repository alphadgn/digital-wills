
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import TermsAndConditions from "./TermsAndConditions";

const Hero = () => {
  const { connectWallet, isConnecting } = useWallet();
  const [hasConsented, setHasConsented] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  
  const handleOpenTerms = () => {
    setTermsOpen(true);
  };
  
  const handleAcceptTerms = () => {
    setHasConsented(true);
  };
  
  return (
    <section className="py-20 px-6">
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
            onClick={() => connectWallet()}
            disabled={isConnecting || !hasConsented}
            className={`${hasConsented ? 'bg-digitalwill-primary hover:bg-digitalwill-primary/90' : 'bg-gray-400 cursor-not-allowed'}`}
          >
            {isConnecting ? "Connecting..." : "Sign Up & Connect Wallet"}
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={handleOpenTerms}
          >
            Terms & Conditions Consent
          </Button>
        </div>
        
        {!hasConsented && (
          <p className="text-amber-600 mt-4 text-sm">
            Please review and accept the Terms & Conditions before connecting your wallet
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
