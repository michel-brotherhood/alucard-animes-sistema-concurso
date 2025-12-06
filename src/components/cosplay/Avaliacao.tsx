import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Inscrito, Nota } from "@/lib/cosplay-types";
import { DEFAULT_JURORS, CATEGORIES_WITHOUT_SCORES } from "@/lib/cosplay-types";
import { byOrder, groupSmallCategories, shouldShowInAvaliacao, getJurorScores, calculateMedia } from "@/lib/cosplay-utils";
import { Loader2 } from "lucide-react";

interface AvaliacaoProps {
  inscritos: Inscrito[];
  notas: Record<string, Nota>;
  loading: boolean;
  onSetNota: (id: string, jurorIndex: number, value: string) => Promise<void>;
}

export function Avaliacao({ inscritos, notas, loading, onSetNota }: AvaliacaoProps) {
  const filteredInscritos = inscritos.filter(it => shouldShowInAvaliacao(it.categoria));
  const groupedInscritos = groupSmallCategories(filteredInscritos);
  const sortedInscritos = [...groupedInscritos].sort(byOrder);

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground mt-4">Carregando participantes para avaliação...</p>
      </div>
    );
  }

  // Mobile Card View
  const MobileCard = ({ inscrito, idx, nota, isNotScored, scores, media }: {
    inscrito: Inscrito;
    idx: number;
    nota: Nota;
    isNotScored: boolean;
    scores: number[];
    media: number | null;
  }) => (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
            {idx + 1}
          </span>
          <div className="min-w-0">
            <h4 className="font-semibold truncate">{inscrito.nome}</h4>
            <p className="text-sm text-muted-foreground truncate">{inscrito.cosplay}</p>
          </div>
        </div>
        <Badge variant="secondary" className="flex-shrink-0 text-xs">
          {inscrito.categoria}
        </Badge>
      </div>
      
      {isNotScored ? (
        <p className="text-sm text-muted-foreground italic text-center py-2">
          Categoria não avaliável
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((jurorIdx) => (
            <div key={jurorIdx} className="space-y-1">
              <label className="text-xs text-muted-foreground">Jurado {jurorIdx + 1}</label>
              <Input
                type="number"
                min="0"
                max="10"
                step="0.5"
                value={nota[`jurado_${jurorIdx + 1}` as keyof Nota] ?? ""}
                onChange={(e) => onSetNota(inscrito.id, jurorIdx, e.target.value)}
                className="h-10 text-center border-input bg-background"
              />
            </div>
          ))}
        </div>
      )}
      
      <div className="flex justify-between items-center pt-2 border-t border-border">
        <span className="text-sm text-muted-foreground">Média:</span>
        <span className="font-bold text-lg">
          {media !== null ? media.toFixed(2) : "—"}
        </span>
      </div>
    </Card>
  );

  return (
    <Card className="p-4 sm:p-6 border-border bg-card">
      <h2 className="text-xl sm:text-2xl font-bold text-primary mb-4 sm:mb-6 flex items-center gap-2">
        <span>⭐</span>
        <span>Sistema de Avaliação</span>
      </h2>
      
      {!sortedInscritos.length ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground space-y-2">
            <div className="text-4xl">⭐</div>
            <p>Nenhum participante para avaliar</p>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile View - Cards */}
          <div className="lg:hidden space-y-4">
            {sortedInscritos.map((inscrito, idx) => {
              const nota = notas[inscrito.id] || { id: inscrito.id };
              const isNotScored = CATEGORIES_WITHOUT_SCORES.includes(inscrito.categoria as any);
              const scores = getJurorScores(nota);
              const media = calculateMedia(scores);

              return (
                <MobileCard
                  key={inscrito.id}
                  inscrito={inscrito}
                  idx={idx}
                  nota={nota}
                  isNotScored={isNotScored}
                  scores={scores}
                  media={media}
                />
              );
            })}
          </div>

          {/* Desktop View - Table */}
          <div className="hidden lg:block overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-secondary w-12">#</TableHead>
                  <TableHead className="text-secondary">Categoria</TableHead>
                  <TableHead className="text-secondary">Participante</TableHead>
                  <TableHead className="text-secondary">Cosplay</TableHead>
                  <TableHead className="text-secondary w-24">Jurado 1</TableHead>
                  <TableHead className="text-secondary w-24">Jurado 2</TableHead>
                  <TableHead className="text-secondary w-24">Jurado 3</TableHead>
                  <TableHead className="text-secondary w-20 text-right">Média</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedInscritos.map((inscrito, idx) => {
                  const nota = notas[inscrito.id] || { id: inscrito.id };
                  const isNotScored = CATEGORIES_WITHOUT_SCORES.includes(inscrito.categoria as any);
                  const scores = getJurorScores(nota);
                  const media = calculateMedia(scores);

                  return (
                    <TableRow key={inscrito.id} className="hover:bg-primary/5">
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {inscrito.categoria}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{inscrito.nome}</TableCell>
                      <TableCell className="text-muted-foreground">{inscrito.cosplay}</TableCell>
                      
                      {isNotScored ? (
                        <TableCell colSpan={3} className="text-center text-muted-foreground italic">
                          Categoria não avaliável
                        </TableCell>
                      ) : (
                        <>
                          {[0, 1, 2].map((jurorIdx) => (
                            <TableCell key={jurorIdx}>
                              <Input
                                type="number"
                                min="0"
                                max="10"
                                step="0.5"
                                value={nota[`jurado_${jurorIdx + 1}` as keyof Nota] ?? ""}
                                onChange={(e) => onSetNota(inscrito.id, jurorIdx, e.target.value)}
                                className="w-20 border-input bg-background"
                              />
                            </TableCell>
                          ))}
                        </>
                      )}
                      
                      <TableCell className="text-right font-bold">
                        {media !== null ? media.toFixed(2) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </Card>
  );
}
