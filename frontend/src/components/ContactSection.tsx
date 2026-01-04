import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, ArrowRight } from "lucide-react";

const ContactSection = () => {
  return (
    <section id="contato" className="py-32 relative">
      {/* Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-primary/10 rounded-full blur-[150px]" />
      
      <div className="container mx-auto px-4 relative">
        <div className="max-w-5xl mx-auto">
          {/* Main CTA Card */}
          <div className="relative rounded-3xl border border-primary/30 bg-gradient-card p-8 md:p-12 lg:p-20 overflow-hidden glow-primary">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/15 rounded-full blur-[100px]" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/15 rounded-full blur-[80px]" />

            <div className="relative z-10 text-center">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-medium mb-8">
                Vamos Conversar
              </span>
              
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8">
                Pronto para Transformar
                <br />
                <span className="text-gradient">Sua Infraestrutura?</span>
              </h2>
              
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-12 leading-relaxed">
                Entre em contato conosco para uma análise gratuita da sua rede. 
                Nossa equipe está pronta para entender suas necessidades e propor 
                as melhores soluções.
              </p>

              {/* CTA Button */}
              <Button 
                variant="hero" 
                size="xl" 
                className="mb-16 group"
                onClick={() => window.location.href = 'mailto:contato@version2.com.br?subject=Solicita%C3%A7%C3%A3o%20de%20An%C3%A1lise%20Gratuita'}
              >
                Solicitar Análise Gratuita
                <ArrowRight className="ml-2 transition-transform group-hover:translate-x-1" />
              </Button>

              {/* Contact Info */}
              <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                <a 
                  href="mailto:contato@version2.com.br" 
                  className="flex items-center gap-3 px-6 py-3 rounded-xl glass-card hover:border-primary/50 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-foreground">contato@version2.com.br</span>
                </a>
                
                <a 
                  href="https://wa.me/5519987601686?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20os%20servi%C3%A7os%20da%20Version2." 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-6 py-3 rounded-xl glass-card hover:border-primary/50 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                    <Phone className="w-5 h-5 text-green-500" />
                  </div>
                  <span className="text-foreground">(19) 9 8760-1686</span>
                </a>
                
                <div className="flex items-center gap-3 px-6 py-3 rounded-xl glass-card">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-foreground">São Paulo, SP</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;