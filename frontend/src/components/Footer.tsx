import { Linkedin, Instagram, Github, Mail } from "lucide-react";

const footerLinks = {
  services: [
    { name: "Projetos de Rede", href: "#servicos" },
    { name: "Suporte Técnico", href: "#servicos" },
    { name: "Consultoria BGP", href: "#servicos" },
    { name: "Wanguard DDoS", href: "#wanguard" },
  ],
  company: [
    { name: "Sobre Nós", href: "#sobre" },
    { name: "Tecnologias", href: "#tecnologias" },
    { name: "Contato", href: "#contato" },
    { name: "Área do Cliente", href: "/auth" },
  ],
};

const socialLinks = [
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Github, href: "#", label: "GitHub" },
  { icon: Mail, href: "mailto:contato@version2.com.br", label: "Email" },
];

const Footer = () => {
  return (
    <footer className="py-16 border-t border-border/50 relative">
      {/* Background */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-[100px]" />
      
      <div className="container mx-auto px-4 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xl">V2</span>
                </div>
              </div>
              <span className="text-2xl font-bold text-foreground">
                Version<span className="text-gradient">2</span>
              </span>
            </div>
            <p className="text-muted-foreground max-w-md mb-6 leading-relaxed">
              Consultoria especializada em infraestrutura de redes para ISPs, 
              Datacenters e ambientes Enterprise. Transformamos tecnologia 
              em resultados.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="w-11 h-11 rounded-xl glass-card flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-all duration-300"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Services Links */}
          <div>
            <h3 className="text-foreground font-semibold mb-6">Serviços</h3>
            <ul className="space-y-4">
              {footerLinks.services.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors duration-300 text-sm"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-foreground font-semibold mb-6">Empresa</h3>
            <ul className="space-y-4">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors duration-300 text-sm"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm text-center md:text-left">
            © {new Date().getFullYear()} Version2 Consultoria. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">
              Política de Privacidade
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Termos de Uso
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;