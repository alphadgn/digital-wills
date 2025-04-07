
import React from "react";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface WalletSelectionSectionProps {
  onComplete?: () => void;
}

const WalletSelectionSection: React.FC<WalletSelectionSectionProps> = ({ onComplete }) => {
  const { connectWallet, isConnecting } = useWallet();
  
  const handleConnect = async () => {
    await connectWallet();
    toast.success("Wallet connection simulated");
    
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Wallet Selection</CardTitle>
        <CardDescription className="text-center">
          Connect your wallet to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          className="w-full"
          onClick={handleConnect}
          disabled={isConnecting}
        >
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default WalletSelectionSection;
