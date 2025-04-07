
import React from "react";
import { Progress as ProgressBar } from "@/components/ui/progress";

interface ProgressProps {
  progressPercentage: number;
  currentStep: string;
}

const Progress: React.FC<ProgressProps> = ({ progressPercentage, currentStep }) => {
  return (
    <div className="mb-6 max-w-md mx-auto">
      <ProgressBar value={progressPercentage} className="h-2" />
      <div className="flex justify-between mt-1 text-xs">
        <span className="text-gray-500">Start</span>
        <span className="text-center font-medium text-digitalwill-primary">{currentStep}</span>
        <span className="text-gray-500">Complete</span>
      </div>
    </div>
  );
};

export default Progress;
