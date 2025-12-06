import { Card, CardContent } from "@/components/ui/card";
import { Users, Star, AlertCircle, BarChart3 } from "lucide-react";
import type { Inscrito, Nota } from "@/lib/cosplay-types";

interface AdminStatsProps {
  inscritos: Inscrito[];
  notas: Record<string, Nota>;
}

export function AdminStats({ inscritos, notas }: AdminStatsProps) {
  const totalInscritos = inscritos.length;
  
  const categorias = inscritos.reduce((acc, i) => {
    acc[i.categoria] = (acc[i.categoria] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalAvaliados = Object.keys(notas).filter(id => {
    const nota = notas[id];
    return nota?.jurado_1 !== null || nota?.jurado_2 !== null || nota?.jurado_3 !== null;
  }).length;

  const semAvaliacao = totalInscritos - totalAvaliados;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border-border/50 bg-card/80">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Participantes</p>
              <p className="text-2xl font-bold text-foreground">{totalInscritos}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary/20">
              <Star className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avaliados</p>
              <p className="text-2xl font-bold text-foreground">{totalAvaliados}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/20">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sem Avaliação</p>
              <p className="text-2xl font-bold text-foreground">{semAvaliacao}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/20">
              <BarChart3 className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Categorias</p>
              <p className="text-2xl font-bold text-foreground">{Object.keys(categorias).length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
