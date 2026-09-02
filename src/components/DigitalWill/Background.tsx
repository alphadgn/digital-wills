
import React from "react";
import backgroundImage from "@/assets/background.jpg";

// Define constants for background configuration
const BACKGROUND_OPACITY = 0.18; // Opacity value for background image

interface BackgroundProps {
  children: React.ReactNode;
}

const Background: React.FC<BackgroundProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col relative transition-colors duration-300 bg-background">
      {/* Background image */}
      <div 
        className="fixed inset-0 z-0 bg-center bg-cover bg-no-repeat transition-opacity duration-500 pointer-events-none"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          opacity: BACKGROUND_OPACITY,
        }}
      />

      
      {/* Content container */}
      <div className="relative z-10 flex flex-col flex-1">
        {children}
      </div>
    </div>
  );
};

export default Background;
