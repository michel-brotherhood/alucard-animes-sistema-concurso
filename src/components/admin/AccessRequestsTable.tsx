import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, X, RefreshCw } from "lucide-react";

interface AccessRequest {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  status: "pending" | "approved" | "rejected";
  granted_role: string | null;
  created_at: string;
  reviewed_at: string | null;
}

type RoleChoice = "admin" | "juror" | "viewer";

interface Props {
  onCountChange?: (pending: number) => void;
}

export function AccessRequestsTable({ onCountChange }: Props) {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [roleChoices, setRoleChoices] = useState<Record<string, RoleChoice>>({});
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("list_access_requests", { _status: null as any });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      const list = (data ?? []) as AccessRequest[];
      setRequests(list);
      onCountChange?.(list.filter((r) => r.status === "pending").length);
    }
    setLoading(false);
  }, [toast, onCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(id: string) {
    const role = roleChoices[id] ?? "juror";
    setActionLoading(id);
    const { error } = await supabase.rpc("approve_access_request", {
      _request_id: id,
      _role: role as any,
    });
    setActionLoading(null);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Aprovado", description: `Papel concedido: ${role}` });
      load();
    }
  }

  async function reject(id: string) {
    setActionLoading(id);
    const { error } = await supabase.rpc("reject_access_request", { _request_id: id });
    setActionLoading(null);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Recusado" });
      load();
    }
  }

  const pending = requests.filter((r) => r.status === "pending");
  const reviewed = requests.filter((r) => r.status !== "pending");

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Pendentes <Badge variant="destructive" className="ml-2">{pending.length}</Badge>
          </h3>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Atualizar
        </Button>
      </div>

      {pending.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Nenhum pedido pendente.</p>
      ) : (
        <div className="border border-border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Solicitado em</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.email}</TableCell>
                  <TableCell>{r.display_name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={roleChoices[r.id] ?? "juror"}
                      onValueChange={(v) => setRoleChoices((s) => ({ ...s, [r.id]: v as RoleChoice }))}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="juror">Jurado</SelectItem>
                        <SelectItem value="viewer">Visualizador</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        onClick={() => approve(r.id)}
                        disabled={actionLoading === r.id}
                      >
                        {actionLoading === r.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => reject(r.id)}
                        disabled={actionLoading === r.id}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {reviewed.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Histórico</h3>
          <div className="border border-border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Papel concedido</TableHead>
                  <TableHead>Revisado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewed.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.email}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "approved" ? "default" : "secondary"}>
                        {r.status === "approved" ? "Aprovado" : "Recusado"}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.granted_role ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.reviewed_at ? new Date(r.reviewed_at).toLocaleString("pt-BR") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
