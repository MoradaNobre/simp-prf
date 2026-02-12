import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, AlertTriangle, CheckCircle, Clock } from "lucide-react";

const stats = [
  { label: "OS Abertas", value: "24", icon: ClipboardList, color: "text-info" },
  { label: "Urgentes", value: "5", icon: AlertTriangle, color: "text-destructive" },
  { label: "Concluídas (mês)", value: "47", icon: CheckCircle, color: "text-success" },
  { label: "MTTR Médio", value: "3.2h", icon: Clock, color: "text-warning" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da manutenção predial</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Corretiva vs. Preventiva</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Corretiva</span>
                  <span className="font-medium">42%</span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-destructive" style={{ width: "42%" }} />
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Preventiva</span>
                  <span className="font-medium">58%</span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: "58%" }} />
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Meta: 30% corretiva / 70% preventiva</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Disponibilidade Operacional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-5xl font-bold text-primary">91.3%</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Unidades 100% aptas ao serviço
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
