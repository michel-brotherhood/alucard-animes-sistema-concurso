import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, RefreshCw, Shield, Gavel, Trash2 } from "lucide-react";
import { CreateUserDialog } from "./CreateUserDialog";
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

type AppRole = "admin" | "judge" | "viewer" | "juror";

interface UserWithRoles {
  user_id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  roles: AppRole[];
}

export function RolesTable() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.rpc("list_users_with_roles" as any);
    if (error) {
      toast({
        title: "Erro ao carregar usuários",
        description: error.message,
        variant: "destructive",
      });
      setUsers([]);
    } else {
      setUsers((data ?? []) as UserWithRoles[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleRole(userId: string, role: AppRole, grant: boolean) {
    setBusyId(`${userId}:${role}`);
    const { error } = await supabase.rpc("set_user_role" as any, {
      _user_id: userId,
      _role: role,
      _grant: grant,
    });
    if (error) {
      toast({
        title: "Erro ao atualizar papel",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: grant ? "Papel concedido" : "Papel revogado",
        description: `${role} ${grant ? "concedido" : "revogado"} com sucesso.`,
      });
      // atualização otimista
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === userId
            ? {
                ...u,
                roles: grant
                  ? Array.from(new Set([...u.roles, role]))
                  : u.roles.filter((r) => r !== role),
              }
            : u,
        ),
      );
    }
    setBusyId(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {users.length} usuário(s) cadastrado(s)
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
          <CreateUserDialog onCreated={load} />
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:block rounded-md border border-border/50">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Papéis</TableHead>
              <TableHead className="w-[140px]">Jurado</TableHead>
              <TableHead className="w-[140px]">Admin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const isJuror = u.roles.includes("juror");
              const isAdmin = u.roles.includes("admin");
              const isSelf = u.user_id === currentUser?.id;
              return (
                <TableRow key={u.user_id}>
                  <TableCell>
                    <div className="font-medium text-foreground">
                      {u.email ?? "—"}
                      {isSelf && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          você
                        </Badge>
                      )}
                    </div>
                    {u.display_name && (
                      <div className="text-xs text-muted-foreground">
                        {u.display_name}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 && (
                        <span className="text-xs text-muted-foreground">
                          nenhum
                        </span>
                      )}
                      {u.roles.map((r) => (
                        <Badge
                          key={r}
                          variant={r === "admin" ? "default" : "secondary"}
                        >
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={isJuror}
                      disabled={busyId === `${u.user_id}:juror`}
                      onCheckedChange={(v) => toggleRole(u.user_id, "juror", v)}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={isAdmin}
                      disabled={
                        busyId === `${u.user_id}:admin` || (isSelf && isAdmin)
                      }
                      onCheckedChange={(v) => toggleRole(u.user_id, "admin", v)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {users.map((u) => {
          const isJuror = u.roles.includes("juror");
          const isAdmin = u.roles.includes("admin");
          const isSelf = u.user_id === currentUser?.id;
          return (
            <Card key={u.user_id} className="border-border/50 bg-card/80">
              <CardContent className="p-4 space-y-3">
                <div>
                  <div className="font-medium text-foreground break-all">
                    {u.email ?? "—"}
                    {isSelf && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        você
                      </Badge>
                    )}
                  </div>
                  {u.display_name && (
                    <div className="text-xs text-muted-foreground">
                      {u.display_name}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {u.roles.length === 0 && (
                      <span className="text-xs text-muted-foreground">
                        sem papéis
                      </span>
                    )}
                    {u.roles.map((r) => (
                      <Badge
                        key={r}
                        variant={r === "admin" ? "default" : "secondary"}
                      >
                        {r}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2 text-sm">
                    <Gavel className="h-4 w-4 text-muted-foreground" />
                    Jurado
                  </div>
                  <Switch
                    checked={isJuror}
                    disabled={busyId === `${u.user_id}:juror`}
                    onCheckedChange={(v) => toggleRole(u.user_id, "juror", v)}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    Admin
                  </div>
                  <Switch
                    checked={isAdmin}
                    disabled={
                      busyId === `${u.user_id}:admin` || (isSelf && isAdmin)
                    }
                    onCheckedChange={(v) => toggleRole(u.user_id, "admin", v)}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
