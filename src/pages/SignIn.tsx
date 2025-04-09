
import React, { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Background from "@/components/DigitalWill/Background";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const SignIn = () => {
  const { connectWallet, isConnecting, usedWallets, address } = useWallet();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const navigate = useNavigate();
  
  const handleSignIn = async () => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }
    
    setIsAuthenticating(true);
    
    // Simulate checking the database for the wallet
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (usedWallets.includes(address)) {
      toast.success("Successfully signed in");
      navigate("/dashboard");
    } else {
      toast.error("User not found. This wallet is not associated with any account.");
    }
    
    setIsAuthenticating(false);
  };
  
  return (
    <Background>
      <Header />
      
      <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Connect your ApeChain wallet to sign in to your account
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <Wallet className="h-8 w-8 text-gray-400" />
            </div>
            
            {!address ? (
              <Button
                onClick={connectWallet}
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </Button>
            ) : (
              <>
                <div className="p-3 bg-gray-100 rounded-md text-sm font-mono w-full text-center break-all">
                  {address}
                </div>
                <Button
                  onClick={handleSignIn}
                  disabled={isAuthenticating}
                  className="w-full"
                >
                  {isAuthenticating ? "Authenticating..." : "Sign In"}
                </Button>
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-500">
              Don't have an account?{" "}
              <Button 
                variant="link" 
                className="p-0 h-auto text-blue-600"
                onClick={() => navigate("/")}
              >
                Sign Up
              </Button>
            </p>
          </CardFooter>
        </Card>
      </div>
      
      <Footer />
    </Background>
  );
};

export default SignIn;
