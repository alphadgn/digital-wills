
import React from "react";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface FinalConfirmationProps {
  onMakeChanges: () => void;
  onSubmit: () => void;
}

const FinalConfirmation: React.FC<FinalConfirmationProps> = ({
  onMakeChanges,
  onSubmit
}) => {
  return (
    <div className="flex-1 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8">
          Confirm Digital Will Setup
        </h2>
        
        <Alert className="bg-amber-50 border-amber-300 my-8">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <AlertTitle className="text-amber-800 text-lg">Important Notice</AlertTitle>
          <AlertDescription className="text-amber-700">
            <p className="mb-4">You are about to finalize your Digital Will setup. After submission, this information cannot be changed or modified.</p>
            <p>Please carefully review all your information before proceeding.</p>
          </AlertDescription>
        </Alert>
        
        <div className="space-y-6 border rounded-lg p-6 bg-white shadow-sm">
          <div className="space-y-2">
            <h3 className="font-semibold">Donor Information</h3>
            <p className="text-sm text-gray-600">
              Your donor wallet and identification information has been verified.
            </p>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold">Multi-Signature Wallet</h3>
            <p className="text-sm text-gray-600">
              Multi-signature wallet has been created and configured successfully.
            </p>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold">Beneficiary Setup</h3>
            <p className="text-sm text-gray-600">
              Beneficiary wallet address has been registered and will be notified when conditions are met.
            </p>
          </div>
        </div>
        
        <div className="mt-8 flex justify-center space-x-4">
          <Button 
            variant="outline"
            onClick={onMakeChanges}
          >
            Make Changes
          </Button>
          <Button 
            onClick={onSubmit}
          >
            Submit & Complete Setup
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FinalConfirmation;
