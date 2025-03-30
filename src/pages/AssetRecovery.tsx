
import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AssetRecoverySection from "@/components/AssetRecoverySection";

const AssetRecovery = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <div className="flex-1 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Asset Recovery Process
          </h2>
          
          <div className="space-y-8">
            <p className="text-center text-gray-600 max-w-2xl mx-auto mb-8">
              If you have been designated as a beneficiary for a digital will, you can use this page to recover the assets.
            </p>
            
            <AssetRecoverySection />
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default AssetRecovery;
