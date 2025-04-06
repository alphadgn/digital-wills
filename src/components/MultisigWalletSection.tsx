
import React, { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Link, Wallet, Shield, AlertTriangle, Copy, AlertCircle, Check } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface MultisigWalletSectionProps {
  onCompleteBeneficiary?: () => void;
}

const MultisigWalletSection: React.FC<MultisigWalletSectionProps> = ({ 
  onCompleteBeneficiary 
}) => {
  const { 
    createMultisigWallet, 
    isMultisigCreated, 
    beneficiaryWallet, 
    setBeneficiaryWallet,
    seedPhrases,
    productKeys,
    multisigWallet,
    setShowCompletionBanner,
    communicationPreference
  } = useWallet();
  const [isCreating, setIsCreating] = useState(false);
  const [beneficiaryAddress, setBeneficiaryAddress] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showBeneficiaryConfirmation, setShowBeneficiaryConfirmation] = useState(false);
  
  const handleCreateMultisig = async () => {
    if (!beneficiaryAddress || !beneficiaryAddress.startsWith("0x") || beneficiaryAddress.length !== 42) {
      toast.error("Please enter a valid wallet address");
      return;
    }
    
    setIsCreating(true);
    setBeneficiaryWallet(beneficiaryAddress);
    const success = await createMultisigWallet();
    setIsCreating(false);
    
    if (success) {
      // Show confirmation dialog after successful creation
      setShowConfirmation(true);
      // Show beneficiary confirmation notification
      setShowBeneficiaryConfirmation(true);
      toast.success("Beneficiary wallet address has been saved");
      
      // If we're in the beneficiary setup step and the callback exists, call it
      if (beneficiaryWallet && onCompleteBeneficiary) {
        onCompleteBeneficiary();
      }
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${type} copied to clipboard`);
  };

  const handleFinalSubmit = () => {
    // Set the completion banner to show on the main page
    if (onCompleteBeneficiary) {
      onCompleteBeneficiary();
    } else {
      setShowCompletionBanner(true);
      toast.success("Digital Will setup completed successfully!");
    }
  };

  // Check if multisig wallet should be disabled
  const isMultisigDisabled = !!(communicationPreference.method && communicationPreference.value);
  
  // Log component lifecycle and state for debugging
  React.useEffect(() => {
    console.log("🔑 MultisigWalletSection rendered:", {
      isMultisigCreated,
      beneficiaryWallet: !!beneficiaryWallet,
      hasBeneficiaryAddress: !!beneficiaryAddress,
      step: isMultisigCreated ? (beneficiaryWallet ? "complete" : "beneficiary setup") : "multisig setup"
    });
  }, [isMultisigCreated, beneficiaryWallet, beneficiaryAddress]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">
          {isMultisigCreated && !beneficiaryWallet ? "Configure Beneficiary" : "Create Multi Sig Wallet"}
        </CardTitle>
        <CardDescription className="text-center">
          {isMultisigCreated && !beneficiaryWallet 
            ? "Designate a beneficiary to receive your assets when conditions are met"
            : "Set up a multi-signature wallet using Lore and designate your beneficiary"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isMultisigCreated ? (
          <div className="py-4 flex flex-col items-center justify-center space-y-6">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <Wallet className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-lg font-medium text-center">Multisig Wallet Created!</h3>
            
            {/* Beneficiary confirmation notification */}
            {showBeneficiaryConfirmation && (
              <Alert className="bg-green-50 border-green-200">
                <Check className="h-4 w-4 text-green-500" />
                <AlertTitle>Beneficiary Wallet Confirmed</AlertTitle>
                <AlertDescription className="text-sm">
                  Beneficiary wallet address <span className="font-mono">{beneficiaryWallet}</span> has been successfully linked to this Digital Will.
                </AlertDescription>
              </Alert>
            )}
            
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertTitle>Important Warning</AlertTitle>
              <AlertDescription className="text-sm">
                You are responsible for storing and/or distributing seed phrases and product keys. 
                Digital Wills does not store and does not have access to any user specific data 
                that grants access to assets. If you lose access to these wallets, all assets will be unrecoverable.
              </AlertDescription>
            </Alert>
            
            <div className="w-full">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="donor">
                  <AccordionTrigger className="text-left font-medium">
                    Your Wallet (Donor)
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">Seed Phrase:</p>
                      <div className="relative">
                        <div className="p-3 bg-gray-100 rounded-md text-sm font-mono break-all">
                          {seedPhrases.donor}
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="absolute top-1 right-1"
                          onClick={() => copyToClipboard(seedPhrases.donor || "", "Seed phrase")}
                        >
                          <Copy size={14} />
                        </Button>
                      </div>
                      
                      <p className="text-sm text-gray-500 mt-2">Product Key:</p>
                      <div className="relative">
                        <div className="p-3 bg-gray-100 rounded-md text-sm font-mono">
                          {productKeys.donor}
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="absolute top-1 right-1"
                          onClick={() => copyToClipboard(productKeys.donor || "", "Product key")}
                        >
                          <Copy size={14} />
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="multisig">
                  <AccordionTrigger className="text-left font-medium">
                    Asset Multi Sig Wallet
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">Wallet Address:</p>
                      <div className="relative">
                        <div className="p-3 bg-gray-100 rounded-md text-sm font-mono break-all">
                          {multisigWallet}
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="absolute top-1 right-1"
                          onClick={() => copyToClipboard(multisigWallet || "", "Multisig wallet address")}
                        >
                          <Copy size={14} />
                        </Button>
                      </div>
                      
                      <p className="text-sm text-gray-500">Seed Phrase:</p>
                      <div className="relative">
                        <div className="p-3 bg-gray-100 rounded-md text-sm font-mono break-all">
                          {seedPhrases.multisig}
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="absolute top-1 right-1"
                          onClick={() => copyToClipboard(seedPhrases.multisig || "", "Seed phrase")}
                        >
                          <Copy size={14} />
                        </Button>
                      </div>
                      
                      <p className="text-sm text-gray-500 mt-2">Product Key:</p>
                      <div className="relative">
                        <div className="p-3 bg-gray-100 rounded-md text-sm font-mono">
                          {productKeys.multisig}
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="absolute top-1 right-1"
                          onClick={() => copyToClipboard(productKeys.multisig || "", "Product key")}
                        >
                          <Copy size={14} />
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="beneficiary">
                  <AccordionTrigger className="text-left font-medium">
                    Beneficiary Wallet
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">Wallet Address:</p>
                      <div className="relative">
                        <div className="p-3 bg-gray-100 rounded-md text-sm font-mono break-all">
                          {beneficiaryWallet}
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="absolute top-1 right-1"
                          onClick={() => copyToClipboard(beneficiaryWallet || "", "Beneficiary wallet address")}
                        >
                          <Copy size={14} />
                        </Button>
                      </div>
                      
                      <p className="text-sm text-gray-500">Seed Phrase:</p>
                      <div className="relative">
                        <div className="p-3 bg-gray-100 rounded-md text-sm font-mono break-all">
                          {seedPhrases.beneficiary}
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="absolute top-1 right-1"
                          onClick={() => copyToClipboard(seedPhrases.beneficiary || "", "Seed phrase")}
                        >
                          <Copy size={14} />
                        </Button>
                      </div>
                      
                      <p className="text-sm text-gray-500 mt-2">Product Key:</p>
                      <div className="relative">
                        <div className="p-3 bg-gray-100 rounded-md text-sm font-mono">
                          {productKeys.beneficiary}
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="absolute top-1 right-1"
                          onClick={() => copyToClipboard(productKeys.beneficiary || "", "Product key")}
                        >
                          <Copy size={14} />
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
            
            {/* Final confirmation and submit button */}
            <div className="w-full mt-4">
              <Alert className="bg-amber-50 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Final Review</AlertTitle>
                <AlertDescription className="text-amber-700">
                  Please review all information carefully. Once submitted, you cannot make changes to this setup.
                </AlertDescription>
              </Alert>
              
              <Button
                className="w-full mt-4"
                onClick={handleFinalSubmit}
                disabled={!!showConfirmation && !onCompleteBeneficiary}
              >
                {onCompleteBeneficiary ? "Continue to Final Review" : "Complete Digital Will Setup"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="beneficiary">Beneficiary Wallet Address</Label>
              <Input
                id="beneficiary"
                placeholder="0x..."
                value={beneficiaryAddress}
                onChange={(e) => setBeneficiaryAddress(e.target.value)}
                className={isMultisigDisabled ? "bg-gray-100" : ""}
                disabled={isMultisigDisabled}
              />
              <p className="text-xs text-gray-500">
                Enter the wallet address that will receive the assets when beneficiary initiates a claim request
              </p>
            </div>
            
            <div className="flex items-center p-3 bg-amber-50 border border-amber-200 rounded-md">
              <Link className="h-4 w-4 text-amber-500 flex-shrink-0 mr-2" />
              <p className="text-xs text-amber-700">
                The beneficiary will gain access only under conditions specified in your digital will
              </p>
            </div>

            {isMultisigDisabled && (
              <Alert className="bg-gray-100 border-gray-300">
                <AlertCircle className="h-4 w-4 text-gray-500" />
                <AlertTitle className="text-gray-700">Communication Preferences Already Set</AlertTitle>
                <AlertDescription className="text-gray-600">
                  You've already set communication preferences for this donor wallet.
                  Please continue with the current setup or start over if you need to make changes.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
      
      {!isMultisigCreated && (
        <CardFooter>
          <Button
            className="w-full"
            onClick={handleCreateMultisig}
            disabled={isCreating || isMultisigDisabled}
          >
            {isCreating ? "Creating Multi Sig Wallet..." : "Create Multi Sig Wallet"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default MultisigWalletSection;
