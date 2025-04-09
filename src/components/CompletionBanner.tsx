
import React from 'react';
import CongratulationsScreen from './CongratulationsScreen';
import { useWallet } from '@/contexts/WalletContext';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Check, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CompletionBanner = () => {
  const { allClaimsProcessed, resetProcess } = useWallet();
  const navigate = useNavigate();

  const handleClose = () => {
    resetProcess();
    navigate('/');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      {allClaimsProcessed ? (
        <Card className="w-full max-w-md mx-auto bg-white">
          <CardContent className="p-6 text-center space-y-4">
            <div className="mx-auto rounded-full bg-green-100 w-20 h-20 flex items-center justify-center mb-4">
              <Award className="h-10 w-10 text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800">All Claims Processed</h2>
            
            <p className="text-gray-600">
              All claims have been honored in this matter. Thank you for using our services.
            </p>
            
            <div className="pt-4">
              <Button onClick={handleClose} className="w-full">
                <Check className="mr-2 h-4 w-4" />
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <CongratulationsScreen />
      )}
    </div>
  );
};

export default CompletionBanner;
