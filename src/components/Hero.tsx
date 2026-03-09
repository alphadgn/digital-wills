import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/PrivyAuthContext";
import { Award, ShieldCheck, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAccount, useReadContract } from "wagmi";
import { toast } from "@/hooks/use-toast";

const BAYC_CONTRACT = "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D" as const;
const MAYC_CONTRACT = "0x60E4d786628Fea6478F785A6d7e704777c86a7c6" as const;

const ERC721_BALANCE_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const Hero = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const [isCheckingNFT, setIsCheckingNFT] = useState(false);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);

  // Read BAYC balance
  const { data: baycBalance } = useReadContract({
    address: BAYC_CONTRACT,
    abi: ERC721_BALANCE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: 1, // Ethereum mainnet
    query: { enabled: !!address },
  });

  // Read MAYC balance
  const { data: maycBalance } = useReadContract({
    address: MAYC_CONTRACT,
    abi: ERC721_BALANCE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: 1,
    query: { enabled: !!address },
  });

  const handlePurchase = async () => {
    if (isAuthenticated) {
      navigate("/dashboard");
      return;
    }

    // If wallet connected, check NFT holdings
    if (isConnected && address) {
      setIsCheckingNFT(true);
      try {
        const hasBayc = baycBalance && BigInt(baycBalance.toString()) > 0n;
        const hasMayc = maycBalance && BigInt(maycBalance.toString()) > 0n;

        if (hasBayc) {
          toast({
            title: "BAYC Holder Verified! 🎉",
            description: "You get free access. Signing you in now...",
          });
          login();
          setIsCheckingNFT(false);
          return;
        }

        if (hasMayc) {
          toast({
            title: "MAYC Holder Detected! 🦍",
            description: "You qualify for the discounted rate of $59.95.",
          });
          setIsCheckingNFT(false);
          await createCheckoutSession("mayc");
          return;
        }
      } catch (error) {
        console.error("NFT check failed:", error);
      }
      setIsCheckingNFT(false);
    }

    // Standard price for non-holders or no wallet connected
    await createCheckoutSession("standard");
  };

  const createCheckoutSession = async (tier: "standard" | "mayc") => {
    setIsCreatingCheckout(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { tier },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Error",
        description: "Failed to create checkout session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingCheckout(false);
    }
  };

  const handleInitiateClaim = () => {
    navigate("/asset-recovery");
  };

  const isLoading = isCheckingNFT || isCreatingCheckout;

  return (
    <section className="py-20 px-6 relative">
      <div className="max-w-4xl mx-auto text-center animate-fade-in">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-6">
          Secure Your Digital Legacy
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto transition-colors duration-300">
          The true essence of decentralization is self custody so why would you leave the future of your hard earned assets to a court appointed probate process. Take control of the process. Ensure your loved ones receive full benefits of your empire. Create a digital will today.
        </p>
        <div className="flex flex-col items-center gap-4">
          <Button
            size="lg"
            onClick={handlePurchase}
            disabled={isLoading}
            className="transition-all duration-300 text-lg px-10 py-6 hover:scale-[1.02] hover:shadow-lg"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                {isCheckingNFT ? "Verifying NFT Holdings..." : "Redirecting to Checkout..."}
              </span>
            ) : isAuthenticated ? (
              "Go to Dashboard"
            ) : (
              <>
                <ShieldCheck className="mr-2 h-5 w-5" />
                Purchase your Digital Will
              </>
            )}
          </Button>

          {!isAuthenticated && (
            <p className="text-sm text-muted-foreground max-w-md">
              <span className="font-semibold text-primary">BAYC holders:</span> Free access •{" "}
              <span className="font-semibold text-primary">MAYC holders:</span> $59.95 •{" "}
              <span className="font-semibold">Standard:</span> $99.95
            </p>
          )}
        </div>

        <div className="mt-8 flex justify-center">
          <Button
            size="lg"
            variant="secondary"
            onClick={handleInitiateClaim}
            className="bg-accent hover:bg-accent/90 text-accent-foreground transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
          >
            <Award className="mr-2 h-5 w-5" />
            Initiate Asset Claim
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
