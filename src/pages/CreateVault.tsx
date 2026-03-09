import React, { useState } from "react";
import { useAuth } from "@/contexts/PrivyAuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Wallet, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Background from "@/components/DigitalWill/Background";

interface BeneficiaryInput {
  address: string;
  name: string;
  allocationPercent: number;
}

type Step = "beneficiaries" | "review" | "deploying" | "complete";

const CreateVault = () => {
  const { walletAddress } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("beneficiaries");
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryInput[]>([
    { address: "", name: "", allocationPercent: 100 },
  ]);
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);

  const totalAllocation = beneficiaries.reduce((s, b) => s + b.allocationPercent, 0);
  const isValid = beneficiaries.every((b) => b.address.startsWith("0x") && b.address.length === 42 && b.name.trim() && b.allocationPercent > 0) && totalAllocation === 100;

  const addBeneficiary = () => {
    setBeneficiaries([...beneficiaries, { address: "", name: "", allocationPercent: 0 }]);
  };

  const removeBeneficiary = (i: number) => {
    if (beneficiaries.length <= 1) return;
    setBeneficiaries(beneficiaries.filter((_, idx) => idx !== i));
  };

  const update = (i: number, field: keyof BeneficiaryInput, val: string | number) => {
    setBeneficiaries(beneficiaries.map((b, idx) => (idx === i ? { ...b, [field]: val } : b)));
  };

  const handleDeploy = async () => {
    setStep("deploying");
    // Simulate contract deployment — replace with actual wagmi writeContract
    await new Promise((r) => setTimeout(r, 3000));
    const mockAddr = "0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    setDeployedAddress(mockAddr);
    setStep("complete");
    toast.success("Vault deployed successfully!");
  };

  return (
    <Background>
      <Header />
      <div className="min-h-screen py-12 px-4 max-w-2xl mx-auto w-full">
        <Button variant="ghost" className="mb-6 gap-2 text-muted-foreground" onClick={() => navigate("/vaults")}>
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Button>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {["Beneficiaries", "Review", "Deploy"].map((label, i) => {
            const steps: Step[] = ["beneficiaries", "review", "deploying"];
            const isActive = steps.indexOf(step === "complete" ? "deploying" : step) >= i;
            return (
              <React.Fragment key={label}>
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {step === "complete" && i === 2 ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-sm ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>{label}</span>
                {i < 2 && <div className={`flex-1 h-px ${isActive ? "bg-primary" : "bg-border"}`} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step: Beneficiaries */}
        {step === "beneficiaries" && (
          <Card>
            <CardHeader>
              <CardTitle>Define Beneficiaries</CardTitle>
              <CardDescription>Add wallet addresses and allocation percentages. Total must equal 100%.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {beneficiaries.map((b, i) => (
                <div key={i} className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-foreground">Beneficiary {i + 1}</span>
                    {beneficiaries.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeBeneficiary(i)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Name</Label>
                      <Input placeholder="John Doe" value={b.name} onChange={(e) => update(i, "name", e.target.value)} />
                    </div>
                    <div>
                      <Label>Allocation %</Label>
                      <Input type="number" min={1} max={100} value={b.allocationPercent} onChange={(e) => update(i, "allocationPercent", parseInt(e.target.value) || 0)} />
                    </div>
                  </div>
                  <div>
                    <Label>Wallet Address</Label>
                    <Input placeholder="0x..." className="font-mono" value={b.address} onChange={(e) => update(i, "address", e.target.value)} />
                  </div>
                </div>
              ))}

              <Button variant="outline" className="w-full gap-2" onClick={addBeneficiary}>
                <Plus className="h-4 w-4" /> Add Beneficiary
              </Button>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <div>
                <Badge variant={totalAllocation === 100 ? "default" : "destructive"}>
                  {totalAllocation}% allocated
                </Badge>
              </div>
              <Button disabled={!isValid} onClick={() => setStep("review")}>
                Review Vault
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step: Review */}
        {step === "review" && (
          <Card>
            <CardHeader>
              <CardTitle>Review Vault Configuration</CardTitle>
              <CardDescription>Confirm the details before deploying your inheritance vault smart contract.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Donor Wallet</p>
                <p className="font-mono text-sm text-foreground">{walletAddress}</p>
              </div>
              {beneficiaries.map((b, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex justify-between">
                    <p className="font-medium text-foreground">{b.name}</p>
                    <Badge>{b.allocationPercent}%</Badge>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground mt-1">{b.address}</p>
                </div>
              ))}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-foreground">
                <strong>Unlock Conditions:</strong> Vault assets will only be distributed when <em>both</em> a beneficiary claim and oracle death verification are confirmed.
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("beneficiaries")}>Back</Button>
              <Button onClick={handleDeploy}>Deploy Vault Contract</Button>
            </CardFooter>
          </Card>
        )}

        {/* Step: Deploying */}
        {step === "deploying" && (
          <Card className="text-center">
            <CardContent className="py-16">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground">Deploying Vault Contract</h2>
              <p className="text-muted-foreground mt-2">Confirm the transaction in your wallet…</p>
            </CardContent>
          </Card>
        )}

        {/* Step: Complete */}
        {step === "complete" && deployedAddress && (
          <Card className="text-center">
            <CardContent className="py-16">
              <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">Vault Deployed!</h2>
              <p className="text-muted-foreground mb-4">Your inheritance vault is now live on-chain.</p>
              <div className="inline-block p-3 rounded-lg bg-muted font-mono text-sm text-foreground mb-6">
                {deployedAddress}
              </div>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => navigate("/vaults")}>Go to Dashboard</Button>
                <Button onClick={() => navigate(`/vault/new`)}>Deposit Assets</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <Footer />
    </Background>
  );
};

export default CreateVault;
