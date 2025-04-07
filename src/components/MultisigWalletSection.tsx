
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface MultisigWalletSectionProps {
  onComplete?: () => void;
  onCompleteBeneficiary?: () => void;
}

const MultisigWalletSection: React.FC<MultisigWalletSectionProps> = ({ 
  onComplete,
  onCompleteBeneficiary
}) => {
  const handleAction = () => {
    toast.success("Multisig operation simulated");
    
    if (onComplete) {
      onComplete();
    }
    
    if (onCompleteBeneficiary) {
      onCompleteBeneficiary();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Multisig Setup</CardTitle>
        <CardDescription className="text-center">
          Create a multisignature wallet
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          className="w-full"
          onClick={handleAction}
        >
          Complete Setup
        </Button>
      </CardContent>
    </Card>
  );
};

export default MultisigWalletSection;
