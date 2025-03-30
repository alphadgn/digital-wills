
import React from "react";
import { useWallet } from "@/contexts/WalletContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Check, Wallet } from "lucide-react";
import { Navigate } from "react-router-dom";

const Dashboard = () => {
  const { address, donorWallet, beneficiaryWallet, isMultisigCreated, resetProcess } = useWallet();

  // Redirect to home if not connected
  if (!address || !isMultisigCreated) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Your Digital Will Dashboard</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Will Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-green-500">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">Active</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Your digital will is active and secured by blockchain
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Donor Wallet</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-digitalwill-primary" />
                  <span className="font-mono text-sm">
                    {donorWallet?.substring(0, 8)}...{donorWallet?.substring(donorWallet.length - 6)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Assets in this wallet are protected by your will
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Beneficiary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-digitalwill-secondary" />
                  <span className="font-mono text-sm">
                    {beneficiaryWallet?.substring(0, 8)}...{beneficiaryWallet?.substring(beneficiaryWallet.length - 6)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  This wallet will receive your assets
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Will Details</CardTitle>
              <CardDescription>
                Information about your digital will agreement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Creation Date</h3>
                    <p>{new Date().toLocaleDateString()}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Last Updated</h3>
                    <p>{new Date().toLocaleDateString()}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Smart Contract Address</h3>
                    <p className="font-mono text-sm">0x8742eE7FaDc4F384fB6A8543f3c6d660D1F31040</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Multisig Wallet</h3>
                    <p className="font-mono text-sm">0x91C04346Ae1851b82651eD4825F99a56695Bd19A</p>
                  </div>
                </div>
                
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Protected Assets</h3>
                  <ul className="space-y-2">
                    <li className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span>Ethereum (ETH)</span>
                      <span className="font-medium">2.5 ETH</span>
                    </li>
                    <li className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span>ApeChain Token (APE)</span>
                      <span className="font-medium">1000 APE</span>
                    </li>
                    <li className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span>NFT Collection</span>
                      <span className="font-medium">3 NFTs</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Important Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-amber-800">
                Your digital will is legally binding through smart contract technology. The beneficiary 
                will only gain access to your assets under the conditions specified in your agreement.
              </p>
              <div className="mt-4">
                <Button variant="outline" onClick={resetProcess}>
                  Reset Process (Demo Only)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Dashboard;
