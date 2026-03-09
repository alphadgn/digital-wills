import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/PrivyAuthContext";
import { getVaultById, getVaultBeneficiaries, getDepositHistory, type VaultRow } from "@/lib/supabaseVault";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Shield, Users, Coins, ExternalLink, Clock, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Background from "@/components/DigitalWill/Background";
import { apechain } from "@/config/wagmi";

const statusColor: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  CLAIMED: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  DISTRIBUTED: "bg-primary/10 text-primary border-primary/20",
  PAUSED: "bg-muted text-muted-foreground border-border",
};

const VaultDetail = () => {
  const { vaultId } = useParams<{ vaultId: string }>();
  const { walletAddress } = useAuth();
  const navigate = useNavigate();
  const [vault, setVault] = useState<VaultRow | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress || !vaultId) return;

    const load = async () => {
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
      } catch (e: any) {
        setError(e.message || "Failed to load vault");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [walletAddress, vaultId]);

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
              <a
                href={`${apechain.blockExplorers.default.url}/address/${vault.vault_contract_address}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="gap-1">
                  <ExternalLink className="h-3 w-3" /> View on ApeScan
                </Button>
              </a>
            </CardContent>
          </Card>
        )}

        {/* Beneficiaries */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-center justify-center">
              <Users className="h-5 w-5 text-primary" /> Beneficiaries
            </CardTitle>
            <CardDescription className="text-center">
              {beneficiaries.length === 0 ? "No beneficiaries configured yet." : `${beneficiaries.length} beneficiar${beneficiaries.length !== 1 ? "ies" : "y"} configured.`}
            </CardDescription>
          </CardHeader>
          {beneficiaries.length > 0 && (
            <CardContent className="space-y-3">
              {beneficiaries.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {b.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{b.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {b.wallet_address.substring(0, 10)}...{b.wallet_address.substring(b.wallet_address.length - 4)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{b.allocation_percent}%</Badge>
                    {b.invite_accepted ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Accepted</Badge>
                    ) : b.invite_sent ? (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Not invited</Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>

        {/* Deposit History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-center justify-center">
              <Coins className="h-5 w-5 text-primary" /> Deposit History
            </CardTitle>
            <CardDescription className="text-center">
              {deposits.length === 0 ? "No deposits yet." : `${deposits.length} deposit${deposits.length !== 1 ? "s" : ""} recorded.`}
            </CardDescription>
          </CardHeader>
          {deposits.length > 0 && (
            <CardContent className="space-y-3">
              {deposits.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-3">
                    <Coins className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{d.amount_eth} ETH</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {new Date(d.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`${apechain.blockExplorers.default.url}/tx/${d.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" /> Tx
                  </a>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      </div>
      <Footer />
    </Background>
  );
};

export default VaultDetail;
