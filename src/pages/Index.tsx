
import React, { useEffect, useState } from "react";
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

// Define background image paths as constants to avoid magic numbers
// Try multiple potential paths/formats for better compatibility
const IMAGE_PATHS = [
  "/lovable-uploads/54fc367e-0d73-40ad-9b2a-a1410019dc6c.png",
  "./lovable-uploads/54fc367e-0d73-40ad-9b2a-a1410019dc6c.png",
  "lovable-uploads/54fc367e-0d73-40ad-9b2a-a1410019dc6c.png",
  "/54fc367e-0d73-40ad-9b2a-a1410019dc6c.png",
  "/images/background.png"
];

// Increase opacity from 0.15 to 0.35 (20% more opaque)
const BACKGROUND_OPACITY = 0.35;

const Index = () => {
  const { 
    address, 
    isAuthenticated, 
    donorWallet, 
    showCompletionBanner,
    setShowCompletionBanner
  } = useWallet();
  
  // Add state to track if image is loaded
  const [imageLoaded, setImageLoaded] = useState(false);
  const [backgroundImagePath, setBackgroundImagePath] = useState("");
  const [attemptCount, setAttemptCount] = useState(0);

  // Log when component mounts to verify it's rendering correctly
  useEffect(() => {
    console.log("🔍 Index component mounted");
    
    // Function to try loading each image path
    const tryLoadImage = (index = 0) => {
      if (index >= IMAGE_PATHS.length) {
        console.error("❌ Failed to load background image from all paths");
        // Use fallback background
        tryFallbackBackground();
        return;
      }

      const path = IMAGE_PATHS[index];
      console.log(`🖼️ Attempting to load background image from: ${path}`);
      
      const img = new Image();
      img.onload = () => {
        console.log(`✅ Successfully loaded background image from: ${path}`);
        setBackgroundImagePath(path);
        setImageLoaded(true);
      };
      img.onerror = () => {
        console.error(`❌ Failed to load background image from: ${path}`);
        // Try next path
        setAttemptCount(prev => prev + 1);
        tryLoadImage(index + 1);
      };
      img.src = path;
    };

    // Start trying to load images
    tryLoadImage();
  }, []);
  
  // Function to try a fallback background color if image fails
  const tryFallbackBackground = () => {
    console.log("🔄 Using fallback background style");
    setImageLoaded(true); // Allow rendering even though we're using a fallback
  };

  // Create an inline style for the background with the loaded image or fallback
  const backgroundStyle = {
    backgroundImage: imageLoaded && backgroundImagePath ? `url(${backgroundImagePath})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    opacity: BACKGROUND_OPACITY,
    backgroundColor: !imageLoaded || !backgroundImagePath ? 'rgba(59, 76, 222, 0.05)' : undefined // Very light blue fallback
  };

  // Add debug information for troubleshooting
  console.log("🔄 Current image state:", {
    imageLoaded,
    backgroundImagePath,
    attemptCount,
    style: backgroundStyle
  });

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background with either image or gradient fallback */}
      <div 
        className="fixed inset-0 z-0 bg-center bg-cover bg-no-repeat"
        style={backgroundStyle}
      />
      
      {/* Content container with relative positioning to appear above the background */}
      <div className="relative z-10 flex flex-col flex-1">
        <Header />
        
        {/* Debug info visible during development */}
        {process.env.NODE_ENV === 'development' && !imageLoaded && backgroundImagePath === "" && attemptCount >= IMAGE_PATHS.length && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded m-4">
            <p>Debug: Failed to load background image after {attemptCount} attempts</p>
          </div>
        )}
        
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
                      <h3 className="text-lg font-medium">Step 3: Create Multi Sig Wallet & Add Beneficiary</h3>
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
    </div>
  );
};

export default Index;
