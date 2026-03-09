import React, { createContext, useContext, ReactNode } from "react";
import { PrivyProvider, usePrivy, useWallets } from "@privy-io/react-auth";

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || "";
const isPrivyReady = Boolean(PRIVY_APP_ID && PRIVY_APP_ID.startsWith("cl"));

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  walletAddress: string | null;
  privyUserId: string | null;
  login: () => void;
  logout: () => Promise<void>;
  isPrivyConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const fallbackValue: AuthContextType = {
  isAuthenticated: false,
  isLoading: false,
  walletAddress: null,
  privyUserId: null,
  login: () => console.warn("Set VITE_PRIVY_APP_ID to enable wallet auth."),
  logout: async () => {},
  isPrivyConfigured: false,
};

function AuthInner({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const walletAddress = wallets[0]?.address ?? user?.wallet?.address ?? null;

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: authenticated,
        isLoading: !ready,
        walletAddress,
        privyUserId: user?.id ?? null,
        login,
        logout,
        isPrivyConfigured: true,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!isPrivyReady) {
    return (
      <AuthContext.Provider value={fallbackValue}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: { theme: "light", accentColor: "#3B4CDE" },
        loginMethods: ["wallet"],
        embeddedWallets: { createOnLogin: "users-without-wallets" },
      }}
    >
      <AuthInner>{children}</AuthInner>
    </PrivyProvider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
