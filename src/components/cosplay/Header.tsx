import logo from "@/assets/logo.png";
import { useNavigate, useLocation } from "react-router-dom";

interface HeaderProps {
  activeView: string;
  onNavigate: (view: string) => void;
  onExportPdf: () => void;
}

export function Header({ activeView, onNavigate, onExportPdf }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleNavigation = (id: string) => {
    if (id === "apresentacao") {
      navigate("/apresentacao");
    } else {
      navigate("/");
      onNavigate(id);
    }
  };
  
  const getCurrentView = () => {
    if (location.pathname === "/apresentacao") {
      return "apresentacao";
    }
    return activeView;
  };
  const navItems = [
    { id: "inscricoes", label: "Inscrições", icon: "📝" },
    { id: "apresentacao", label: "Apresentação", icon: "🎭" },
    { id: "ranking", label: "Ranking", icon: "🏆" },
    { id: "avaliacao", label: "Jurados", icon: "⭐" },
    { id: "kpop", label: "K-pop", icon: "🎵" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <button 
            onClick={() => {
              navigate("/");
              onNavigate("home");
            }}
            className="flex items-center gap-3 group"
          >
            <img
              src={logo}
              alt="Alucard Animes"
              className="h-12 w-12 rounded-lg object-contain transition-transform group-hover:scale-110 group-hover:rotate-3"
            />
            <div className="hidden sm:block text-left">
              <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Cadastro Concurso
              </h1>
              <p className="text-xs text-muted-foreground">
                Sistema de gerenciamento e avaliação
              </p>
            </div>
          </button>

          <nav className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                  getCurrentView() === item.id
                    ? "bg-gradient-to-r from-primary to-accent text-primary-foreground border-primary shadow-lg shadow-primary/25"
                    : "border-border hover:border-primary hover:bg-muted"
                }`}
              >
                <span>{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
