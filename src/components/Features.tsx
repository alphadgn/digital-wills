
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Link, Check } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: <Wallet className="h-10 w-10 text-primary" />,
      title: "Digital Asset Protection",
      description: "Securely store and transfer digital assets to your beneficiaries using blockchain technology"
    },
    {
      icon: <Link className="h-10 w-10 text-primary" />,
      title: "Multi-signature Security",
      description: "Create multisig wallets that ensure assets are only transferred under specified conditions"
    },
    {
      icon: <Check className="h-10 w-10 text-primary" />,
      title: "Easy Authentication",
      description: "Simple verification process to ensure only authorized individuals can access your assets TRUSTLESSLY"
    }
  ];

  return (
    <section className="py-16 px-6 bg-muted/50 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12 text-foreground transition-colors duration-300">Why Choose Digital Wills</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="border-none shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader>
                <div className="mb-4 transition-transform duration-300 hover:scale-110">{feature.icon}</div>
                <CardTitle className="transition-colors duration-200">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
