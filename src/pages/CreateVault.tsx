import React, { useState } from "react";
import { useAuth } from "@/contexts/PrivyAuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Wallet, ArrowLeft, CheckCircle2, Loader2, Shield, ExternalLink, Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Background from "@/components/DigitalWill/Background";
import { useDeployVault, useDepositToVault } from "@/hooks/useVaultContract";
import { CONTRACTS } from "@/config/contracts";
import { apechain } from "@/config/wagmi";

interface BeneficiaryInput {
  address: string;
  name: string;
  allocationPercent: number;
}

type Step = "configure" | "beneficiaries" | "review" | "deploying" | "deposit" | "complete";

const CreateVault = () => {
  const { walletAddress, isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("configure");
  const [vaultName, setVaultName] = useState("");
  const [inactivityPeriod, setInactivityPeriod] = useState("365");
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryInput[]>([
    { address: "", name: "", allocationPercent: 100 },
  ]);
  const [depositAmount, setDepositAmount] = useState("");

  const { deploy, txHash, isPending, isConfirming, isSuccess, vaultAddress, error, reset } = useDeployVault();
  const {
    deposit,
    txHash: depositTxHash,
    isPending: isDepositPending,
    isConfirming: isDepositConfirming,
    isSuccess: isDepositSuccess,
    error: depositError,
  } = useDepositToVault(vaultAddress ?? undefined);

  const totalAllocation = beneficiaries.reduce((s, b) => s + b.allocationPercent, 0);
  const isValid =
    beneficiaries.every(
      (b) => b.address.startsWith("0x") && b.address.length === 42 && b.name.trim() && b.allocationPercent > 0
    ) && totalAllocation === 100;

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

  const handleDeploy = () => {
    setStep("deploying");
    deploy({
      beneficiaries: beneficiaries.map((b) => b.address as `0x${string}`),
      allocations: beneficiaries.map((b) => b.allocationPercent),
    });
  };

  // Watch for deployment success
  React.useEffect(() => {
    if (isSuccess && vaultAddress) {
      toast.success("Vault deployed on-chain!");
      setStep("deposit");
    }
  }, [isSuccess, vaultAddress]);

  // Watch for deployment error
  React.useEffect(() => {
    if (error) {
      toast.error("Transaction failed: " + (error as Error).message?.substring(0, 100));
      setStep("review");
      reset();
    }
  }, [error, reset]);

  // Watch for deposit success
  React.useEffect(() => {
    if (isDepositSuccess) {
      toast.success("Deposit confirmed!");
      setStep("complete");
    }
  }, [isDepositSuccess]);

  React.useEffect(() => {
    if (depositError) {
      toast.error("Deposit failed: " + (depositError as Error).message?.substring(0, 100));
    }
  }, [depositError]);

  const stepLabels = ["Configure", "Beneficiaries", "Review", "Deploy", "Deposit"];
  const stepKeys: Step[] = ["configure", "beneficiaries", "review", "deploying", "deposit"];

  if (!isAuthenticated) {
    return (
      <Background>
        <Header />
        <div className="min-h-screen flex items-center justify-center px-4">
          <Card className="max-w-md w-full text-center">
            <CardContent className="py-12">
              <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Connect Your Wallet</h2>
              <p className="text-muted-foreground mb-6">You need to connect your wallet to create a vault.</p>
              <Button onClick={login} className="gap-2">
                <Wallet className="h-4 w-4" /> Connect Wallet
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </Background>
    );
  }

  return (
    <Background>
      <Header />
      <div className="min-h-screen py-12 px-4 max-w-2xl mx-auto w-full">
        <Button variant="ghost" className="mb-6 gap-2 text-muted-foreground" onClick={() => navigate("/vaults")}>
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Button>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {stepLabels.map((label, i) => {
            const currentIdx = stepKeys.indexOf(step === "complete" ? "deposit" : step);
            const isActive = currentIdx >= i;
            return (
              <React.Fragment key={label}>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium shrink-0 ${
                    isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step === "complete" && i === 4 ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:inline ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {label}
                </span>
                {i < stepLabels.length - 1 && <div className={`flex-1 h-px ${isActive ? "bg-primary" : "bg-border"}`} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step: Configure */}
        {step === "configure" && (
          <Card>
            <CardHeader>
              <CardTitle>Configure Vault</CardTitle>
              <CardDescription>Set up your inheritance vault parameters.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label>Vault Name</Label>
                <Input
                  placeholder="My Family Vault"
                  value={vaultName}
                  onChange={(e) => setVaultName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">A label for your reference (stored off-chain).</p>
              </div>
              <div>
                <Label>Inactivity Period (days)</Label>
                <Input
                  type="number"
                  min={30}
                  max={3650}
                  value={inactivityPeriod}
                  onChange={(e) => setInactivityPeriod(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  After this period of wallet inactivity, beneficiaries can initiate a claim.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Connected Wallet (Donor)</p>
                <p className="font-mono text-sm text-foreground">{walletAddress}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-foreground">
                <strong>Network:</strong> ApeChain (Chain ID: {CONTRACTS.CHAIN_ID})
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button disabled={!vaultName.trim()} onClick={() => setStep("beneficiaries")}>
                Next: Add Beneficiaries
              </Button>
            </CardFooter>
          </Card>
        )}

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
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={b.allocationPercent}
                        onChange={(e) => update(i, "allocationPercent", parseInt(e.target.value) || 0)}
                      />
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
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setStep("configure")}>Back</Button>
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
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Vault Name</p>
                  <p className="font-medium text-foreground">{vaultName}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Inactivity Period</p>
                  <p className="font-medium text-foreground">{inactivityPeriod} days</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Donor Wallet</p>
                <p className="font-mono text-sm text-foreground">{walletAddress}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Beneficiaries ({beneficiaries.length})</p>
                {beneficiaries.map((b, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex justify-between">
                      <p className="font-medium text-foreground">{b.name}</p>
                      <Badge>{b.allocationPercent}%</Badge>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground mt-1">{b.address}</p>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-foreground">
                <strong>Contract:</strong>{" "}
                <span className="font-mono text-xs">{CONTRACTS.VAULT_FACTORY}</span>
                <br />
                <strong>Network:</strong> ApeChain • <strong>Unlock:</strong> Dual-vote (Beneficiary + Oracle)
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("beneficiaries")}>Back</Button>
              <Button onClick={handleDeploy} className="gap-2">
                <Shield className="h-4 w-4" /> Deploy Vault Contract
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step: Deploying */}
        {step === "deploying" && (
          <Card className="text-center">
            <CardContent className="py-16 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <h2 className="text-xl font-semibold text-foreground">
                {isPending ? "Confirm in Wallet" : isConfirming ? "Waiting for Confirmation" : "Deploying..."}
              </h2>
              <p className="text-muted-foreground">
                {isPending
                  ? "Please approve the transaction in your wallet."
                  : "Your transaction is being confirmed on ApeChain..."}
              </p>
              {txHash && (
                <a
                  href={`${apechain.blockExplorers.default.url}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  View on ApeScan <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step: Deposit */}
        {step === "deposit" && vaultAddress && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-primary" /> Fund Your Vault
              </CardTitle>
              <CardDescription>
                Deposit APE into your new vault. You can also do this later from the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Vault Contract</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm text-foreground truncate">{vaultAddress}</p>
                  <a
                    href={`${apechain.blockExplorers.default.url}/address/${vaultAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </a>
                </div>
              </div>

              <div>
                <Label>Deposit Amount (APE)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.0"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("complete")}>
                Skip for Now
              </Button>
              <Button
                disabled={!depositAmount || parseFloat(depositAmount) <= 0 || isDepositPending || isDepositConfirming}
                onClick={() => deposit(depositAmount)}
                className="gap-2"
              >
                {isDepositPending || isDepositConfirming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Coins className="h-4 w-4" />
                )}
                {isDepositPending ? "Confirm in Wallet" : isDepositConfirming ? "Confirming..." : "Deposit"}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step: Complete */}
        {step === "complete" && (
          <Card className="text-center">
            <CardContent className="py-16">
              <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">Vault Created!</h2>
              <p className="text-muted-foreground mb-4">Your inheritance vault is live on ApeChain.</p>
              {vaultAddress && (
                <div className="inline-flex items-center gap-2 p-3 rounded-lg bg-muted font-mono text-sm text-foreground mb-6">
                  <span className="truncate max-w-[280px]">{vaultAddress}</span>
                  <a
                    href={`${apechain.blockExplorers.default.url}/address/${vaultAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </a>
                </div>
              )}
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => navigate("/vaults")}>Go to Dashboard</Button>
                {vaultAddress && (
                  <Button onClick={() => navigate(`/vault/${vaultAddress}/beneficiaries`)}>
                    Manage Beneficiaries
                  </Button>
                )}
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
