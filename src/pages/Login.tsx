import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Shield, Loader2, ArrowLeft, Eye, EyeOff, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type Mode = "login" | "signup" | "forgot" | "reset";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [regionalId, setRegionalId] = useState("");
  const [regionais, setRegionais] = useState<{ id: string; nome: string; sigla: string }[]>([]);
  const [mode, setMode] = useState<Mode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const isValidPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    return digits.length === 10 || digits.length === 11;
  };

  const isPrfEmail = email.trim().toLowerCase().endsWith("@prf.gov.br");

  // Fetch regionais when entering signup mode
  useEffect(() => {
    if (mode === "signup" && regionais.length === 0) {
      supabase.from("regionais").select("id, nome, sigla").order("sigla").then(({ data }) => {
        if (data) setRegionais(data);
      });
    }
  }, [mode]);

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
        if (!isValidPhone(phone)) {
          toast.error("Informe um telefone válido com DDD. Ex: (81) 99507-3100");
          setLoading(false);
          return;
        }
        const metadata: Record<string, string> = { full_name: fullName, phone: phone.replace(/\D/g, "") };
        if (isPrfEmail && regionalId) {
          metadata.regional_id = regionalId;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: metadata,
          },
        });
        if (error) throw error;

        if (isPrfEmail && !regionalId) {
          toast.warning("Conta criada, mas sem regional vinculada. Peça a um administrador para vincular.");
        }
        toast.success("Conta criada! Verifique seu e-mail para confirmar o cadastro.");
        setEmail("");
        setPassword("");
        setFullName("");
        setPhone("");
        setRegionalId("");
        setMode("login");
      } else if (mode === "forgot") {
        // Use custom edge function instead of default resetPasswordForEmail
        const { data, error } = await supabase.functions.invoke("send-auth-email", {
          body: {
            email,
            type: "recovery",
            redirect_to: `${window.location.origin}/login`,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        toast.success("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
        setMode("login");
      } else if (mode === "reset") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success("Senha atualizada com sucesso!");
        setMode("login");
        navigate("/app");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/app");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro na autenticação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary/5 p-4 relative">
      <a
        href="https://notebooklm.google.com/notebook/500f6b8a-cf93-44f3-a522-29b0ab49e608"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        title="Ajuda"
      >
        <HelpCircle className="h-6 w-6" />
      </a>
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
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
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
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone com DDD *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(81) 99507-3100"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
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
                {mode === "signup" && isPrfEmail && (
                  <div className="space-y-2">
                    <Label>Regional *</Label>
                    <Select value={regionalId} onValueChange={setRegionalId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione sua regional..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {regionais.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.sigla} — {r.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Selecione a regional onde você trabalha para poder criar OS imediatamente.
                    </p>
                  </div>
                )}
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
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
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