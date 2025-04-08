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
  multisigWallet: string | null;
  setDonorWallet: (address: string) => void;
  setBeneficiaryWallet: (address: string) => void;
  isMultisigCreated: boolean;
  createMultisigWallet: () => Promise<boolean>;
  resetProcess: () => void;
  seedPhrases: {
    donor: string | null;
    multisig: string | null;
    beneficiary: string | null;
  };
  productKeys: {
    donor: string | null;
    multisig: string | null;
    beneficiary: string | null;
  };
  initiateAssetRecovery: (beneficiaryAddress: string, organizerSSN: string) => Promise<boolean>;
  verifyDeathCertificate: (name: string) => Promise<boolean>;
  userHasAttemptedRecovery: boolean;
  willsCreated: number;
  showCompletionBanner: boolean;
  setShowCompletionBanner: (show: boolean) => void;
  createNewWill: () => void;
  usedWallets: string[];
  // SSN related fields
  donorSSN: string | null;
  setDonorSSN: (ssn: string) => void;
  // New communication preference fields
  communicationPreference: {
    method: "email" | "phone" | null;
    value: string | null;
  };
  setCommunicationPreference: (method: "email" | "phone", value: string) => void;
  // Method to notify donor of recovery attempt
  notifyDonorOfRecoveryAttempt: () => void;
};

// Create the initial context
const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Helper to generate a mock seed phrase
const generateSeedPhrase = (): string => {
  const words = [
    "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract", 
    "absurd", "abuse", "access", "accident", "account", "accuse", "achieve", "acid", 
    "acoustic", "acquire", "across", "act", "action", "actor", "actual", "adapt"
  ];
  
  let seedPhrase = "";
  for (let i = 0; i < 12; i++) {
    const randomIndex = Math.floor(Math.random() * words.length);
    seedPhrase += words[randomIndex] + (i < 11 ? " " : "");
  }
  return seedPhrase;
};

// Helper to generate a mock product key
const generateProductKey = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let key = "";
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 5; j++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (i < 3) key += "-";
  }
  return key;
};

