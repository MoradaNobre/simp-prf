import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type Mode = "login" | "signup" | "forgot" | "reset";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Check if we're on a password reset callback
  useState(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setMode("reset");
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu e-mail para confirmar o cadastro.");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        });
        if (error) throw error;
        toast.success("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
        setMode("login");
      } else if (mode === "reset") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success("Senha atualizada com sucesso!");
        setMode("login");
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro na autenticação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
              <Shield className="h-9 w-9 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">SIMP-PRF</h1>
            <p className="text-sm text-muted-foreground">Sistema de Manutenção Predial</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "forgot" && (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  Informe seu e-mail para receber o link de recuperação de senha.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.gov.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button className="w-full" size="lg" type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar Link de Recuperação
                </Button>
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="flex items-center gap-1 text-sm text-primary hover:underline mx-auto"
                >
                  <ArrowLeft className="h-3 w-3" /> Voltar ao login
                </button>
              </>
            )}

            {mode === "reset" && (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  Defina sua nova senha abaixo.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="password">Nova Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button className="w-full" size="lg" type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Atualizar Senha
                </Button>
              </>
            )}

            {(mode === "login" || mode === "signup") && (
              <>
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome Completo</Label>
                    <Input
                      id="fullName"
                      placeholder="Seu nome completo"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.gov.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-xs text-primary hover:underline"
                      >
                        Esqueceu a senha?
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button className="w-full" size="lg" type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "signup" ? "Criar Conta" : "Entrar"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  {mode === "signup" ? "Já tem conta?" : "Não tem conta?"}{" "}
                  <button
                    type="button"
                    onClick={() => setMode(mode === "signup" ? "login" : "signup")}
                    className="text-primary underline-offset-4 hover:underline font-medium"
                  >
                    {mode === "signup" ? "Fazer login" : "Criar conta"}
                  </button>
                </p>
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}