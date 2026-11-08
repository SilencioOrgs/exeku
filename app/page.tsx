import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Practice } from "@/components/landing/practice";
import { About } from "@/components/landing/about";
import { Languages } from "@/components/landing/languages";
import { LabAppShowcase } from "@/components/lab/lab-app-banner";
import { FAQ } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <div className="landing-page min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Practice />
        <About />
        <Languages />
        <LabAppShowcase />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
