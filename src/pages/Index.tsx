
import React from "react";
import { useWallet } from "@/contexts/WalletContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Background from "@/components/DigitalWill/Background";
import LandingPage from "@/components/DigitalWill/LandingPage";
import { toast } from "sonner";

const Index = () => {
  const { address } = useWallet();
  
  // Simple function to display a message
  const handleAction = () => {
    toast.info("Action requested");
  };
  
  return (
    <Background>
      <Header />
      
      {!address ? (
        <LandingPage />
      ) : (
        <div className="flex-1 py-12 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8">
              Digital Will Creation
            </h2>
            
            <div className="p-8 bg-white rounded-lg shadow-md">
              <h3 className="text-xl font-semibold text-center">Application Reset</h3>
              <p className="text-center my-4">
                The application logic has been removed as requested. You can now rebuild the functionality.
              </p>
              <div className="flex justify-center mt-6">
                <button 
                  className="px-4 py-2 bg-digitalwill-primary text-white rounded-md"
                  onClick={handleAction}
                >
                  Sample Action
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </Background>
  );
};

export default Index;
