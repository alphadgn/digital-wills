
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWallet } from "@/contexts/WalletContext";
import { Shield, CheckCircle } from "lucide-react";

const CompletionBanner = () => {
  const { willsCreated, createNewWill, resetProcess } = useWallet();
  
  const handleYes = () => {
    createNewWill();
  };
  
  const handleNo = () => {
    resetProcess();
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6 flex flex-col items-center space-y-6">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-500" />
          </div>
          
          <h3 className="text-xl font-bold text-center">
            You have successfully created your trustless Digital Will
          </h3>
          
          <p className="text-center text-gray-600">
            You have {willsCreated} will{willsCreated !== 1 ? 's' : ''} existing.
          </p>
          
          <p className="text-center font-medium">
            Would you like to create another one?
          </p>
          
          <div className="flex space-x-4 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleNo}
            >
              No
            </Button>
            <Button
              className="flex-1 bg-digitalwill-primary hover:bg-digitalwill-primary/90"
              onClick={handleYes}
            >
              Yes
            </Button>
          </div>
          
          <div className="flex items-start p-3 bg-amber-50 border border-amber-200 rounded-md w-full">
            <Shield className="h-4 w-4 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              Every Digital Will is separate and distinct. Each donor wallet can only be used once and cannot be used in any other Digital Will on this platform.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompletionBanner;
