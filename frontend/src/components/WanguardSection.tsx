import { Shield, Zap, BarChart3, Globe, Lock, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Zap,
    title: "Detecção em Tempo Real",
    description: "Identificação instantânea de ataques DDoS com análise de tráfego em milissegundos.",
  },
  {
    icon: BarChart3,
    title: "Análise de Tráfego",
    description: "Monitoramento detalhado com NetFlow, sFlow e IPFIX para visibilidade completa da rede.",
  },
  {
    icon: Globe,
    title: "Mitigação Automática",
    description: "Resposta automatizada com BGP Flowspec e técnicas avançadas de scrubbing.",
  },
  {
    icon: Lock,
    title: "Proteção Multi-Camada",
    description: "Defesa em profundidade contra ataques volumétricos, de protocolo e aplicação.",
  },
  {
    icon: Activity,
    title: "SLA Garantido",
    description: "Disponibilidade de 99.99% com suporte especializado 24/7.",
  },
  {
    icon: Shield,
    title: "Escalabilidade",
    description: "Capacidade de mitigação escalável para proteger redes de qualquer tamanho.",
  },
];

const WanguardSection = () => {
  return (
    <section id="wanguard" className="py-32 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-primary/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 relative">
        {/* Main Hero Card */}
        <div className="relative rounded-3xl border border-primary/30 bg-gradient-card p-8 md:p-12 lg:p-16 mb-16 glow-primary overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-[80px]" />

          <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/50 bg-primary/10 mb-6">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Proteção DDoS</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                <span className="text-gradient">Wanguard</span>
                <br />
                Anti-DDoS
              </h2>
              
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Proteção de rede de nível carrier com a tecnologia Andrisoft Wanguard. 
                Detecção e mitigação de ataques DDoS em tempo real, garantindo 
                a disponibilidade e performance da sua infraestrutura.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="hero" size="lg">
                  Solicitar Demo
                </Button>
                <Button variant="heroOutline" size="lg">
                  Saiba Mais
                </Button>
              </div>
            </div>

            {/* Right Visual */}
            <div className="relative">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 rounded-2xl glass-card">
                  <div className="text-4xl font-bold text-gradient mb-2">99.99%</div>
                  <div className="text-sm text-muted-foreground">Uptime SLA</div>
                </div>
                <div className="p-6 rounded-2xl glass-card">
                  <div className="text-4xl font-bold text-gradient mb-2">&lt;1ms</div>
                  <div className="text-sm text-muted-foreground">Detecção</div>
                </div>
                <div className="p-6 rounded-2xl glass-card">
                  <div className="text-4xl font-bold text-gradient mb-2">1Tbps+</div>
                  <div className="text-sm text-muted-foreground">Capacidade</div>
                </div>
                <div className="p-6 rounded-2xl glass-card">
                  <div className="text-4xl font-bold text-gradient mb-2">24/7</div>
                  <div className="text-sm text-muted-foreground">Monitoramento</div>
                </div>
              </div>

              {/* Decorative glow */}
              <div className="absolute -inset-4 bg-gradient-primary rounded-3xl blur-2xl opacity-20 -z-10" />
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-8 rounded-2xl glass-card card-hover"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:text-gradient transition-all">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WanguardSection;