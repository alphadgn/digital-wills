import React, { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, Search, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";

const AssetRecoverySection = () => {
  const { initiateAssetRecovery, userHasAttemptedRecovery } = useWallet();
  const [ssn, setSsn] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState(false);
  const [showRecoveryForm, setShowRecoveryForm] = useState(false);
  const navigate = useNavigate();
  
  const handleRecoveryRequest = async () => {
    if (!ssn || ssn.length < 9) {
      return;
    }
    
    setIsProcessing(true);
    // Simulate beneficiary wallet address
    const beneficiaryAddress = "0x" + Math.random().toString(16).substring(2, 42);
    
    const success = await initiateAssetRecovery(beneficiaryAddress, ssn);
    setRecoverySuccess(success);
    setIsProcessing(false);
  };

  const handleNoClick = () => {
    navigate('/');
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Asset Recovery</CardTitle>
        <CardDescription className="text-center">
          Recover assets from a digital will as a beneficiary
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recoverySuccess ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <Wallet className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-lg font-medium text-center">Assets Recovered Successfully!</h3>
            <div className="text-sm text-center text-gray-500">
              <p>The assets have been transferred to your wallet.</p>
            </div>
          </div>
        ) : userHasAttemptedRecovery && !recoverySuccess ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-4">
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <Search className="h-4 w-4 text-red-500" />
              <AlertTitle>Verification Failed</AlertTitle>
              <AlertDescription className="text-sm">
                We could not verify the death certificate or the information provided. 
                The original account owner has been notified of this attempt.
              </AlertDescription>
            </Alert>
          </div>
        ) : showRecoveryForm ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ssn">Organizer's Social Security Number</Label>
              <Input
                id="ssn"
                placeholder="123-45-6789"
                value={ssn}
                onChange={(e) => setSsn(e.target.value)}
                type="password"
              />
              <p className="text-xs text-gray-500">
                Enter the Social Security Number of the person who created the digital will.
              </p>
            </div>
            
            <Alert className="bg-blue-50 border-blue-200">
              <Search className="h-4 w-4 text-blue-500" />
              <AlertTitle>Death Certificate Verification</AlertTitle>
              <AlertDescription className="text-sm">
                We'll automatically search for and verify the death certificate of the wallet organizer.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="py-6 flex flex-col items-center justify-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Wallet className="h-8 w-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-medium text-center">Claim Assets</h3>
            <div className="text-sm text-center text-gray-500">
              <p>Our system shows you are able to claim assets from a multisig wallet.</p>
              <p className="mt-2">Would you like to claim these assets now?</p>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-center">
        {recoverySuccess || (userHasAttemptedRecovery && !recoverySuccess) ? (
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Start Over
          </Button>
        ) : showRecoveryForm ? (
          <Button
            className="w-full"
            onClick={handleRecoveryRequest}
            disabled={isProcessing || !ssn}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : "Verify & Claim Assets"}
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleNoClick}
            >
              No
            </Button>
            <Button
              onClick={() => setShowRecoveryForm(true)}
            >
              Yes, Claim Assets
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default AssetRecoverySection;
