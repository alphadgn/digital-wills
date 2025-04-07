
import React, { useState, useEffect } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Wallet, AlertCircle, RefreshCw, Check, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import SSNInputDialog from "./SSNInputDialog";
import CommunicationPreferenceDialog from "./CommunicationPreferenceDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

const SummaryConfirmationDialog = ({ 
  open, 
  onOpenChange, 
  onConfirm, 
  donorSSN, 
  communicationPreference,
  donorWallet,
  selectedWalletName
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review Information</DialogTitle>
          <DialogDescription className="space-y-2">
            <p>Please review your information before final submission.</p>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Warning</AlertTitle>
            <AlertDescription className="text-amber-700">
              Once submitted, this information cannot be changed. You will need to discard everything and start over if changes are needed later.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-3 border rounded-md p-4">
            <h3 className="font-medium">Selected Donor Wallet</h3>
            <p className="text-sm">{selectedWalletName}</p>
            <p className="text-sm font-mono">
              {donorWallet.substring(0, 8)}...{donorWallet.substring(donorWallet.length - 6)}
            </p>
          </div>
          
          <div className="space-y-1 border rounded-md p-4">
            <h3 className="font-medium">Identity Verification</h3>
            <p className="text-sm">SSN: •••••{donorSSN?.substring(5)}</p>
          </div>
          
          <div className="space-y-1 border rounded-md p-4">
            <h3 className="font-medium">Communication Preference</h3>
            <p className="text-sm">Method: {communicationPreference.method === 'email' ? 'Email' : 'SMS'}</p>
            <p className="text-sm">
              {communicationPreference.method === 'email' 
                ? `Email: ${communicationPreference.value}` 
                : `Phone: ${communicationPreference.value}`}
            </p>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Make Changes
          </Button>
          <Button onClick={() => {
            onConfirm();
            toast.success("Information submitted successfully!");
          }}>
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const WalletSelectionSection = () => {
  const { 
    isAuthenticated, 
    authenticateWallet, 
    setDonorWallet, 
    donorWallet,
    donorSSN,
    communicationPreference,
    isMultisigCreated,
    beneficiaryWallet,
  } = useWallet();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const [failedWalletId, setFailedWalletId] = useState<string | null>(null);
  const [showSSNDialog, setShowSSNDialog] = useState(false);
  const [showCommunicationDialog, setShowCommunicationDialog] = useState(false);
  const [pendingWallet, setPendingWallet] = useState<{address: string, id: string, name: string} | null>(null);
  const [ssnProvided, setSsnProvided] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  
  const [steps, setSteps] = useState({
    ssnComplete: false,
    commPrefComplete: false,
    authComplete: false,
    finalConfirmation: false
  });

  useEffect(() => {
    console.log("👛 WalletSelectionSection rendered:", {
      isMultisigCreated,
      beneficiaryWallet: !!beneficiaryWallet,
      hasBeneficiaryWallet: !!beneficiaryWallet,
      step: isMultisigCreated ? (beneficiaryWallet ? "complete" : "beneficiary setup") : "multisig setup"
    });
  }, [isMultisigCreated, beneficiaryWallet]);

  useEffect(() => {
    if (ssnProvided && donorSSN && !communicationPreference.method && pendingWallet) {
      setShowCommunicationDialog(true);
    }
  }, [ssnProvided, donorSSN, communicationPreference.method, pendingWallet]);

  useEffect(() => {
    setSteps({
      ssnComplete: !!donorSSN,
      commPrefComplete: !!communicationPreference.method,
      authComplete: !!donorWallet,
      finalConfirmation: false
    });
  }, [donorSSN, communicationPreference.method, donorWallet]);

  const selectedWalletName = React.useMemo(() => {
    if (!donorWallet) return "";
    const wallet = mockWallets.find(wallet => wallet.address === donorWallet);
    return wallet?.name || "";
  }, [donorWallet]);

  const handleWalletSelect = (walletAddress: string, walletId: string, walletName: string) => {
    if (donorWallet) {
      toast.error("You've already selected a wallet");
      return;
    }
    
    setSelectedWalletId(walletId);
    setPendingWallet({ address: walletAddress, id: walletId, name: walletName });
    setShowSSNDialog(true);
  };

  const handleAuthenticate = async (walletAddress: string, walletId: string) => {
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
      setShowSummaryDialog(true);
    } else {
      setAuthFailed(true);
    }
    
    setIsAuthenticating(false);
  };

  const handleSSNDialogClose = (confirmed: boolean) => {
    setShowSSNDialog(false);
    
    if (confirmed && pendingWallet) {
      setSsnProvided(true);
      setShowCommunicationDialog(true);
    } else {
      setPendingWallet(null);
      setSsnProvided(false);
      setSelectedWalletId(null);
    }
  };

  const handleCommunicationDialogClose = () => {
    setShowCommunicationDialog(false);
    
    if (pendingWallet && communicationPreference.method) {
      handleAuthenticate(pendingWallet.address, pendingWallet.id);
    }
  };

  const handleSummaryConfirm = () => {
    setShowSummaryDialog(false);
    setSteps(prev => ({...prev, finalConfirmation: true}));
  };

  const retryAuthentication = async (walletAddress: string, walletId: string, walletName: string) => {
    setPendingWallet({ address: walletAddress, id: walletId, name: walletName });
    setSelectedWalletId(walletId);
    setShowSSNDialog(true);
  };

  const isWalletDisabled = (walletId: string) => {
    return donorWallet !== null && selectedWalletId !== walletId;
  };

  // Determine current step logic
  const determineCurrentStep = () => {
    if (!donorWallet) return "wallet1"; // Main Wallet
    if (!isMultisigCreated) return "wallet2"; // Multi Sig
    if (isMultisigCreated && !beneficiaryWallet) return "wallet3"; // Beneficiary
    return null; // All steps completed
  };
  
  const currentStep = determineCurrentStep();

  return (
    <>
      {/* Progress tracking UI */}
      <div className="mb-8 max-w-md mx-auto">
        <div className="space-y-4">
          <div className={`flex items-center p-3 border rounded-lg ${
            steps.ssnComplete 
              ? 'border-green-500 bg-green-50' 
              : 'border-digitalwill-primary bg-digitalwill-primary/5'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
              steps.ssnComplete 
                ? 'bg-green-500'
                : 'bg-digitalwill-primary'
            }`}>
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
          
          {steps.authComplete && (
            <div className={`flex items-center p-3 border rounded-lg ${
              steps.finalConfirmation 
                ? 'border-green-500 bg-green-50' 
                : 'border-digitalwill-primary bg-digitalwill-primary/5'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                steps.finalConfirmation 
                  ? 'bg-green-500' 
                  : 'bg-digitalwill-primary'
              }`}>
                {steps.finalConfirmation ? (
                  <Check className="h-5 w-5 text-white" />
                ) : (
                  <span className="text-white font-medium">4</span>
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-medium">Review and Confirm</h4>
                <p className="text-sm text-gray-500">
                  {steps.finalConfirmation 
                    ? "Information confirmed" 
                    : "Review your information before final submission"}
                </p>
                {!steps.finalConfirmation && (
                  <Button 
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => setShowSummaryDialog(true)}
                  >
                    Review Now
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">Donor Information</CardTitle>
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
                onClick={() => {
                  setAuthFailed(false);
                  setSelectedWalletId(null);
                }}
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
                disabled={steps.commPrefComplete}
              >
                Set Preferences
              </Button>
            </Alert>
          )}
          
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-center mb-4">Select Wallets</h3>
          </div>
          
          <div className="space-y-3">
            {mockWallets.map((wallet) => {
              const isSelected = selectedWalletId === wallet.id;
              const isAuthenticated = donorWallet === wallet.address;
              
              // Determine if wallet should be highlighted as the current step
              const isCurrentStep = currentStep === wallet.id;
              
              let isDisabled = false;
              let highlightColor = ""; 
              let activeStatus = "";
              
              // Main Wallet logic
              if (wallet.id === "wallet1") {
                isDisabled = isWalletDisabled(wallet.id);
                if (currentStep === "wallet1") {
                  highlightColor = "border-digitalwill-primary bg-digitalwill-primary/5";
                  activeStatus = "Current Step";
                } else if (donorWallet) {
                  highlightColor = "border-green-500 bg-green-50";
                  activeStatus = "Completed";
                } else {
                  highlightColor = "border-gray-300 bg-gray-50";
                }
              } 
              // Multi Sig logic
              else if (wallet.id === "wallet2") {
                isDisabled = !donorWallet || isWalletDisabled(wallet.id);
                if (currentStep === "wallet2") {
                  highlightColor = "border-digitalwill-primary bg-digitalwill-primary/5";
                  activeStatus = "Current Step";
                } else if (isMultisigCreated) {
                  highlightColor = "border-green-500 bg-green-50";
                  activeStatus = "Completed";
                } else {
                  highlightColor = "border-gray-300 bg-gray-50";
                }
              } 
              // Beneficiary logic
              else if (wallet.id === "wallet3") {
                isDisabled = !isMultisigCreated || isWalletDisabled(wallet.id);
                if (currentStep === "wallet3") {
                  highlightColor = "border-digitalwill-primary bg-digitalwill-primary/5";
                  activeStatus = "Current Step";
                } else if (beneficiaryWallet) {
                  highlightColor = "border-green-500 bg-green-50";
                  activeStatus = "Completed";
                } else {
                  highlightColor = "border-gray-300 bg-gray-50";
                }
              }
              
              return (
                <div 
                  key={wallet.id} 
                  className={`p-4 border rounded-lg transition-colors ${highlightColor}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center">
                        <h3 className="font-medium">{wallet.name}</h3>
                        {isCurrentStep && (
                          <span className="ml-2 text-xs px-2 py-1 bg-digitalwill-primary/10 text-digitalwill-primary rounded-full">
                            Active
                          </span>
                        )}
                        {!isCurrentStep && activeStatus === "Completed" && (
                          <span className="ml-2 text-xs px-2 py-1 bg-green-100 text-green-600 rounded-full">
                            Completed
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 font-mono mt-1">
                        {wallet.address.substring(0, 8)}...{wallet.address.substring(wallet.address.length - 6)}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {wallet.assets}
                      </p>
                    </div>
                    
                    {isAuthenticated && wallet.address === donorWallet ? (
                      <div className="flex items-center text-green-500">
                        <Check className="h-4 w-4 mr-1" />
                        <span className="text-xs">Selected</span>
                      </div>
                    ) : failedWalletId === wallet.id && authFailed ? (
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isAuthenticating}
                          onClick={() => retryAuthentication(wallet.address, wallet.id, wallet.name)}
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
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        disabled={isAuthenticating || isDisabled || (!isCurrentStep && !isAuthenticated)}
                        onClick={() => handleWalletSelect(wallet.address, wallet.id, wallet.name)}
                        className={isSelected ? "" : ""}
                      >
                        {isSelected ? (
                          <>
                            <Wallet className="h-4 w-4 mr-2" />
                            Selected
                          </>
                        ) : isAuthenticating && pendingWallet?.id === wallet.id ? (
                          "Authenticating..."
                        ) : isDisabled || (!isCurrentStep && !isAuthenticated) ? (
                          isCurrentStep ? "Select & Authenticate" : "Not Available"
                        ) : (
                          "Select & Authenticate"
                        )}
                      </Button>
                    )}
                  </div>
                  
                  {!isCurrentStep && !isAuthenticated && (
                    <div className="mt-2 text-xs text-gray-500">
                      {wallet.id === "wallet2" && !donorWallet && (
                        "Complete Main Wallet setup first"
                      )}
                      {wallet.id === "wallet3" && !isMultisigCreated && (
                        "Complete Multi-Sig setup first"
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
        {steps.authComplete && steps.finalConfirmation && (
          <CardFooter className="flex justify-center">
            <Alert className="w-full bg-green-50 border-green-300">
              <Check className="h-5 w-5 text-green-500" />
              <AlertTitle className="text-green-700">Setup Complete!</AlertTitle>
              <AlertDescription className="text-green-600">
                You can now proceed to set up your multisig wallet and beneficiaries.
              </AlertDescription>
            </Alert>
          </CardFooter>
        )}
      </Card>

      <SSNInputDialog 
        open={showSSNDialog} 
        onOpenChange={(open) => {
          if (!open) handleSSNDialogClose(false);
        }}
        onConfirm={() => handleSSNDialogClose(true)}
        title="Identity Verification Required"
        description="Please provide your Social Security Number to authenticate your wallet. This helps secure your digital assets."
      />

      <CommunicationPreferenceDialog
        open={showCommunicationDialog}
        onOpenChange={setShowCommunicationDialog}
        onConfirm={handleCommunicationDialogClose}
        isCompleted={steps.commPrefComplete}
      />
      
      <SummaryConfirmationDialog
        open={showSummaryDialog}
        onOpenChange={setShowSummaryDialog}
        onConfirm={handleSummaryConfirm}
        donorSSN={donorSSN}
        communicationPreference={communicationPreference}
        donorWallet={donorWallet || ""}
        selectedWalletName={selectedWalletName}
      />
    </>
  );
};

export default WalletSelectionSection;
