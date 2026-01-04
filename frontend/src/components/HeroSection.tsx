import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Server, Network } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0">
        {/* Main gradient orb */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/20 rounded-full blur-[120px] animate-pulse-glow" />
        
        {/* Secondary orbs */}
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-accent/15 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-primary/10 rounded-full blur-[80px] animate-pulse-glow" style={{ animationDelay: '4s' }} />

        {/* Grid pattern */}
        <div className="absolute inset-0 grid-pattern opacity-30" />

        {/* Floating particles */}
        <div className="absolute top-1/4 right-1/3 w-2 h-2 bg-primary rounded-full animate-float glow-primary" />
        <div className="absolute top-2/3 left-1/4 w-3 h-3 bg-accent/60 rounded-full animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/3 right-1/4 w-1.5 h-1.5 bg-primary/80 rounded-full animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/3 w-2 h-2 bg-accent/40 rounded-full animate-float" style={{ animationDelay: '3s' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-primary/30 bg-primary/5 backdrop-blur-sm mb-10 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-sm text-muted-foreground font-medium">
              Consultoria Especializada em Infraestrutura de Redes
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-6xl lg:text-8xl font-bold mb-8 animate-slide-up tracking-tight">
            Conectando o
            <br />
            <span className="text-gradient">Futuro Digital</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-12 animate-slide-up leading-relaxed" style={{ animationDelay: '0.15s' }}>
            Transformamos infraestruturas de rede em vantagem competitiva. 
            Especialistas em ISP, Datacenter e Enterprise com soluções 
            sob medida para cada desafio.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <Button 
              variant="hero" 
              size="xl" 
              className="group"
              onClick={() => document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Solicitar Proposta
              <ArrowRight className="ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button 
              variant="heroOutline" 
              size="xl"
              onClick={() => document.getElementById('servicos')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Conhecer Serviços
            </Button>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '0.45s' }}>
            <div className="group p-6 rounded-2xl glass-card card-hover">
              <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors mx-auto">
                <Server className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">ISP</h3>
              <p className="text-sm text-muted-foreground">Provedores de Internet</p>
            </div>

            <div className="group p-6 rounded-2xl glass-card card-hover">
              <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors mx-auto">
                <Network className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Datacenter</h3>
              <p className="text-sm text-muted-foreground">Infraestrutura Crítica</p>
            </div>

            <div className="group p-6 rounded-2xl glass-card card-hover">
              <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors mx-auto">
                <Shield className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Enterprise</h3>
              <p className="text-sm text-muted-foreground">Redes Corporativas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;