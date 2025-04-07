
import React from "react";

// Define constants for background configuration
const BACKGROUND_OPACITY = 0.35; // Opacity value for background image
const FALLBACK_BG_COLOR = "rgba(59, 76, 222, 0.05)"; // Fallback background color

interface BackgroundProps {
  children: React.ReactNode;
}

const Background: React.FC<BackgroundProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background image */}
      <div 
        className="fixed inset-0 z-0 bg-center bg-cover bg-no-repeat"
        style={{
          backgroundImage: `url('/images/background.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: BACKGROUND_OPACITY,
          backgroundColor: FALLBACK_BG_COLOR,
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
