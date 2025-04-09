
import React from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { useNavigate } from "react-router-dom";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface RestartButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

const RestartButton: React.FC<RestartButtonProps> = ({ 
  variant = "outline", 
  size = "default",
  className = ""
}) => {
  const { resetProcess } = useWallet();
  const navigate = useNavigate();

  const handleRestart = () => {
    // Reset all stored information
    resetProcess();
    // Navigate back to the home page
    navigate('/');
    // Show confirmation toast
    toast.info("Application has been reset");
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleRestart}
      className={className}
    >
      <RotateCcw className="mr-2 h-4 w-4" />
      Restart
    </Button>
  );
};

export default RestartButton;
