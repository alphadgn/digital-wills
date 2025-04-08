
import React from "react";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

const Header = () => {
  const { address, connectWallet, isConnecting, termsAccepted } = useWallet();

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
            disabled={isConnecting || !termsAccepted}
            variant="outline"
            className={`flex items-center gap-2 ${!termsAccepted ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Wallet className="h-4 w-4" />
            {isConnecting ? "Connecting..." : "Connect Wallet"}
            {!termsAccepted && <span className="text-xs text-red-500 ml-1">(Accept Terms First)</span>}
          </Button>
        )}
      </div>
    </header>
  );
};

export default Header;
