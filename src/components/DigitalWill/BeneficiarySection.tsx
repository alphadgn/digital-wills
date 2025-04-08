
import React, { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Wallet, CheckCircle2, AlertCircle } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const walletAddressSchema = z.object({
  beneficiaryAddress: z.string()
    .min(42, "Wallet address must be at least 42 characters")
    .max(44, "Wallet address must not exceed 44 characters")
    .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid Ethereum wallet address starting with 0x")
});

type WalletAddressFormValues = z.infer<typeof walletAddressSchema>;

interface BeneficiarySectionProps {
  onProceedToConfirmation?: () => void;
}

const BeneficiarySection: React.FC<BeneficiarySectionProps> = ({ onProceedToConfirmation }) => {
  const { setBeneficiaryWallet, donorWallet, address } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const form = useForm<WalletAddressFormValues>({
    resolver: zodResolver(walletAddressSchema),
    defaultValues: {
      beneficiaryAddress: ""
    }
  });

  const onSubmit = async (values: WalletAddressFormValues) => {
    try {
      setIsSubmitting(true);
      setValidationError(null);
      
      // Check if beneficiary wallet is the same as donor wallet
      if (values.beneficiaryAddress === donorWallet || values.beneficiaryAddress === address) {
        setValidationError("Donor wallet and beneficiary wallet cannot be the same. Which would you like to change?");
        toast.error("Donor wallet and beneficiary wallet cannot be the same");
        setIsSubmitting(false);
        return;
      }
      
      // Save beneficiary wallet address
      setBeneficiaryWallet(values.beneficiaryAddress);
      
      toast.success("Beneficiary wallet set successfully");
      
      // Proceed to confirmation page
      if (onProceedToConfirmation) {
        onProceedToConfirmation();
      }
    } catch (error) {
      console.error("Error setting up beneficiary:", error);
      toast.error("An error occurred while setting up the beneficiary");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Set Beneficiary Wallet</CardTitle>
        <CardDescription className="text-center">
          Enter the wallet address that will receive your assets
        </CardDescription>
      </CardHeader>
      <CardContent>
        {validationError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Validation Error</AlertTitle>
            <AlertDescription>
              {validationError}
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setValidationError(null)}
                >
                  Change Beneficiary Wallet
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="beneficiaryAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beneficiary Wallet Address</FormLabel>
                  <FormControl>
                    <div className="flex items-center">
                      <Wallet className="mr-2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="0x..." {...field} />
                    </div>
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
                {isSubmitting ? "Processing..." : "Continue to Review"}
              </Button>
            </div>
          </form>
        </Form>
        
        <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-xs text-amber-800">
            <span className="flex items-center gap-1">
              <AlertCircle className="h-4 w-4" /> Important:
            </span>
            Assets will be transferred to this beneficiary wallet only after verification of: (1) death certificate matching your SSN, 
            (2) beneficiary SSN verification, and (3) beneficiary wallet authentication.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default BeneficiarySection;
