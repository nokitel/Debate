import { Suspense } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { PublicLayout } from "@/components/layout/PublicLayout";
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
    <PublicLayout>
      <Navbar variant="warm" />
      <main>
        <HeroSection />
        <Suspense fallback={<PublicDebatePreviewSkeleton />}>
          <PublicDebatePreview />
        </Suspense>
        <FeatureHighlights />
        <PricingCTA />
      </main>
      <Footer />
    </PublicLayout>
  );
}
