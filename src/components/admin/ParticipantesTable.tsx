import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { Inscrito } from "@/lib/cosplay-types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

interface ParticipantesTableProps {
  inscritos: Inscrito[];
  onRefresh: () => void;
}

export function ParticipantesTable({ inscritos, onRefresh }: ParticipantesTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const toggleSelectAll = () => {
    if (selected.size === inscritos.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(inscritos.map(i => i.id)));
    }
  };

  async function handleDeleteSelected() {
    if (selected.size === 0) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from('inscritos')
        .delete()
        .in('id', Array.from(selected));

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: `${selected.size} participante(s) removido(s).`,
      });
      setSelected(new Set());
      onRefresh();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir os participantes.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDeleteAll() {
    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from('inscritos')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Todos os participantes foram removidos.",
      });
      setSelected(new Set());
      onRefresh();
    } catch (error) {
      console.error('Erro ao excluir todos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir os participantes.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  function exportToExcel() {
    const data = inscritos.map((i, index) => ({
      '#': index + 1,
      'Nome': i.nome,
      'Categoria': i.categoria,
      'Cosplay': i.cosplay,
      'Data': i.created_at ? new Date(i.created_at).toLocaleDateString('pt-BR') : '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Participantes');
    
    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 30 },
      { wch: 20 },
      { wch: 35 },
      { wch: 15 }
    ];
    
    XLSX.writeFile(workbook, `participantes_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({
      title: "Exportado!",
      description: "Arquivo Excel baixado com sucesso.",
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                size="sm" 
                disabled={selected.size === 0 || isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir Selecionados ({selected.size})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Deseja realmente excluir {selected.size} participante(s)? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSelected}>
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={inscritos.length === 0 || isDeleting}
                className="border-destructive text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir Todos
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir todos os participantes</AlertDialogTitle>
                <AlertDialogDescription>
                  Deseja realmente excluir TODOS os {inscritos.length} participantes? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive hover:bg-destructive/90">
                  Excluir Todos
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Button variant="outline" size="sm" onClick={exportToExcel} disabled={inscritos.length === 0}>
          <Download className="h-4 w-4 mr-1" />
          Exportar Excel
        </Button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={selected.size === inscritos.length && inscritos.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Cosplay</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isDeleting ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : inscritos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum participante cadastrado
                </TableCell>
              </TableRow>
            ) : (
              inscritos.map((inscrito, index) => (
                <TableRow 
                  key={inscrito.id}
                  className={selected.has(inscrito.id) ? "bg-primary/10" : ""}
                >
                  <TableCell>
                    <Checkbox
                      checked={selected.has(inscrito.id)}
                      onCheckedChange={() => toggleSelect(inscrito.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{inscrito.nome}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-secondary border-secondary/50">
                      {inscrito.categoria}
                    </Badge>
                  </TableCell>
                  <TableCell>{inscrito.cosplay}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {inscrito.created_at ? new Date(inscrito.created_at).toLocaleDateString('pt-BR') : '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
