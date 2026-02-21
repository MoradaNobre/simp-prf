import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ClipboardList,
  Wrench,
  BarChart3,
  FileText,
  Shield,
  Building2,
  ChevronRight,
  Play,
  ArrowRight,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import logoImg from "@/assets/logo.jpg";
import heroBg from "@/assets/hero-bg.jpg";
import featureManutencao from "@/assets/feature-manutencao.jpg";
import featureDashboard from "@/assets/feature-dashboard.png";
import demoVideo from "@/assets/demo-video.mp4";
import { useRef, useState } from "react";

const features = [
  {
    icon: ClipboardList,
    title: "Ordens de Serviço",
    description:
      "Abertura, acompanhamento e encerramento de OS corretivas e preventivas com fluxo completo de aprovação.",
  },
  {
    icon: Wrench,
    title: "Manutenção Preventiva",
    description:
      "Planos de manutenção com frequências configuráveis e geração automática de ordens de serviço.",
  },
  {
    icon: BarChart3,
    title: "Dashboard Analítico",
    description:
      "Visualização em tempo real de indicadores, gráficos de desempenho e status das manutenções.",
  },
  {
    icon: FileText,
    title: "Contratos & Orçamento",
    description:
      "Gestão de contratos com fornecedores, controle de saldo, empenhos e créditos orçamentários.",
  },
  {
    icon: Shield,
    title: "Controle de Acesso",
    description:
      "Perfis hierárquicos (Gestor Nacional, Regional, Fiscal, Operador, Preposto) com permissões granulares.",
  },
  {
    icon: Building2,
    title: "Gestão de Unidades",
    description:
      "Cadastro de regionais, delegacias e UOPs com geolocalização e inventário de equipamentos.",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayVideo = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="SIMP Logo" className="h-10 w-10 rounded-lg object-cover" />
            <span className="text-lg font-bold tracking-tight text-foreground">
              SIMP
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button onClick={() => navigate("/login")} className="gap-2">
              Acessar Sistema <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroBg}
            alt="SIMP Dashboard"
            className="h-full w-full object-cover opacity-20 dark:opacity-10"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Shield className="h-4 w-4" />
              Sistema de Manutenção Predial
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Gestão inteligente de{" "}
              <span className="text-primary">manutenção predial</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Controle completo de ordens de serviço, contratos, orçamentos e
              manutenções preventivas — tudo em uma plataforma integrada,
              segura e responsiva.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" onClick={() => navigate("/login")} className="gap-2 text-base px-8">
                Entrar no Sistema <ChevronRight className="h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() =>
                  document.getElementById("video-section")?.scrollIntoView({ behavior: "smooth" })
                }
                className="gap-2 text-base px-8"
              >
                <Play className="h-5 w-5" /> Ver Demonstração
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Funcionalidades
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Uma suíte completa para gerenciar a manutenção predial de ponta a ponta.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card
              key={f.title}
              className="group relative overflow-hidden border-border/60 transition-shadow hover:shadow-lg"
            >
              <CardContent className="p-6">
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Imagens de destaque */}
      <section className="bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Manutenção profissional e organizada
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Gerencie equipes de manutenção, acompanhe a execução de serviços
                em tempo real e garanta a qualidade das entregas com relatórios
                detalhados e rastreabilidade completa.
              </p>
              <Button
                variant="link"
                className="mt-4 gap-1 p-0 text-primary"
                onClick={() => navigate("/login")}
              >
                Comece a usar agora <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="overflow-hidden rounded-xl shadow-2xl">
              <img
                src={featureManutencao}
                alt="Manutenção profissional"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>

          <div className="mt-20 grid items-center gap-12 lg:grid-cols-2">
            <div className="order-2 lg:order-1 overflow-hidden rounded-xl shadow-2xl">
              <img
                src={featureDashboard}
                alt="Dashboard analítico"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Dados e indicadores na palma da mão
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Dashboard com gráficos interativos, filtros por regional e
                período, e exportação de relatórios em PDF. Tome decisões
                baseadas em dados reais.
              </p>
              <Button
                variant="link"
                className="mt-4 gap-1 p-0 text-primary"
                onClick={() => navigate("/login")}
              >
                Acessar o dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Vídeo */}
      <section id="video-section" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Veja o SIMP em ação
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Assista ao vídeo demonstrativo e conheça o funcionamento do sistema.
          </p>
        </div>
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl shadow-2xl bg-card border border-border">
          <video
            ref={videoRef}
            src={demoVideo}
            controls={isPlaying}
            className="w-full aspect-video object-cover"
            poster={heroBg}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          {!isPlaying && (
            <button
              onClick={handlePlayVideo}
              className="absolute inset-0 flex items-center justify-center bg-foreground/20 transition-colors hover:bg-foreground/30"
              aria-label="Reproduzir vídeo"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl">
                <Play className="h-8 w-8 ml-1" />
              </div>
            </button>
          )}
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-primary">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
            Pronto para modernizar sua gestão predial?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-primary-foreground/80">
            Acesse o SIMP e comece a gerenciar suas ordens de serviço,
            contratos e manutenções de forma eficiente.
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate("/login")}
            className="mt-8 gap-2 text-base px-8"
          >
            Acessar o Sistema <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <img src={logoImg} alt="SIMP" className="h-8 w-8 rounded object-cover" />
              <span className="text-sm font-semibold">SIMP - Sistema de Manutenção Predial</span>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
