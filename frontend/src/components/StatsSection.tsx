const stats = [
  { value: "150+", label: "Projetos Entregues", suffix: "" },
  { value: "99.9", label: "Uptime Garantido", suffix: "%" },
  { value: "24/7", label: "Suporte Disponível", suffix: "" },
  { value: "10+", label: "Anos de Experiência", suffix: "" },
];

const StatsSection = () => {
  return (
    <section className="py-24 relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      
      <div className="container mx-auto px-4 relative">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="text-center p-8 rounded-2xl glass-card card-hover"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="text-5xl md:text-6xl font-bold text-gradient mb-3">
                  {stat.value}{stat.suffix}
                </div>
                <div className="text-muted-foreground text-sm md:text-base font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsSection;