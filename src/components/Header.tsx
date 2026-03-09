
import React from "react";
import { useAuth } from "@/contexts/PrivyAuthContext";
import { Wallet, LayoutDashboard, FileCheck, LogOut } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Header = ({ hideWalletConnect = false }: { hideWalletConnect?: boolean }) => {
  const { isAuthenticated, walletAddress, login, logout } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();

  const navLinks = [
    { to: "/vaults", label: "Vaults", icon: LayoutDashboard },
    { to: "/claims", label: "Claims", icon: FileCheck },
  ];

  return (
    <header className="w-full py-3 px-6 flex justify-center items-center border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2">
        <Wallet className={`${isMobile ? "h-5 w-5" : "h-6 w-6"} text-primary`} />
        <h1 className={`${isMobile ? "text-lg" : "text-xl"} font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent`}>
          DigitalWills.io
        </h1>
      </Link>

      {/* Nav */}
      {isAuthenticated && !isMobile && (
        <nav className="flex items-center gap-1">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to}>
              <Button
                variant={location.pathname === to ? "secondary" : "ghost"}
                size="sm"
                className="gap-2"
              >
                <Icon className="h-4 w-4" /> {label}
              </Button>
            </Link>
          ))}
        </nav>
      )}

      {/* Auth */}
      {!hideWalletConnect && (
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <span className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground font-mono">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {walletAddress?.substring(0, 6)}...{walletAddress?.substring((walletAddress?.length ?? 0) - 4)}
              </span>
              <Button variant="ghost" size="sm" onClick={logout} className="gap-1 text-muted-foreground">
                <LogOut className="h-4 w-4" />
                {!isMobile && "Disconnect"}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={login} className="gap-2">
              <Wallet className="h-4 w-4" /> Connect Wallet
            </Button>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
