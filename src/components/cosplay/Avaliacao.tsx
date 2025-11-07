import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

  return (
    <Card className="p-6 border-border bg-card">
      <h2 className="text-2xl font-bold text-primary mb-6 flex items-center gap-2">
        <span>⭐</span>
        <span>Sistema de Avaliação</span>
      </h2>
      
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-secondary">#</TableHead>
              <TableHead className="text-secondary">Categoria</TableHead>
              <TableHead className="text-secondary">Participante</TableHead>
              <TableHead className="text-secondary">Cosplay</TableHead>
              <TableHead className="text-secondary">Jurado 1</TableHead>
              <TableHead className="text-secondary">Jurado 2</TableHead>
              <TableHead className="text-secondary">Jurado 3</TableHead>
              <TableHead className="text-secondary">Média</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!sortedInscritos.length ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="text-muted-foreground space-y-2">
                    <div className="text-4xl">⭐</div>
                    <p>Nenhum participante para avaliar</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sortedInscritos.map((inscrito, idx) => {
                const nota = notas[inscrito.id] || { id: inscrito.id };
                const isNotScored = CATEGORIES_WITHOUT_SCORES.includes(inscrito.categoria as any);
                const scores = getJurorScores(nota);
                const media = calculateMedia(scores);

                return (
                  <TableRow key={inscrito.id} className="hover:bg-primary/5 animate-slide-in">
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <span className="inline-block bg-muted px-2 py-1 rounded text-xs font-semibold">
                        {inscrito.categoria}
                      </span>
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
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
