import React, { useState } from "react";
import { useAuth } from "@/contexts/PrivyAuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, Trash2, Send, ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Background from "@/components/DigitalWill/Background";

interface BeneficiaryRow {
  id: string;
  name: string;
  walletAddress: string;
  allocationPercent: number;
  inviteSent: boolean;
  inviteAccepted: boolean;
}

const MOCK_BENEFICIARIES: BeneficiaryRow[] = [
  { id: "b1", name: "Alice", walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", allocationPercent: 60, inviteSent: true, inviteAccepted: true },
  { id: "b2", name: "Bob", walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", allocationPercent: 40, inviteSent: true, inviteAccepted: false },
];

const ManageBeneficiaries = () => {
  const { walletAddress } = useAuth();
  const navigate = useNavigate();
  const { vaultId } = useParams();
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryRow[]>(MOCK_BENEFICIARIES);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newAlloc, setNewAlloc] = useState(0);

  const handleAdd = () => {
    if (!newAddress.startsWith("0x") || newAddress.length !== 42) {
      toast.error("Invalid wallet address");
      return;
    }
    setBeneficiaries([
      ...beneficiaries,
      { id: `b${Date.now()}`, name: newName, walletAddress: newAddress, allocationPercent: newAlloc, inviteSent: false, inviteAccepted: false },
    ]);
    setNewName("");
    setNewAddress("");
    setNewAlloc(0);
    setShowAdd(false);
    toast.success("Beneficiary added");
  };

  const handleRemove = (id: string) => {
    setBeneficiaries(beneficiaries.filter((b) => b.id !== id));
    toast.success("Beneficiary removed");
  };

  const handleSendInvite = (id: string) => {
    setBeneficiaries(beneficiaries.map((b) => (b.id === id ? { ...b, inviteSent: true } : b)));
    toast.success("Invitation sent");
  };

  return (
    <Background>
      <Header />
      <div className="min-h-screen py-12 px-4 max-w-3xl mx-auto w-full">
        <Button variant="ghost" className="mb-6 gap-2 text-muted-foreground" onClick={() => navigate("/vaults")}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Beneficiaries
          </h1>
          <p className="text-muted-foreground text-sm">Vault {vaultId}</p>
          <Button className="gap-2 mt-3" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>

        {showAdd && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Add Beneficiary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label>Name</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" />
                </div>
                <div>
                  <Label>Wallet Address</Label>
                  <Input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="0x..." className="font-mono" />
                </div>
                <div>
                  <Label>Allocation %</Label>
                  <Input type="number" value={newAlloc} onChange={(e) => setNewAlloc(parseInt(e.target.value) || 0)} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button onClick={handleAdd}>Add</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {beneficiaries.map((b) => (
            <Card key={b.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {b.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{b.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{b.walletAddress.substring(0, 10)}...{b.walletAddress.substring(38)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge>{b.allocationPercent}%</Badge>
                  {b.inviteAccepted ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Accepted</Badge>
                  ) : b.inviteSent ? (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>
                  ) : (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => handleSendInvite(b.id)}>
                      <Send className="h-3 w-3" /> Invite
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => handleRemove(b.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
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

export default ManageBeneficiaries;
