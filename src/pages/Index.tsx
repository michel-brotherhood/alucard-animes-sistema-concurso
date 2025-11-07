import { useState } from "react";
import { useCosplayData } from "@/hooks/useCosplayData";
import { Header } from "@/components/cosplay/Header";
import { Footer } from "@/components/cosplay/Footer";
import { Home } from "@/components/cosplay/Home";
import { Inscricoes } from "@/components/cosplay/Inscricoes";
import { Avaliacao } from "@/components/cosplay/Avaliacao";
import { Ranking } from "@/components/cosplay/Ranking";
import { Kpop } from "@/components/cosplay/Kpop";
import { Apresentacao } from "@/components/cosplay/Apresentacao";
import { exportPdfApresentacao } from "@/lib/pdf-utils";
import logo from "@/assets/logo.png";

const Index = () => {
  const [activeView, setActiveView] = useState("home");
  const { inscritos, notas, loading, addInscrito, deleteInscrito, setNota } = useCosplayData();

  const handleExportPdf = () => {
    exportPdfApresentacao(inscritos, logo);
  };

  const renderActiveView = () => {
    switch (activeView) {
      case "inscricoes":
        return (
          <Inscricoes 
            inscritos={inscritos}
            loading={loading}
            onAdd={addInscrito}
            onDelete={deleteInscrito}
          />
        );
      case "avaliacao":
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
      case "apresentacao":
        return (
          <Apresentacao 
            inscritos={inscritos}
            notas={notas}
            loading={loading}
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

  if (loading) {
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
