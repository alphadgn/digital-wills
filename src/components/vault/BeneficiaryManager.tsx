import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Users, Plus, Trash2, Copy, Check, Loader2, Mail } from "lucide-react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { INHERITANCE_VAULT_ABI } from "@/config/contracts";
import { apechain } from "@/config/wagmi";
import { addBeneficiary, removeBeneficiary, markInviteSent, type BeneficiaryRow } from "@/lib/supabaseVault";
import { useAuth } from "@/contexts/PrivyAuthContext";
import { toast } from "sonner";

interface Props {
  vaultId: string;
  vaultContractAddress: string | null;
  walletAddress: string;
  beneficiaries: BeneficiaryRow[];
  onRefresh: () => void;
}

export default function BeneficiaryManager({ vaultId, vaultContractAddress, walletAddress, beneficiaries, onRefresh }: Props) {
  const { getAccessToken } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [wallet, setWallet] = useState("");
  const [allocation, setAllocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { address: account } = useAccount();
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });

  const handleAdd = async () => {
    if (!name.trim() || !email.trim() || !allocation.trim()) {
      toast.error("Please fill name, email, and allocation");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Invalid email address");
      return;
    }
    if (wallet.trim() && !/^0x[a-fA-F0-9]{40}$/.test(wallet.trim())) {
      toast.error("Invalid wallet address format");
      return;
    }
    const alloc = parseInt(allocation);
    if (isNaN(alloc) || alloc < 1 || alloc > 100) {
      toast.error("Allocation must be 1-100%");
      return;
    }

    const beneficiaryWallet = wallet.trim() || "0x0000000000000000000000000000000000000000";

    setSaving(true);
    try {
      // On-chain transaction (only if real wallet provided)
      if (vaultContractAddress && account && wallet.trim()) {
        writeContract({
          account,
          chain: apechain,
          address: vaultContractAddress as `0x${string}`,
          abi: INHERITANCE_VAULT_ABI,
          functionName: "addBeneficiary",
          args: [beneficiaryWallet as `0x${string}`, BigInt(alloc)],
        });
      }

      // Save to database
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      await addBeneficiary(token, vaultId, name.trim(), beneficiaryWallet, alloc, email.trim());
      toast.success(`${name.trim()} added as beneficiary`);
      setName("");
      setEmail("");
      setWallet("");
      setAllocation("");
      setAddOpen(false);
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to add beneficiary");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (b: BeneficiaryRow) => {
    setRemovingId(b.id);
    try {
      if (vaultContractAddress && account && b.wallet_address !== "0x0000000000000000000000000000000000000000") {
        writeContract({
          account,
          chain: apechain,
          address: vaultContractAddress as `0x${string}`,
          abi: INHERITANCE_VAULT_ABI,
          functionName: "removeBeneficiary",
          args: [b.wallet_address as `0x${string}`],
        });
      }

      await removeBeneficiary(walletAddress, b.id);
      toast.success(`${b.name} removed`);
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to remove beneficiary");
    } finally {
      setRemovingId(null);
    }
  };

  const handleCopyInvite = async (b: BeneficiaryRow) => {
    if (!b.invite_token) return;
    const link = `${window.location.origin}/invite/${b.invite_token}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(b.id);
    setTimeout(() => setCopiedId(null), 2000);

    if (!b.invite_sent) {
      try {
        await markInviteSent(walletAddress, b.id);
        onRefresh();
      } catch { /* non-critical */ }
    }
    toast.success("Invite link copied!");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <CardTitle className="flex items-center gap-2 justify-center">
              <Users className="h-5 w-5 text-primary" /> Beneficiaries
            </CardTitle>
            <CardDescription>
              {beneficiaries.length === 0
                ? "No beneficiaries configured yet."
                : `${beneficiaries.length} beneficiar${beneficiaries.length !== 1 ? "ies" : "y"} configured.`}
            </CardDescription>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Beneficiary</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="ben-name">Name</Label>
                  <Input id="ben-name" placeholder="e.g. John Doe" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="ben-email">Email Address <span className="text-destructive">*</span></Label>
                  <Input id="ben-email" type="email" placeholder="john@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <p className="text-xs text-muted-foreground mt-1">Required — used for claim notifications</p>
                </div>
                <div>
                  <Label htmlFor="ben-wallet">Wallet Address <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input id="ben-wallet" placeholder="0x... (can be added later)" value={wallet} onChange={(e) => setWallet(e.target.value)} className="font-mono" />
                </div>
                <div>
                  <Label htmlFor="ben-alloc">Allocation (%)</Label>
                  <Input id="ben-alloc" type="number" min={1} max={100} placeholder="e.g. 50" value={allocation} onChange={(e) => setAllocation(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAdd} disabled={saving || isPending || isConfirming} className="gap-2">
                  {(saving || isPending || isConfirming) && <Loader2 className="h-4 w-4 animate-spin" />}
                  Add Beneficiary
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
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
                  {b.email && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {b.email}
                    </p>
                  )}
                  {b.wallet_address && b.wallet_address !== "0x0000000000000000000000000000000000000000" && (
                    <p className="font-mono text-xs text-muted-foreground">
                      {b.wallet_address.substring(0, 10)}...{b.wallet_address.substring(b.wallet_address.length - 4)}
                    </p>
                  )}
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
                {b.invite_token && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyInvite(b)} title="Copy invite link">
                    {copiedId === b.id ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleRemove(b)}
                  disabled={removingId === b.id}
                  title="Remove beneficiary"
                >
                  {removingId === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}