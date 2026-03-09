import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Background from "@/components/DigitalWill/Background";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/PrivyAuthContext";

const SignIn = () => {
  const { login, isAuthenticated, isLoading, isPrivyConfigured } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate("/profile");
    }
  }, [isAuthenticated, navigate]);

  return (
    <Background>
      <Header />

      <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Connect your wallet to sign in or create an account
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Wallet className="h-8 w-8 text-muted-foreground" />
            </div>

            {!isPrivyConfigured && (
              <p className="text-sm text-destructive text-center">
                Wallet authentication is not configured. Please set VITE_PRIVY_APP_ID.
              </p>
            )}

            <Button
              onClick={login}
              disabled={isLoading || !isPrivyConfigured}
              className="w-full"
              size="lg"
            >
              {isLoading ? "Loading..." : "Connect Wallet to Sign In"}
            </Button>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Button
                variant="link"
                className="p-0 h-auto text-primary"
                onClick={() => navigate("/")}
              >
                Sign Up
              </Button>
            </p>
          </CardFooter>
        </Card>
      </div>

      <Footer />
    </Background>
  );
};

export default SignIn;
