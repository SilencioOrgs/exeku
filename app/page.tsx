import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Practice } from "@/components/landing/practice";
import { PodiumTour } from "@/components/landing/podium-tour";
import { About } from "@/components/landing/about";
import { Languages } from "@/components/landing/languages";
import { LabAppShowcase } from "@/components/lab/lab-app-banner";
import { FAQ } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <div data-theme-scope="dark" className="landing-page dark min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Practice />
        <PodiumTour />
        <About />
        <Languages />
        <LabAppShowcase />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
