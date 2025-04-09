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
  donorSSN: string | null;
  setDonorSSN: (ssn: string) => void;
  communicationPreference: {
    method: "email" | "phone" | null;
    value: string | null;
  };
  setCommunicationPreference: (method: "email" | "phone", value: string) => void;
  notifyDonorOfRecoveryAttempt: () => void;
  termsAccepted: boolean;
  setTermsAccepted: (accepted: boolean) => void;
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
  const [donorSSN, setDonorSSN] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  const [communicationPreference, setCommunicationPreferenceState] = useState<{
    method: "email" | "phone" | null;
    value: string | null;
  }>({
    method: null,
    value: null
  });
  
  const setCommunicationPreference = (method: "email" | "phone", value: string) => {
    setCommunicationPreferenceState({
      method,
      value
    });
  };
  
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

  const notifyDonorOfRecoveryAttempt = () => {
    if (!communicationPreference.method || !communicationPreference.value) {
      console.log("No communication preference set, cannot notify donor");
      return;
    }
    
    console.log(`Notifying donor via ${communicationPreference.method} to ${communicationPreference.value}`);
    toast.info(`Mock notification sent to donor via ${communicationPreference.method}`);
  };

  const connectWallet = async (): Promise<boolean> => {
    try {
      setIsConnecting(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockAddress = "0x" + Math.random().toString(16).substring(2, 42);
      
      if (usedWallets.includes(mockAddress)) {
        toast.error("This wallet has already been used for a Digital Will. Please use a different wallet.");
        setIsConnecting(false);
        return false;
      }
      
      setAddress(mockAddress);
      
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

  const authenticateWallet = async (): Promise<boolean> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const isSuccess = Math.random() > 0.2;
      
      if (isSuccess) {
        setIsAuthenticated(true);
        return true;
      } else {
        console.log("Authentication failed silently");
        return false;
      }
    } catch (error) {
      console.error("Authentication error:", error);
      return false;
    }
  };

  const createMultisigWallet = async (): Promise<boolean> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (!donorWallet) {
        toast.error("Please select a donor wallet first");
        return false;
      }
      
      if (!beneficiaryWallet) {
        toast.error("Please provide a beneficiary wallet address");
        return false;
      }
      
      if (beneficiaryWallet === donorWallet || beneficiaryWallet === address) {
        toast.error("Beneficiary wallet cannot be the same as the donor wallet");
        return false;
      }
      
      if (usedWallets.includes(donorWallet)) {
        toast.error("This donor wallet has already been used for a Digital Will. Please use a different wallet.");
        return false;
      }
      
      const newMultisigWallet = "0x" + Math.random().toString(16).substring(2, 42);
      setMultisigWallet(newMultisigWallet);
      
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
      
      setUsedWallets(prev => [...prev, donorWallet]);
      
      setWillsCreated(prev => prev + 1);
      
      toast.message(
        "Important: You are responsible for storing and/or distributing seed phrases and product keys. Digital Wills does not store and does not have access to any user specific data that grants access to assets. If you lose access to these wallets, all assets will be unrecoverable.",
        {
          duration: 10000,
        }
      );
      
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

  const verifyDeathCertificate = async (name: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return Math.random() > 0.5;
  };

  const initiateAssetRecovery = async (beneficiaryAddress: string, organizerSSN: string): Promise<boolean> => {
    try {
      setUserHasAttemptedRecovery(true);
      
      if (!/^\d{9}$|^\d{3}-\d{2}-\d{4}$/.test(organizerSSN)) {
        toast.error("Invalid Social Security Number format");
        return false;
      }
      
      const formattedOrganizerSSN = organizerSSN.replace(/-/g, "");
      if (donorSSN && formattedOrganizerSSN !== donorSSN) {
        notifyDonorOfRecoveryAttempt();
        
        toast.error("Social Security Number verification failed");
        return false;
      }
      
      const isDonorDeceased = await verifyDeathCertificate("John Doe");
      
      if (isDonorDeceased) {
        toast.success("Assets have been transferred to your wallet");
        return true;
      } else {
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
    setTermsAccepted(false);
  };
  
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
        termsAccepted,
        setTermsAccepted,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
