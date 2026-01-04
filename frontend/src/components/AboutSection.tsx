import { CheckCircle } from "lucide-react";

const expertise = [
  "Cisco, Juniper, MikroTik, Huawei",
  "MPLS, VPLS, SD-WAN",
  "BGP, OSPF, IS-IS",
  "IPv4 / IPv6 Dual-Stack",
  "Firewall & Security",
  "Monitoramento & Automação",
];

const AboutSection = () => {
  return (
    <section id="sobre" className="py-32 relative">
      {/* Background */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[150px]" />
      
      <div className="container mx-auto px-4 relative">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          {/* Left Content */}
          <div className="order-2 lg:order-1">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-medium mb-6">
              Sobre Nós
            </span>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8">
              Expertise que
              <br />
              <span className="text-gradient">Transforma Negócios</span>
            </h2>
            
            <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
              A Version2 nasceu da paixão por redes e da vontade de entregar 
              soluções que realmente funcionam. Com uma equipe de especialistas 
              certificados, atuamos em todo o Brasil atendendo provedores de 
              internet, datacenters e empresas de todos os portes.
            </p>
            
            <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
              Nossa metodologia combina as melhores práticas do mercado com 
              experiência real de operação, garantindo projetos robustos e 
              suporte técnico de excelência.
            </p>

            {/* Expertise List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {expertise.map((item) => (
                <div key={item} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/50">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-foreground text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Visual */}
          <div className="order-1 lg:order-2 relative">
            {/* Main Card */}
            <div className="relative z-10 rounded-3xl glass-card p-8 glow-primary">
              {/* Terminal Header */}
              <div className="flex items-center gap-2 mb-8 pb-4 border-b border-border/50">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <div className="w-3 h-3 rounded-full bg-warning" />
                <div className="w-3 h-3 rounded-full bg-success" />
                <span className="ml-4 text-muted-foreground text-sm font-mono">version2@network:~</span>
              </div>

              {/* Terminal Content */}
              <div className="font-mono text-sm space-y-4">
                <div>
                  <p className="text-muted-foreground">
                    <span className="text-primary">$</span> show bgp summary
                  </p>
                  <div className="mt-2 pl-4 border-l-2 border-primary/30">
                    <p className="text-foreground">
                      Neighbor: AS65001 <span className="text-success">Established</span>
                    </p>
                    <p className="text-foreground">
                      Prefixes received: <span className="text-primary">847,432</span>
                    </p>
                  </div>
                </div>
                
                <div>
                  <p className="text-muted-foreground">
                    <span className="text-primary">$</span> show interfaces status
                  </p>
                  <div className="mt-2 pl-4 border-l-2 border-primary/30 space-y-1">
                    <p className="text-foreground">
                      eth0: <span className="text-success">UP</span> 100Gbps
                    </p>
                    <p className="text-foreground">
                      eth1: <span className="text-success">UP</span> 100Gbps
                    </p>
                    <p className="text-foreground">
                      eth2: <span className="text-success">UP</span> 40Gbps
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground">
                    <span className="text-primary">$</span> show system uptime
                  </p>
                  <div className="mt-2 pl-4 border-l-2 border-primary/30">
                    <p className="text-foreground">
                      Uptime: <span className="text-primary">365 days, 23:59:59</span>
                    </p>
                  </div>
                </div>

                <p className="text-muted-foreground">
                  <span className="text-primary">$</span> <span className="animate-pulse">_</span>
                </p>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -top-8 -right-8 w-40 h-40 bg-primary/20 rounded-full blur-[60px]" />
            <div className="absolute -bottom-8 -left-8 w-56 h-56 bg-accent/20 rounded-full blur-[80px]" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;