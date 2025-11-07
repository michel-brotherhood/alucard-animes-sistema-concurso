import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Inscrito, Nota } from "@/lib/cosplay-types";
import { CATEGORIES, CATEGORIES_WITHOUT_SCORES } from "@/lib/cosplay-types";
import { byOrder, groupSmallCategories, shouldShowInAvaliacao, getJurorScores, median, desvio } from "@/lib/cosplay-utils";
import type { RankingItem } from "@/lib/cosplay-types";
import { Loader2, FileDown, FileSpreadsheet } from "lucide-react";
import { exportRankingToExcel } from "@/lib/excel-utils";
import { generateRankingPDF } from "@/lib/pdf-utils";

interface RankingProps {
  inscritos: Inscrito[];
  notas: Record<string, Nota>;
  loading: boolean;
}

export function Ranking({ inscritos, notas, loading }: RankingProps) {
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
    if (cat !== "DESFILE LIVRE" && itemsForCat.length < 3) return;
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
    generateRankingPDF(allRankings);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
          <span>🏆</span>
          <span>Rankings por Categoria</span>
        </h2>
        
        {allRankings.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleExportPDF}
              variant="outline"
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              <span>Exportar PDF</span>
            </Button>
            <Button
              onClick={handleExportExcel}
              variant="outline"
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Exportar Excel</span>
            </Button>
          </div>
        )}
      </div>

      {CATEGORIES.map((cat) => {
        if (CATEGORIES_WITHOUT_SCORES.includes(cat as any)) return null;
        
        const itemsForCat = porCat[cat] || [];
        if (cat !== "DESFILE LIVRE" && itemsForCat.length < 3) return null;
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
          <Card key={cat} className="p-6 border-border bg-card animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-secondary">{cat}</h3>
              <span className="text-sm text-muted-foreground">
                {items.length} classificado{items.length !== 1 ? "s" : ""}
              </span>
            </div>

            {!items.length ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-muted-foreground italic">
                  Sem avaliações suficientes para ranking
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((x, i) => {
                  const pos = i + 1;
                  return (
                    <div
                      key={x.it.id}
                      className="flex items-center justify-between p-4 bg-background border border-border rounded-lg hover:border-primary transition-all animate-slide-in"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-lg ${getMedalClass(pos)}`}
                        >
                          {pos}
                        </div>
                        <div>
                          <div className="font-semibold">{x.it.nome}</div>
                          <div className="text-sm text-muted-foreground">{x.it.cosplay}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
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
