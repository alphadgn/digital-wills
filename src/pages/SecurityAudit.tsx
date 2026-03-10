import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Background from "@/components/DigitalWill/Background";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, ShieldX, Lock, Eye, Zap, Database, Key, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/PrivyAuthContext";
import { Navigate } from "react-router-dom";

interface AuditItem {
  label: string;
  status: "pass" | "warn" | "fail";
  description: string;
  icon: React.ReactNode;
}

const StatusBadge = ({ status }: { status: "pass" | "warn" | "fail" }) => {
  const config = {
    pass: { label: "Passed", variant: "default" as const, className: "bg-emerald-500/90 hover:bg-emerald-500 text-white" },
    warn: { label: "Warning", variant: "secondary" as const, className: "bg-amber-500/90 hover:bg-amber-500 text-white" },
    fail: { label: "Failed", variant: "destructive" as const, className: "" },
  };
  const c = config[status];
  return <Badge variant={c.variant} className={c.className}>{c.label}</Badge>;
};

const StatusIcon = ({ status }: { status: "pass" | "warn" | "fail" }) => {
  if (status === "pass") return <ShieldCheck className="h-5 w-5 text-emerald-500" />;
  if (status === "warn") return <ShieldAlert className="h-5 w-5 text-amber-500" />;
  return <ShieldX className="h-5 w-5 text-destructive" />;
};

const reentrancyChecks: AuditItem[] = [
  { label: "Checks-Effects-Interactions Pattern", status: "pass", description: "All external calls follow CEI pattern to prevent re-entrancy attacks.", icon: <Lock className="h-4 w-4" /> },
  { label: "ReentrancyGuard Modifier", status: "pass", description: "OpenZeppelin ReentrancyGuard applied to all state-changing functions.", icon: <ShieldCheck className="h-4 w-4" /> },
  { label: "Cross-function Re-entrancy", status: "warn", description: "Multi-function re-entrancy vectors identified — recommend mutex lock review.", icon: <Zap className="h-4 w-4" /> },
  { label: "Read-only Re-entrancy", status: "pass", description: "View functions do not rely on intermediate state during external calls.", icon: <Eye className="h-4 w-4" /> },
];

const oracleChecks: AuditItem[] = [
  { label: "Death Oracle Data Source", status: "warn", description: "Single oracle source configured. Recommend adding Chainlink or multi-sig oracle for redundancy.", icon: <Database className="h-4 w-4" /> },
  { label: "Oracle Update Frequency", status: "pass", description: "Heartbeat interval set to 24 hours with staleness threshold.", icon: <Zap className="h-4 w-4" /> },
  { label: "Oracle Manipulation Resistance", status: "warn", description: "Flash loan attack surface exists if oracle reads from single DEX pool.", icon: <ShieldAlert className="h-4 w-4" /> },
  { label: "Fallback Oracle", status: "fail", description: "No fallback oracle configured. Critical — assets could be locked if primary oracle fails.", icon: <ShieldX className="h-4 w-4" /> },
];

const accessControlChecks: AuditItem[] = [
  { label: "Owner Privileges", status: "pass", description: "Owner role restricted to vault creator with no admin override.", icon: <Key className="h-4 w-4" /> },
  { label: "Beneficiary Authorization", status: "pass", description: "Beneficiaries can only claim after oracle confirmation and timelock.", icon: <Users className="h-4 w-4" /> },
  { label: "Multisig Requirement", status: "pass", description: "Emergency functions require 2-of-3 multisig approval.", icon: <Lock className="h-4 w-4" /> },
  { label: "Upgrade Authority", status: "warn", description: "UUPS proxy upgrade restricted to owner — recommend timelock on upgrades.", icon: <ShieldAlert className="h-4 w-4" /> },
];

const AuditSection = ({ title, items }: { title: string; items: AuditItem[] }) => {
  const passCount = items.filter(i => i.status === "pass").length;
  const score = Math.round((passCount / items.length) * 100);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Badge variant="outline" className="font-mono">{score}% passing</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <StatusIcon status={item.status} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {item.icon}
                <span className="font-medium text-sm">{item.label}</span>
                <StatusBadge status={item.status} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

const SecurityAudit = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  const allItems = [...reentrancyChecks, ...oracleChecks, ...accessControlChecks];
  const totalPass = allItems.filter(i => i.status === "pass").length;
  const totalWarn = allItems.filter(i => i.status === "warn").length;
  const totalFail = allItems.filter(i => i.status === "fail").length;
  const overallScore = Math.round((totalPass / allItems.length) * 100);

  return (
    <Background>
      <Header />
      <main className="flex-1 py-8 px-4 md:px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Security Audit Checklist</h1>
            <p className="text-muted-foreground">Smart contract security verification for your vault protocol</p>
          </div>

          {/* Summary */}
          <Card className="border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className={`h-16 w-16 rounded-full flex items-center justify-center text-xl font-bold ${overallScore >= 80 ? "bg-emerald-500/10 text-emerald-500" : overallScore >= 50 ? "bg-amber-500/10 text-amber-500" : "bg-destructive/10 text-destructive"}`}>
                    {overallScore}%
                  </div>
                  <div>
                    <p className="font-semibold text-lg">Overall Security Score</p>
                    <p className="text-sm text-muted-foreground">{allItems.length} checks evaluated</p>
                  </div>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="flex items-center gap-1"><ShieldCheck className="h-4 w-4 text-emerald-500" /> {totalPass} passed</span>
                  <span className="flex items-center gap-1"><ShieldAlert className="h-4 w-4 text-amber-500" /> {totalWarn} warnings</span>
                  <span className="flex items-center gap-1"><ShieldX className="h-4 w-4 text-destructive" /> {totalFail} failed</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <AuditSection title="Re-entrancy Protection" items={reentrancyChecks} />
          <AuditSection title="Oracle Configuration" items={oracleChecks} />
          <AuditSection title="Access Control Verification" items={accessControlChecks} />
        </div>
      </main>
      <Footer />
    </Background>
  );
};

export default SecurityAudit;
