
import React, { useState, useEffect } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, AlertCircle, RefreshCw } from "lucide-react";
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

  // Show communication preference dialog if SSN is provided but no communication preference is set
  useEffect(() => {
    if (ssnProvided && donorSSN && !communicationPreference.method && pendingWallet) {
      // Show communication dialog after SSN is provided
      setShowCommunicationDialog(true);
    }
  }, [ssnProvided, donorSSN, communicationPreference.method, pendingWallet]);

  // Handle the initial wallet selection
  const handleWalletSelect = (walletAddress: string, walletId: string) => {
    setPendingWallet({ address: walletAddress, id: walletId });
    setShowSSNDialog(true);
  };

  // Process authentication after SSN has been provided and communication preference set
  const handleAuthenticate = async (walletAddress: string, walletId: string) => {
    setIsAuthenticating(true);
    setFailedWalletId(walletId);
    
    const success = await authenticateWallet();
    
    if (success) {
      setDonorWallet(walletAddress);
      setAuthFailed(false);
      setFailedWalletId(null);
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
      // Communication dialog will show via useEffect
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
