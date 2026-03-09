
import React, { useState } from "react";
import { useAuth } from "@/contexts/PrivyAuthContext";
import { Wallet, LayoutDashboard, FileCheck, LogOut, UserCircle, Menu, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";

const Header = ({ hideWalletConnect = false }: { hideWalletConnect?: boolean }) => {
  const { isAuthenticated, walletAddress, login, logout } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: "/vaults", label: "Vaults", icon: LayoutDashboard },
    { to: "/claims", label: "Claims", icon: FileCheck },
    { to: "/profile", label: "Profile", icon: UserCircle },
  ];

  return (
    <header className="w-full border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50 transition-all duration-300">
      <div className="py-3 px-6 flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 transition-opacity duration-200 hover:opacity-80">
          <Wallet className={`${isMobile ? "h-5 w-5" : "h-6 w-6"} text-primary transition-colors duration-200`} />
          <h1 className={`${isMobile ? "text-lg" : "text-xl"} font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent`}>
            DigitalWills.io
          </h1>
        </Link>

        {/* Desktop Nav */}
        {isAuthenticated && !isMobile && (
          <nav className="flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to}>
                <Button
                  variant={location.pathname === to ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2 transition-all duration-200"
                >
                  <Icon className="h-4 w-4" /> {label}
                </Button>
              </Link>
            ))}
          </nav>
        )}

        {/* Right side: Theme toggle + Auth + Mobile menu trigger */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isAuthenticated && !isMobile && (
            <>
              <span className="flex items-center gap-2 text-sm text-muted-foreground font-mono transition-colors duration-200">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {walletAddress?.substring(0, 6)}...{walletAddress?.substring((walletAddress?.length ?? 0) - 4)}
              </span>
              <Button variant="ghost" size="sm" onClick={logout} className="gap-1 text-muted-foreground transition-colors duration-200 hover:text-destructive">
                <LogOut className="h-4 w-4" />
                Disconnect
              </Button>
            </>
          )}
          {isAuthenticated && isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 transition-transform duration-200"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className={`h-5 w-5 absolute transition-all duration-300 ${mobileMenuOpen ? "rotate-90 opacity-0 scale-75" : "rotate-0 opacity-100 scale-100"}`} />
              <X className={`h-5 w-5 absolute transition-all duration-300 ${mobileMenuOpen ? "rotate-0 opacity-100 scale-100" : "-rotate-90 opacity-0 scale-75"}`} />
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          mobileMenuOpen && isAuthenticated && isMobile
            ? "max-h-80 opacity-100"
            : "max-h-0 opacity-0"
        }`}
      >
        <nav className="flex flex-col gap-1 px-4 pb-4">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} onClick={() => setMobileMenuOpen(false)}>
              <Button
                variant={location.pathname === to ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start gap-3 transition-all duration-200"
              >
                <Icon className="h-4 w-4" /> {label}
              </Button>
            </Link>
          ))}
          
          {/* Wallet info */}
          {walletAddress && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { logout(); setMobileMenuOpen(false); }}
            className="w-full justify-start gap-3 text-muted-foreground transition-colors duration-200 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Disconnect
          </Button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
