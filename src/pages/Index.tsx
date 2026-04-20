import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCosplayData } from "@/hooks/useCosplayData";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/cosplay/Header";
import { Footer } from "@/components/cosplay/Footer";
import { Home } from "@/components/cosplay/Home";
import { Inscricoes } from "@/components/cosplay/Inscricoes";
import { Avaliacao } from "@/components/cosplay/Avaliacao";
import { Ranking } from "@/components/cosplay/Ranking";
import { Kpop } from "@/components/cosplay/Kpop";

import { exportPdfApresentacao } from "@/lib/pdf-utils";
import logo from "@/assets/logo.png";

const Index = () => {
  const [activeView, setActiveView] = useState("home");
  const { inscritos, notas, loading, addInscrito, deleteInscrito, setNota } = useCosplayData();
  const { user, isAdmin, isJuror, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Visitantes sem login só veem o ranking
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/ranking", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleExportPdf = () => {
    exportPdfApresentacao(inscritos, logo);
  };

  const renderActiveView = () => {
    switch (activeView) {
      case "inscricoes":
        if (!isAdmin) {
          return (
            <div className="text-center py-16">
              <h2 className="text-2xl font-bold text-foreground mb-2">Acesso restrito</h2>
              <p className="text-muted-foreground">Apenas administradores podem gerenciar inscrições.</p>
            </div>
          );
        }
        return (
          <Inscricoes 
            inscritos={inscritos}
            loading={loading}
            onAdd={addInscrito}
            onDelete={deleteInscrito}
          />
        );
      case "avaliacao":
        if (!isAdmin && !isJuror) {
          return (
            <div className="text-center py-16">
              <h2 className="text-2xl font-bold text-foreground mb-2">Acesso restrito</h2>
              <p className="text-muted-foreground">Apenas jurados e administradores.</p>
            </div>
          );
        }
        return (
          <Avaliacao 
            inscritos={inscritos}
            notas={notas}
            loading={loading}
            onSetNota={setNota}
          />
        );
      case "ranking":
        return (
          <Ranking 
            inscritos={inscritos}
            notas={notas}
            loading={loading}
          />
        );
      case "kpop":
        return (
          <Kpop 
            inscritos={inscritos}
            notas={notas}
            loading={loading}
            onSetNota={setNota}
          />
        );
      default:
        return (
          <Home 
            inscritos={inscritos}
            notas={notas}
            onNavigate={setActiveView}
            onExportPdf={handleExportPdf}
          />
        );
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header 
        activeView={activeView} 
        onNavigate={setActiveView}
        onExportPdf={handleExportPdf}
      />
      <main className="container mx-auto px-4 py-8 flex-1">
        {renderActiveView()}
      </main>
      <Footer />
    </div>
  );
};

export default Index;
