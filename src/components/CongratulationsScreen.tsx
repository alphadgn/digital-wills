
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Award, Bookmark } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";

const CongratulationsScreen = () => {
  const { createNewWill, resetProcess } = useWallet();

  const handleCreateNew = () => {
    createNewWill();
  };

  const handleFinish = () => {
    resetProcess();
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
            <Award className="h-12 w-12 text-green-600" />
          </div>
        </div>
        <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-digitalwill-primary to-digitalwill-secondary bg-clip-text text-transparent">
          Congratulations!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-center">
        <div className="py-4 px-6 bg-green-50 rounded-lg border border-green-200">
          <h3 className="font-semibold text-xl mb-2 text-green-800">
            You've Made an Excellent Choice
          </h3>
          <p className="text-green-700">
            By being proactive about disbursing your digital assets according to your wishes, 
            you've taken an important step in securing your digital legacy.
          </p>
        </div>
        
        <div className="space-y-4 py-2">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <h4 className="font-semibold">Truly Decentralized</h4>
              <p className="text-gray-600">Your assets will be distributed according to your wishes without intermediaries.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <h4 className="font-semibold">Secure & Private</h4>
              <p className="text-gray-600">Your digital will is securely stored on the blockchain, accessible only with the correct keys.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <h4 className="font-semibold">Peace of Mind</h4>
              <p className="text-gray-600">You can rest easy knowing your digital assets will be transferred according to your wishes.</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-center p-4 bg-blue-50 rounded-md border border-blue-200">
          <Bookmark className="h-5 w-5 text-blue-500 mr-2" />
          <p className="text-blue-700">
            Remember to share the appropriate access information with your trusted contacts.
          </p>
        </div>
        
        <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            variant="outline"
            className="w-full sm:w-auto"
            onClick={handleFinish}
          >
            Return to Home
          </Button>
          <Button 
            className="w-full sm:w-auto bg-digitalwill-primary hover:bg-digitalwill-primary/90"
            onClick={handleCreateNew}
          >
            Create Another Will
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CongratulationsScreen;
