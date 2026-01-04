import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ServicesSection from "@/components/ServicesSection";
import WanguardSection from "@/components/WanguardSection";
import StatsSection from "@/components/StatsSection";
import AboutSection from "@/components/AboutSection";
import ExpertiseSection from "@/components/ExpertiseSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <main className="min-h-screen bg-background noise-overlay">
      <Navbar />
      <HeroSection />
      <ServicesSection />
      <WanguardSection />
      <StatsSection />
      <AboutSection />
      <ExpertiseSection />
      <ContactSection />
      <Footer />
    </main>
  );
};

export default Index;