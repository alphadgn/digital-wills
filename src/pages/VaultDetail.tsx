import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/PrivyAuthContext";
import { getVaultById, getVaultBeneficiaries, getDepositHistory, type VaultRow, type BeneficiaryRow, type DepositRow } from "@/lib/supabaseVault";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Shield, ExternalLink, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Background from "@/components/DigitalWill/Background";
import BeneficiaryManager from "@/components/vault/BeneficiaryManager";
import DepositManager from "@/components/vault/DepositManager";
import EmergencySection from "@/components/vault/EmergencySection";
import { apechain } from "@/config/wagmi";

const statusColor: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  CLAIMED: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  DISTRIBUTED: "bg-primary/10 text-primary border-primary/20",
  PAUSED: "bg-muted text-muted-foreground border-border",
  CANCELLED: "bg-destructive/10 text-destructive border-destructive/20",
};

const VaultDetail = () => {
  const { vaultId } = useParams<{ vaultId: string }>();
  const { walletAddress } = useAuth();
  const navigate = useNavigate();
  const [vault, setVault] = useState<VaultRow | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryRow[]>([]);
  const [deposits, setDeposits] = useState<DepositRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!walletAddress || !vaultId) return;
    try {
      setLoading(true);
      const [v, b, d] = await Promise.all([
        getVaultById(walletAddress, vaultId),
        getVaultBeneficiaries(walletAddress, vaultId),
        getDepositHistory(walletAddress, vaultId),
      ]);
      setVault(v);
      setBeneficiaries(b);
      setDeposits(d);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Failed to load vault");
    } finally {
      setLoading(false);
    }
  }, [walletAddress, vaultId]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <Background>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Background>
    );
  }

  if (error || !vault) {
    return (
      <Background>
        <Header />
        <div className="min-h-screen flex items-center justify-center px-4">
          <Card className="max-w-md w-full text-center">
            <CardContent className="py-12">
              <p className="text-destructive mb-4">{error || "Vault not found"}</p>
              <Button onClick={() => navigate("/vaults")}>Back to Vaults</Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </Background>
    );
  }

  const explorerUrl = apechain.blockExplorers.default.url;

  return (
    <Background>
      <Header />
      <div className="min-h-screen py-12 px-4 max-w-4xl mx-auto w-full">
        <Button variant="ghost" className="mb-6 gap-2 text-muted-foreground" onClick={() => navigate("/vaults")}>
          <ArrowLeft className="h-4 w-4" /> Back to Vaults
        </Button>

        {/* Vault Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">{vault.vault_name}</h1>
          </div>
          <Badge variant="outline" className={statusColor[vault.status] || ""}>
            {vault.status}
          </Badge>
        </div>

        {/* Vault Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold text-foreground">{vault.total_value_eth} ETH</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Beneficiaries</p>
              <p className="text-2xl font-bold text-foreground">{beneficiaries.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Inactivity Period</p>
              <p className="text-2xl font-bold text-foreground">{vault.inactivity_period_days}d</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="text-lg font-bold text-foreground">{new Date(vault.created_at).toLocaleDateString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Contract Address */}
        {vault.vault_contract_address && (
          <Card className="mb-8">
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm text-muted-foreground">Contract Address</p>
                <p className="font-mono text-sm text-foreground">{vault.vault_contract_address}</p>
              </div>
              <a href={`${explorerUrl}/address/${vault.vault_contract_address}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1">
                  <ExternalLink className="h-3 w-3" /> View on ApeScan
                </Button>
              </a>
            </CardContent>
          </Card>
        )}

        {/* Beneficiary Management */}
        <div className="mb-8">
          <BeneficiaryManager
            vaultId={vault.id}
            vaultContractAddress={vault.vault_contract_address}
            walletAddress={walletAddress!}
            beneficiaries={beneficiaries}
            onRefresh={loadData}
          />
        </div>

        {/* Deposit Management */}
        <div className="mb-8">
          <DepositManager
            vaultId={vault.id}
            vaultContractAddress={vault.vault_contract_address}
            walletAddress={walletAddress!}
            deposits={deposits}
            onRefresh={loadData}
            blockExplorerUrl={explorerUrl}
          />
        </div>

        {/* Emergency Section — only for vault owner */}
        {vault.status !== "CANCELLED" && (
          <div className="mb-8">
            <EmergencySection
              vaultId={vault.id}
              walletAddress={walletAddress!}
              donorEmail={vault.donor_email}
              donorPhone={vault.donor_phone}
              onRefresh={loadData}
            />
          </div>
        )}
      </div>
      <Footer />
    </Background>
  );
};

export default VaultDetail;
