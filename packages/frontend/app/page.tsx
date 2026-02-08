import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeatureHighlights } from "@/components/landing/FeatureHighlights";
import {
  PublicDebatePreview,
  PublicDebatePreviewSkeleton,
} from "@/components/landing/PublicDebatePreview";
import { PricingCTA } from "@/components/landing/PricingCTA";
import { Footer } from "@/components/landing/Footer";

export default function HomePage(): React.JSX.Element {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <FeatureHighlights />
        <Suspense fallback={<PublicDebatePreviewSkeleton />}>
          <PublicDebatePreview />
        </Suspense>
        <PricingCTA />
      </main>
      <Footer />
    </>
  );
}
