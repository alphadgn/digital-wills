
import React from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";

const Hero = () => {
  const { connectWallet, isConnecting } = useWallet();
  
  return (
    <section className="py-20 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-digitalwill-primary to-digitalwill-secondary bg-clip-text text-transparent mb-6">
          Secure Your Digital Legacy
        </h1>
        <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Plan for your digital future with our blockchain-based will solution. 
          Ensure your digital assets pass on to your loved ones securely.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button 
            size="lg" 
            onClick={() => connectWallet()}
            disabled={isConnecting}
            className="bg-digitalwill-primary hover:bg-digitalwill-primary/90"
          >
            {isConnecting ? "Connecting..." : "Sign Up & Connect Wallet"}
          </Button>
          <Button 
            size="lg" 
            variant="outline"
          >
            Learn More
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
