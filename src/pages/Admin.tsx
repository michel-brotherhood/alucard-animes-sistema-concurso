import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCosplayData } from "@/hooks/useCosplayData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminStats } from "@/components/admin/AdminStats";
import { ParticipantesTable } from "@/components/admin/ParticipantesTable";
import { NotasTable } from "@/components/admin/NotasTable";
import { LogOut, RefreshCw, Users, Star, Home, Loader2 } from "lucide-react";

export default function Admin() {
  const { user, signOut, isAdmin } = useAuth();
  const { inscritos, notas, loading, refresh } = useCosplayData();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-foreground">Painel Admin</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <Home className="h-4 w-4 mr-1" />
              Início
            </Button>
            <Button variant="ghost" size="sm" onClick={refresh}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <AdminStats inscritos={inscritos} notas={notas} />

        {/* Tabs */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Gerenciamento de Dados</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="participantes" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="participantes" className="gap-2">
                  <Users className="h-4 w-4" />
                  Participantes
                </TabsTrigger>
                <TabsTrigger value="notas" className="gap-2">
                  <Star className="h-4 w-4" />
                  Notas
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="participantes">
                <ParticipantesTable inscritos={inscritos} onRefresh={refresh} />
              </TabsContent>
              
              <TabsContent value="notas">
                <NotasTable inscritos={inscritos} notas={notas} onRefresh={refresh} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
