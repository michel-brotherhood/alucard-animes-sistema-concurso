import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Trash2, Download, Loader2 } from "lucide-react";
import type { Inscrito, Nota } from "@/lib/cosplay-types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

interface NotasTableProps {
  inscritos: Inscrito[];
  notas: Record<string, Nota>;
  onRefresh: () => void;
}

export function NotasTable({ inscritos, notas, onRefresh }: NotasTableProps) {
  const [isClearing, setIsClearing] = useState(false);
  const { toast } = useToast();

  const inscritosComNotas = inscritos.filter(i => {
    const nota = notas[i.id];
    return nota && (nota.jurado_1 !== null || nota.jurado_2 !== null || nota.jurado_3 !== null);
  });

  async function handleClearNota(id: string) {
    setIsClearing(true);
    try {
      const { error } = await supabase
        .from('notas')
        .update({ jurado_1: null, jurado_2: null, jurado_3: null })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Notas do participante foram limpas.",
      });
      onRefresh();
    } catch (error) {
      console.error('Erro ao limpar notas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível limpar as notas.",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  }

  async function handleClearAllNotas() {
    setIsClearing(true);
    try {
      const { error } = await supabase
        .from('notas')
        .update({ jurado_1: null, jurado_2: null, jurado_3: null })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Todas as notas foram limpas.",
      });
      onRefresh();
    } catch (error) {
      console.error('Erro ao limpar todas as notas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível limpar as notas.",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  }

  function exportToExcel() {
    const data = inscritos.map((i, index) => {
      const nota = notas[i.id];
      const notasValidas = [nota?.jurado_1, nota?.jurado_2, nota?.jurado_3].filter(n => n !== null && n !== undefined) as number[];
      const media = notasValidas.length > 0 
        ? notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length 
        : null;

      return {
        '#': index + 1,
        'Nome': i.nome,
        'Categoria': i.categoria,
        'Cosplay': i.cosplay,
        'Jurado 1': nota?.jurado_1 ?? '-',
        'Jurado 2': nota?.jurado_2 ?? '-',
        'Jurado 3': nota?.jurado_3 ?? '-',
        'Média': media ? media.toFixed(2) : '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Notas');
    
    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 30 },
      { wch: 20 },
      { wch: 35 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 }
    ];
    
    XLSX.writeFile(workbook, `notas_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({
      title: "Exportado!",
      description: "Arquivo Excel com as notas baixado.",
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={inscritosComNotas.length === 0 || isClearing}
              className="border-destructive text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Limpar Todas as Notas
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Limpar todas as notas</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja realmente limpar TODAS as notas? Os participantes permanecerão cadastrados, apenas as avaliações serão removidas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearAllNotas} className="bg-destructive hover:bg-destructive/90">
                Limpar Tudo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button variant="outline" size="sm" onClick={exportToExcel} disabled={inscritos.length === 0}>
          <Download className="h-4 w-4 mr-1" />
          Exportar Notas
        </Button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">#</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-center">J1</TableHead>
              <TableHead className="text-center">J2</TableHead>
              <TableHead className="text-center">J3</TableHead>
              <TableHead className="text-center">Média</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isClearing ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : inscritos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum participante cadastrado
                </TableCell>
              </TableRow>
            ) : (
              inscritos.map((inscrito, index) => {
                const nota = notas[inscrito.id];
                const notasValidas = [nota?.jurado_1, nota?.jurado_2, nota?.jurado_3].filter(n => n !== null && n !== undefined) as number[];
                const media = notasValidas.length > 0 
                  ? notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length 
                  : null;
                const temNota = notasValidas.length > 0;

                return (
                  <TableRow key={inscrito.id}>
                    <TableCell className="font-mono text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{inscrito.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-secondary border-secondary/50">
                        {inscrito.categoria}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={nota?.jurado_1 != null ? "font-semibold" : "text-muted-foreground"}>
                        {nota?.jurado_1 ?? "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={nota?.jurado_2 != null ? "font-semibold" : "text-muted-foreground"}>
                        {nota?.jurado_2 ?? "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={nota?.jurado_3 != null ? "font-semibold" : "text-muted-foreground"}>
                        {nota?.jurado_3 ?? "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {media !== null ? (
                        <Badge className="bg-primary/20 text-primary hover:bg-primary/30">
                          {media.toFixed(1)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {temNota && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleClearNota(inscrito.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
