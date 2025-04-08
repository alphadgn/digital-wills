
import React, { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, Search, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Form schema
const recoveryFormSchema = z.object({
  ssn: z.string()
    .min(9, "Social Security Number must be 9 digits")
    .max(11, "Social Security Number must not exceed 11 characters")
    .regex(/^\d{3}-?\d{2}-?\d{4}$/, "Must be a valid SSN format"),
  beneficiaryAddress: z.string()
    .min(42, "Wallet address must be at least 42 characters")
    .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid Ethereum wallet address")
});

type RecoveryFormValues = z.infer<typeof recoveryFormSchema>;

const AssetRecoverySection = () => {
  const { initiateAssetRecovery, userHasAttemptedRecovery, notifyDonorOfRecoveryAttempt, beneficiaryWallet, donorSSN } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState(false);
  const [showRecoveryForm, setShowRecoveryForm] = useState(false);
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const navigate = useNavigate();

  // Initialize form with react-hook-form  
  const form = useForm<RecoveryFormValues>({
    resolver: zodResolver(recoveryFormSchema),
    defaultValues: {
      ssn: "",
      beneficiaryAddress: ""
    }
  });
  
  const handleRecoveryRequest = async (values: RecoveryFormValues) => {
    setIsProcessing(true);
    
    // Format SSN by removing dashes
    const formattedSSN = values.ssn.replace(/-/g, "");
    
    // Check if SSN and beneficiary address match what was set during setup
    const isSSNCorrect = donorSSN === formattedSSN;
    const isBeneficiaryAddressCorrect = beneficiaryWallet === values.beneficiaryAddress;
    
    if (!isSSNCorrect || !isBeneficiaryAddressCorrect) {
      // Increment verification attempts
      setVerificationAttempts(prev => prev + 1);
      
      // Notify donor of failed attempt
      notifyDonorOfRecoveryAttempt();
      
      toast.error("Verification failed. The donor has been notified of this attempt.");
      setIsProcessing(false);
      return;
    }
    
    // Both checks passed, proceed with recovery
    const success = await initiateAssetRecovery(values.beneficiaryAddress, formattedSSN);
    setRecoverySuccess(success);
    setIsProcessing(false);
  };

  const handleNoClick = () => {
    navigate('/');
  };

  // Format SSN as user types (add dashes)
  const formatSSNInput = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "");
    
    // Add dashes in the correct positions if we have enough digits
    if (digits.length > 5) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 9)}`;
    } else if (digits.length > 3) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }
    
    return digits;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Asset Recovery</CardTitle>
        <CardDescription className="text-center">
          Recover assets from a digital will as a beneficiary
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recoverySuccess ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <Wallet className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-lg font-medium text-center">Assets Recovered Successfully!</h3>
            <div className="text-sm text-center text-gray-500">
              <p>The assets have been transferred to your wallet.</p>
            </div>
          </div>
        ) : userHasAttemptedRecovery && !recoverySuccess ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-4">
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <Search className="h-4 w-4 text-red-500" />
              <AlertTitle>Verification Failed</AlertTitle>
              <AlertDescription className="text-sm">
                We could not verify the death certificate or the information provided. 
                The original account owner has been notified of this failed attempt via their preferred communication method.
              </AlertDescription>
            </Alert>
          </div>
        ) : showRecoveryForm ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleRecoveryRequest)} className="space-y-4">
              <FormField
                control={form.control}
                name="ssn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Donor's Social Security Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="123-45-6789"
                        type="password"
                        {...field}
                        onChange={(e) => {
                          const formatted = formatSSNInput(e.target.value);
                          field.onChange(formatted);
                        }}
                        maxLength={11}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="beneficiaryAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beneficiary Wallet Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0x..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {verificationAttempts > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Verification Failed</AlertTitle>
                  <AlertDescription>
                    The information provided doesn't match our records. The donor has been notified of this attempt.
                    {verificationAttempts > 1 && " Multiple failed attempts may result in account lockout."}
                  </AlertDescription>
                </Alert>
              )}
              
              <Alert className="bg-blue-50 border-blue-200">
                <Search className="h-4 w-4 text-blue-500" />
                <AlertTitle>Death Certificate Verification</AlertTitle>
                <AlertDescription className="text-sm">
                  We'll automatically search for and verify the death certificate of the wallet organizer.
                  If the SSN doesn't match or verification fails, the donor will be notified.
                </AlertDescription>
              </Alert>
              
              <Button
                type="submit"
                className="w-full"
                disabled={isProcessing || !form.formState.isValid}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : "Verify & Claim Assets"}
              </Button>
            </form>
          </Form>
        ) : (
          <div className="py-6 flex flex-col items-center justify-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Wallet className="h-8 w-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-medium text-center">Claim Assets</h3>
            <div className="text-sm text-center text-gray-500">
              <p>Our system shows you are able to claim assets from a multisig wallet.</p>
              <p className="mt-2">Would you like to claim these assets now?</p>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-center">
        {recoverySuccess || (userHasAttemptedRecovery && !recoverySuccess) ? (
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Start Over
          </Button>
        ) : showRecoveryForm ? (
          <Button
            variant="outline"
            onClick={() => setShowRecoveryForm(false)}
            className="mt-4"
          >
            Cancel
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleNoClick}
            >
              No
            </Button>
            <Button
              onClick={() => setShowRecoveryForm(true)}
            >
              Yes, Claim Assets
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default AssetRecoverySection;
