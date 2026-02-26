import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ClipboardList,
  Shield,
  User,
  Mail,
  Phone,
  FileText,
  Lock,
  Server,
  Code,
  Database,
  ExternalLink,
} from "lucide-react";

const BUILD_DATE = new Date().toLocaleDateString("pt-BR");

export default function Sobre() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sobre o Sistema</h1>
        <p className="text-muted-foreground">
          Informações sobre o SIMP, desenvolvedor e documentação
        </p>
      </div>

      {/* Sistema */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            SIMP – Sistema de Manutenção Predial
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            O SIMP é uma aplicação web desenvolvida para uso interno da Polícia
            Rodoviária Federal (PRF), com o objetivo de otimizar a gestão de
            manutenção predial das unidades operacionais em todo o território
            nacional.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoItem
              icon={<Server className="h-4 w-4" />}
              label="Versão"
              value="1.0"
            />
            <InfoItem
              icon={<Code className="h-4 w-4" />}
              label="Build"
              value={BUILD_DATE}
            />
            <InfoItem
              icon={<Database className="h-4 w-4" />}
              label="Stack"
              value="React + TypeScript + PostgreSQL"
            />
            <InfoItem
              icon={<Shield className="h-4 w-4" />}
              label="Segurança"
              value="RLS + Criptografia AES-256"
            />
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Principais Funcionalidades
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                "Ordens de Serviço",
                "Contratos",
                "Ativos",
                "Orçamento",
                "Relatórios",
                "Dashboard",
                "Auditoria",
                "Notificações por E-mail",
              ].map((feat) => (
                <Badge key={feat} variant="secondary" className="text-xs">
                  {feat}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Desenvolvedor */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            Desenvolvedor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                Daniel Nunes de Ávila
              </p>
              <p className="text-sm text-muted-foreground">
                Servidor da Polícia Rodoviária Federal
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="mailto:daniel.avila@prf.gov.br"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Mail className="h-4 w-4" />
              daniel.avila@prf.gov.br
            </a>
            <a
              href="tel:+5581995073100"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Phone className="h-4 w-4" />
              (81) 9.9507-3100
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Documentação */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Documentação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/app/documento?doc=tecnico"
              className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-all group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Documentação Técnica
                </p>
                <p className="text-xs text-muted-foreground">
                  Arquitetura, segurança e especificações
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>

            <Link
              to="/app/documento?doc=privacidade"
              className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-all group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Política de Privacidade
                </p>
                <p className="text-xs text-muted-foreground">
                  LGPD, dados coletados e seus direitos
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>

            <Link
              to="/app/documento?doc=prd"
              className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-all group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Requisitos do Produto (PRD)
                </p>
                <p className="text-xs text-muted-foreground">
                  Requisitos funcionais e não funcionais
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Rodapé */}
      <p className="text-xs text-muted-foreground text-center pb-4">
        © {new Date().getFullYear()} Polícia Rodoviária Federal — SIMP v1.0
      </p>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-sm">
        <span className="text-muted-foreground">{label}:</span>{" "}
        <span className="font-medium text-foreground">{value}</span>
      </span>
    </div>
  );
}
