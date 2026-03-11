import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, Image, Clock, ExternalLink, Loader2 } from "lucide-react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { parseEther } from "viem";
import { INHERITANCE_VAULT_ABI, ERC721_ABI, ERC1155_ABI } from "@/config/contracts";
import { apechain } from "@/config/wagmi";
import { addDeposit, type DepositRow } from "@/lib/supabaseVault";
import { useAuth } from "@/contexts/PrivyAuthContext";
import { toast } from "sonner";

interface Props {
  vaultId: string;
  vaultContractAddress: string | null;
  walletAddress: string;
  deposits: DepositRow[];
  onRefresh: () => void;
  blockExplorerUrl: string;
}

export default function DepositManager({ vaultId, vaultContractAddress, walletAddress, deposits, onRefresh, blockExplorerUrl }: Props) {
  const { getAccessToken } = useAuth();
  const [ethAmount, setEthAmount] = useState("");
  const [nftAddress, setNftAddress] = useState("");
  const [nftTokenId, setNftTokenId] = useState("");
  const [nftType, setNftType] = useState<"ERC-721" | "ERC-1155">("ERC-721");
  const [nftAmount, setNftAmount] = useState("1");
  const [depositingEth, setDepositingEth] = useState(false);
  const [depositingNft, setDepositingNft] = useState(false);

  const { address: account } = useAccount();
  const { writeContract, data: txHash, isPending, isSuccess, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } = useWaitForTransactionReceipt({ hash: txHash });

  // Record deposit after confirmation
  useEffect(() => {
    if (isConfirmed && txHash && (depositingEth || depositingNft)) {
      const record = async () => {
        try {
          const token = await getAccessToken();
          if (!token) throw new Error("Not authenticated");
          if (depositingEth) {
            await addDeposit(token, vaultId, txHash, parseFloat(ethAmount) || 0, "ETH");
          } else if (depositingNft) {
            await addDeposit(token, vaultId, txHash, 0, nftType, nftAddress, nftTokenId);
          }
          toast.success("Deposit recorded!");
          setEthAmount("");
          setNftAddress("");
          setNftTokenId("");
          setNftAmount("1");
          onRefresh();
        } catch (e: any) {
          toast.error("Deposit confirmed on-chain but failed to record in database");
        } finally {
          setDepositingEth(false);
          setDepositingNft(false);
          reset();
        }
      };
      record();
    }
  }, [isConfirmed, txHash]);

  const handleDepositEth = useCallback(() => {
    if (!vaultContractAddress || !account) {
      toast.error("Vault contract not available");
      return;
    }
    const amount = parseFloat(ethAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid ETH amount");
      return;
    }
    setDepositingEth(true);
    writeContract({
      account,
      chain: apechain,
      address: vaultContractAddress as `0x${string}`,
      abi: INHERITANCE_VAULT_ABI,
      functionName: "deposit",
      value: parseEther(ethAmount),
    });
  }, [vaultContractAddress, account, ethAmount, writeContract]);

  const handleDepositNft = useCallback(() => {
    if (!vaultContractAddress || !account) {
      toast.error("Vault contract not available");
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(nftAddress.trim())) {
      toast.error("Invalid NFT contract address");
      return;
    }
    if (!nftTokenId.trim()) {
      toast.error("Enter a token ID");
      return;
    }

    setDepositingNft(true);

    if (nftType === "ERC-721") {
      // Transfer ERC-721 to vault
      writeContract({
        account,
        chain: apechain,
        address: nftAddress.trim() as `0x${string}`,
        abi: ERC721_ABI,
        functionName: "transferFrom",
        args: [account, vaultContractAddress as `0x${string}`, BigInt(nftTokenId)],
      });
    } else {
      // Transfer ERC-1155 to vault
      const amt = parseInt(nftAmount) || 1;
      writeContract({
        account,
        chain: apechain,
        address: nftAddress.trim() as `0x${string}`,
        abi: ERC1155_ABI,
        functionName: "safeTransferFrom",
        args: [account, vaultContractAddress as `0x${string}`, BigInt(nftTokenId), BigInt(amt), "0x" as `0x${string}`],
      });
    }
  }, [vaultContractAddress, account, nftAddress, nftTokenId, nftType, nftAmount, writeContract]);

  const isBusy = isPending || isConfirming;

  const tokenIcon = (type: string) => {
    if (type === "ETH") return <Coins className="h-5 w-5 text-primary" />;
    return <Image className="h-5 w-5 text-secondary" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-center">
          <Coins className="h-5 w-5 text-primary" /> Deposits
        </CardTitle>
        <CardDescription className="text-center">
          Deposit ETH or NFTs into your vault
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Deposit Form */}
        {vaultContractAddress && (
          <Tabs defaultValue="eth" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="eth">ETH</TabsTrigger>
              <TabsTrigger value="nft">NFT</TabsTrigger>
            </TabsList>
            <TabsContent value="eth" className="space-y-3 pt-4">
              <div>
                <Label htmlFor="eth-amount">Amount (ETH)</Label>
                <Input id="eth-amount" type="number" step="0.001" min="0" placeholder="0.1" value={ethAmount} onChange={(e) => setEthAmount(e.target.value)} />
              </div>
              <Button onClick={handleDepositEth} disabled={isBusy} className="w-full gap-2">
                {isBusy && depositingEth && <Loader2 className="h-4 w-4 animate-spin" />}
                Deposit ETH
              </Button>
            </TabsContent>
            <TabsContent value="nft" className="space-y-3 pt-4">
              <div className="flex gap-2">
                <Button variant={nftType === "ERC-721" ? "default" : "outline"} size="sm" onClick={() => setNftType("ERC-721")}>ERC-721</Button>
                <Button variant={nftType === "ERC-1155" ? "default" : "outline"} size="sm" onClick={() => setNftType("ERC-1155")}>ERC-1155</Button>
              </div>
              <div>
                <Label htmlFor="nft-addr">NFT Contract Address</Label>
                <Input id="nft-addr" placeholder="0x..." className="font-mono" value={nftAddress} onChange={(e) => setNftAddress(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="nft-id">Token ID</Label>
                <Input id="nft-id" placeholder="1" value={nftTokenId} onChange={(e) => setNftTokenId(e.target.value)} />
              </div>
              {nftType === "ERC-1155" && (
                <div>
                  <Label htmlFor="nft-amt">Amount</Label>
                  <Input id="nft-amt" type="number" min="1" value={nftAmount} onChange={(e) => setNftAmount(e.target.value)} />
                </div>
              )}
              <Button onClick={handleDepositNft} disabled={isBusy} className="w-full gap-2">
                {isBusy && depositingNft && <Loader2 className="h-4 w-4 animate-spin" />}
                Deposit NFT
              </Button>
            </TabsContent>
          </Tabs>
        )}

        {/* Deposit History */}
        {deposits.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">History</h4>
            {deposits.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-3">
                  {tokenIcon(d.token_type)}
                  <div>
                    <p className="font-medium text-foreground">
                      {d.token_type === "ETH" ? `${d.amount_eth} ETH` : `${d.token_type} #${d.token_id}`}
                    </p>
                    {d.token_address && (
                      <p className="font-mono text-xs text-muted-foreground">
                        {d.token_address.substring(0, 10)}...{d.token_address.substring(d.token_address.length - 4)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {new Date(d.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <a href={`${blockExplorerUrl}/tx/${d.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" /> Tx
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center">No deposits yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
