
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletProvider } from "./contexts/WalletContext";
import { AuthProvider } from "./contexts/PrivyAuthContext";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import AssetRecovery from "./pages/AssetRecovery";
import NotFound from "./pages/NotFound";
import SignIn from "./pages/SignIn";
import UserProfile from "./pages/UserProfile";
import VaultDashboard from "./pages/VaultDashboard";
import CreateVault from "./pages/CreateVault";
import ManageBeneficiaries from "./pages/ManageBeneficiaries";
import Claims from "./pages/Claims";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <WalletProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/asset-recovery" element={<AssetRecovery />} />
              <Route path="/sign-in" element={<SignIn />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/vaults" element={<VaultDashboard />} />
              <Route path="/create-vault" element={<CreateVault />} />
              <Route path="/vault/:vaultId/beneficiaries" element={<ManageBeneficiaries />} />
              <Route path="/claims" element={<Claims />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </WalletProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
