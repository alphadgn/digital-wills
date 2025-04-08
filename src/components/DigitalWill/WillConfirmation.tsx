
import React, { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Edit3 } from "lucide-react";
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
    communicationPreference
  } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
        onComplete();
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
