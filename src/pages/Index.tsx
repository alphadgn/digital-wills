
import React, { useEffect } from "react";
import { useWallet } from "@/contexts/WalletContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Background from "@/components/DigitalWill/Background";
import LandingPage from "@/components/DigitalWill/LandingPage";
import ContentContainer from "@/components/DigitalWill/ContentContainer";

const Index = () => {
  const { address } = useWallet();
  
  // Ensure page starts at the top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  return (
    <Background>
      <Header />
      
      <div className="min-h-screen flex flex-col">
        {!address ? (
          <LandingPage />
        ) : (
          <ContentContainer />
        )}
        
        <Footer />
      </div>
    </Background>
  );
};

export default Index;
