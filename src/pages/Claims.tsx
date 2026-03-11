import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/PrivyAuthContext";
import { getMyClaims, executeClaim, type ClaimRow } from "@/lib/claimApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle, CheckCircle2, Clock, XCircle, Loader2,
  ShieldCheck, ArrowLeft, RefreshCw
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Background from "@/components/DigitalWill/Background";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

type ClaimStatus = ClaimRow["status"];

const statusConfig: Record<ClaimStatus, { icon: React.ReactNode; color: string; label: string }> = {
  INITIATED: { icon: <Clock className="h-4 w-4" />, color: "bg-muted text-muted-foreground", label: "Initiated" },
  VERIFICATION_PENDING: { icon: <Loader2 className="h-4 w-4 animate-spin" />, color: "bg-amber-500/10 text-amber-600", label: "Verifying" },
  VERIFIED: { icon: <CheckCircle2 className="h-4 w-4" />, color: "bg-emerald-500/10 text-emerald-600", label: "Verified" },
  DENIED: { icon: <XCircle className="h-4 w-4" />, color: "bg-destructive/10 text-destructive", label: "Denied" },
  EXECUTED: { icon: <ShieldCheck className="h-4 w-4" />, color: "bg-primary/10 text-primary", label: "Executed" },
};

const Claims = () => {
  const { isAuthenticated, walletAddress, login, getAccessToken } = useAuth();
  const navigate = useNavigate();
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);

  const loadClaims = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getAccessToken();
      if (!token) return;
      const data = await getMyClaims(token);
      setClaims(data);
    } catch (e: any) {
      console.error("Failed to load claims:", e);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (isAuthenticated) loadClaims();
  }, [isAuthenticated, loadClaims]);

  // Realtime subscription for claim updates
  useEffect(() => {
    const channel = supabase
      .channel("claims-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "claims" },
        () => { loadClaims(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadClaims]);

  const handleExecute = async (claimId: string) => {
    try {
      setExecuting(claimId);
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      await executeClaim(token, claimId);
      toast.success("Vault assets distributed successfully!");
      loadClaims();
    } catch (e: any) {
      toast.error(e.message || "Failed to execute claim");
    } finally {
      setExecuting(null);
    }
  };

  const canExecute = (c: ClaimRow) =>
    c.beneficiary_vote && c.oracle_vote === true && c.status === "VERIFIED";

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

  const allExecuted = claims.length > 0 && claims.every(
    (c) => c.status === "EXECUTED" || c.status === "DENIED"
  );

  return (
    <Background>
      <Header />
      <div className="min-h-screen py-12 px-4 max-w-4xl mx-auto w-full">
        <Button variant="ghost" className="mb-6 gap-2 text-muted-foreground" onClick={() => navigate("/vaults")}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Claims</h1>
            <p className="text-muted-foreground">Track inheritance claims and oracle verification.</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadClaims} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {allExecuted && (
          <Alert className="mb-6 border-emerald-500/30 bg-emerald-500/5">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <AlertDescription className="text-foreground font-medium">
              All claims have been resolved. Thank you for using our services.
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : claims.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No claims found. Claims appear here when a beneficiary initiates one against a vault you're associated with.</p>
            </CardContent>
          </Card>
        ) : (
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
                          <span className="text-xs text-muted-foreground">
                            {new Date(claim.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="font-mono text-sm text-foreground">
                          Vault: {claim.vault_id.substring(0, 8)}…
                        </p>
                      </div>

                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex gap-3 text-sm">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Beneficiary:</span>
                            {claim.beneficiary_vote ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Oracle:</span>
                            {claim.oracle_vote === true ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : claim.oracle_vote === false ? (
                              <XCircle className="h-4 w-4 text-destructive" />
                            ) : (
                              <Clock className="h-4 w-4 text-amber-500" />
                            )}
                          </div>
                        </div>

                        {claim.oracle_confidence !== null && (
                          <Badge
                            variant="outline"
                            className={claim.oracle_confidence >= 0.99 ? "text-emerald-600" : "text-destructive"}
                          >
                            {(claim.oracle_confidence * 100).toFixed(1)}% confidence
                          </Badge>
                        )}

                        {canExecute(claim) && (
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

                    {/* Oracle results */}
                    {claim.oracle_results && claim.oracle_results.length > 0 && (
                      <div className="mt-3 p-3 rounded-md bg-muted/50">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Oracle Verification</p>
                        {claim.oracle_results.map((or: any) => (
                          <div key={or.id} className="text-xs text-muted-foreground">
                            <span>Sources: {or.sources?.join(", ") || "N/A"}</span>
                            {or.matched_name && <span> · Name matched</span>}
                            {or.matched_dob && <span> · DOB matched</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {claim.status === "DENIED" && (
                      <Alert variant="destructive" className="mt-3">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Oracle verification failed. The donor has been notified.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </Background>
  );
};

export default Claims;
