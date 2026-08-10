// Som de notificação gerado na hora via Web Audio API — sem precisar de
// arquivo de áudio. Continua tocando mesmo com a aba em segundo plano (o
// navegador só pausa/limita timers, não áudio de uma conexão ativa como o
// canal Realtime que dispara isso).
let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) sharedContext = new Ctor();
  return sharedContext;
}

export function playNotificationSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;
    // Duas notas curtas (tipo "ding-ding") — mais perceptível que um bipe só.
    [880, 1318.5].forEach((freq, i) => {
      const start = now + i * 0.1;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.22, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  } catch (error) {
    console.error("[Som de notificação] Erro ao tocar:", error);
  }
}
