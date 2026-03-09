import React, { createContext, useContext, ReactNode } from "react";

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || "";

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

const noopLogin = () => {
  console.warn("Privy is not configured. Set VITE_PRIVY_APP_ID to enable wallet auth.");
};
const noopLogout = async () => {};

const fallbackValue: AuthContextType = {
  isAuthenticated: false,
  isLoading: false,
  walletAddress: null,
  privyUserId: null,
  login: noopLogin,
  logout: noopLogout,
  isPrivyConfigured: false,
};

function FallbackProvider({ children }: { children: ReactNode }) {
  return <AuthContext.Provider value={fallbackValue}>{children}</AuthContext.Provider>;
}

// Lazy-load Privy only when configured
let PrivyInner: React.ComponentType<{ children: ReactNode }> | null = null;
let PrivyWrapper: React.ComponentType<{ children: ReactNode }> | null = null;

if (PRIVY_APP_ID && PRIVY_APP_ID.startsWith("cl")) {
  // Dynamic imports would be ideal but for simplicity we do conditional require
  const privyModule = await import("@privy-io/react-auth");
  const { PrivyProvider: PP, usePrivy, useWallets } = privyModule;

  PrivyInner = function AuthInner({ children }: { children: ReactNode }) {
    const { ready, authenticated, user, login, logout } = usePrivy();
    const { wallets } = useWallets();
    const walletAddress = wallets[0]?.address ?? user?.wallet?.address ?? null;

    const value: AuthContextType = {
      isAuthenticated: authenticated,
      isLoading: !ready,
      walletAddress,
      privyUserId: user?.id ?? null,
      login,
      logout,
      isPrivyConfigured: true,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  };

  PrivyWrapper = function PrivyWrap({ children }: { children: ReactNode }) {
    return (
      <PP
        appId={PRIVY_APP_ID}
        config={{
          appearance: { theme: "light", accentColor: "#3B4CDE" },
          loginMethods: ["wallet"],
          embeddedWallets: { createOnLogin: "users-without-wallets" },
        }}
      >
        <PrivyInner!>{children}</PrivyInner!>
      </PP>
    );
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (PrivyWrapper) {
    return <PrivyWrapper>{children}</PrivyWrapper>;
  }
  return <FallbackProvider>{children}</FallbackProvider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
