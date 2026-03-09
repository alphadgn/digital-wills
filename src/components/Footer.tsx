
import React from "react";
import { Wallet } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border py-12 px-6 transition-colors duration-300">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="h-6 w-6 text-accent" />
            <h2 className="text-xl font-bold text-foreground">DigitalWills.io</h2>
          </div>
          <p className="text-muted-foreground max-w-md">
            Secure your digital legacy with blockchain technology. 
            Ensure your digital assets pass on to your loved ones when the time comes.
          </p>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-4 text-foreground">Quick Links</h3>
          <ul className="space-y-2">
            <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors duration-200">How It Works</a></li>
            <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors duration-200">Features</a></li>
            <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors duration-200">FAQ</a></li>
            <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors duration-200">Contact</a></li>
          </ul>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-4 text-foreground">Legal</h3>
          <ul className="space-y-2">
            <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors duration-200">Terms of Service</a></li>
            <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors duration-200">Privacy Policy</a></li>
            <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors duration-200">Cookie Policy</a></li>
          </ul>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-border text-center text-muted-foreground text-sm">
        © {new Date().getFullYear()} DigitalWills.io. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
