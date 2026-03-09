import React, { createContext, useContext, ReactNode } from "react";
import { PrivyProvider, usePrivy, useWallets } from "@privy-io/react-auth";

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || "cmmim4tyh01d90dl8bz0khyjt";
// Privy app IDs start with "cl" or "cm"
const isPrivyReady = Boolean(PRIVY_APP_ID && /^c[lm][a-z0-9]{10,}$/i.test(PRIVY_APP_ID));

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  walletAddress: string | null;
  email: string | null;
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
  email: null,
  privyUserId: null,
  login: () => console.warn("Privy app ID is not configured or invalid. Set a valid VITE_PRIVY_APP_ID."),
  logout: async () => {},
  isPrivyConfigured: false,
};

function AuthInner({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const walletAddress = wallets[0]?.address ?? user?.wallet?.address ?? null;
  const email = user?.email?.address ?? null;

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: authenticated,
        isLoading: !ready,
        walletAddress,
        email,
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

class PrivyErrorBoundary extends React.Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.warn("[PrivyAuth] Failed to initialize Privy:", error.message);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!isPrivyReady) {
    return (
      <AuthContext.Provider value={fallbackValue}>
        {children}
      </AuthContext.Provider>
    );
  }

  const fallbackUI = (
    <AuthContext.Provider value={fallbackValue}>
      {children}
    </AuthContext.Provider>
  );

  return (
    <PrivyErrorBoundary fallback={fallbackUI}>
      <PrivyProvider
        appId={PRIVY_APP_ID}
        config={{
          appearance: { theme: "light", accentColor: "#3B4CDE" },
          loginMethods: ["wallet", "email"],
          embeddedWallets: { createOnLogin: "users-without-wallets" },
        }}
      >
        <AuthInner>{children}</AuthInner>
      </PrivyProvider>
    </PrivyErrorBoundary>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
