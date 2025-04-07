
import React from "react";
import StepIndicator, { STEP } from "./StepIndicator";

interface ContentContainerProps {
  currentStep?: number;
  progressPercentage?: number;
}

const ContentContainer: React.FC<ContentContainerProps> = ({
  currentStep = STEP.DONOR_WALLET,
  progressPercentage = 0,
}) => {
  return (
    <div className="flex-1 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8">
          Digital Will Creation
        </h2>
        
        <div className="space-y-8">
          <StepIndicator 
            currentStep={currentStep} 
            donorWallet={null}
            isMultisigCreated={false}
            beneficiaryWallet={null}
          />
          
          <div className="mt-8 p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-center mb-6">Application Reset</h3>
            <p className="text-center">
              All application logic has been removed as requested.
              You can now build the functionality from scratch.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentContainer;
