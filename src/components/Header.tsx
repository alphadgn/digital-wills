
import React from "react";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

const Header = () => {
  const { address, connectWallet, isConnecting } = useWallet();

  return (
    <header className="w-full py-4 px-6 flex justify-between items-center border-b">
      <div className="flex items-center gap-2">
        <Wallet className="h-6 w-6 text-digitalwill-primary" />
        <h1 className="text-2xl font-bold bg-gradient-to-r from-digitalwill-primary to-digitalwill-secondary bg-clip-text text-transparent">
          DigitalWills.io
        </h1>
      </div>
      
      <div className="flex items-center space-x-4">
        {address ? (
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 rounded-full bg-green-500"></div>
            <span className="text-sm font-medium">
              {address.substring(0, 6)}...{address.substring(address.length - 4)}
            </span>
          </div>
        ) : (
          <Button 
            onClick={() => connectWallet()} 
            disabled={isConnecting}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Wallet className="h-4 w-4" />
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </Button>
        )}
      </div>
    </header>
  );
};

export default Header;
