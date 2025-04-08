
import React, { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { Shield, User } from "lucide-react";

// Define the form schema with validation
const ssnFormSchema = z.object({
  ssn: z
    .string()
    .min(9, "Social Security Number must be 9 digits")
    .max(11, "Social Security Number must not exceed 11 characters")
    .regex(/^\d{3}-?\d{2}-?\d{4}$/, "Must be a valid SSN format (e.g., 123-45-6789 or 123456789)")
});

type SsnFormValues = z.infer<typeof ssnFormSchema>;

interface SSNInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: () => void;
  title?: string;
  description?: string;
  buttonText?: string;
}

const SSNInputDialog = ({ 
  open, 
  onOpenChange,
  onConfirm,
  title = "Secure Identity Verification",
  description = "Please provide <strong>your</strong> Social Security Number for future beneficiary verification of your Digital Will.",
  buttonText = "Save Identity Information"
}: SSNInputDialogProps) => {
  const { setDonorSSN } = useWallet();

  // Initialize form with react-hook-form
  const form = useForm<SsnFormValues>({
    resolver: zodResolver(ssnFormSchema),
    defaultValues: {
      ssn: ""
    }
  });

  const onSubmit = (values: SsnFormValues) => {
    // Format SSN to standard format without dashes for storage
    const formattedSSN = values.ssn.replace(/-/g, "");
    
    // Save the SSN to the wallet context
    setDonorSSN(formattedSSN);
    
    toast.success("Social Security Number saved successfully");
    onOpenChange(false);
    
    // Call onConfirm callback if provided
    if (onConfirm) {
      onConfirm();
    }
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-digitalwill-primary" />
            {title}
          </DialogTitle>
          <DialogDescription dangerouslySetInnerHTML={{ __html: description }} />
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="ssn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Social Security Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123-45-6789"
                      {...field}
                      onChange={(e) => {
                        const formatted = formatSSNInput(e.target.value);
                        field.onChange(formatted);
                      }}
                      maxLength={11}
                    />
                  </FormControl>
                  <FormDescription>
                    This information is encrypted and only used for verification during asset recovery.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="submit" className="w-full">
                {buttonText}
              </Button>
            </DialogFooter>
          </form>
        </Form>
        
        <div className="pt-4 border-t">
          <p className="text-xs text-gray-500">
            <strong>Privacy Note:</strong> Your SSN is stored securely and only used to verify your identity 
            during the asset recovery process by your beneficiary. This helps prevent unauthorized access to your digital assets.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SSNInputDialog;
