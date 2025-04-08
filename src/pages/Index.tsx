
import React from "react";
import { useWallet } from "@/contexts/WalletContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Background from "@/components/DigitalWill/Background";
import LandingPage from "@/components/DigitalWill/LandingPage";
import ContentContainer from "@/components/DigitalWill/ContentContainer";

const Index = () => {
  const { address } = useWallet();
  
  return (
    <Background>
      <Header />
      
      {!address ? (
        <LandingPage />
      ) : (
        <ContentContainer />
      )}
      
      <Footer />
    </Background>
  );
};

export default Index;
