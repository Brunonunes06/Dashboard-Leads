// Botão "⋮" que aparece ao passar o mouse (desktop) ou ao pressionar e
// segurar (mobile/tablet) por cima de uma mensagem própria, com a opção de
// excluir. Compartilhado entre ChatWindow.tsx e SupportChatWindow.tsx.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreVertical, Trash2 } from "lucide-react";

interface MessageDeleteMenuProps {
  onDelete: () => void;
  align: "left" | "right";
  maxWidth?: string;
  children: ReactNode;
}

// Sair do hover não esconde o botão na hora — dá uma folga (350ms) pro
// cursor "escorregar" até ele sem sumir antes de dar tempo de clicar.
const HIDE_DELAY_MS = 350;

export function MessageDeleteMenu({ onDelete, align, maxWidth = "70%", children }: MessageDeleteMenuProps) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startLongPress = () => {
    longPressTimer.current = setTimeout(() => setMenuOpen(true), 500);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleMouseEnter = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setHovered(true);
  };
  const handleMouseLeave = () => {
    hideTimer.current = setTimeout(() => setHovered(false), HIDE_DELAY_MS);
  };

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  return (
    <div
      // display: "table" — truque clássico de "encolhe pro conteúdo" sem
      // ambiguidade. inline-block/fit-content ficaram inconsistentes com
      // texto curto sem espaço (ex.: "asd"): o layout de tabela calcula o
      // tamanho do conteúdo ANTES de decidir onde quebrar linha, então não
      // "acha" que cabe só 1 letra por linha.
      style={{ position: "relative", display: "table", maxWidth }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={startLongPress}
      onTouchEnd={cancelLongPress}
      onTouchMove={cancelLongPress}
      onContextMenu={(e) => {
        // Em muitos navegadores mobile, tocar e segurar abre o menu nativo
        // de seleção/copiar — evita isso pra não brigar com o nosso menu.
        e.preventDefault();
        setMenuOpen(true);
      }}
    >
      {children}

      {/* Dentro da própria bolha (não flutuando na margem de fora) — assim
          sempre tem espaço pra aparecer, sem depender de sobrar área vazia
          ao lado. Sempre presente (não só condicionado a "hovered") pra não
          depender do evento de mouse pegar direito; opacidade baixa até
          passar o mouse/tocar, então nunca "some" de vez. */}
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        aria-label="Mais opções"
        style={{
          position: "absolute",
          top: 4,
          ...(align === "right" ? { right: 4 } : { left: 4 }),
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: "none",
          background: "rgba(0,0,0,.32)",
          color: "#fff",
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          padding: 0,
          opacity: hovered || menuOpen ? 1 : 0.55,
          zIndex: 5,
        }}
      >
        <MoreVertical size={12} />
      </button>

      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div
            style={{
              position: "absolute",
              top: 26,
              ...(align === "right" ? { right: 0 } : { left: 0 }),
              zIndex: 41,
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              boxShadow: "0 8px 24px rgba(0,0,0,.35)",
              overflow: "hidden",
              minWidth: 160,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onDelete();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "9px 12px",
                border: "none",
                background: "transparent",
                color: "#ef4444",
                fontSize: 13,
                cursor: "pointer",
                textAlign: "left",
                whiteSpace: "nowrap",
              }}
            >
              <Trash2 size={14} /> Excluir mensagem
            </button>
          </div>
        </>
      )}
    </div>
  );
}
