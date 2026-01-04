import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, LogIn } from "lucide-react";
import { Link } from "react-router-dom";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: "Serviços", href: "#servicos" },
    { name: "Wanguard", href: "#wanguard" },
    { name: "Sobre", href: "#sobre" },
    { name: "Tecnologias", href: "#tecnologias" },
    { name: "Contato", href: "#contato" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-2xl border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a href="#" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center glow-primary transition-all duration-300 group-hover:scale-105">
                <span className="text-primary-foreground font-bold text-xl">V2</span>
              </div>
              <div className="absolute -inset-1 bg-gradient-primary rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity" />
            </div>
            <span className="text-2xl font-bold text-foreground">
              Version<span className="text-gradient">2</span>
            </span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-muted-foreground hover:text-foreground transition-colors duration-300 text-sm font-medium relative group"
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-primary transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            <Link to="/auth">
              <Button variant="glass" size="default" className="gap-2">
                <LogIn className="w-4 h-4" />
                Área do Cliente
              </Button>
            </Link>
            <Button variant="hero" size="default">
              Fale Conosco
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 text-foreground rounded-lg hover:bg-secondary transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="lg:hidden py-6 border-t border-border/50 animate-fade-in">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors duration-300 text-base font-medium py-2"
                  onClick={() => setIsOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <div className="flex flex-col gap-3 pt-4 border-t border-border/50">
                <Link to="/auth" onClick={() => setIsOpen(false)}>
                  <Button variant="glass" size="default" className="w-full gap-2">
                    <LogIn className="w-4 h-4" />
                    Área do Cliente
                  </Button>
                </Link>
                <Button variant="hero" size="default" className="w-full">
                  Fale Conosco
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;