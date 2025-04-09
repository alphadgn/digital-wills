
import React from "react";
import { useWallet } from "@/contexts/WalletContext";
import { Wallet } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link, useLocation } from "react-router-dom";

const Header = () => {
  const { address } = useWallet();
  const isMobile = useIsMobile();
  const location = useLocation();

  // Only show sign in link on index page (/)
  const showSignInLink = location.pathname === "/";

  return (
    <header className="w-full py-4 px-6 flex justify-between items-center border-b">
      <div className="flex-1">
        {address && (
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 rounded-full bg-green-500"></div>
            <span className="text-sm font-medium">
              {address.substring(0, 6)}...{address.substring(address.length - 4)}
            </span>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2 flex-1 justify-center relative">
        <Wallet className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-digitalwill-primary`} />
        <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold bg-gradient-to-r from-digitalwill-primary to-digitalwill-secondary bg-clip-text text-transparent`}>
          DigitalWills.io
        </h1>
        
        {showSignInLink && (
          <Link 
            to="/sign-in"
            className="absolute right-0 top-1/2 transform -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Sign In
          </Link>
        )}
      </div>
      
      <div className="flex-1"></div>
    </header>
  );
};

export default Header;
