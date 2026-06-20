import { Badge } from "@/components/ui/badge";
import type { LeadStatus } from "@/data/mockLeads";
;

const map: Record<LeadStatus, { label: string; className: string }> = {
  novo: { label: "Novo", className: "bg-chart-2/15 text-chart-2 border-chart-2/30" },
  qualificando: { label: "Qualificando", className: "bg-warning/15 text-warning border-warning/30" },
  qualificado: { label: "Qualificado", className: "bg-primary/15 text-primary border-primary/30" },
  transferido: { label: "Transferido", className: "bg-chart-5/15 text-chart-5 border-chart-5/30" },
  descartado: { label: "Descartado", className: "bg-muted text-muted-foreground border-border" },
};

export function StatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  const cfg = map[status];
  return (
    <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider", cfg.className, className)}>
      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {cfg.label}
    </Badge>
  );
}
