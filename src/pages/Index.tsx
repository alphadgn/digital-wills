
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
import CompletionBanner from "@/components/CompletionBanner";

// Define constants for background configuration
const BACKGROUND_OPACITY = 0.35; // Opacity value for background image
const FALLBACK_BG_COLOR = "rgba(59, 76, 222, 0.05)"; // Fallback background color

const Index = () => {
  const { 
    address, 
    isAuthenticated, 
    donorWallet, 
    showCompletionBanner,
    setShowCompletionBanner,
    isMultisigCreated
  } = useWallet();
  
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background image with fixed positioning and opacity */}
      <div 
        className="fixed inset-0 z-0 bg-center bg-cover bg-no-repeat"
        style={{
          backgroundImage: `url('/images/background.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: BACKGROUND_OPACITY,
          backgroundColor: FALLBACK_BG_COLOR, // Fallback color if image fails
        }}
      />
      
      {/* Content container with relative positioning to appear above the background */}
      <div className="relative z-10 flex flex-col flex-1">
        <Header />
        
        {/* Completion Banner */}
        {showCompletionBanner && (
          <CompletionBanner />
        )}
        
        {/* If not connected to wallet, show landing page */}
        {!address && !showCompletionBanner && (
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
        
        {/* If connected to wallet and not showing completion banner, show the appropriate section based on state */}
        {address && !showCompletionBanner && (
          <div className="flex-1 py-12 px-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">
                Digital Will Creation
              </h2>
              
              <div className="space-y-8">
                {/* Process Timeline */}
                <div className="flex justify-between items-center mb-12">
                  <div className={`flex flex-col items-center ${address ? 'text-green-500' : 'text-gray-400'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${address ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}>
                      <span className="text-lg font-bold">1</span>
                    </div>
                    <span className="text-sm mt-2">Connect Wallet</span>
                  </div>
                  
                  <div className="flex-1 h-1 mx-2 bg-gray-200">
                    <div className={`h-full ${donorWallet ? 'bg-green-500' : 'bg-gray-200'}`} style={{ width: address ? '100%' : '0%', transition: 'width 0.5s' }}></div>
                  </div>
                  
                  <div className={`flex flex-col items-center ${donorWallet ? 'text-green-500' : address ? 'text-digitalwill-primary' : 'text-gray-400'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${donorWallet ? 'border-green-500 bg-green-50' : address ? 'border-digitalwill-primary' : 'border-gray-300'}`}>
                      <span className="text-lg font-bold">2</span>
                    </div>
                    <span className="text-sm mt-2">Donor Wallet</span>
                  </div>
                  
                  <div className="flex-1 h-1 mx-2 bg-gray-200">
                    <div className={`h-full ${isMultisigCreated ? 'bg-green-500' : 'bg-gray-200'}`} style={{ width: donorWallet ? '100%' : '0%', transition: 'width 0.5s' }}></div>
                  </div>
                  
                  <div className={`flex flex-col items-center ${isMultisigCreated ? 'text-green-500' : donorWallet ? 'text-digitalwill-primary' : 'text-gray-400'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${isMultisigCreated ? 'border-green-500 bg-green-50' : donorWallet ? 'border-digitalwill-primary' : 'border-gray-300'}`}>
                      <span className="text-lg font-bold">3</span>
                    </div>
                    <span className="text-sm mt-2">Multi-Sig & Beneficiary</span>
                  </div>
                </div>
                
                {/* Current step content */}
                {!donorWallet ? (
                  <>
                    {/* Step 2: Select and authenticate the donor wallet */}
                    <WalletSelectionSection />
                  </>
                ) : (
                  <>
                    {/* Step 3: Create Multisig and Add Beneficiary */}
                    <MultisigWalletSection />
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        
        <Footer />
      </div>
    </div>
  );
};

export default Index;
