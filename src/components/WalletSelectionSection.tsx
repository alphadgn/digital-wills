
import React, { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  const { isAuthenticated, authenticateWallet, setDonorWallet, donorWallet } = useWallet();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const [failedWalletId, setFailedWalletId] = useState<string | null>(null);

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

  const retryAuthentication = async (walletAddress: string, walletId: string) => {
    setIsAuthenticating(true);
    
    const success = await authenticateWallet();
    
    if (success) {
      setDonorWallet(walletAddress);
      setAuthFailed(false);
      setFailedWalletId(null);
    } else {
      // After second failure, show the critical error
      toast.error("Failed to authenticate wallet. Please gather necessary information and try again.");
      setAuthFailed(true);
    }
    
    setIsAuthenticating(false);
  };

  return (
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
                    onClick={() => handleAuthenticate(wallet.address, wallet.id)}
                  >
                    {donorWallet === wallet.address ? (
                      <>
                        <Wallet className="h-4 w-4 mr-2" />
                        Selected
                      </>
                    ) : isAuthenticating && failedWalletId === wallet.id ? (
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
  );
};

export default WalletSelectionSection;
