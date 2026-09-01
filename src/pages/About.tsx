import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

/**
 * About Digital Wills
 *
 * Plain, document-style layout on purpose. This page explains custody and
 * inheritance rules, so it reads like a policy document rather than a pitch:
 * no gradients, no motion, no marketing chrome.
 */

const parties = [
  {
    role: "You — the Donor",
    detail: "You own the assets and control your Digital Will while alive.",
  },
  {
    role: "Your Beneficiary",
    detail: "The person you designate to receive the assets after your death.",
  },
  {
    role: "The Oracle Authority",
    detail:
      "An independent verification system responsible for confirming death through approved sources.",
  },
];

const pillars = [
  "Smart contracts enforce the rules.",
  "Multi-signature authorization protects the vault.",
  "Death verification determines eligibility.",
  "Blockchain records provide transparency.",
  "The donor retains control while alive.",
];

const Section = ({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) => (
  <section id={id} className="border-t border-border pt-10 scroll-mt-24">
    <h2 className="text-2xl font-semibold text-foreground mb-5">{title}</h2>
    <div className="space-y-4 text-base leading-relaxed text-muted-foreground">
      {children}
    </div>
  </section>
);

const About = () => {
  const { hash } = useLocation();

  // Footer links deep-link into sections; react-router does not scroll to a hash on its own.
  useEffect(() => {
    const target = hash ? document.querySelector(hash) : null;
    if (target) {
      target.scrollIntoView({ block: "start" });
    } else {
      window.scrollTo(0, 0);
    }
  }, [hash]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-14 px-6">
        <article className="max-w-3xl mx-auto space-y-12">
          {/* Masthead */}
          <header className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              About Digital Wills
            </h1>
            <p className="text-lg text-foreground">
              Your Digital Assets. Your Legacy. Your Control.
            </p>
            <div className="space-y-4 text-base leading-relaxed text-muted-foreground">
              <p>
                Digital Wills is a trustless digital inheritance protocol designed to help
                ensure your digital assets reach the people you choose when you are no
                longer here.
              </p>
              <p>
                Instead of placing your assets in the hands of a centralized company or
                custodian, Digital Wills uses Ethereum smart contracts, multi-signature
                vaults, and independent death verification to enforce your inheritance
                instructions on-chain.
              </p>
            </div>
          </header>

          <Section id="how-it-works" title="How It Works">
            <p className="font-medium text-foreground">
              While you are alive, you remain in control.
            </p>
            <p>
              Create your Digital Will, designate a beneficiary, and place supported
              digital assets—including ETH, ERC-20 tokens, NFTs, and ERC-1155 assets—into
              a secure 2-of-3 multi-signature vault.
            </p>
            <p>The vault is governed by three parties:</p>

            <dl className="grid gap-px bg-border border border-border rounded-md overflow-hidden not-prose">
              {parties.map(({ role, detail }) => (
                <div key={role} className="bg-card p-5">
                  <dt className="font-semibold text-foreground">{role}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {detail}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="font-medium text-foreground">
              Your beneficiary cannot simply access the vault.
            </p>
            <p>
              If a beneficiary initiates an inheritance claim, the vault is frozen and the
              verification process begins. You are notified through your selected email or
              SMS contact method, giving you the ability to cancel an improper claim while
              you are alive.
            </p>
            <p className="font-medium text-foreground">
              If death cannot be verified, the assets remain locked.
            </p>
            <p>
              If death is verified, the oracle records its signed decision on-chain. Only
              after the required authorization conditions are satisfied can the smart
              contracts release the assets to the beneficiary.
            </p>
          </Section>

          <Section id="security" title="Built Around Control and Security">
            <p>Digital Wills is designed around a simple principle:</p>
            <p className="border-l-2 border-foreground/30 pl-4 text-lg font-semibold text-foreground">
              No verified death. No inheritance release.
            </p>
            <p>
              The platform does not take custody of your assets. Sensitive identity
              information remains off-chain, and blockchain records provide a transparent
              and auditable history of important vault and inheritance events.
            </p>
            <p>
              While alive, donors can continue managing their Digital Will, including
              changing their designated beneficiary.
            </p>
          </Section>

          <Section id="trustless" title="Trustless Digital Inheritance">
            <p>
              Traditional inheritance often depends on institutions, paperwork,
              intermediaries, and manual asset discovery.
            </p>
            <p>
              Digital Wills introduces programmable inheritance for digital ownership.
            </p>

            <ul className="space-y-2 border border-border rounded-md p-5 bg-card">
              {pillars.map((line) => (
                <li key={line} className="text-foreground">
                  {line}
                </li>
              ))}
            </ul>

            <p>
              The result is infrastructure designed to allow digital property to move
              securely from one generation to the next—without requiring a centralized
              platform to hold the assets.
            </p>
          </Section>

          {/* Closing */}
          <footer className="border-t border-border pt-10 space-y-3">
            <p className="text-xl font-bold text-foreground">Digital Wills</p>
            <p className="text-base text-muted-foreground">
              Your assets shouldn’t disappear when you do.
            </p>
            <div className="pt-3">
              <Link to="/">
                <Button variant="outline">Create your Digital Will</Button>
              </Link>
            </div>
          </footer>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default About;
