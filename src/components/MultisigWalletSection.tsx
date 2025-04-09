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
import { Wallet, CheckCircle2, ShieldCheck, ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react";
import TermsAndConditions from "@/components/TermsAndConditions";
import { useIsMobile } from "@/hooks/use-mobile";
import RestartButton from "./RestartButton";

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
  const { setDonorWallet, address, termsAccepted } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const isMobile = useIsMobile();
  
  const form = useForm<WalletAddressFormValues>({
    resolver: zodResolver(walletAddressSchema),
    defaultValues: {
      donorAddress: address || "" // Pre-fill with connected wallet if available
    }
  });

  const onSubmit = async (values: WalletAddressFormValues) => {
    if (!termsAccepted) {
      console.log("⚠️ Attempted to create vault without accepting terms");
      setShowTerms(true);
      toast.warning("You must accept the terms and conditions to proceed.");
      return;
    }

    try {
      console.log("🔒 Submitting wallet address for vault creation");
      setIsSubmitting(true);
      
      // Set donor wallet
      console.log("💼 Setting donor wallet address");
      setDonorWallet(values.donorAddress);
      
      toast.success("Wallet set successfully");
      
      // Call onComplete callback after successful setting of wallet
      if (onComplete) {
        console.log("✅ Multisig setup completed, proceeding to next step");
        onComplete();
      }
    } catch (error) {
      console.error("❌ Error setting wallet:", error);
      toast.error("An error occurred setting the wallet");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for terms acceptance
  const handleTermsAccept = () => {
    console.log("📝 Terms and conditions accepted");
    setShowTerms(false);
    window.scrollTo(0, 0); // Scroll to top after accepting terms
  };

  const handleCreateVault = () => {
    if (!termsAccepted) {
      console.log("⚠️ Showing terms before vault creation");
      setShowTerms(true);
      return;
    }
    console.log("🚀 Proceeding with vault creation");
    form.handleSubmit(onSubmit)();
  };

  return (
    <>
      <Card className="w-full max-w-md mx-auto relative">
        <div className="absolute top-4 right-4">
          <RestartButton size="sm" />
        </div>
        <CardHeader>
          <CardTitle className="text-center">Create Secure Vault Wallet</CardTitle>
          <CardDescription className="text-center">
            Enter the wallet address containing assets you wish to include in your digital will
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md mb-4">
            <p className="text-xs text-amber-800 flex items-start gap-1">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Important Security Notice:</strong> The multisig vault wallet will be created to securely store your digital assets. Please ensure you save all wallet details when provided.
              </span>
            </p>
          </div>

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
                  disabled={isSubmitting || !termsAccepted}
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
        </CardContent>
        <CardFooter className={`flex ${isMobile ? 'flex-col space-y-2' : 'justify-between'}`}>
          <Button 
            variant="outline" 
            onClick={onBack}
            className={`flex items-center gap-1 ${isMobile ? 'w-full' : ''}`}
            disabled={isSubmitting}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <Button
            variant="ghost"
            onClick={onComplete}
            className={`flex items-center gap-1 ${isMobile ? 'w-full' : ''}`}
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
