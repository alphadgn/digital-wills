import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/PrivyAuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, Shield, ArrowRight, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Background from "@/components/DigitalWill/Background";
import { useAutoVault } from "@/hooks/useAutoVault";
import { SecurityBanner, LivenessBadge, EncryptionBadge } from "@/components/TrustIndicators";
import { getLivenessStatus, checkIn, type LivenessStatus } from "@/lib/livenessApi";

// Mock data until backend connected
const MOCK_VAULTS = [
  {
    id: "v1",
    contractAddress: "0xABC...1234",
    status: "ACTIVE" as const,
    totalValueEth: "2.5",
    beneficiaryCount: 2,
    createdAt: "2025-12-01",
  },
  {
    id: "v2",
    contractAddress: "0xDEF...5678",
    status: "CLAIMED" as const,
    totalValueEth: "0.8",
    beneficiaryCount: 1,
    createdAt: "2026-01-15",
  },
];

const statusColor: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  CLAIMED: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  DISTRIBUTED: "bg-primary/10 text-primary border-primary/20",
  PAUSED: "bg-muted text-muted-foreground border-border",
};

const VaultDashboard = () => {
  const { isAuthenticated, walletAddress, login, isLoading } = useAuth();
  const { vaultAddress: autoVaultAddress, isCreating, hasVault } = useAutoVault();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Background>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse-slow text-muted-foreground">Loading…</div>
        </div>
      </Background>
    );
  }

  if (!isAuthenticated) {
    return (
      <Background>
        <Header />
        <div className="min-h-screen flex items-center justify-center px-4">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Wallet className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Connect Your Wallet</CardTitle>
              <CardDescription>
                Sign in with your wallet to access your inheritance vaults
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={login} size="lg" className="w-full">
                Connect Wallet
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
      <div className="min-h-screen py-12 px-4 max-w-5xl mx-auto w-full">
        {/* Back button */}
        <Button variant="ghost" className="mb-4 gap-2 text-muted-foreground" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        {/* Top bar - centered */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Vault Dashboard</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">
            {walletAddress?.substring(0, 6)}...{walletAddress?.substring((walletAddress?.length ?? 0) - 4)}
          </p>
        </div>

        {/* Auto-vault creation status */}
        {isCreating && (
          <Card className="mb-8 border-primary/30 bg-primary/5">
            <CardContent className="flex items-center gap-4 py-5">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <div>
                <p className="font-medium text-foreground">Creating your vault...</p>
                <p className="text-sm text-muted-foreground">Please confirm the transaction in your wallet.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {hasVault && autoVaultAddress && (
          <Card className="mb-8 border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="flex items-center gap-4 py-5">
              <Shield className="h-6 w-6 text-emerald-600" />
              <div>
                <p className="font-medium text-foreground">Your Vault</p>
                <p className="text-sm font-mono text-muted-foreground">{autoVaultAddress}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Vaults", value: MOCK_VAULTS.length + (hasVault ? 1 : 0) },
            { label: "Total Value Locked", value: `${MOCK_VAULTS.reduce((s, v) => s + parseFloat(v.totalValueEth), 0).toFixed(2)} ETH` },
            { label: "Active Claims", value: MOCK_VAULTS.filter((v) => v.status === "CLAIMED").length },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Vault list */}
        <div className="space-y-4">
          {MOCK_VAULTS.map((vault) => (
            <Card key={vault.id} className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/vault/${vault.id}`)}>
              <CardContent className="flex items-center justify-between py-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-mono text-sm font-medium text-foreground">{vault.contractAddress}</p>
                    <p className="text-xs text-muted-foreground">
                      {vault.beneficiaryCount} beneficiar{vault.beneficiaryCount !== 1 ? "ies" : "y"} · Created {vault.createdAt}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={statusColor[vault.status]}>
                    {vault.status}
                  </Badge>
                  <span className="font-semibold text-foreground">{vault.totalValueEth} ETH</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <Footer />
    </Background>
  );
};

export default VaultDashboard;