// Provider component
export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [donorWallet, setDonorWallet] = useState<string | null>(null);
  const [beneficiaryWallet, setBeneficiaryWallet] = useState<string | null>(null);
  const [multisigWallet, setMultisigWallet] = useState<string | null>(null);
  const [isMultisigCreated, setIsMultisigCreated] = useState(false);
  const [userHasAttemptedRecovery, setUserHasAttemptedRecovery] = useState(false);
  const [willsCreated, setWillsCreated] = useState(0);
  const [showCompletionBanner, setShowCompletionBanner] = useState(false);
  const [usedWallets, setUsedWallets] = useState<string[]>([]);
  // SSN state
  const [donorSSN, setDonorSSN] = useState<string | null>(null);
  
  // New communication preference state
  const [communicationPreference, setCommunicationPreferenceState] = useState<{
    method: "email" | "phone" | null;
    value: string | null;
  }>({
    method: null,
    value: null
  });
  
  // Create a wrapper function that matches the expected signature
  const setCommunicationPreference = (method: "email" | "phone", value: string) => {
    setCommunicationPreferenceState({
      method,
      value
    });
  };
  
  // Seed phrases and product keys for the wallets
  const [seedPhrases, setSeedPhrases] = useState({
    donor: null as string | null,
    multisig: null as string | null,
    beneficiary: null as string | null
  });
  
  const [productKeys, setProductKeys] = useState({
    donor: null as string | null,
    multisig: null as string | null,
    beneficiary: null as string | null
  });

  // Function to notify donor of recovery attempt
  const notifyDonorOfRecoveryAttempt = () => {
    if (!communicationPreference.method || !communicationPreference.value) {
      console.log("No communication preference set, cannot notify donor");
      return;
    }
    
    // In a real app, this would send an email or SMS
    console.log(`Notifying donor via ${communicationPreference.method} to ${communicationPreference.value}`);
    toast.info(`Mock notification sent to donor via ${communicationPreference.method}`);
  };

  // Simulate wallet connection (in a real app, this would connect to ApeChain)
  const connectWallet = async (): Promise<boolean> => {
    try {
      setIsConnecting(true);
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock successful connection
      const mockAddress = "0x" + Math.random().toString(16).substring(2, 42);
      
      // Check if this wallet has been used before
      if (usedWallets.includes(mockAddress)) {
        toast.error("This wallet has already been used for a Digital Will. Please use a different wallet.");
        setIsConnecting(false);
        return false;
      }
      
      setAddress(mockAddress);
      
      // Generate seed phrase and product key for the connected wallet
      const donorSeed = generateSeedPhrase();
      const donorKey = generateProductKey();
      
      setSeedPhrases(prev => ({
        ...prev,
        donor: donorSeed
      }));
      
      setProductKeys(prev => ({
        ...prev,
        donor: donorKey
      }));
      
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
        toast.error("Failed to authenticate wallet. Would you like to authenticate?");
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
      
      if (!beneficiaryWallet) {
        toast.error("Please provide a beneficiary wallet address");
        return false;
      }
      
      // Check if beneficiary wallet is the same as donor wallet
      if (beneficiaryWallet === donorWallet || beneficiaryWallet === address) {
        toast.error("Beneficiary wallet cannot be the same as the donor wallet");
        return false;
      }
      
      // Check if donor wallet has been used before
      if (usedWallets.includes(donorWallet)) {
        toast.error("This donor wallet has already been used for a Digital Will. Please use a different wallet.");
        return false;
      }
      
      // Generate a new multisig wallet address
      const newMultisigWallet = "0x" + Math.random().toString(16).substring(2, 42);
      setMultisigWallet(newMultisigWallet);
      
      // Generate seed phrases and product keys for multisig and beneficiary wallets
      const multisigSeed = generateSeedPhrase();
      const multisigKey = generateProductKey();
      const beneficiarySeed = generateSeedPhrase();
      const beneficiaryKey = generateProductKey();
      
      setSeedPhrases(prev => ({
        ...prev,
        multisig: multisigSeed,
        beneficiary: beneficiarySeed
      }));
      
      setProductKeys(prev => ({
        ...prev,
        multisig: multisigKey,
        beneficiary: beneficiaryKey
      }));
      
      setIsMultisigCreated(true);
      
      // Add the donor wallet to the list of used wallets
      setUsedWallets(prev => [...prev, donorWallet]);
      
      // Increment the number of wills created
      setWillsCreated(prev => prev + 1);
      
      // Important notice about seed phrases and product keys
      toast.message(
        "Important: You are responsible for storing and/or distributing seed phrases and product keys. Digital Wills does not store and does not have access to any user specific data that grants access to assets. If you lose access to these wallets, all assets will be unrecoverable.",
        {
          duration: 10000,
        }
      );
      
      // Show success notification
      toast.success("Digital Will created successfully", {
        duration: 3000,
      });
      
      return true;
    } catch (error) {
      console.error("Failed to create multisig wallet:", error);
      toast.error("Failed to create multisig wallet. Please try again.");
      return false;
    }
  };

  // Simulate death certificate verification
  const verifyDeathCertificate = async (name: string): Promise<boolean> => {
    // In a real implementation, this would call an AI service to search for death certificates
    // For demo purposes, we'll randomly determine if the person is deceased
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 50% chance the person is found to be deceased (for demo)
    return Math.random() > 0.5;
  };

  // Initiate asset recovery process
  const initiateAssetRecovery = async (beneficiaryAddress: string, organizerSSN: string): Promise<boolean> => {
    try {
      setUserHasAttemptedRecovery(true);
      
      // Validate SSN format (simple check for demo)
      if (!/^\d{9}$|^\d{3}-\d{2}-\d{4}$/.test(organizerSSN)) {
        toast.error("Invalid Social Security Number format");
        return false;
      }
      
      // Compare the entered SSN with the stored donor SSN
      const formattedOrganizerSSN = organizerSSN.replace(/-/g, "");
      if (donorSSN && formattedOrganizerSSN !== donorSSN) {
        // Notify the donor about failed recovery attempt
        notifyDonorOfRecoveryAttempt();
        
        toast.error("Social Security Number verification failed");
        return false;
      }
      
      // Verify death certificate
      const isDonorDeceased = await verifyDeathCertificate("John Doe"); // In real app, would use actual name
      
      if (isDonorDeceased) {
        // Both votes have been received (death certificate + beneficiary request)
        toast.success("Assets have been transferred to your wallet");
        return true;
      } else {
        // Notify the original donor that someone tried to access the assets
        notifyDonorOfRecoveryAttempt();
        
        toast.error("Death certificate verification failed. The original account owner has been notified of this attempt.");
        return false;
      }
    } catch (error) {
      console.error("Asset recovery failed:", error);
      toast.error("Asset recovery process failed. Please try again later.");
      return false;
    }
  };

  // Reset the entire process
  const resetProcess = () => {
    setAddress(null);
    setIsAuthenticated(false);
    setDonorWallet(null);
    setBeneficiaryWallet(null);
    setMultisigWallet(null);
    setIsMultisigCreated(false);
    setSeedPhrases({
      donor: null,
      multisig: null,
      beneficiary: null
    });
    setProductKeys({
      donor: null,
      multisig: null,
      beneficiary: null
    });
    setUserHasAttemptedRecovery(false);
    setShowCompletionBanner(false);
    setDonorSSN(null);
    setCommunicationPreferenceState({
      method: null,
      value: null
    });
  };
  
  // Start creating a new will
  const createNewWill = () => {
    resetProcess();
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
        multisigWallet,
        setDonorWallet,
        setBeneficiaryWallet,
        isMultisigCreated,
        createMultisigWallet,
        resetProcess,
        seedPhrases,
        productKeys,
        initiateAssetRecovery,
        verifyDeathCertificate,
        userHasAttemptedRecovery,
        willsCreated,
        showCompletionBanner,
        setShowCompletionBanner,
        createNewWill,
        usedWallets,
        donorSSN,
        setDonorSSN,
        communicationPreference,
        setCommunicationPreference,
        notifyDonorOfRecoveryAttempt,
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
