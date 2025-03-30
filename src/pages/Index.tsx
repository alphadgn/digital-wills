
import React from "react";
import { useWallet } from "@/contexts/WalletContext";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Footer from "@/components/Footer";
import WalletConnectSection from "@/components/WalletConnectSection";
import WalletSelectionSection from "@/components/WalletSelectionSection";
import MultisigWalletSection from "@/components/MultisigWalletSection";

const Index = () => {
  const { address, isAuthenticated, donorWallet } = useWallet();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {/* If not connected to wallet, show landing page */}
      {!address && (
        <>
          <Hero />
          <Features />
          <div className="text-center py-10">
            <p className="text-gray-600 mb-4">Are you a beneficiary looking to recover assets?</p>
            <Link 
              to="/asset-recovery" 
              className="text-digitalwill-primary hover:text-digitalwill-primary/80 underline"
            >
              Go to Asset Recovery
            </Link>
          </div>
        </>
      )}
      
      {/* If connected to wallet, show the appropriate section based on state */}
      {address && (
        <div className="flex-1 py-12 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Digital Will Creation
            </h2>
            
            <div className="space-y-8">
              {/* Step 1: Connect Wallet (already done but shown for clarity) */}
              <div className="border-l-4 border-green-500 pl-4 py-2 mb-8">
                <h3 className="text-lg font-medium">Step 1: Connect Wallet</h3>
                <p className="text-gray-500">Connected successfully</p>
              </div>
              
              {/* Step 2: Select Donor Wallet */}
              <div className={`border-l-4 ${donorWallet ? 'border-green-500' : 'border-digitalwill-primary'} pl-4 py-2 mb-8`}>
                <h3 className="text-lg font-medium">Step 2: Select Donor Wallet</h3>
                <p className="text-gray-500">
                  {donorWallet 
                    ? "Donor wallet selected and authenticated" 
                    : "Select and authenticate the wallet containing assets you wish to assign"}
                </p>
              </div>
              
              {!donorWallet && <WalletSelectionSection />}
              
              {/* Step 3: Create Multisig and Add Beneficiary */}
              {donorWallet && (
                <>
                  <div className="border-l-4 border-digitalwill-primary pl-4 py-2 mb-8">
                    <h3 className="text-lg font-medium">Step 3: Create Multisig Wallet & Add Beneficiary</h3>
                    <p className="text-gray-500">
                      Create a multisig wallet and designate your beneficiary
                    </p>
                  </div>
                  <MultisigWalletSection />
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
};

export default Index;
