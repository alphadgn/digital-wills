
import React from "react";
import { Progress as ProgressBar } from "@/components/ui/progress";

interface ProgressProps {
  progressPercentage: number;
}

const Progress: React.FC<ProgressProps> = ({ progressPercentage }) => {
  return (
    <div className="mb-6 max-w-md mx-auto">
      <ProgressBar value={progressPercentage} className="h-2" />
      <div className="flex justify-between mt-1 text-xs text-gray-500">
        <span>Start</span>
        <span>Complete</span>
      </div>
    </div>
  );
};

export default Progress;
