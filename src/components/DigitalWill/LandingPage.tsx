
import React from "react";
import { Link } from "react-router-dom";
import Hero from "@/components/Hero";
import Features from "@/components/Features";

const LandingPage: React.FC = () => {
  return (
    <>
      <Hero />
      <Features />
      <div className="text-center py-10">
        <p className="text-gray-600 mb-4">Are you a beneficiary looking to recover assets?</p>
        <Link 
          to="/asset-recovery" 
          className="text-digitalwill-primary hover:text-digitalwill-primary/80 underline"
        >
          Go to Asset Recovery
        </Link>
      </div>
    </>
  );
};

export default LandingPage;
