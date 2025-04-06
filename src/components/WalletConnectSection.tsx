
import React, { useState, useEffect } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import SSNInputDialog from "./SSNInputDialog";

const WalletConnectSection = () => {
  const { address, connectWallet, isConnecting } = useWallet();
  const [showSSNDialog, setShowSSNDialog] = useState(false);

  // Show SSN dialog when wallet is connected
  useEffect(() => {
    if (address) {
      // Add a slight delay so the connection success is registered first
      const timer = setTimeout(() => {
        setShowSSNDialog(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [address]);

  return (
    <>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">Connect Your Wallet</CardTitle>
          <CardDescription className="text-center">
            Connect your ApeChain wallet to get started with digital will creation
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center",
            address ? "bg-green-100" : "bg-gray-100"
          )}>
            <Wallet className={cn(
              "h-8 w-8",
              address ? "text-green-500" : "text-gray-400"
            )} />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm">Wallet Status:</span>
            {address ? (
              <span className="flex items-center gap-1 text-green-500">
                <Check className="h-4 w-4" /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-gray-400">
                <X className="h-4 w-4" /> Not Connected
              </span>
            )}
          </div>
          
          {address ? (
            <div className="p-3 bg-gray-100 rounded-md text-sm font-mono">
              {address.substring(0, 16)}...{address.substring(address.length - 6)}
            </div>
          ) : (
            <Button 
              onClick={() => connectWallet()} 
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? "Connecting..." : "Connect ApeChain Wallet"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* SSN Dialog */}
      <SSNInputDialog 
        open={showSSNDialog} 
        onOpenChange={setShowSSNDialog} 
        title="Complete Your Wallet Connection"
        description="Please provide your Social Security Number to complete the wallet connection process."
        buttonText="Complete Connection"
      />
    </>
  );
};

export default WalletConnectSection;
