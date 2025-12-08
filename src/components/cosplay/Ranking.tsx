import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Inscrito, Nota } from "@/lib/cosplay-types";
import { CATEGORIES, CATEGORIES_WITHOUT_SCORES } from "@/lib/cosplay-types";
import { byOrder, groupSmallCategories, shouldShowInAvaliacao, getJurorScores, median, desvio, MIN_PARTICIPANTS_PER_CATEGORY } from "@/lib/cosplay-utils";
import type { RankingItem } from "@/lib/cosplay-types";
import { Loader2, FileDown, FileSpreadsheet } from "lucide-react";
import { exportRankingToExcel } from "@/lib/excel-utils";
import { generateRankingPDF } from "@/lib/pdf-utils";
import { useToast } from "@/hooks/use-toast";

interface RankingProps {
  inscritos: Inscrito[];
  notas: Record<string, Nota>;
  loading: boolean;
}

export function Ranking({ inscritos, notas, loading }: RankingProps) {
  const { toast } = useToast();
  const filteredInscritos = inscritos.filter(it => shouldShowInAvaliacao(it.categoria));
  const groupedInscritos = groupSmallCategories(filteredInscritos);
  const sortedInscritos = [...groupedInscritos].sort(byOrder);

  const porCat: Record<string, Inscrito[]> = {};
  for (const it of sortedInscritos) {
    (porCat[it.categoria] = porCat[it.categoria] || []).push(it);
  }

  const getMedalClass = (pos: number) => {
    if (pos === 1) return "bg-gradient-to-br from-yellow-400 to-yellow-600 text-black";
    if (pos === 2) return "bg-gradient-to-br from-gray-300 to-gray-500 text-black";
    if (pos === 3) return "bg-gradient-to-br from-amber-600 to-amber-800 text-black";
    return "";
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground mt-4">Calculando rankings...</p>
      </div>
    );
  }

  if (!sortedInscritos.length) {
    return (
      <Card className="p-12 text-center border-border bg-card">
        <div className="text-6xl mb-4">🏆</div>
        <h3 className="text-lg font-semibold mb-2">Nenhum participante inscrito</h3>
        <p className="text-muted-foreground">Adicione participantes para ver os rankings</p>
      </Card>
    );
  }

  const allRankings: { categoria: string; ganhadores: RankingItem[] }[] = [];
  
  CATEGORIES.forEach((cat) => {
    if (CATEGORIES_WITHOUT_SCORES.includes(cat as any)) return;
    
    const itemsForCat = porCat[cat] || [];
    if (cat !== "DESFILE LIVRE" && itemsForCat.length < MIN_PARTICIPANTS_PER_CATEGORY) return;
    if (!itemsForCat.length) return;

    const items: RankingItem[] = itemsForCat
      .map((it) => {
        const scores = getJurorScores(notas[it.id]);
        if (!scores.length) return null;

        return {
          it,
          media: +(scores.reduce((p, c) => p + c, 0) / scores.length).toFixed(2),
          med: median(scores),
          desv: desvio(scores),
        };
      })
      .filter((x): x is RankingItem => x !== null)
      .sort((a, b) => {
        if (b.media !== a.media) return b.media - a.media;
        if (b.med !== a.med) return b.med - a.med;
        if (a.desv !== b.desv) return a.desv - b.desv;
        return a.it.created - b.it.created;
      })
      .slice(0, 3);
    
    if (items.length > 0) {
      allRankings.push({ categoria: cat, ganhadores: items });
    }
  });

  const handleExportExcel = () => {
    exportRankingToExcel(allRankings);
  };

  const handleExportPDF = () => {
    try {
      toast({
        title: "Gerando PDF...",
        description: "Aguarde enquanto o PDF é gerado.",
      });
      generateRankingPDF(allRankings);
      toast({
        title: "PDF exportado!",
        description: "O arquivo foi baixado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast({
        title: "Erro ao exportar",
        description: "Ocorreu um erro ao gerar o PDF. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-primary flex items-center gap-2">
          <span>🏆</span>
          <span>Rankings por Categoria</span>
        </h2>
        
        {allRankings.length > 0 && (
          <div className="flex gap-2">
            <Button
              onClick={handleExportPDF}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
            <Button
              onClick={handleExportExcel}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar Excel</span>
              <span className="sm:hidden">Excel</span>
            </Button>
          </div>
        )}
      </div>

      {CATEGORIES.map((cat) => {
        if (CATEGORIES_WITHOUT_SCORES.includes(cat as any)) return null;
        
        const itemsForCat = porCat[cat] || [];
        if (cat !== "DESFILE LIVRE" && itemsForCat.length < MIN_PARTICIPANTS_PER_CATEGORY) return null;
        if (!itemsForCat.length) return null;

        const items: RankingItem[] = itemsForCat
          .map((it) => {
            const scores = getJurorScores(notas[it.id]);
            if (!scores.length) return null;

            return {
              it,
              media: +(scores.reduce((p, c) => p + c, 0) / scores.length).toFixed(2),
              med: median(scores),
              desv: desvio(scores),
            };
          })
          .filter((x): x is RankingItem => x !== null)
          .sort((a, b) => {
            if (b.media !== a.media) return b.media - a.media;
            if (b.med !== a.med) return b.med - a.med;
            if (a.desv !== b.desv) return a.desv - b.desv;
            return a.it.created - b.it.created;
          })
          .slice(0, 3);

        return (
          <Card key={cat} className="p-4 sm:p-6 border-border bg-card animate-fade-in-up">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-secondary">{cat}</h3>
              <span className="text-xs sm:text-sm text-muted-foreground">
                {items.length} classificado{items.length !== 1 ? "s" : ""}
              </span>
            </div>

            {!items.length ? (
              <div className="text-center py-6 sm:py-8">
                <div className="text-3xl sm:text-4xl mb-2">📊</div>
                <p className="text-muted-foreground italic text-sm sm:text-base">
                  Sem avaliações suficientes para ranking
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {items.map((x, i) => {
                  const pos = i + 1;
                  return (
                    <div
                      key={x.it.id}
                      className="flex items-center justify-between p-3 sm:p-4 bg-background border border-border rounded-lg hover:border-primary transition-all animate-slide-in gap-3"
                    >
                      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                        <div
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-base sm:text-lg font-bold shadow-lg flex-shrink-0 ${getMedalClass(pos)}`}
                        >
                          {pos}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-sm sm:text-base truncate">{x.it.nome}</div>
                          <div className="text-xs sm:text-sm text-muted-foreground truncate">{x.it.cosplay}</div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xl sm:text-2xl font-bold text-primary">
                          {x.media.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">média</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
