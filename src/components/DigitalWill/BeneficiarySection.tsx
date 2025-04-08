
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

const walletAddressSchema = z.object({
  beneficiaryAddress: z.string()
    .min(42, "Wallet address must be at least 42 characters")
    .max(44, "Wallet address must not exceed 44 characters")
    .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid Ethereum wallet address starting with 0x")
});

type WalletAddressFormValues = z.infer<typeof walletAddressSchema>;

const BeneficiarySection: React.FC = () => {
  const { setBeneficiaryWallet, createMultisigWallet } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<WalletAddressFormValues>({
    resolver: zodResolver(walletAddressSchema),
    defaultValues: {
      beneficiaryAddress: ""
    }
  });

  const onSubmit = async (values: WalletAddressFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Save beneficiary wallet address
      setBeneficiaryWallet(values.beneficiaryAddress);
      
      // Create multisig wallet
      const success = await createMultisigWallet();
      
      if (success) {
        toast.success("Beneficiary wallet successfully set and multisig wallet created");
      } else {
        toast.error("Failed to create multisig wallet");
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
                {isSubmitting ? "Processing..." : "Complete Digital Will Setup"}
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
