
import React from "react";
import Hero from "@/components/Hero";
import Features from "@/components/Features";

const LandingPage: React.FC = () => {
  return (
    <div className="flex-1">
      <Hero />
      <Features />
    </div>
  );
};

export default LandingPage;
