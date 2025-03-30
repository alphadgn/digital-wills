
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "sonner";

// Define the wallet context type
type WalletContextType = {
  address: string | null;
  isConnecting: boolean;
  isAuthenticated: boolean;
  connectWallet: () => Promise<boolean>;
  authenticateWallet: () => Promise<boolean>;
  donorWallet: string | null;
  beneficiaryWallet: string | null;
  setDonorWallet: (address: string) => void;
  setBeneficiaryWallet: (address: string) => void;
  isMultisigCreated: boolean;
  createMultisigWallet: () => Promise<boolean>;
  resetProcess: () => void;
};

// Create the initial context
const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Provider component
export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [donorWallet, setDonorWallet] = useState<string | null>(null);
  const [beneficiaryWallet, setBeneficiaryWallet] = useState<string | null>(null);
  const [isMultisigCreated, setIsMultisigCreated] = useState(false);

  // Simulate wallet connection (in a real app, this would connect to ApeChain)
  const connectWallet = async (): Promise<boolean> => {
    try {
      setIsConnecting(true);
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock successful connection
      const mockAddress = "0x" + Math.random().toString(16).substring(2, 42);
      setAddress(mockAddress);
      toast.success("Wallet connected successfully!");
      setIsConnecting(false);
      return true;
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      toast.error("Failed to connect wallet. Please try again.");
      setIsConnecting(false);
      return false;
    }
  };

  // Simulate wallet authentication
  const authenticateWallet = async (): Promise<boolean> => {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 80% chance of success for demo purposes
      const isSuccess = Math.random() > 0.2;
      
      if (isSuccess) {
        setIsAuthenticated(true);
        toast.success("Wallet authenticated successfully!");
        return true;
      } else {
        toast.error("Failed to authenticate wallet. Please try again.");
        return false;
      }
    } catch (error) {
      console.error("Authentication error:", error);
      toast.error("Authentication error. Please try again.");
      return false;
    }
  };

  // Create a multisig wallet
  const createMultisigWallet = async (): Promise<boolean> => {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (!donorWallet) {
        toast.error("Please select a donor wallet first");
        return false;
      }
      
      setIsMultisigCreated(true);
      toast.success("Multisig wallet created successfully!");
      return true;
    } catch (error) {
      console.error("Failed to create multisig wallet:", error);
      toast.error("Failed to create multisig wallet. Please try again.");
      return false;
    }
  };

  // Reset the entire process
  const resetProcess = () => {
    setAddress(null);
    setIsAuthenticated(false);
    setDonorWallet(null);
    setBeneficiaryWallet(null);
    setIsMultisigCreated(false);
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnecting,
        isAuthenticated,
        connectWallet,
        authenticateWallet,
        donorWallet,
        beneficiaryWallet,
        setDonorWallet,
        setBeneficiaryWallet,
        isMultisigCreated,
        createMultisigWallet,
        resetProcess,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

// Custom hook to use the wallet context
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
