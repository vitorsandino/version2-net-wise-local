import { Server, Headphones, GitBranch, Shield, Wifi, Settings, ArrowUpRight } from "lucide-react";

const services = [
  {
    icon: Server,
    title: "Projetos de Rede",
    description: "Arquitetura e implementação de infraestrutura de rede escalável para ISPs, datacenters e ambientes corporativos.",
    highlight: false,
  },
  {
    icon: Headphones,
    title: "Suporte Técnico 24/7",
    description: "Suporte especializado com SLA garantido. Resolução rápida de incidentes e manutenção preventiva.",
    highlight: true,
  },
  {
    icon: GitBranch,
    title: "Consultoria BGP",
    description: "Configuração e otimização de sessões BGP, peering, políticas de roteamento e engenharia de tráfego.",
    highlight: false,
  },
  {
    icon: Shield,
    title: "Segurança de Rede",
    description: "Implementação de firewalls, segmentação de rede, VPNs e auditorias de segurança completas.",
    highlight: false,
  },
  {
    icon: Wifi,
    title: "Wireless Enterprise",
    description: "Projetos de Wi-Fi corporativo com alta densidade, gestão centralizada e análise de cobertura.",
    highlight: false,
  },
  {
    icon: Settings,
    title: "Automação & NOC",
    description: "Automação de infraestrutura, monitoramento proativo e operação de Network Operations Center.",
    highlight: false,
  },
];

const ServicesSection = () => {
  return (
    <section id="servicos" className="py-32 relative">
      {/* Background subtle gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
      
      <div className="container mx-auto px-4 relative">
        {/* Section Header */}
        <div className="text-center mb-20">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-medium mb-6">
            Nossos Serviços
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            Soluções Completas em
            <br />
            <span className="text-gradient">Infraestrutura de Rede</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Da concepção à operação, oferecemos serviços especializados para 
            garantir performance, disponibilidade e segurança.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <div
              key={service.title}
              className={`group relative p-8 rounded-2xl transition-all duration-500 cursor-pointer ${
                service.highlight 
                  ? 'bg-gradient-primary glow-primary' 
                  : 'glass-card card-hover'
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Icon */}
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 transition-all duration-300 ${
                service.highlight
                  ? 'bg-background/20'
                  : 'bg-primary/10 border border-primary/20 group-hover:bg-primary/20'
              }`}>
                <service.icon className={`w-8 h-8 ${service.highlight ? 'text-foreground' : 'text-primary'}`} />
              </div>

              {/* Content */}
              <h3 className={`text-xl font-semibold mb-4 ${
                service.highlight ? 'text-foreground' : 'text-foreground group-hover:text-gradient'
              }`}>
                {service.title}
              </h3>
              <p className={`leading-relaxed ${
                service.highlight ? 'text-foreground/80' : 'text-muted-foreground'
              }`}>
                {service.description}
              </p>

              {/* Arrow */}
              <div className={`absolute top-8 right-8 transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 ${
                service.highlight ? 'opacity-100' : ''
              }`}>
                <ArrowUpRight className={`w-5 h-5 ${service.highlight ? 'text-foreground/60' : 'text-primary'}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;