
import React from 'react';
import CongratulationsScreen from './CongratulationsScreen';

const CompletionBanner = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <CongratulationsScreen />
    </div>
  );
};

export default CompletionBanner;
