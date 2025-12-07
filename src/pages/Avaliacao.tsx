import { useCosplayData } from "@/hooks/useCosplayData";
import { Header } from "@/components/cosplay/Header";
import { Avaliacao as AvaliacaoComponent } from "@/components/cosplay/Avaliacao";
import { Footer } from "@/components/cosplay/Footer";
import { Loader2 } from "lucide-react";

const Avaliacao = () => {
  const { inscritos, notas, loading, setNota } = useCosplayData();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-4">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header activeView="avaliacao" onNavigate={() => {}} />
      
      <main className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <AvaliacaoComponent 
          inscritos={inscritos} 
          notas={notas} 
          loading={loading}
          onSetNota={setNota}
        />
      </main>

      <Footer />
    </div>
  );
};

export default Avaliacao;
