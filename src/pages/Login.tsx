import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Clock } from "lucide-react";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const signupSchema = authSchema.extend({
  displayName: z.string().min(2, "Nome muito curto").max(60, "Nome muito longo"),
});

export default function Login() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<null | "pending" | "rejected">(null);
  const { user, signIn, signOut, isAdmin, isJuror, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Após login, decide destino com base em status do pedido
  useEffect(() => {
    if (loading || !user) return;
    (async () => {
      const { data } = await supabase.rpc("my_access_request_status");
      const row = (data as any[])?.[0];
      if (row?.status === "pending") {
        setPendingStatus("pending");
        return;
      }
      if (row?.status === "rejected") {
        setPendingStatus("rejected");
        return;
      }
      if (isAdmin) navigate("/admin", { replace: true });
      else if (isJuror) navigate("/avaliacao", { replace: true });
      else navigate("/", { replace: true });
    })();
  }, [user, loading, isAdmin, isJuror, navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const v = authSchema.safeParse({ email, password });
      if (!v.success) {
        toast({ title: "Erro", description: v.error.errors[0].message, variant: "destructive" });
        return;
      }
      const { error } = await signIn(email, password);
      if (error) {
        const msg = error.message.includes("Invalid login credentials")
          ? "Email ou senha incorretos"
          : error.message;
        toast({ title: "Erro", description: msg, variant: "destructive" });
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const v = signupSchema.safeParse({ email, password, displayName });
      if (!v.success) {
        toast({ title: "Erro", description: v.error.errors[0].message, variant: "destructive" });
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        toast({
          title: "Conta criada",
          description: "Seu pedido de acesso foi enviado para o administrador.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (pendingStatus) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl text-foreground">
              {pendingStatus === "pending" ? "Aguardando aprovação" : "Acesso recusado"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {pendingStatus === "pending"
                ? "Seu pedido foi enviado ao administrador. Você será notificado após a aprovação."
                : "Seu pedido de acesso foi recusado. Entre em contato com o administrador."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                await signOut();
                setPendingStatus(null);
              }}
            >
              Sair
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => navigate("/ranking")}>
              Ver ranking público
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl text-foreground">Acesso ao Sistema</CardTitle>
          <CardDescription className="text-muted-foreground">
            Entre ou solicite acesso. Novos cadastros precisam de aprovação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Solicitar acesso</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-login">Email</Label>
                  <Input
                    id="email-login" type="email" required autoComplete="email"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pwd-login">Senha</Label>
                  <Input
                    id="pwd-login" type="password" required autoComplete="current-password"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Entrar
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name-signup">Nome</Label>
                  <Input
                    id="name-signup" required value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-signup">Email</Label>
                  <Input
                    id="email-signup" type="email" required autoComplete="email"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pwd-signup">Senha</Label>
                  <Input
                    id="pwd-signup" type="password" required autoComplete="new-password"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Solicitar acesso
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Seu pedido será enviado ao administrador. Você só poderá entrar após aprovação.
                </p>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <Button variant="ghost" onClick={() => navigate("/ranking")} className="text-muted-foreground">
              ← Ver ranking público
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
