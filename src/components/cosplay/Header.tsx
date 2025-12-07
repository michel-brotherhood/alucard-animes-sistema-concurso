import logo from "@/assets/logo.png";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FileDown, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface HeaderProps {
  activeView: string;
  onNavigate: (view: string) => void;
  onExportPdf?: () => void;
}

export function Header({ activeView, onNavigate, onExportPdf }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const handleNavigation = (id: string) => {
    setMobileMenuOpen(false);
    if (id === "apresentacao") {
      navigate("/apresentacao");
      return;
    }
    if (id === "avaliacao") {
      navigate("/avaliacao");
      return;
    }
    if (id === "ranking") {
      navigate("/ranking");
      return;
    }
    if (id === "admin") {
      navigate("/admin");
      return;
    }
    if (location.pathname !== "/") {
      navigate("/");
    }
    onNavigate(id);
  };
  
  const getCurrentView = () => {
    if (location.pathname === "/apresentacao") return "apresentacao";
    if (location.pathname === "/avaliacao") return "avaliacao";
    if (location.pathname === "/ranking") return "ranking";
    return activeView;
  };

  const isApresentacaoPage = location.pathname === "/apresentacao";

  const navItems = [
    { id: "inscricoes", label: "Inscrições", icon: "📝" },
    { id: "apresentacao", label: "Apresentação", icon: "🎭" },
    { id: "ranking", label: "Ranking", icon: "🏆" },
    { id: "avaliacao", label: "Jurados", icon: "⭐" },
    { id: "kpop", label: "K-pop", icon: "🎵" },
    { id: "admin", label: "Admin", icon: "🔐" },
  ];

  const NavButton = ({ item }: { item: typeof navItems[0] }) => (
    <button
      onClick={() => handleNavigation(item.id)}
      className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
        getCurrentView() === item.id
          ? "bg-gradient-to-r from-primary to-accent text-primary-foreground border-primary shadow-lg shadow-primary/25"
          : "border-border hover:border-primary hover:bg-muted"
      }`}
    >
      <span>{item.icon}</span>
      <span>{item.label}</span>
    </button>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex h-14 sm:h-16 items-center justify-between gap-2">
          {/* Logo */}
          <button 
            onClick={() => {
              navigate("/");
              onNavigate("home");
            }}
            className="flex items-center gap-2 sm:gap-3 group flex-shrink-0"
          >
            <img
              src={logo}
              alt="Alucard Animes"
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg object-contain transition-transform group-hover:scale-110 group-hover:rotate-3"
            />
            <div className="hidden md:block text-left">
              <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Cadastro Concurso
              </h1>
              <p className="text-xs text-muted-foreground">
                Sistema de gerenciamento
              </p>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-2">
            {isApresentacaoPage && onExportPdf && (
              <Button
                onClick={onExportPdf}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <FileDown className="h-4 w-4" />
                Exportar PDF
              </Button>
            )}
            {navItems.map((item) => (
              <NavButton key={item.id} item={item} />
            ))}
          </nav>

          {/* Mobile Menu */}
          <div className="flex lg:hidden items-center gap-2">
            {isApresentacaoPage && onExportPdf && (
              <Button
                onClick={onExportPdf}
                variant="outline"
                size="sm"
                className="gap-1"
              >
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
            )}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <nav className="flex flex-col gap-2 mt-8">
                  {navItems.map((item) => (
                    <NavButton key={item.id} item={item} />
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
