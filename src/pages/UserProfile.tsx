
import React, { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Background from "@/components/DigitalWill/Background";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { deleteUser, updateUser } from "@/data/userDatabase";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Wallet, UserRoundX, UserRoundCog, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const walletSchema = z.object({
  beneficiaryWallet: z.string()
    .min(42, "Wallet address must be at least 42 characters")
    .max(44, "Wallet address must not exceed 44 characters")
    .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid Ethereum wallet address starting with 0x")
});

type BeneficiaryFormValues = z.infer<typeof walletSchema>;

const UserProfile = () => {
  const { address, donorWallet, beneficiaryWallet, setBeneficiaryWallet, resetProcess } = useWallet();
  const [isUpdating, setIsUpdating] = useState(false);
  const navigate = useNavigate();
  
  const form = useForm<BeneficiaryFormValues>({
    resolver: zodResolver(walletSchema),
    defaultValues: {
      beneficiaryWallet: beneficiaryWallet || ""
    }
  });

  // If no wallet is connected, redirect to home
  React.useEffect(() => {
    if (!address && !donorWallet) {
      navigate("/");
    }
  }, [address, donorWallet, navigate]);

  const handleDeleteAccount = () => {
    const walletToDelete = donorWallet || address;
    
    if (!walletToDelete) {
      toast.error("No wallet connected");
      return;
    }
    
    const deleted = deleteUser(walletToDelete);
    
    if (deleted) {
      toast.success("Account deleted successfully");
      resetProcess();
      navigate("/");
    } else {
      toast.error("Failed to delete account");
    }
  };

  const handleChangeBeneficiary = (values: BeneficiaryFormValues) => {
    if (!donorWallet) {
      toast.error("No donor wallet found");
      return;
    }
    
    setIsUpdating(true);
    
    // Update in mock database
    const updatedUser = updateUser(donorWallet, {
      beneficiaryWallet: values.beneficiaryWallet
    });
    
    // Update in wallet context
    setBeneficiaryWallet(values.beneficiaryWallet);
    
    if (updatedUser) {
      toast.success("Beneficiary updated successfully");
    } else {
      toast.error("Failed to update beneficiary");
    }
    
    setIsUpdating(false);
  };

  return (
    <Background>
      <Header />
      
      <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center">User Profile</CardTitle>
            <CardDescription className="text-center">
              Manage your digital will account
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {/* Wallet Information */}
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Wallet className="h-5 w-5" /> Wallet Information
              </h3>
              <div className="bg-gray-100 p-4 rounded-md">
                <p className="text-sm font-medium text-gray-500">Donor Wallet Address</p>
                <p className="font-mono text-sm break-all">{donorWallet || address}</p>
              </div>
              
              {beneficiaryWallet && (
                <div className="bg-gray-100 p-4 rounded-md">
                  <p className="text-sm font-medium text-gray-500">Current Beneficiary Wallet</p>
                  <p className="font-mono text-sm break-all">{beneficiaryWallet}</p>
                </div>
              )}
            </div>
            
            {/* Change Beneficiary Form */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <UserRoundCog className="h-5 w-5" /> Update Beneficiary
              </h3>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleChangeBeneficiary)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="beneficiaryWallet"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Beneficiary Wallet Address</FormLabel>
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
                    disabled={isUpdating || !form.formState.isValid}
                    className="w-full"
                  >
                    {isUpdating ? "Updating..." : "Update Beneficiary"}
                  </Button>
                </form>
              </Form>
            </div>
            
            {/* Delete Account Section */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-destructive">
                <UserRoundX className="h-5 w-5" /> Delete Account
              </h3>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your account
                      and remove your data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAccount}>
                      Yes, delete my account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center pt-4">
            <Button 
              variant="outline" 
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2"
            >
              <ShieldCheck className="h-4 w-4" /> Back to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <Footer />
    </Background>
  );
};

export default UserProfile;
