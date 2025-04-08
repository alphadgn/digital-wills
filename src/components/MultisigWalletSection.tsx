
import React, { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Wallet, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface MultisigWalletSectionProps {
  onComplete?: () => void;
}

const walletAddressSchema = z.object({
  donorAddress: z.string()
    .min(42, "Wallet address must be at least 42 characters")
    .max(44, "Wallet address must not exceed 44 characters")
    .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid Ethereum wallet address starting with 0x")
});

type WalletAddressFormValues = z.infer<typeof walletAddressSchema>;

const MultisigWalletSection: React.FC<MultisigWalletSectionProps> = ({ 
  onComplete 
}) => {
  const { setDonorWallet, authenticateWallet, address } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState(false);
  
  const form = useForm<WalletAddressFormValues>({
    resolver: zodResolver(walletAddressSchema),
    defaultValues: {
      donorAddress: address || "" // Pre-fill with connected wallet if available
    }
  });

  const onSubmit = async (values: WalletAddressFormValues) => {
    try {
      setIsSubmitting(true);
      setAuthError(false);
      
      // Authenticate wallet
      const isAuthenticated = await authenticateWallet();
      
      if (!isAuthenticated) {
        setAuthError(true);
        toast.error("Failed to authenticate wallet");
        return;
      }
      
      // Set donor wallet
      setDonorWallet(values.donorAddress);
      
      toast.success("Wallet authenticated successfully");
      
      // Call onComplete callback after successful authentication
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Error authenticating wallet:", error);
      toast.error("An error occurred during wallet authentication");
      setAuthError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for retry authentication
  const handleRetryAuth = () => {
    setAuthError(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Donor Wallet Setup</CardTitle>
        <CardDescription className="text-center">
          Enter the wallet address containing assets you wish to include in your digital will
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {authError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Failed</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <p>Failed to authenticate wallet. Would you like to authenticate again?</p>
              <Button 
                variant="outline" 
                onClick={handleRetryAuth}
                size="sm"
                className="self-start"
              >
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {!authError && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="donorAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-digitalwill-primary" />
                      Donor Wallet Address
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="0x..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="pt-3">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Authenticating..." : "Authenticate Donor Wallet"}
                </Button>
              </div>
            </form>
          </Form>
        )}
        
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-xs text-blue-800">
            This wallet will contain the assets you wish to pass on to your beneficiary. You must authenticate 
            ownership of this wallet to proceed with the digital will creation process.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default MultisigWalletSection;
