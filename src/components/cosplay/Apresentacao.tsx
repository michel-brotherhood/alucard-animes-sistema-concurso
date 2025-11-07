import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Inscrito, Nota, DEFAULT_JURORS } from "@/lib/cosplay-types";
import { exportPdfApresentacao } from "@/lib/pdf-utils";
import logo from "@/assets/logo.png";

interface ApresentacaoProps {
  inscritos: Inscrito[];
  notas: Record<string, Nota>;
  loading: boolean;
}

const PRESENTATION_ORDER = [
  "COSPOBRE",
  "INFANTIL",
  "GAME",
  "GEEK",
  "ANIME",
  "DESFILE LIVRE",
  "APRESENTAÇÃO SOLO OU GRUPO"
] as const;

export function Apresentacao({ inscritos, notas, loading }: ApresentacaoProps) {
  const handleExportPdf = () => {
    exportPdfApresentacao(inscritos, logo);
  };

  // Organizar inscritos por categoria na ordem especificada
  const organizedByCategory = PRESENTATION_ORDER.map(categoria => ({
    categoria,
    participantes: inscritos
      .filter(p => p.categoria === categoria)
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
  })).filter(group => group.participantes.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Carregando apresentação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Apresentação dos Cosplayers
          </h2>
          <p className="text-muted-foreground mt-1">
            Ordem de apresentação organizada por categoria
          </p>
        </div>
        <Button onClick={handleExportPdf} className="gap-2">
          <Download className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      {/* Card com informações dos jurados */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">⭐</span>
            Jurados Avaliadores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {DEFAULT_JURORS.map((juror, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-4 rounded-lg bg-background border border-border"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  {index + 1}
                </div>
                <div>
                  <p className="font-semibold">{juror}</p>
                  <p className="text-xs text-muted-foreground">Avaliador</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lista de categorias e participantes */}
      {organizedByCategory.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Nenhum cosplayer cadastrado ainda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {organizedByCategory.map(({ categoria, participantes }) => (
            <Card key={categoria} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl flex items-center gap-3">
                    <Badge variant="default" className="text-sm px-3 py-1">
                      {categoria}
                    </Badge>
                    <span className="text-muted-foreground text-base">
                      {participantes.length} {participantes.length === 1 ? 'participante' : 'participantes'}
                    </span>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {participantes.map((participante, index) => {
                    const nota = notas[participante.id];
                    const temAvaliacao = nota && (nota.jurado_1 || nota.jurado_2 || nota.jurado_3);

                    return (
                      <div
                        key={participante.id}
                        className="p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold flex-shrink-0">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-lg truncate">
                                {participante.nome}
                              </h4>
                              <p className="text-muted-foreground text-sm mt-1">
                                Cosplay: <span className="font-medium">{participante.cosplay}</span>
                              </p>
                            </div>
                          </div>
                          {temAvaliacao && (
                            <Badge variant="secondary" className="flex-shrink-0">
                              Avaliado
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Estatísticas finais */}
      <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-primary/5">
        <CardContent className="py-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {inscritos.length}
              </p>
              <p className="text-sm text-muted-foreground">Total de Participantes</p>
            </div>
            <div>
              <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {organizedByCategory.length}
              </p>
              <p className="text-sm text-muted-foreground">Categorias Ativas</p>
            </div>
            <div>
              <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {DEFAULT_JURORS.length}
              </p>
              <p className="text-sm text-muted-foreground">Jurados</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
