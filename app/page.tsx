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
    <div className="min-h-screen flex flex-col bg-[#090514] text-[#F5F3FF] selection:bg-[#9E00FF] selection:text-white">
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
