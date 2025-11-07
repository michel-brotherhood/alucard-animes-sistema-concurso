import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Inscrito, Nota, RankingItem } from "@/lib/cosplay-types";
import { KPOP_CATEGORIES } from "@/lib/cosplay-types";
import { byOrder, getJurorScores, calculateMedia, median, desvio } from "@/lib/cosplay-utils";
import { Loader2 } from "lucide-react";

interface KpopProps {
  inscritos: Inscrito[];
  notas: Record<string, Nota>;
  loading: boolean;
  onSetNota: (id: string, jurorIndex: number, value: string) => Promise<void>;
}

export function Kpop({ inscritos, notas, loading, onSetNota }: KpopProps) {
  const [activeTab, setActiveTab] = useState<"avaliacao" | "ranking">("avaliacao");

  const kpopList = inscritos
    .filter(it => KPOP_CATEGORIES.includes(it.categoria as any))
    .sort(byOrder);

  const getMedalClass = (pos: number) => {
    if (pos === 1) return "bg-gradient-to-br from-yellow-400 to-yellow-600 text-black";
    if (pos === 2) return "bg-gradient-to-br from-gray-300 to-gray-500 text-black";
    if (pos === 3) return "bg-gradient-to-br from-amber-600 to-amber-800 text-black";
    return "";
  };

  const renderAvaliacao = () => (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-secondary">#</TableHead>
            <TableHead className="text-secondary">Categoria</TableHead>
            <TableHead className="text-secondary">Participante</TableHead>
            <TableHead className="text-secondary">Música/Artista</TableHead>
            <TableHead className="text-secondary">Jurado 1</TableHead>
            <TableHead className="text-secondary">Jurado 2</TableHead>
            <TableHead className="text-secondary">Jurado 3</TableHead>
            <TableHead className="text-secondary">Média</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!kpopList.length ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-12">
                <div className="space-y-2">
                  <div className="text-6xl">🎵</div>
                  <h3 className="text-lg font-semibold">Nenhum participante K-pop inscrito</h3>
                  <p className="text-muted-foreground">
                    Cadastre participantes nas categorias K-POP SOLO ou K-POP GRUPO
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            kpopList.map((inscrito, idx) => {
              const nota = notas[inscrito.id] || { id: inscrito.id };
              const scores = getJurorScores(nota);
              const media = calculateMedia(scores);

              return (
                <TableRow key={inscrito.id} className="hover:bg-primary/5 animate-slide-in">
                  <TableCell className="font-semibold">{idx + 1}</TableCell>
                  <TableCell>
                    <span className="inline-block bg-muted px-3 py-1 rounded-lg text-xs font-semibold">
                      {inscrito.categoria}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{inscrito.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{inscrito.cosplay}</TableCell>
                  {[0, 1, 2].map((jurorIdx) => (
                    <TableCell key={jurorIdx}>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        value={nota[`jurado_${jurorIdx + 1}` as keyof Nota] ?? ""}
                        onChange={(e) => onSetNota(inscrito.id, jurorIdx, e.target.value)}
                        className="w-20 border-input bg-background text-center"
                      />
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <span className="text-lg font-bold text-primary">
                      {media !== null ? media.toFixed(2) : "—"}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  const renderRanking = () => {
    if (!kpopList.length) {
      return (
        <Card className="p-12 text-center border-border bg-card">
          <div className="text-6xl mb-4">🎵</div>
          <h3 className="text-lg font-semibold mb-2">Nenhum participante K-pop inscrito</h3>
          <p className="text-muted-foreground">
            Cadastre participantes nas categorias K-POP SOLO ou K-POP GRUPO
          </p>
        </Card>
      );
    }

    const porCat: Record<string, Inscrito[]> = {};
    for (const it of kpopList) {
      (porCat[it.categoria] = porCat[it.categoria] || []).push(it);
    }

    return (
      <div className="space-y-6">
        {KPOP_CATEGORIES.map((cat) => {
          const itemsForCat = porCat[cat] || [];
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
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground mt-4">Carregando participantes K-pop...</p>
      </div>
    );
  }

  return (
    <Card className="p-6 border-border bg-card">
      <h2 className="text-2xl font-bold text-primary mb-6 flex items-center gap-2">
        <span>🎵</span>
        <span>Concurso K-pop</span>
      </h2>

      <div className="flex gap-2 mb-6 border-b-2 border-border">
        <Button
          variant={activeTab === "avaliacao" ? "default" : "ghost"}
          onClick={() => setActiveTab("avaliacao")}
          className={activeTab === "avaliacao" ? "border-b-4 border-primary rounded-b-none" : ""}
        >
          <span>⭐</span>
          <span>Avaliação</span>
        </Button>
        <Button
          variant={activeTab === "ranking" ? "default" : "ghost"}
          onClick={() => setActiveTab("ranking")}
          className={activeTab === "ranking" ? "border-b-4 border-primary rounded-b-none" : ""}
        >
          <span>🏆</span>
          <span>Ranking</span>
        </Button>
      </div>

      {activeTab === "avaliacao" ? renderAvaliacao() : renderRanking()}
    </Card>
  );
}
