import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/PrivyAuthContext";
import { Award, ShieldCheck, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAccount, useReadContract } from "wagmi";
import { toast } from "@/hooks/use-toast";
import { useDelegatedNFTCheck } from "@/hooks/useDelegatedNFTCheck";

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
  const [hasPurchased, setHasPurchased] = useState(false);

  // Direct NFT balance checks
  const { data: baycBalance } = useReadContract({
    address: BAYC_CONTRACT,
    abi: ERC721_BALANCE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: 1,
    query: { enabled: !!address },
  });

  const { data: maycBalance } = useReadContract({
    address: MAYC_CONTRACT,
    abi: ERC721_BALANCE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: 1,
    query: { enabled: !!address },
  });

  // Delegated wallet check via delegate.cash V2
  const { hasDelegatedBAYC, hasDelegatedMAYC, isChecking: isDelegateChecking } =
    useDelegatedNFTCheck(address as `0x${string}` | undefined);

  // Check if wallet has already purchased
  useEffect(() => {
    if (!address) return;
    const checkPurchase = async () => {
      try {
        const { data } = await (supabase as any)
          .from("purchases")
          .select("id")
          .eq("wallet_address", address.toLowerCase())
          .maybeSingle();
        if (data) setHasPurchased(true);
      } catch (e) {
        console.error("Purchase check failed:", e);
      }
    };
    checkPurchase();
  }, [address]);

  const handlePurchase = async () => {
    if (isAuthenticated) {
      navigate("/dashboard");
      return;
    }

    // If already purchased, go straight to sign-in
    if (hasPurchased) {
      toast({
        title: "Welcome back! 👋",
        description: "You already have access. Signing you in...",
      });
      login();
      return;
    }

    // Check NFT holdings (direct + delegated)
    if (isConnected && address) {
      setIsCheckingNFT(true);
      try {
        const hasDirectBAYC = baycBalance && BigInt(baycBalance.toString()) > 0n;
        const hasDirectMAYC = maycBalance && BigInt(maycBalance.toString()) > 0n;

        if (hasDirectBAYC || hasDelegatedBAYC) {
          toast({
            title: hasDirectBAYC
              ? "BAYC Holder Verified! 🎉"
              : "Delegated BAYC Access Verified! 🎉",
            description: "You get free access. Signing you in now...",
          });
          login();
          setIsCheckingNFT(false);
          return;
        }

        if (hasDirectMAYC || hasDelegatedMAYC) {
          toast({
            title: hasDirectMAYC
              ? "MAYC Holder Detected! 🦍"
              : "Delegated MAYC Access Detected! 🦍",
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

    // Standard price for non-holders
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

  const isLoading = isCheckingNFT || isCreatingCheckout || isDelegateChecking;

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
                {isCheckingNFT || isDelegateChecking
                  ? "Verifying NFT Holdings..."
                  : "Redirecting to Checkout..."}
              </span>
            ) : isAuthenticated ? (
              "Go to Dashboard"
            ) : hasPurchased ? (
              <>
                <ShieldCheck className="mr-2 h-5 w-5" />
                Sign In (Already Purchased)
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-5 w-5" />
                Purchase your Digital Will
              </>
            )}
          </Button>

          {!isAuthenticated && !hasPurchased && (
            <p className="text-sm text-muted-foreground max-w-md">
              <span className="font-semibold text-primary">BAYC holders:</span> Free access •{" "}
              <span className="font-semibold text-primary">MAYC holders:</span> $59.95 •{" "}
              <span className="font-semibold">Standard:</span> $99.95
              <br />
              <span className="text-xs opacity-75">
                Supports delegate.cash V2 — delegated wallets qualify too
              </span>
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
