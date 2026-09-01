
import React, { useState } from "react";
import { useAuth } from "@/contexts/PrivyAuthContext";
import { Wallet, LayoutDashboard, FileCheck, LogOut, UserCircle, Info, Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";

const Header = ({ hideWalletConnect = false }: { hideWalletConnect?: boolean }) => {
  const { isAuthenticated, walletAddress, login, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: "/vaults", label: "Vaults", icon: LayoutDashboard },
    { to: "/claims", label: "Claims", icon: FileCheck },
    { to: "/profile", label: "Profile", icon: UserCircle },
  ];

  const shortAddress = walletAddress
    ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`
    : null;

  return (
    <header className="w-full border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50 transition-all duration-300">
      <div className="py-3 px-3 sm:px-6 flex justify-between items-center gap-2 relative">
        {/* Left cluster. "About" only has room once there are two buttons on the
            right; below sm it lives in the mobile menu instead. */}
        <div className="flex md:flex-1 justify-start items-center gap-1 shrink-0">
          <ThemeToggle />
          <Link to="/about" className="hidden sm:block">
            <Button
              variant={location.pathname === "/about" ? "secondary" : "ghost"}
              size="sm"
              className="transition-all duration-200"
            >
              About
            </Button>
          </Link>
        </div>

        {/* Logo. Absolutely centred only from md up, where nothing can collide
            with it; in the flow below that so it can shrink instead of overlap. */}
        <Link
          to="/"
          className="flex items-center gap-2 min-w-0 transition-opacity duration-200 hover:opacity-80 md:absolute md:left-1/2 md:-translate-x-1/2"
        >
          <Wallet className="h-5 w-5 md:h-6 md:w-6 shrink-0 text-primary transition-colors duration-200" />
          <h1 className="text-base sm:text-lg md:text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent truncate">
            DigitalWills.io
          </h1>
        </Link>

        {/* Desktop Nav */}
        {isAuthenticated && (
          <nav className="hidden md:flex items-center gap-1">
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

        {/* Right side: Auth + Mobile menu trigger */}
        <div className="flex md:flex-1 items-center justify-end gap-2 shrink-0">
          {!isAuthenticated && (
            <Button variant="outline" size="sm" onClick={login} className="gap-2 transition-all duration-200">
              <UserCircle className="h-4 w-4" />
              Sign In
            </Button>
          )}
          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-2">
              <span className="flex items-center gap-2 text-sm text-muted-foreground font-mono transition-colors duration-200">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {shortAddress}
              </span>
              <Button variant="ghost" size="sm" onClick={logout} className="gap-1 text-muted-foreground transition-colors duration-200 hover:text-destructive">
                <LogOut className="h-4 w-4" />
                Disconnect
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
            className="relative h-9 w-9 shrink-0 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className={`h-5 w-5 absolute transition-all duration-300 ${mobileMenuOpen ? "rotate-90 opacity-0 scale-75" : "rotate-0 opacity-100 scale-100"}`} />
            <X className={`h-5 w-5 absolute transition-all duration-300 ${mobileMenuOpen ? "rotate-0 opacity-100 scale-100" : "-rotate-90 opacity-0 scale-75"}`} />
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="flex flex-col gap-1 px-3 pb-4">
          <Link to="/about" onClick={() => setMobileMenuOpen(false)}>
            <Button
              variant={location.pathname === "/about" ? "secondary" : "ghost"}
              size="sm"
              className="w-full justify-start gap-3 transition-all duration-200"
            >
              <Info className="h-4 w-4" /> About
            </Button>
          </Link>

          {isAuthenticated &&
            navLinks.map(({ to, label, icon: Icon }) => (
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
          {isAuthenticated && shortAddress && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {shortAddress}
            </div>
          )}

          {isAuthenticated && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { logout(); setMobileMenuOpen(false); }}
              className="w-full justify-start gap-3 text-muted-foreground transition-colors duration-200 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Disconnect
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
