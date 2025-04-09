
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const walletSchema = z.object({
  walletAddress: z.string()
    .min(42, "Wallet address must be at least 42 characters")
    .max(44, "Wallet address must not exceed 44 characters")
    .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid Ethereum wallet address starting with 0x")
});

type WalletFormValues = z.infer<typeof walletSchema>;

const SignIn = () => {
  const { connectWallet, isConnecting, usedWallets, address, setAddress } = useWallet();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showError, setShowError] = useState(false);
  const navigate = useNavigate();
  
  const form = useForm<WalletFormValues>({
    resolver: zodResolver(walletSchema),
    defaultValues: {
      walletAddress: ""
    }
  });

  const handleSubmitWallet = (values: WalletFormValues) => {
    setAddress(values.walletAddress);
    handleSignIn(values.walletAddress);
  };
  
  const handleSignIn = async (walletAddress?: string) => {
    const addressToCheck = walletAddress || address;
    
    if (!addressToCheck) {
      toast.error("Please enter a wallet address first");
      return;
    }
    
    setIsAuthenticating(true);
    setShowError(false);
    
    // Simulate checking the database for the wallet
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (usedWallets.includes(addressToCheck)) {
      toast.success("Successfully signed in");
      navigate("/dashboard");
    } else {
      setShowError(true);
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
              Enter your ApeChain wallet address to sign in to your account
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            {showError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This address is not associated with any existing accounts.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <Wallet className="h-8 w-8 text-gray-400" />
            </div>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmitWallet)} className="w-full space-y-4">
                <FormField
                  control={form.control}
                  name="walletAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wallet Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="0x..." 
                          {...field} 
                          className="font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button
                  type="submit"
                  disabled={isAuthenticating || !form.formState.isValid}
                  className="w-full"
                >
                  {isAuthenticating ? "Authenticating..." : "Sign In with Wallet"}
                </Button>
              </form>
            </Form>
            
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
