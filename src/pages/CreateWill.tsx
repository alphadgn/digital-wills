import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Copy, Loader2, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/PrivyAuthContext";
import { useAutoVault } from "@/hooks/useAutoVault";
import { saveWill, type WillBeneficiary, type WillContent } from "@/lib/willApi";

const STEPS = ["Your identity", "Beneficiaries", "Instructions", "Encrypt & save"] as const;

const emptyBeneficiary = (): WillBeneficiary => ({
  id: crypto.randomUUID(),
  name: "",
  email: "",
  walletAddress: "",
  allocationPercent: 0,
});

const CreateWill: React.FC = () => {
  const navigate = useNavigate();
  const { getAccessToken } = useAuth();
  const { vaultId, isCreating } = useAutoVault();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [codes, setCodes] = useState<Array<{ beneficiaryId: string; name: string; code: string }> | null>(null);

  const [donorLegalName, setDonorLegalName] = useState("");
  const [donorDob, setDonorDob] = useState("");
  const [beneficiaries, setBeneficiaries] = useState<WillBeneficiary[]>([emptyBeneficiary()]);
  const [assetNotes, setAssetNotes] = useState("");
  const [executorInstructions, setExecutorInstructions] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [passphrase2, setPassphrase2] = useState("");

  const totalAllocation = useMemo(
    () => beneficiaries.reduce((sum, b) => sum + (Number(b.allocationPercent) || 0), 0),
    [beneficiaries],
  );

  const updateBeneficiary = (id: string, patch: Partial<WillBeneficiary>) =>
    setBeneficiaries((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const canContinue = () => {
    if (step === 0) return donorLegalName.trim().length > 2 && /^\d{4}-\d{2}-\d{2}$/.test(donorDob);
    if (step === 1)
      return (
        beneficiaries.length > 0 &&
        beneficiaries.every((b) => b.name.trim() && /\S+@\S+\.\S+/.test(b.email)) &&
        totalAllocation === 100
      );
    if (step === 2) return true;
    return passphrase.length >= 10 && passphrase === passphrase2;
  };

  const handleSave = async () => {
    if (!vaultId) {
      toast.error("Your vault is still being prepared. Try again in a moment.");
      return;
    }
    setSaving(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Please sign in again");

      const content: WillContent = {
        donorLegalName: donorLegalName.trim(),
        donorDob,
        assetNotes,
        executorInstructions,
        personalMessage,
        beneficiaries: beneficiaries.map((b) => ({
          ...b,
          name: b.name.trim(),
          email: b.email.trim().toLowerCase(),
          allocationPercent: Number(b.allocationPercent) || 0,
        })),
        updatedAt: new Date().toISOString(),
      };

      const { accessCodes } = await saveWill(token, vaultId, content, passphrase);
      setCodes(accessCodes);
      toast.success("Your will is encrypted and stored");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Could not save your will");
    } finally {
      setSaving(false);
    }
  };

  if (codes) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-10">
          <h1 className="text-3xl font-bold text-center mb-2">Your will is sealed</h1>
          <p className="text-muted-foreground text-center mb-8">
            Each beneficiary needs their own access code to open the document after your passing.
            These codes are shown once and are never stored on our servers — share them privately now.
          </p>
          <Card>
            <CardContent className="pt-6 space-y-4">
              {codes.map((c) => (
                <div key={c.beneficiaryId} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="font-mono text-sm text-muted-foreground">{c.code}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(c.code);
                      toast.success("Access code copied");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="flex justify-center mt-8">
            <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <h1 className="text-3xl font-bold text-center mb-2">Create Your Digital Will</h1>
        <p className="text-muted-foreground text-center mb-6">
          Encrypted in your browser before it is stored. Only you and your beneficiaries can read it.
        </p>

        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">{STEPS[step]}</CardTitle>
            <CardDescription className="text-center">
              Step {step + 1} of {STEPS.length}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="legalName">Full legal name</Label>
                  <Input
                    id="legalName"
                    value={donorLegalName}
                    onChange={(e) => setDonorLegalName(e.target.value)}
                    placeholder="As it appears on official records"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of birth</Label>
                  <Input id="dob" type="date" value={donorDob} onChange={(e) => setDonorDob(e.target.value)} />
                  <p className="text-xs text-muted-foreground">
                    Used only so the death-record oracle can match public registries. Everything else
                    you enter is encrypted.
                  </p>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                {beneficiaries.map((b, idx) => (
                  <div key={b.id} className="space-y-3">
                    {idx > 0 && <Separator />}
                    <div className="flex items-center justify-between">
                      <p className="font-medium">Beneficiary {idx + 1}</p>
                      {beneficiaries.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setBeneficiaries((p) => p.filter((x) => x.id !== b.id))}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <Input
                      placeholder="Full name"
                      value={b.name}
                      onChange={(e) => updateBeneficiary(b.id, { name: e.target.value })}
                    />
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={b.email}
                      onChange={(e) => updateBeneficiary(b.id, { email: e.target.value })}
                    />
                    <Input
                      placeholder="Wallet address (optional)"
                      value={b.walletAddress}
                      onChange={(e) => updateBeneficiary(b.id, { walletAddress: e.target.value })}
                    />
                    <div className="space-y-1">
                      <Label>Allocation %</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={b.allocationPercent}
                        onChange={(e) =>
                          updateBeneficiary(b.id, { allocationPercent: Number(e.target.value) })
                        }
                      />
                    </div>
                    <Textarea
                      placeholder="Notes for this beneficiary (optional)"
                      value={b.notes || ""}
                      onChange={(e) => updateBeneficiary(b.id, { notes: e.target.value })}
                    />
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setBeneficiaries((p) => [...p, emptyBeneficiary()])}
                  >
                    Add beneficiary
                  </Button>
                  <span
                    className={`text-sm ${
                      totalAllocation === 100 ? "text-muted-foreground" : "text-destructive"
                    }`}
                  >
                    Total: {totalAllocation}% / 100%
                  </span>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="assets">Assets and where to find them</Label>
                  <Textarea
                    id="assets"
                    rows={4}
                    value={assetNotes}
                    onChange={(e) => setAssetNotes(e.target.value)}
                    placeholder="Wallets, exchanges, hardware devices, NFTs, off-chain holdings..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instructions">Distribution instructions</Label>
                  <Textarea
                    id="instructions"
                    rows={4}
                    value={executorInstructions}
                    onChange={(e) => setExecutorInstructions(e.target.value)}
                    placeholder="How your estate should be handled..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Personal message</Label>
                  <Textarea
                    id="message"
                    rows={4}
                    value={personalMessage}
                    onChange={(e) => setPersonalMessage(e.target.value)}
                    placeholder="A message to your loved ones (optional)"
                  />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="flex items-start gap-3 rounded-lg border p-4 bg-muted/40">
                  <Lock className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Choose a passphrase you alone know. It unlocks your own copy of the will. We
                    cannot recover it — if you lose it, you will need to create the will again.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pass">Passphrase (min. 10 characters)</Label>
                  <Input
                    id="pass"
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pass2">Confirm passphrase</Label>
                  <Input
                    id="pass2"
                    type="password"
                    value={passphrase2}
                    onChange={(e) => setPassphrase2(e.target.value)}
                  />
                  {passphrase2 && passphrase !== passphrase2 && (
                    <p className="text-sm text-destructive">Passphrases do not match</p>
                  )}
                </div>
                <div className="rounded-lg border p-4 text-sm space-y-1">
                  <p className="font-medium flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" /> Summary
                  </p>
                  <p className="text-muted-foreground">{donorLegalName}</p>
                  <p className="text-muted-foreground">
                    {beneficiaries.length} beneficiary(ies) · {totalAllocation}% allocated
                  </p>
                </div>
              </>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button disabled={!canContinue()} onClick={() => setStep((s) => s + 1)}>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button disabled={!canContinue() || saving || isCreating} onClick={handleSave}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Encrypting...
                    </>
                  ) : (
                    "Encrypt & Save Will"
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default CreateWill;
