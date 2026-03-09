import React, { useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Background from "@/components/DigitalWill/Background";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/PrivyAuthContext";
import { useNavigate } from "react-router-dom";

const PaymentSuccess = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  return (
    <Background>
      <Header />
      <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md mx-auto text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <p className="text-muted-foreground">
              Your Digital Will purchase is complete. Sign in now to start creating your digital will, set up your assets, and designate your beneficiaries.
            </p>
            <Button onClick={login} size="lg" className="w-full">
              Sign In to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </Background>
  );
};

export default PaymentSuccess;
