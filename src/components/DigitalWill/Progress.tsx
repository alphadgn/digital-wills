
import React from "react";
import { Progress as ProgressBar } from "@/components/ui/progress";

interface ProgressProps {
  progressPercentage: number;
  currentStep: string;
}

const Progress: React.FC<ProgressProps> = ({ progressPercentage, currentStep }) => {
  console.log(`📊 Rendering progress bar with ${progressPercentage}% completion`);
  
  return (
    <div className="mb-6 max-w-md mx-auto">
      <ProgressBar 
        value={progressPercentage} 
        className="h-2 bg-blue-600" 
        indicatorClassName="bg-yellow-400" 
      />
      <div className="flex justify-between items-center gap-2 mt-1 text-[11px] sm:text-xs">
        <span className="text-gray-500 shrink-0">Start</span>
        <span className="text-center font-medium text-digitalwill-primary truncate">{currentStep}</span>
        <span className="text-gray-500 shrink-0">Complete</span>
      </div>
    </div>
  );
};

export default Progress;
