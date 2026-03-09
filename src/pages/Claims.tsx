import React, { useState } from "react";
import { useAuth } from "@/contexts/PrivyAuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, XCircle, Loader2, ShieldCheck, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Background from "@/components/DigitalWill/Background";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ClaimStatus = "INITIATED" | "VERIFICATION_PENDING" | "VERIFIED" | "DENIED" | "EXECUTED";

interface ClaimRow {
  id: string;
  vaultContract: string;
  donorAddress: string;
  status: ClaimStatus;
  beneficiaryVote: boolean;
  oracleVote: boolean | null;
  oracleConfidence: number | null;
  createdAt: string;
}

const MOCK_CLAIMS: ClaimRow[] = [
  {
    id: "c1",
    vaultContract: "0xABC...1234",
    donorAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    status: "VERIFIED",
    beneficiaryVote: true,
    oracleVote: true,
    oracleConfidence: 0.997,
    createdAt: "2026-03-01",
  },
  {
    id: "c2",
    vaultContract: "0xDEF...5678",
    donorAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    status: "VERIFICATION_PENDING",
    beneficiaryVote: true,
    oracleVote: null,
    oracleConfidence: null,
    createdAt: "2026-03-08",
  },
  {
    id: "c3",
    vaultContract: "0xGHI...9012",
    donorAddress: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    status: "DENIED",
    beneficiaryVote: true,
    oracleVote: false,
    oracleConfidence: 0.12,
    createdAt: "2026-02-20",
  },
];

const statusConfig: Record<ClaimStatus, { icon: React.ReactNode; color: string; label: string }> = {
  INITIATED: { icon: <Clock className="h-4 w-4" />, color: "bg-muted text-muted-foreground", label: "Initiated" },
  VERIFICATION_PENDING: { icon: <Loader2 className="h-4 w-4 animate-spin" />, color: "bg-amber-500/10 text-amber-600", label: "Verifying" },
  VERIFIED: { icon: <CheckCircle2 className="h-4 w-4" />, color: "bg-emerald-500/10 text-emerald-600", label: "Verified" },
  DENIED: { icon: <XCircle className="h-4 w-4" />, color: "bg-destructive/10 text-destructive", label: "Denied" },
  EXECUTED: { icon: <ShieldCheck className="h-4 w-4" />, color: "bg-primary/10 text-primary", label: "Executed" },
};

const Claims = () => {
  const { isAuthenticated, walletAddress, login } = useAuth();
  const navigate = useNavigate();
  const [claims, setClaims] = useState<ClaimRow[]>(MOCK_CLAIMS);
  const [executing, setExecuting] = useState<string | null>(null);

  const handleExecute = async (claimId: string) => {
    setExecuting(claimId);
    // Simulate on-chain vault distribution
    await new Promise((r) => setTimeout(r, 2500));
    setClaims(claims.map((c) => (c.id === claimId ? { ...c, status: "EXECUTED" as ClaimStatus } : c)));
    setExecuting(null);
    toast.success("Vault assets distributed successfully!");
  };

  const canExecute = (c: ClaimRow) => c.beneficiaryVote && c.oracleVote === true && c.status === "VERIFIED";
  const allExecuted = claims.every((c) => c.status === "EXECUTED" || c.status === "DENIED");

  if (!isAuthenticated) {
    return (
      <Background>
        <Header />
        <div className="min-h-screen flex items-center justify-center px-4">
          <Card className="max-w-md w-full text-center">
            <CardContent className="py-12">
              <p className="text-muted-foreground mb-4">Connect your wallet to view claims</p>
              <Button onClick={login}>Connect Wallet</Button>
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
      <div className="min-h-screen py-12 px-4 max-w-4xl mx-auto w-full">
        <Button variant="ghost" className="mb-6 gap-2 text-muted-foreground" onClick={() => navigate("/vaults")}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <h1 className="text-3xl font-bold text-foreground mb-2">Claims</h1>
        <p className="text-muted-foreground mb-8">Track and manage inheritance claims and oracle verification status.</p>

        {allExecuted && (
          <Alert className="mb-6 border-emerald-500/30 bg-emerald-500/5">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <AlertDescription className="text-foreground font-medium">
              All claims have been honored in this matter. Thank you for using our services.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {claims.map((claim) => {
            const cfg = statusConfig[claim.status];
            return (
              <Card key={claim.id} className="overflow-hidden">
                <CardContent className="py-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className={`${cfg.color} gap-1`}>
                          {cfg.icon} {cfg.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{claim.createdAt}</span>
                      </div>
                      <p className="font-mono text-sm text-foreground">Vault: {claim.vaultContract}</p>
                      <p className="font-mono text-xs text-muted-foreground">Donor: {claim.donorAddress}</p>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Vote indicators */}
                      <div className="flex gap-3 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Beneficiary:</span>
                          {claim.beneficiaryVote ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Oracle:</span>
                          {claim.oracleVote === true ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : claim.oracleVote === false ? (
                            <XCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <Clock className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                      </div>

                      {claim.oracleConfidence !== null && (
                        <Badge variant="outline" className={claim.oracleConfidence >= 0.99 ? "text-emerald-600" : "text-destructive"}>
                          {(claim.oracleConfidence * 100).toFixed(1)}% confidence
                        </Badge>
                      )}

                      {canExecute(claim) && claim.status !== "EXECUTED" && (
                        <Button
                          size="sm"
                          disabled={executing === claim.id}
                          onClick={() => handleExecute(claim.id)}
                        >
                          {executing === claim.id ? (
                            <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Distributing…</>
                          ) : (
                            "Execute Distribution"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {claim.status === "DENIED" && (
                    <Alert variant="destructive" className="mt-3">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Oracle verification failed. The donor has been notified of this claim attempt.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
      <Footer />
    </Background>
  );
};

export default Claims;
