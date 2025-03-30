
import React from "react";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Link, Wallet } from "lucide-react";

const MultisigWalletSection = () => {
  const { createMultisigWallet, isMultisigCreated, beneficiaryWallet, setBeneficiaryWallet } = useWallet();
  const [isCreating, setIsCreating] = React.useState(false);
  const [beneficiaryAddress, setBeneficiaryAddress] = React.useState("");
  
  const handleCreateMultisig = async () => {
    if (!beneficiaryAddress || !beneficiaryAddress.startsWith("0x") || beneficiaryAddress.length !== 42) {
      toast.error("Please enter a valid wallet address");
      return;
    }
    
    setIsCreating(true);
    const success = await createMultisigWallet();
    if (success) {
      setBeneficiaryWallet(beneficiaryAddress);
    }
    setIsCreating(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Create Multisig Wallet</CardTitle>
        <CardDescription className="text-center">
          Set up a multi-signature wallet using Lore and designate your beneficiary
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isMultisigCreated ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <Wallet className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-lg font-medium text-center">Multisig Wallet Created!</h3>
            <div className="text-sm text-center text-gray-500">
              <p>Your assets are now protected with a multisig wallet.</p>
              <p className="mt-1">Beneficiary address:</p>
              <p className="font-mono text-xs mt-1 p-2 bg-gray-100 rounded">{beneficiaryWallet}</p>
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
              />
              <p className="text-xs text-gray-500">
                Enter the wallet address that will receive the assets
              </p>
            </div>
            
            <div className="flex items-center p-3 bg-amber-50 border border-amber-200 rounded-md">
              <Link className="h-4 w-4 text-amber-500 flex-shrink-0 mr-2" />
              <p className="text-xs text-amber-700">
                The beneficiary will gain access only under conditions specified in your digital will
              </p>
            </div>
          </>
        )}
      </CardContent>
      
      {!isMultisigCreated && (
        <CardFooter>
          <Button
            className="w-full"
            onClick={handleCreateMultisig}
            disabled={isCreating}
          >
            {isCreating ? "Creating Multisig Wallet..." : "Create Multisig Wallet"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default MultisigWalletSection;
