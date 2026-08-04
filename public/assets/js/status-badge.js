// Porta de src/components/StatusBadge.tsx — mapa status -> {label, cor}.
(function () {
  const MAP = {
    novo: { label: "Novo", color: "var(--chart-2)" },
    qualificando: { label: "Qualificando", color: "var(--warning)" },
    qualificado: { label: "Qualificado", color: "var(--primary)" },
    transferido: { label: "Transferido", color: "var(--chart-5)" },
    descartado: { label: "Descartado", color: "var(--muted-foreground)" },
  };

  function statusBadgeHtml(status) {
    const cfg = MAP[status] || MAP.novo;
    return `<span class="badge" style="background:color-mix(in srgb, ${cfg.color} 15%, transparent); color:${cfg.color}; border-color:color-mix(in srgb, ${cfg.color} 30%, transparent);"><span class="badge-dot"></span>${cfg.label}</span>`;
  }

  window.StatusBadge = { MAP, html: statusBadgeHtml };
})();
