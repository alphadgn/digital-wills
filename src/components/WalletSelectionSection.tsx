
import React, { useState, useEffect } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, AlertCircle, RefreshCw, Check } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import SSNInputDialog from "./SSNInputDialog";
import CommunicationPreferenceDialog from "./CommunicationPreferenceDialog";

const mockWallets = [
  {
    id: "wallet1",
    address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    assets: "2.5 ETH, 1000 APE",
    name: "Main Wallet"
  },
  {
    id: "wallet2",
    address: "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E",
    assets: "5.8 ETH, 250 APE, 10 NFTs",
    name: "Multi Sig"
  },
  {
    id: "wallet3",
    address: "0xdD870fA1b7C4700F2BD7f44238821C26f7392148",
    assets: "0.7 ETH, 500 APE, 2 NFTs",
    name: "Beneficiary"
  }
];

const WalletSelectionSection = () => {
  const { 
    isAuthenticated, 
    authenticateWallet, 
    setDonorWallet, 
    donorWallet,
    donorSSN,
    communicationPreference
  } = useWallet();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const [failedWalletId, setFailedWalletId] = useState<string | null>(null);
  const [showSSNDialog, setShowSSNDialog] = useState(false);
  const [showCommunicationDialog, setShowCommunicationDialog] = useState(false);
  const [pendingWallet, setPendingWallet] = useState<{address: string, id: string} | null>(null);
  const [ssnProvided, setSsnProvided] = useState(false);
  
  // Track completion of each step
  const [steps, setSteps] = useState({
    ssnComplete: false,
    commPrefComplete: false,
    authComplete: false
  });

  // Show communication preference dialog if SSN is provided but no communication preference is set
  useEffect(() => {
    if (ssnProvided && donorSSN && !communicationPreference.method && pendingWallet) {
      // Show communication dialog after SSN is provided
      setShowCommunicationDialog(true);
    }
  }, [ssnProvided, donorSSN, communicationPreference.method, pendingWallet]);

  // Update steps status whenever relevant state changes
  useEffect(() => {
    setSteps({
      ssnComplete: !!donorSSN,
      commPrefComplete: !!communicationPreference.method,
      authComplete: !!donorWallet
    });
  }, [donorSSN, communicationPreference.method, donorWallet]);

  // Handle the initial wallet selection
  const handleWalletSelect = (walletAddress: string, walletId: string) => {
    setPendingWallet({ address: walletAddress, id: walletId });
    setShowSSNDialog(true);
  };

  // Process authentication after SSN has been provided and communication preference set
  const handleAuthenticate = async (walletAddress: string, walletId: string) => {
    // Check if communication preference is set before proceeding
    if (!communicationPreference.method) {
      toast.error("Please set your communication preference before proceeding");
      setShowCommunicationDialog(true);
      return;
    }
    
    setIsAuthenticating(true);
    setFailedWalletId(walletId);
    
    const success = await authenticateWallet();
    
    if (success) {
      setDonorWallet(walletAddress);
      setAuthFailed(false);
      setFailedWalletId(null);
      toast.success("Wallet successfully authenticated. You can now proceed to the next step.");
    } else {
      setAuthFailed(true);
    }
    
    setIsAuthenticating(false);
  };

  // After SSN dialog closes successfully, proceed to communication preferences
  const handleSSNDialogClose = (confirmed: boolean) => {
    setShowSSNDialog(false);
    
    if (confirmed && pendingWallet) {
      // SSN was provided, mark it
      setSsnProvided(true);
      // Show communication dialog right after SSN is provided
      setShowCommunicationDialog(true);
    } else {
      // Clear the pending wallet if not proceeding
      setPendingWallet(null);
      setSsnProvided(false);
    }
  };

  // After communication preference dialog closes
  const handleCommunicationDialogClose = () => {
    setShowCommunicationDialog(false);
    
    if (pendingWallet && communicationPreference.method) {
      // Both SSN and communication preference are set, proceed with authentication
      handleAuthenticate(pendingWallet.address, pendingWallet.id);
    }
  };

  const retryAuthentication = async (walletAddress: string, walletId: string) => {
    // For retry, we'll show the SSN dialog again
    setPendingWallet({ address: walletAddress, id: walletId });
    setShowSSNDialog(true);
  };

  return (
    <>
      {/* Step Progress Indicator */}
      <div className="mb-8 max-w-md mx-auto">
        <div className="space-y-4">
          {/* Step 1: SSN Verification */}
          <div className={`flex items-center p-3 border rounded-lg ${steps.ssnComplete ? 'border-green-500 bg-green-50' : 'border-digitalwill-primary bg-digitalwill-primary/5'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${steps.ssnComplete ? 'bg-green-500' : 'bg-digitalwill-primary'}`}>
              {steps.ssnComplete ? (
                <Check className="h-5 w-5 text-white" />
              ) : (
                <span className="text-white font-medium">1</span>
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-medium">Social Security Verification</h4>
              <p className="text-sm text-gray-500">
                {steps.ssnComplete ? "Completed" : "Provide SSN for identity verification"}
              </p>
            </div>
          </div>
          
          {/* Step 2: Communication Preference */}
          <div className={`flex items-center p-3 border rounded-lg ${
            steps.ssnComplete 
              ? (steps.commPrefComplete 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-digitalwill-primary bg-digitalwill-primary/5') 
              : 'border-gray-300 bg-gray-50'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
              steps.ssnComplete 
                ? (steps.commPrefComplete 
                    ? 'bg-green-500' 
                    : 'bg-digitalwill-primary') 
                : 'bg-gray-300'
            }`}>
              {steps.commPrefComplete ? (
                <Check className="h-5 w-5 text-white" />
              ) : (
                <span className={`${steps.ssnComplete ? 'text-white' : 'text-gray-500'} font-medium`}>2</span>
              )}
            </div>
            <div className="flex-1">
              <h4 className={`font-medium ${!steps.ssnComplete ? 'text-gray-500' : ''}`}>Communication Preferences</h4>
              <p className={`text-sm ${!steps.ssnComplete ? 'text-gray-400' : 'text-gray-500'}`}>
                {steps.commPrefComplete 
                  ? `${communicationPreference.method === 'email' ? 'Email' : 'Phone'} notifications enabled` 
                  : (steps.ssnComplete 
                      ? "Set up recovery notifications" 
                      : "Complete previous step first")}
              </p>
            </div>
          </div>
          
          {/* Step 3: Authentication */}
          <div className={`flex items-center p-3 border rounded-lg ${
            steps.commPrefComplete 
              ? (steps.authComplete 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-digitalwill-primary bg-digitalwill-primary/5') 
              : 'border-gray-300 bg-gray-50'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
              steps.commPrefComplete 
                ? (steps.authComplete 
                    ? 'bg-green-500' 
                    : 'bg-digitalwill-primary') 
                : 'bg-gray-300'
            }`}>
              {steps.authComplete ? (
                <Check className="h-5 w-5 text-white" />
              ) : (
                <span className={`${steps.commPrefComplete ? 'text-white' : 'text-gray-500'} font-medium`}>3</span>
              )}
            </div>
            <div className="flex-1">
              <h4 className={`font-medium ${!steps.commPrefComplete ? 'text-gray-500' : ''}`}>Wallet Authentication</h4>
              <p className={`text-sm ${!steps.commPrefComplete ? 'text-gray-400' : 'text-gray-500'}`}>
                {steps.authComplete 
                  ? "Wallet successfully authenticated" 
                  : (steps.commPrefComplete 
                      ? "Authenticate your donor wallet" 
                      : "Complete previous steps first")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">Select Donor Wallet</CardTitle>
          <CardDescription className="text-center">
            Choose the wallet containing assets you wish to assign to your successor
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {authFailed && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Authentication Failed</AlertTitle>
              <AlertDescription>
                Please gather necessary information and try again. Without authentication, you will not be able to proceed.
              </AlertDescription>
              <Button 
                variant="outline" 
                size="sm"
                className="mt-2"
                onClick={() => setAuthFailed(false)}
              >
                Dismiss
              </Button>
            </Alert>
          )}
          
          {!steps.commPrefComplete && steps.ssnComplete && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Communication Preference Required</AlertTitle>
              <AlertDescription className="text-amber-700">
                Please set up your communication preferences for recovery notifications before proceeding.
              </AlertDescription>
              <Button 
                variant="outline" 
                size="sm"
                className="mt-2 border-amber-300 text-amber-700 hover:bg-amber-100"
                onClick={() => setShowCommunicationDialog(true)}
              >
                Set Preferences
              </Button>
            </Alert>
          )}
          
          <div className="space-y-3">
            {mockWallets.map((wallet) => (
              <div 
                key={wallet.id} 
                className={`p-4 border rounded-lg transition-colors ${
                  donorWallet === wallet.address 
                    ? "border-digitalwill-primary bg-digitalwill-primary/5" 
                    : (failedWalletId === wallet.id && authFailed)
                      ? "border-red-300 bg-red-50"
                      : "hover:bg-gray-50"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{wallet.name}</h3>
                    <p className="text-sm text-gray-500 font-mono mt-1">
                      {wallet.address.substring(0, 8)}...{wallet.address.substring(wallet.address.length - 6)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {wallet.assets}
                    </p>
                  </div>
                  
                  {failedWalletId === wallet.id && authFailed ? (
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isAuthenticating}
                        onClick={() => retryAuthentication(wallet.address, wallet.id)}
                        className="text-red-500 border-red-300 hover:bg-red-50"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry Authentication
                      </Button>
                      <div className="text-xs text-red-500">
                        Failed to authenticate
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant={donorWallet === wallet.address ? "default" : "outline"}
                      size="sm"
                      disabled={isAuthenticating}
                      onClick={() => handleWalletSelect(wallet.address, wallet.id)}
                    >
                      {donorWallet === wallet.address ? (
                        <>
                          <Wallet className="h-4 w-4 mr-2" />
                          Selected
                        </>
                      ) : isAuthenticating && pendingWallet?.id === wallet.id ? (
                        "Authenticating..."
                      ) : (
                        "Select & Authenticate"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SSN Dialog for wallet authentication */}
      <SSNInputDialog 
        open={showSSNDialog} 
        onOpenChange={(open) => {
          if (!open) handleSSNDialogClose(false);
        }}
        onConfirm={() => handleSSNDialogClose(true)}
        title="Identity Verification Required"
        description="Please provide your Social Security Number to authenticate your wallet. This helps secure your digital assets."
      />

      {/* Communication Preference Dialog */}
      <CommunicationPreferenceDialog
        open={showCommunicationDialog}
        onOpenChange={setShowCommunicationDialog}
        onConfirm={handleCommunicationDialogClose}
      />
    </>
  );
};

export default WalletSelectionSection;
