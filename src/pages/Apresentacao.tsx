import { useCosplayData } from "@/hooks/useCosplayData";
import { Header } from "@/components/cosplay/Header";
import { Footer } from "@/components/cosplay/Footer";
import { Apresentacao as ApresentacaoComponent } from "@/components/cosplay/Apresentacao";
import { exportPdfApresentacao } from "@/lib/pdf-utils";
import logo from "@/assets/logo.png";

const Apresentacao = () => {
  const { inscritos, notas, loading } = useCosplayData();

  const handleExportPdf = () => {
    exportPdfApresentacao(inscritos, logo);
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
        activeView="apresentacao" 
        onNavigate={() => {}}
        onExportPdf={handleExportPdf}
      />
      <main className="container mx-auto px-4 py-8 flex-1">
        <ApresentacaoComponent 
          inscritos={inscritos}
          notas={notas}
          loading={loading}
        />
      </main>
      <Footer />
    </div>
  );
};

export default Apresentacao;
