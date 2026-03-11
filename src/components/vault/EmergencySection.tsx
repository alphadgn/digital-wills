import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertTriangle, ShieldAlert, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/PrivyAuthContext";
import { recordEmergencyAttempt, updateVault } from "@/lib/supabaseVault";
import { toast } from "sonner";

// Note: walletAddress prop is kept for display but DB calls use the Privy token

interface Props {
  vaultId: string;
  walletAddress: string;
  donorEmail: string | null;
  donorPhone: string | null;
  onRefresh: () => void;
}

type Step = "idle" | "confirm1" | "verify" | "destination" | "processing" | "done" | "error";

export default function EmergencySection({ vaultId, walletAddress, donorEmail, donorPhone, onRefresh }: Props) {
  const { login, isAuthenticated, getAccessToken } = useAuth();
  const [step, setStep] = useState<Step>("idle");
  const [freeWill, setFreeWill] = useState(false);
  const [destinationAddr, setDestinationAddr] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [email, setEmail] = useState(donorEmail || "");
  const [phone, setPhone] = useState(donorPhone || "");

  const handleEmergencyClick = () => {
    if (!donorEmail && !donorPhone) {
      // Prompt user to set contact info first
      setContactOpen(true);
      return;
    }
    setStep("confirm1");
    setFreeWill(false);
    setAttempt(0);
  };

  const handleSaveContact = async () => {
    if (!email.trim() && !phone.trim()) {
      toast.error("Please provide at least one contact method");
      return;
    }
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      await updateVault(token, vaultId, {
        donor_email: email.trim() || null,
        donor_phone: phone.trim() || null,
      });
      toast.success("Contact info saved");
      setContactOpen(false);
      onRefresh();
      // Now open emergency flow
      setStep("confirm1");
      setFreeWill(false);
      setAttempt(0);
    } catch (e: any) {
      toast.error("Failed to save contact info");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!freeWill) {
      toast.error("You must confirm you are acting of your own free will");
      return;
    }
    setStep("verify");
  };

  const handleVerify = async () => {
    const currentAttempt = attempt + 1;
    setAttempt(currentAttempt);
    setLoading(true);

    try {
      // Re-authenticate via Privy to verify ownership
      if (!isAuthenticated) {
        login();
        // Wait for auth state change — user will need to re-trigger
        toast.info("Please complete authentication, then try again");
        setLoading(false);
        return;
      }

      // Call edge function for verification
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/emergency-verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vault_id: vaultId,
            wallet_address: walletAddress.toLowerCase(),
            attempt_number: currentAttempt,
          }),
        }
      );

      const data = await res.json();

      if (res.ok && data.verified) {
        const token = await getAccessToken();
        if (token) await recordEmergencyAttempt(token, vaultId, currentAttempt, true);
        toast.success("Identity verified successfully");
        setStep("destination");
      } else {
        const token = await getAccessToken();
        if (token) await recordEmergencyAttempt(token, vaultId, currentAttempt, false);

        if (currentAttempt >= 2) {
          // After 2 failed attempts, send warning
          toast.error("Verification failed. A warning has been sent to your registered contact.");
          setStep("error");
        } else {
          toast.error("Verification failed. Please try again.");
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Verification error");
      if (currentAttempt >= 2) {
        setStep("error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(destinationAddr.trim())) {
      toast.error("Invalid destination address");
      return;
    }
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      // Update vault status
      await updateVault(token, vaultId, { status: "CANCELLED" });
      toast.success("Emergency withdrawal initiated. Assets will be sent to the designated address.");
      setStep("done");
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to process");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-center text-destructive">
            <ShieldAlert className="h-5 w-5" /> Emergency Controls
          </CardTitle>
          <CardDescription className="text-center">
            Cancel your Digital Will and recover your assets. Only the vault owner can perform this action.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {step === "done" ? (
            <p className="text-emerald-600 font-medium">Emergency withdrawal completed. Vault has been cancelled.</p>
          ) : step === "error" ? (
            <div className="space-y-3">
              <p className="text-destructive font-medium">Verification failed after maximum attempts.</p>
              <p className="text-sm text-muted-foreground">A warning notification has been sent to your registered contact method.</p>
              <Button variant="outline" onClick={() => { setStep("idle"); setAttempt(0); }}>Close</Button>
            </div>
          ) : (
            <Button variant="destructive" className="gap-2" onClick={handleEmergencyClick}>
              <AlertTriangle className="h-4 w-4" /> EMERGENCY
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Contact Info Dialog */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Emergency Contact</DialogTitle>
            <DialogDescription>
              Before using emergency controls, you must provide a contact method for security warnings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="em-email">Email</Label>
              <Input id="em-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="em-phone">Phone (SMS)</Label>
              <Input id="em-phone" type="tel" placeholder="+1234567890" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveContact} disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Save & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={step === "confirm1"} onOpenChange={(open) => !open && setStep("idle")}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Emergency Cancellation
            </DialogTitle>
            <DialogDescription>
              This action will cancel your Digital Will and allow you to recover all assets. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
              <Checkbox id="free-will" checked={freeWill} onCheckedChange={(c) => setFreeWill(!!c)} />
              <label htmlFor="free-will" className="text-sm leading-relaxed cursor-pointer">
                I confirm that I am canceling my Digital Will of my own free accord and am <strong>not under duress</strong> to do so.
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStep("idle")}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={!freeWill}>
              Proceed to Verification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verification Dialog */}
      <Dialog open={step === "verify"} onOpenChange={(open) => !open && setStep("idle")}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Identity Verification</DialogTitle>
            <DialogDescription>
              Please verify your identity as the owner of this wallet. Attempt {attempt + 1} of 2.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Click below to re-authenticate through our identity provider to confirm you are the verified owner of this wallet.
            </p>
            <Button onClick={handleVerify} disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Verify My Identity
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Destination Dialog */}
      <Dialog open={step === "destination"} onOpenChange={(open) => !open && setStep("idle")}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Designate Asset Destination</DialogTitle>
            <DialogDescription>
              Enter the wallet address where you want your assets to be sent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="dest-addr">Destination Wallet Address</Label>
              <Input id="dest-addr" placeholder="0x..." className="font-mono" value={destinationAddr} onChange={(e) => setDestinationAddr(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStep("idle")}>Cancel</Button>
            <Button variant="destructive" onClick={handleWithdraw} disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Withdraw All Assets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
