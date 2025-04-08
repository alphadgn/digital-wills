
import React, { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Edit3, Copy, Key, ShieldAlert } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface WillConfirmationProps {
  onEdit: () => void;
  onComplete: () => void;
}

const WillConfirmation: React.FC<WillConfirmationProps> = ({ onEdit, onComplete }) => {
  const { 
    donorWallet, 
    beneficiaryWallet,
    multisigWallet,
    createMultisigWallet,
    donorSSN,
    communicationPreference,
    seedPhrases,
    productKeys
  } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPrivateKeys, setShowPrivateKeys] = useState(false);
  const [dismissCount, setDismissCount] = useState(0);
  
  // Format wallet addresses for display
  const formatAddress = (address: string | null) => {
    if (!address) return "Not provided";
    return `${address.substring(0, 10)}...${address.substring(address.length - 6)}`;
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // Final submission logic
      const success = await createMultisigWallet();
      
      if (success) {
        toast.success("Your Digital Will has been successfully created");
        setShowPrivateKeys(true);
      } else {
        toast.error("There was a problem creating your Digital Will");
      }
    } catch (error) {
      console.error("Error submitting will:", error);
      toast.error("An error occurred while submitting your Digital Will");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyToClipboard = (text: string | null) => {
    if (text) {
      navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    }
  };

  const handleDismiss = () => {
    if (dismissCount === 0) {
      // First dismissal shows notification warning
      setDismissCount(1);
    } else {
      // Second dismissal completes the process
      onComplete();
    }
  };

  if (showPrivateKeys) {
    if (dismissCount === 0) {
      // First screen: Show multisig wallet details only (no beneficiary keys)
      return (
        <Card className="w-full max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center text-2xl">Your Multi-Signature Wallet Details</CardTitle>
            <CardDescription className="text-center">
              Please save this information immediately. This is the ONLY time you will see these details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert variant="destructive" className="bg-red-50 border-red-300">
              <ShieldAlert className="h-5 w-5 text-red-600" />
              <AlertTitle className="text-red-700 font-bold">CRITICAL INFORMATION</AlertTitle>
              <AlertDescription className="text-red-700">
                The private keys and seed phrases below will NEVER be stored or recoverable if lost.
                Without these, you cannot access or manage your multi-signature wallet.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-5 p-4 border rounded-md bg-gray-50">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold border-b pb-2 mb-2">
                  <Key className="h-5 w-5 text-digitalwill-primary" /> Multi-Signature Wallet Address
                </h3>
                <div className="flex justify-between items-center p-2 bg-white border rounded-md font-mono">
                  <span className="text-sm break-all">{multisigWallet}</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCopyToClipboard(multisigWallet)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold border-b pb-2 mb-2">
                  <Key className="h-5 w-5 text-digitalwill-primary" /> Multi-Signature Seed Phrase
                </h3>
                <div className="flex justify-between items-center p-2 bg-white border rounded-md">
                  <span className="text-sm font-mono break-all">{seedPhrases.multisig}</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCopyToClipboard(seedPhrases.multisig)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold border-b pb-2 mb-2">
                  <Key className="h-5 w-5 text-digitalwill-primary" /> Multi-Signature Product Key
                </h3>
                <div className="flex justify-between items-center p-2 bg-white border rounded-md font-mono">
                  <span className="text-sm break-all">{productKeys.multisig}</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCopyToClipboard(productKeys.multisig)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            <Button 
              className="w-full" 
              size="lg"
              onClick={handleDismiss}
            >
              I Have Saved This Information
            </Button>
          </CardContent>
        </Card>
      );
    } else {
      // Second screen: Warning screen
      return (
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center text-2xl text-red-600">FINAL WARNING</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert variant="destructive" className="bg-red-100 border-red-400">
              <ShieldAlert className="h-6 w-6 text-red-600" />
              <AlertTitle className="text-red-700 font-bold text-lg">CRITICAL INFORMATION</AlertTitle>
              <AlertDescription className="text-red-700 text-base">
                <p className="font-bold">This information will not be stored anywhere.</p>
                <p className="mt-2">It is your responsibility to keep this information safe.</p>
                <p className="mt-2">If you lose this information, any assets stored in this multi-signature wallet will be lost FOREVER.</p>
                <p className="mt-2">There is NO WAY to recover these keys if lost.</p>
              </AlertDescription>
            </Alert>
            
            <div className="p-4 border rounded-md bg-amber-50 border-amber-300">
              <p className="font-semibold text-center text-amber-800">
                Please ensure you have backed up ALL keys and seed phrases in a secure location before proceeding.
              </p>
            </div>
            
            <Button 
              className="w-full bg-red-600 hover:bg-red-700"
              size="lg" 
              onClick={handleDismiss}
            >
              I Understand The Risks & Wish To Proceed
            </Button>
          </CardContent>
        </Card>
      );
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Digital Will Confirmation</CardTitle>
        <CardDescription className="text-center">
          Please review all information before final submission
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="bg-amber-50 border-amber-300">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <AlertTitle className="text-amber-800">Important Notice</AlertTitle>
          <AlertDescription className="text-amber-700">
            Is all information correct? After submitting you will not be able to change any information.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-4">
          <div className="border rounded-md p-4">
            <h3 className="font-medium mb-2">Donor Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="font-semibold">Wallet Address:</div>
              <div className="font-mono">{formatAddress(donorWallet)}</div>
              
              <div className="font-semibold">Contact Method:</div>
              <div>{communicationPreference.method || "Not provided"}</div>
              
              <div className="font-semibold">Contact Value:</div>
              <div>{communicationPreference.value || "Not provided"}</div>
            </div>
          </div>
          
          <div className="border rounded-md p-4">
            <h3 className="font-medium mb-2">Beneficiary Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="font-semibold">Wallet Address:</div>
              <div className="font-mono">{formatAddress(beneficiaryWallet)}</div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center space-x-4 pt-4">
          <Button 
            variant="outline" 
            onClick={onEdit}
            className="flex items-center gap-2"
          >
            <Edit3 className="h-4 w-4" />
            Make Changes
          </Button>
          
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            {isSubmitting ? "Submitting..." : "Confirm & Submit"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WillConfirmation;
