const technologies = [
  { name: "Cisco", category: "Routing & Switching" },
  { name: "Juniper", category: "Routing & Switching" },
  { name: "MikroTik", category: "Routing & Switching" },
  { name: "Huawei", category: "Routing & Switching" },
  { name: "Arista", category: "Datacenter" },
  { name: "Fortinet", category: "Security" },
  { name: "Palo Alto", category: "Security" },
  { name: "Wanguard", category: "DDoS Protection" },
  { name: "Zabbix", category: "Monitoring" },
  { name: "Grafana", category: "Monitoring" },
  { name: "Ansible", category: "Automation" },
  { name: "Python", category: "Automation" },
  { name: "Linux", category: "Infrastructure" },
  { name: "VMware", category: "Virtualization" },
];

const ExpertiseSection = () => {
  return (
    <section id="tecnologias" className="py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/30 to-transparent" />
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
      
      <div className="container mx-auto px-4 relative">
        {/* Section Header */}
        <div className="text-center mb-20">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-medium mb-6">
            Tecnologias
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            Trabalhamos com as
            <br />
            <span className="text-gradient">Melhores Tecnologias</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Nossa equipe é certificada e experiente nas principais plataformas 
            de rede do mercado.
          </p>
        </div>

        {/* Technology Grid */}
        <div className="flex flex-wrap justify-center gap-4 max-w-5xl mx-auto">
          {technologies.map((tech, index) => (
            <div
              key={tech.name}
              className="group px-6 py-4 rounded-xl glass-card card-hover cursor-default"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="text-foreground font-semibold group-hover:text-gradient transition-all duration-300">
                {tech.name}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {tech.category}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ExpertiseSection;