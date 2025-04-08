
import React, { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Wallet, CheckCircle2, AlertCircle, ShieldCheck, ArrowLeft, ArrowRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import TermsAndConditions from "@/components/TermsAndConditions";

interface MultisigWalletSectionProps {
  onComplete?: () => void;
  onBack?: () => void;
}

const walletAddressSchema = z.object({
  donorAddress: z.string()
    .min(42, "Wallet address must be at least 42 characters")
    .max(44, "Wallet address must not exceed 44 characters")
    .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid Ethereum wallet address starting with 0x")
});

type WalletAddressFormValues = z.infer<typeof walletAddressSchema>;

const MultisigWalletSection: React.FC<MultisigWalletSectionProps> = ({ 
  onComplete,
  onBack
}) => {
  const { setDonorWallet, authenticateWallet, address } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [hasUnderstandingConfirmed, setHasUnderstandingConfirmed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  const form = useForm<WalletAddressFormValues>({
    resolver: zodResolver(walletAddressSchema),
    defaultValues: {
      donorAddress: address || "" // Pre-fill with connected wallet if available
    }
  });

  const onSubmit = async (values: WalletAddressFormValues) => {
    if (!termsAccepted) {
      setShowTerms(true);
      toast.warning("You must accept the terms and conditions to proceed.");
      return;
    }

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

  // Handler for understanding confirmation
  const handleUnderstandingConfirmation = () => {
    setHasUnderstandingConfirmed(true);
  };

  // Handler for terms acceptance
  const handleTermsAccept = () => {
    setTermsAccepted(true);
    setShowTerms(false);
    window.scrollTo(0, 0); // Scroll to top after accepting terms
  };

  // Check terms before proceeding
  const handleCreateVault = () => {
    if (!termsAccepted) {
      setShowTerms(true);
      return;
    }
    form.handleSubmit(onSubmit)();
  };

  return (
    <>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">Create Secure Vault Wallet</CardTitle>
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
          
          {!authError && !hasUnderstandingConfirmed && (
            <Alert className="bg-amber-50 border-amber-300">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Important Information</AlertTitle>
              <AlertDescription className="text-amber-700">
                <p className="mb-3">You are creating a multi signature wallet that you will be given the private keys to. Your belongings will be stored there for safe transfer directly to your beneficiary upon authentication.</p>
                <p className="mb-3">If at any time you wish to change anything concerning this multi signature vault wallet you are required to authenticate using the private keys and your donor wallet.</p>
                <p className="mb-3">If you fail to authenticate you will not be able to change, abrogate, reverse nor retain any of the contents thereof.</p>
                <p className="font-bold">Do you understand?</p>
                <Button 
                  onClick={handleUnderstandingConfirmation}
                  className="mt-3"
                  variant="outline"
                >
                  Yes, I Understand
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {!authError && hasUnderstandingConfirmed && (
            <Form {...form}>
              <form className="space-y-4">
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
                    type="button" 
                    onClick={handleCreateVault}
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Create Secure Vault"}
                  </Button>
                </div>
                
                <div className="flex items-center justify-center mt-4 text-sm">
                  <div className={`flex items-center ${termsAccepted ? 'text-green-600' : 'text-gray-500'}`}>
                    {termsAccepted ? (
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                    ) : null}
                    <span>
                      {termsAccepted ? 
                        "Terms and conditions accepted" : 
                        <Button variant="link" className="p-0 h-auto text-sm" onClick={() => setShowTerms(true)}>
                          View terms and conditions
                        </Button>
                      }
                    </span>
                  </div>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={onBack}
            className="flex items-center gap-1"
            disabled={isSubmitting}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <Button
            variant="ghost"
            onClick={onComplete}
            className="flex items-center gap-1"
            disabled={isSubmitting || !form.formState.isValid || !termsAccepted}
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      <TermsAndConditions
        open={showTerms}
        onOpenChange={setShowTerms}
        onAccept={handleTermsAccept}
      />
    </>
  );
};

export default MultisigWalletSection;
