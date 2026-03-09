
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import { WalletProvider } from "./contexts/WalletContext";
import { AuthProvider } from "./contexts/PrivyAuthContext";
import { wagmiConfig } from "./config/wagmi";
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
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <WagmiProvider config={wagmiConfig}>
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
                <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
                <Route path="/vaults" element={<ProtectedRoute><VaultDashboard /></ProtectedRoute>} />
                <Route path="/create-vault" element={<ProtectedRoute><CreateVault /></ProtectedRoute>} />
                <Route path="/vault/:vaultId/beneficiaries" element={<ProtectedRoute><ManageBeneficiaries /></ProtectedRoute>} />
                <Route path="/claims" element={<ProtectedRoute><Claims /></ProtectedRoute>} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </WalletProvider>
        </AuthProvider>
      </TooltipProvider>
    </WagmiProvider>
  </QueryClientProvider>
);

export default App;
