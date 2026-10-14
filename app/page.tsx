import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { About } from "@/components/landing/about";
import { Languages } from "@/components/landing/languages";
import { FeaturesRoadmap } from "@/components/landing/features-roadmap";
import { InstallGuide } from "@/components/landing/install-guide";
import { FAQ } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <div className="landing-page min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <About />
        <Languages />
        <FeaturesRoadmap />
        <InstallGuide />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
