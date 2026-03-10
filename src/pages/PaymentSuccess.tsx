import React, { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Background from "@/components/DigitalWill/Background";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/PrivyAuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "wagmi";

const PaymentSuccess = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { address } = useAccount();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
      return;
    }

    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      setIsVerifying(false);
      return;
    }

    const verify = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: {
            session_id: sessionId,
            wallet_address: address || null,
          },
        });
        if (!error && data?.success) {
          setVerified(true);
        }
      } catch (e) {
        console.error("Verification failed:", e);
      } finally {
        setIsVerifying(false);
      }
    };

    verify();
  }, [isAuthenticated, navigate, searchParams, address]);

  return (
    <Background>
      <Header />
      <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md mx-auto text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              {isVerifying ? (
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
              ) : (
                <CheckCircle className="h-16 w-16 text-green-500" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {isVerifying ? "Verifying Payment..." : "Payment Successful!"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <p className="text-muted-foreground">
              {isVerifying
                ? "Please wait while we confirm your payment..."
                : "Your Digital Will purchase is complete. Sign in now to start creating your digital will, set up your assets, and designate your beneficiaries."}
            </p>
            {!isVerifying && (
              <Button onClick={login} size="lg" className="w-full">
                Sign In to Continue
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </Background>
  );
};

export default PaymentSuccess;
