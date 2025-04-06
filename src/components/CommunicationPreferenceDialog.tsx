
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useWallet } from "@/contexts/WalletContext";
import { toast } from "sonner";

interface CommunicationPreferenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

const CommunicationPreferenceDialog = ({
  open,
  onOpenChange,
  onConfirm,
}: CommunicationPreferenceDialogProps) => {
  const { setCommunicationPreference } = useWallet();
  const [preferredMethod, setPreferredMethod] = useState<"email" | "phone">("email");
  const [contactValue, setContactValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    // Validate input based on selected preference
    if (!contactValue) {
      setError("Please enter a value for your preferred contact method");
      return;
    }

    if (preferredMethod === "email") {
      // Simple email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactValue)) {
        setError("Please enter a valid email address");
        return;
      }
    } else if (preferredMethod === "phone") {
      // Simple phone validation (digits only, min 10 digits)
      const phoneRegex = /^\d{10,15}$/;
      if (!phoneRegex.test(contactValue.replace(/\D/g, ''))) {
        setError("Please enter a valid phone number (10+ digits)");
        return;
      }
    }

    // Set the communication preference
    setCommunicationPreference(preferredMethod, contactValue);
    
    // Clear any errors and form values
    setError(null);
    toast.success(`${preferredMethod === "email" ? "Email" : "Phone"} contact preference saved`);
    
    // Close dialog and continue
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Communication Preferences</DialogTitle>
          <DialogDescription>
            How would you like to be notified in case someone attempts to recover your assets?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup 
            value={preferredMethod} 
            onValueChange={(value) => {
              setPreferredMethod(value as "email" | "phone");
              setContactValue(""); // Clear the value when switching methods
              setError(null); // Clear any errors
            }}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="email" id="email" />
              <Label htmlFor="email">Email notifications</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="phone" id="phone" />
              <Label htmlFor="phone">SMS notifications</Label>
            </div>
          </RadioGroup>

          <div className="space-y-2">
            <Label htmlFor="contactValue">
              {preferredMethod === "email" ? "Email Address" : "Phone Number"}
            </Label>
            <Input
              id="contactValue"
              placeholder={
                preferredMethod === "email" 
                  ? "your.email@example.com" 
                  : "(123) 456-7890"
              }
              type={preferredMethod === "email" ? "email" : "tel"}
              value={contactValue}
              onChange={(e) => {
                setContactValue(e.target.value);
                setError(null); // Clear error on change
              }}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" onClick={handleConfirm}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CommunicationPreferenceDialog;
