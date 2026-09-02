import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/PrivyAuthContext";
import { Award, ShieldCheck, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { callFunction } from "@/lib/backendClient";
import { useAccount } from "wagmi";
import { toast } from "@/hooks/use-toast";
import { useNFTAccessTier } from "@/hooks/useNFTAccessTier";

const Hero = () => {
  const { login, isAuthenticated, walletAddress } = useAuth();
  const navigate = useNavigate();
  const { address: connectedAddress } = useAccount();
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);

  // The Privy wallet is the user's main web3 wallet; fall back to an
  // externally connected wallet when Privy has not resolved one yet.
  const activeAddress = (walletAddress || connectedAddress || undefined) as
    | `0x${string}`
    | undefined;

  const { tier, matchedCollection, viaDelegation, isChecking } = useNFTAccessTier(activeAddress);

  // Check if wallet has already purchased via server-side edge function
  useEffect(() => {
    if (!activeAddress) return;
    const checkPurchase = async () => {
      try {
        const data = await callFunction<{ purchased?: boolean }>("check-purchase", {
          wallet_address: activeAddress.toLowerCase(),
        });
        if (data?.purchased) setHasPurchased(true);
      } catch (e) {
        console.error("Purchase check failed:", e);
      }
    };
    checkPurchase();
  }, [activeAddress]);

  const handlePurchase = async () => {
    // Not signed in → open the Privy sign-in modal first
    if (!isAuthenticated) {
      login();
      return;
    }

    // Already purchased → straight to the dashboard
    if (hasPurchased) {
      navigate("/dashboard");
      return;
    }

    if (isChecking) return;

    if (tier === "free") {
      toast({
        title: `${matchedCollection?.name} Holder Verified 🎉`,
        description: viaDelegation
          ? "Delegated holding verified — you have free access."
          : "You have free access. Taking you to your dashboard...",
      });
      navigate("/dashboard");
      return;
    }

    if (tier === "discounted") {
      toast({
        title: `${matchedCollection?.name} Holder Detected 🦍`,
        description: "You qualify for the discounted rate of $59.95.",
      });
      await createCheckoutSession("mayc");
      return;
    }

    // Standard price for non-holders
    await createCheckoutSession("standard");
  };

  const createCheckoutSession = async (tierParam: "standard" | "mayc") => {
    setIsCreatingCheckout(true);
    try {
      const data = await callFunction<{ url?: string }>("create-checkout", { tier: tierParam });
      if (!data?.url) throw new Error("No checkout URL returned");
      window.location.href = data.url;
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

  const isLoading = isChecking || isCreatingCheckout;

  return (
    <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 relative">
      <div className="max-w-4xl mx-auto text-center animate-fade-in">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-6 text-balance">
          Secure Your Digital Legacy
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto transition-colors duration-300">
          The true essence of decentralization is self custody so why would you leave the future of your hard earned assets to a court appointed probate process. Take control of the process. Ensure your loved ones receive full benefits of your empire. Create a digital will today.
        </p>
        <div className="flex flex-col items-center gap-4">
          <Button
            size="lg"
            onClick={handlePurchase}
            disabled={isLoading}
            className="w-full sm:w-auto h-auto whitespace-normal text-base sm:text-lg px-6 sm:px-10 py-4 sm:py-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                {isChecking ? "Verifying NFT Holdings..." : "Redirecting to Checkout..."}
              </span>
            ) : isAuthenticated && hasPurchased ? (
              "Go to Dashboard"
            ) : isAuthenticated && tier === "free" ? (
              <>
                <ShieldCheck className="mr-2 h-5 w-5" />
                Claim Your Free Digital Will
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-5 w-5" />
                Purchase your Digital Will
              </>
            )}
          </Button>

          {!hasPurchased && (
            <p className="text-sm text-muted-foreground max-w-md">
              <span className="font-semibold text-primary">BAYC holders:</span> Free access •{" "}
              <span className="font-semibold text-primary">StonkBroker holders:</span> Free access •{" "}
              <span className="font-semibold text-primary">The Temp Agency holders:</span> Free access •{" "}
              <span className="font-semibold text-primary">MAYC holders:</span> $59.95 •{" "}
              <span className="font-semibold">Standard:</span> $99.95
              <br />
              <span className="text-xs opacity-75">Supports delegated wallets</span>
            </p>
          )}
        </div>

        <div className="mt-8 flex justify-center">
          <Button
            size="lg"
            variant="secondary"
            onClick={handleInitiateClaim}
            className="w-full sm:w-auto h-auto whitespace-normal py-3 bg-accent hover:bg-accent/90 text-accent-foreground transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
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
