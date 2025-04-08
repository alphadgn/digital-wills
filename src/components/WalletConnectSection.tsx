
import React, { useState, useEffect } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Wallet, Check, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import SSNInputDialog from "./SSNInputDialog";
import CommunicationPreferenceDialog from "./CommunicationPreferenceDialog";
import TermsAndConditions from "./TermsAndConditions";
import { toast } from "sonner";

interface WalletConnectSectionProps {
  onComplete?: () => void;
  onNext?: () => void;
}

const WalletConnectSection: React.FC<WalletConnectSectionProps> = ({ onComplete, onNext }) => {
  const { address, connectWallet, isConnecting, donorSSN, communicationPreference, authenticateWallet, isAuthenticated } = useWallet();
  const [showSSNDialog, setShowSSNDialog] = useState(false);
  const [showCommunicationDialog, setShowCommunicationDialog] = useState(false);
  const [hasPreviouslyAdvanced, setHasPreviouslyAdvanced] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Show SSN dialog when wallet is connected
  useEffect(() => {
    if (address) {
      // Add a slight delay so the connection success is registered first
      const timer = setTimeout(() => {
        setShowSSNDialog(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [address]);

  // Show communication preference dialog after SSN is provided
  useEffect(() => {
    if (donorSSN && !communicationPreference.method) {
      // Add a slight delay after SSN dialog closes
      const timer = setTimeout(() => {
        setShowCommunicationDialog(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [donorSSN, communicationPreference.method]);

  // Trigger authentication and completion when communication preferences are set
  useEffect(() => {
    if (address && donorSSN && communicationPreference.method && communicationPreference.value) {
      const performAuth = async () => {
        const success = await authenticateWallet();
        if (success) {
          setHasPreviouslyAdvanced(true);
          if (onComplete) {
            onComplete();
          }
        }
      };
      
      performAuth();
    }
  }, [address, donorSSN, communicationPreference, authenticateWallet, onComplete]);

  const handleNext = () => {
    if (hasPreviouslyAdvanced && onNext) {
      onNext();
    }
  };
  
  const handleTermsAccept = () => {
    setTermsAccepted(true);
    setShowTerms(false);
    // Proceed with wallet connection
    connectWallet();
    // Scroll to top of page
    window.scrollTo(0, 0);
  };
  
  const handleConnectWallet = () => {
    if (!termsAccepted) {
      setShowTerms(true);
      toast.warning("You must accept the terms and conditions before connecting your wallet");
      return;
    }
    connectWallet();
  };

  return (
    <>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">Connect Your Wallet</CardTitle>
          <CardDescription className="text-center">
            Connect your ApeChain wallet to get started with digital will creation
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center",
            address ? "bg-green-100" : "bg-gray-100"
          )}>
            <Wallet className={cn(
              "h-8 w-8",
              address ? "text-green-500" : "text-gray-400"
            )} />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm">Wallet Status:</span>
            {address ? (
              <span className="flex items-center gap-1 text-green-500">
                <Check className="h-4 w-4" /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-gray-400">
                <X className="h-4 w-4" /> Not Connected
              </span>
            )}
          </div>
          
          {address ? (
            <div className="p-3 bg-gray-100 rounded-md text-sm font-mono">
              {address.substring(0, 16)}...{address.substring(address.length - 6)}
            </div>
          ) : (
            <>
              <Button 
                onClick={handleConnectWallet} 
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? "Connecting..." : "Connect ApeChain Wallet"}
              </Button>
              
              <div className="text-xs text-gray-500 text-center">
                {termsAccepted ? (
                  <span className="flex items-center justify-center gap-1 text-green-600">
                    <Check className="h-3 w-3" /> Terms accepted
                  </span>
                ) : (
                  <Button
                    variant="link"
                    className="p-0 h-auto text-xs"
                    onClick={() => setShowTerms(true)}
                  >
                    View terms and conditions
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button
            variant="ghost"
            onClick={handleNext}
            disabled={!hasPreviouslyAdvanced}
            className="flex items-center gap-1"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      {/* SSN Dialog */}
      <SSNInputDialog 
        open={showSSNDialog} 
        onOpenChange={setShowSSNDialog} 
        title="Complete Your Wallet Connection"
        description="Please provide <strong>your</strong> Social Security Number to complete the wallet connection process."
        buttonText="Complete Connection"
      />

      {/* Communication Preference Dialog */}
      <CommunicationPreferenceDialog
        open={showCommunicationDialog}
        onOpenChange={setShowCommunicationDialog}
        onConfirm={() => setShowCommunicationDialog(false)}
      />
      
      {/* Terms and Conditions Dialog */}
      <TermsAndConditions 
        open={showTerms}
        onOpenChange={setShowTerms}
        onAccept={handleTermsAccept}
      />
    </>
  );
};

export default WalletConnectSection;
