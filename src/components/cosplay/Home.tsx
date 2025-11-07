import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Inscrito, Nota } from "@/lib/cosplay-types";
import { DEFAULT_JURORS, CATEGORIES } from "@/lib/cosplay-types";

interface HomeProps {
  inscritos: Inscrito[];
  notas: Record<string, Nota>;
  onNavigate: (view: string) => void;
  onExportPdf: () => void;
}

export function Home({ inscritos, notas, onNavigate, onExportPdf }: HomeProps) {
  const totalInscritos = inscritos.length;
  const totalCategorias = new Set(inscritos.map(x => x.categoria)).size;
  
  const totalNotas = Object.entries(notas).reduce((acc, [, n]) => {
    return acc + DEFAULT_JURORS.filter(j => {
      const key = j.toLowerCase().replace(/[()]/g, '').replace(/\s+/g, '_') as keyof Nota;
      return typeof n[key] === "number";
    }).length;
  }, 0);
  
  const allScores = Object.values(notas).flatMap(n => {
    const jurado1 = n.jurado_1;
    const jurado2 = n.jurado_2;
    const jurado3 = n.jurado_3;
    return [jurado1, jurado2, jurado3].filter(score => typeof score === "number") as number[];
  });
  const avgScore = allScores.length > 0 
    ? (allScores.reduce((sum, score) => sum + score, 0) / allScores.length).toFixed(1)
    : "0.0";

  const quickActions = [
    {
      title: "📝 Gerenciar Inscrições",
      description: "Cadastre novos participantes e gerencie as inscrições existentes com interface moderna e intuitiva",
      action: () => onNavigate("inscricoes")
    },
    {
      title: "⭐ Sistema de Avaliação",
      description: "Avalie participantes com sistema de notas por jurados e cálculo automático de médias",
      action: () => onNavigate("avaliacao")
    },
    {
      title: "🏆 Rankings e Resultados",
      description: "Visualize rankings por categoria com sistema de medalhas e estatísticas detalhadas",
      action: () => onNavigate("ranking")
    },
    {
      title: "📊 Dashboard Analítico",
      description: "Acompanhe estatísticas em tempo real com gráficos e métricas de desempenho",
      action: () => onNavigate("ranking")
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Hero Section */}
      <div className="text-center space-y-6 py-12">
        <img
          src={logo}
          alt="Alucard Animes"
          className="w-32 h-32 mx-auto object-contain animate-pulse"
        />
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
          Concurso de Cosplay
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Sistema completo para gerenciamento de concursos de cosplay com cadastro de participantes,
          avaliação por jurados e geração automática de rankings e apresentações.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Button size="lg" onClick={() => onNavigate("inscricoes")} className="bg-gradient-to-r from-primary to-accent">
            <span>📝</span>
            <span>Cadastrar Participante</span>
          </Button>
          <Button size="lg" variant="outline" onClick={() => onNavigate("avaliacao")}>
            <span>⭐</span>
            <span>Avaliar Participantes</span>
          </Button>
          <Button size="lg" variant="outline" onClick={() => onNavigate("ranking")}>
            <span>📊</span>
            <span>Ver Dashboard</span>
          </Button>
          <Button size="lg" variant="outline" onClick={onExportPdf}>
            <span>📄</span>
            <span>Gerar PDF</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Participantes", value: totalInscritos },
          { label: "Categorias", value: totalCategorias },
          { label: "Avaliações", value: totalNotas },
          { label: "Média Geral", value: avgScore }
        ].map((stat, i) => (
          <Card key={i} className="p-6 text-center border-border bg-card hover:border-primary transition-all hover:shadow-lg hover:shadow-primary/10">
            <div className="text-3xl font-bold bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
              {stat.value}
            </div>
            <div className="text-sm text-muted-foreground uppercase tracking-wide mt-1">
              {stat.label}
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quickActions.map((action, i) => {
          const buttonTexts = ["Acessar", "Avaliar", "Ver Ranking", "Dashboard"];
          return (
            <Card 
              key={i}
              className="p-6 border-border bg-card hover:border-primary transition-all cursor-pointer group hover:shadow-lg hover:shadow-primary/10"
              onClick={action.action}
            >
              <h3 className="text-lg font-semibold text-secondary mb-2 group-hover:text-accent transition-colors">
                {action.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                {action.description}
              </p>
              <Button className="w-full bg-gradient-to-r from-primary to-accent">
                {buttonTexts[i]}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
