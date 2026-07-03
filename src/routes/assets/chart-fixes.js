(function () {
  function renderChartsWhenReady() {
    if (!window.APP_DATA || !window.Chart) return false;

    const barEl = document.getElementById("barChart");
    const pieEl = document.getElementById("pieChart");
    if (!barEl || !pieEl) return false;

    if (Chart.getChart(barEl) || Chart.getChart(pieEl)) {
      window.__dashboardChartsReady = true;
      return true;
    }

    const { weeklyData, sources } = window.APP_DATA;
    const total = sources.reduce((sum, item) => sum + item.value, 0);

    new Chart(barEl, {
      type: "bar",
      data: {
        labels: weeklyData.map((d) => d.day),
        datasets: [
          {
            label: "Leads",
            data: weeklyData.map((d) => d.leads),
            backgroundColor: "#06b6d4",
            borderRadius: 6,
          },
          {
            label: "Qualificados",
            data: weeklyData.map((d) => d.qualificados),
            backgroundColor: "#10b981",
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: "#cbd5e1" } },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.92)",
            borderColor: "#334155",
            borderWidth: 1,
            titleColor: "#fff",
            bodyColor: "#fff",
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#94a3b8" } },
          y: { grid: { color: "rgba(148,163,184,.1)" }, ticks: { color: "#94a3b8" } },
        },
      },
    });

    new Chart(pieEl, {
      type: "doughnut",
      data: {
        labels: sources.map((s) => s.name),
        datasets: [
          {
            data: sources.map((s) => s.value),
            backgroundColor: sources.map((s) => s.color),
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          legend: { display: false },
          tooltip: { titleColor: "#fff", bodyColor: "#fff" },
        },
      },
    });

    const sourceLegendEl = document.getElementById("sourceLegend");
    if (sourceLegendEl) {
      sourceLegendEl.innerHTML = sources
        .map(
          (s) => `
  <div class="row-hover" style="display:flex;justify-content:space-between;padding:6px 8px;border-radius:6px;font-size:12px;cursor:default">
    <div style="display:flex;align-items:center;gap:8px"><span class="dot" style="background:${s.color}"></span><span style="color:var(--muted)">${s.name}</span></div>
    <span style="font-weight:600">${Math.round((s.value / total) * 100)}%</span>
  </div>`,
        )
        .join("");
    }

    window.__dashboardChartsReady = true;
    return true;
  }

  function retry(remaining) {
    if (renderChartsWhenReady()) return;
    if (remaining <= 0) return;
    window.setTimeout(() => retry(remaining - 1), 150);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => retry(20));
  } else {
    retry(20);
  }
})();
