import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { useAuth } from "@/contexts/PrivyAuthContext";
import TermsAndConditions from "./TermsAndConditions";
import { Award } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Hero = () => {
  const { isConnecting, termsAccepted, setTermsAccepted } = useWallet();
  const { login } = useAuth();
  const [termsOpen, setTermsOpen] = useState(false);
  const [showWalletAnimation, setShowWalletAnimation] = useState(false);
  const navigate = useNavigate();
  
  const handleOpenTerms = () => {
    setTermsOpen(true);
  };
  
  const handleAcceptTerms = () => {
    setTermsAccepted(true);
  };
  
  const handleConnectWallet = () => {
    if (termsAccepted) {
      login();
    }
  };

  const handleInitiateClaim = () => {
    navigate('/asset-recovery');
  };
  
  return (
    <section className="py-20 px-6 relative">
      <div className="max-w-4xl mx-auto text-center animate-fade-in">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-6">
          Secure Your Digital Legacy
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto transition-colors duration-300">
          The true essence of decentralization is self custody so why would you leave the future of your hard earned assets to a court appointed probate process. Take control of the process. Ensure your loved ones receive full benefits of your empire. Create a digital will today.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button 
            size="lg" 
            onClick={handleConnectWallet}
            disabled={isConnecting || !termsAccepted || showWalletAnimation}
            className={`transition-all duration-300 ${termsAccepted ? '' : 'opacity-60 cursor-not-allowed'}`}
          >
            {showWalletAnimation ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting Web3 Wallet...
              </span>
            ) : isConnecting ? "Connecting..." : "Sign in/up for account access"}
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={handleOpenTerms}
            className={`transition-all duration-300 text-primary border-primary hover:bg-primary/10 ${
              !termsAccepted 
                ? "animate-pulse-slow ring-2 ring-primary/40 ring-offset-2 ring-offset-background shadow-[0_0_15px_hsl(var(--primary)/0.3)]" 
                : ""
            }`}
          >
            Terms & Conditions Consent
          </Button>
        </div>
        
        {!termsAccepted && (
          <p className="text-amber-600 dark:text-amber-400 mt-4 text-sm animate-fade-in transition-colors duration-300">
            Please review and accept the Terms & Conditions to create an account
          </p>
        )}

        <div className="mt-8 flex justify-center">
          <Button 
            size="lg" 
            variant="secondary"
            onClick={handleInitiateClaim}
            className="bg-accent hover:bg-accent/90 text-accent-foreground transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
          >
            <Award className="mr-2 h-5 w-5" />
            Initiate Asset Claim
          </Button>
        </div>
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
