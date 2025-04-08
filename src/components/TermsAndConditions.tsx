
import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useIsMobile } from "@/hooks/use-mobile";

interface TermsAndConditionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
}

const TermsAndConditions: React.FC<TermsAndConditionsProps> = ({
  open,
  onOpenChange,
  onAccept
}) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = React.useState(false);
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  // Reset scroll state when dialog opens
  useEffect(() => {
    if (open) {
      setHasScrolledToBottom(false);
      setAcceptedTerms(false);
      console.log("🔄 Terms dialog opened, reset states");
    }
  }, [open]);
  
  // Define scroll threshold as a constant rather than magic number
  const SCROLL_BOTTOM_THRESHOLD_PX = 30;
  
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    
    // Calculate how close we are to the bottom
    const distanceToBottom = element.scrollHeight - element.clientHeight - element.scrollTop;
    
    console.log(`📜 Scroll metrics - Distance to bottom: ${distanceToBottom.toFixed(2)}px`);
    
    // Check if we're close enough to the bottom based on threshold
    const isNearBottom = distanceToBottom <= SCROLL_BOTTOM_THRESHOLD_PX;
    
    if (isNearBottom && !hasScrolledToBottom) {
      console.log("🎯 Bottom threshold reached! Enabling checkbox");
      setHasScrolledToBottom(true);
    }
  };
  
  // Check if content requires scrolling at all
  useEffect(() => {
    if (open && scrollAreaRef.current) {
      const element = scrollAreaRef.current;
      const contentFitsViewport = element.scrollHeight <= element.clientHeight;
      
      console.log(`📏 Content metrics - ScrollHeight: ${element.scrollHeight}, ClientHeight: ${element.clientHeight}`);
      console.log(`${contentFitsViewport ? "📱 Content fits without scrolling" : "📜 Content requires scrolling"}`);
      
      if (contentFitsViewport) {
        console.log("✅ Content fits viewport, automatically enabling checkbox");
        setHasScrolledToBottom(true);
      }
    }
  }, [open]);
  
  const handleAccept = () => {
    console.log("✅ Terms accepted, calling onAccept callback");
    onAccept();
    onOpenChange(false);
  };
  
  const handleCheckboxChange = (checked: boolean) => {
    console.log(`🔘 Checkbox toggled: ${checked}`);
    setAcceptedTerms(checked);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] md:max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Terms & Conditions</DialogTitle>
          <DialogDescription>
            Please scroll to the bottom to review the terms and conditions.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea 
          className="flex-1 h-[300px] sm:h-[350px] md:h-[400px] pr-4" 
          onScroll={handleScroll}
          ref={scrollAreaRef}
          data-testid="terms-scroll-area"
        >
          <div className="space-y-4 text-sm">
            <h3 className="font-semibold text-base">DIGITAL WILL PLATFORM TERMS & CONDITIONS</h3>
            
            <p>By using this Digital Will Platform, you agree to the following terms and conditions:</p>
            
            <h4 className="font-semibold mt-4">1. DEFINITIONS</h4>
            <p>
              "Platform" refers to the Digital Will decentralized application.<br />
              "Digital Will" refers to the digital agreement created through this platform.<br />
              "Donor" refers to the individual who creates the Digital Will.<br />
              "Beneficiary" refers to the designated recipient(s) of digital assets.
            </p>
            
            <h4 className="font-semibold mt-4">2. ACCOUNT CREATION AND SECURITY</h4>
            <p>
              2.1 You must connect a compatible cryptocurrency wallet to use the Platform.<br />
              2.2 You are responsible for maintaining the security of your wallet and private keys.<br />
              2.3 Each donor wallet can only be used to create ONE Digital Will.
            </p>
            
            <h4 className="font-semibold mt-4">3. DIGITAL WILL CREATION</h4>
            <p>
              3.1 Each Digital Will is separate and distinct.<br />
              3.2 Donor wallets can only be used once in the system.<br />
              3.3 The Platform uses blockchain technology to create a trustless agreement.<br />
              3.4 The Digital Will is legally binding to the extent permitted by applicable law.
            </p>
            
            <h4 className="font-semibold mt-4">4. MULTISIGNATURE SECURITY</h4>
            <p>
              4.1 The Platform uses multisignature technology to secure digital assets.<br />
              4.2 All transactions require authorization as specified in your Digital Will.
            </p>
            
            <h4 className="font-semibold mt-4">5. LIABILITY</h4>
            <p>
              5.1 The Platform does not guarantee the legal validity of Digital Wills in all jurisdictions.<br />
              5.2 The Platform is not responsible for any loss of digital assets due to user error.<br />
              5.3 Users are advised to consult legal professionals regarding estate planning.
            </p>
            
            <h4 className="font-semibold mt-4">6. PRIVACY AND DATA</h4>
            <p>
              6.1 The Platform operates on blockchain technology, which is inherently transparent.<br />
              6.2 Personal information beyond wallet addresses is not stored on the blockchain.
            </p>
            
            <h4 className="font-semibold mt-4">7. MODIFICATIONS</h4>
            <p>
              7.1 These terms may be updated periodically.<br />
              7.2 Users will be notified of significant changes to these terms.
            </p>
            
            <h4 className="font-semibold mt-4">8. GOVERNING LAW</h4>
            <p>
              8.1 These terms shall be governed by applicable laws.<br />
              8.2 Any disputes shall be resolved through arbitration.
            </p>
            
            <h4 className="font-semibold mt-4">9. TERMINATION</h4>
            <p>
              9.1 Digital Wills created on the Platform are permanent blockchain records.<br />
              9.2 Access to the Platform may be terminated at any time without notice.
            </p>
            
            <p className="mt-8">
              By using this Platform, you acknowledge that you have read, understood, and agree to be bound by these terms and conditions.
            </p>
            
            {/* Add a div at the bottom to ensure scrolling reaches a clear "bottom" point */}
            <div id="terms-end-marker" className="h-4"></div>
          </div>
        </ScrollArea>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2 items-center pt-4">
          <div className="flex items-center space-x-2 mb-4 sm:mb-0">
            <Checkbox 
              id="terms" 
              checked={acceptedTerms}
              onCheckedChange={handleCheckboxChange}
              disabled={!hasScrolledToBottom}
              className={!hasScrolledToBottom ? "cursor-not-allowed opacity-50" : ""}
              data-testid="terms-checkbox"
            />
            <label 
              htmlFor="terms" 
              className={`text-sm ${!hasScrolledToBottom ? "text-gray-400" : "text-gray-700"}`}
            >
              I have read and agree to the terms and conditions
            </label>
          </div>
          
          {!hasScrolledToBottom && (
            <p className="text-amber-600 text-xs">
              Please scroll to the bottom to accept the terms
            </p>
          )}
          
          <Button 
            onClick={handleAccept} 
            disabled={!acceptedTerms}
            className="w-full sm:w-auto"
            data-testid="accept-terms-button"
          >
            Accept Terms
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TermsAndConditions;
