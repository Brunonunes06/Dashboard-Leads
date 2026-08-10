// Mensagem de foto reaproveita exatamente o mesmo esquema do avatar em
// profile.tsx: converte o arquivo pra data URL (base64) via FileReader e
// grava direto no campo de texto da mensagem — sem bucket de storage nem
// coluna nova. Esse prefixo é como o resto do app reconhece que o
// "content" de uma mensagem é uma foto, não texto.
export const IMAGE_DATA_URL_PREFIX = "data:image/";

export function isImageMessage(content: string): boolean {
  return content.startsWith(IMAGE_DATA_URL_PREFIX);
}

// Limite só pra chat (profile.tsx não tem nenhum) — uma foto de câmera de
// celular sem compressão pode passar de 10MB, e isso vira um payload de
// Realtime gigante pra todo mundo na conversa a cada envio.
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

// Prévia de "última mensagem" (listas de conversa, notificações) — nunca
// mostra o base64 cru de uma foto como se fosse texto.
export function formatMessagePreview(content: string | null | undefined): string | null {
  if (!content) return null;
  return isImageMessage(content) ? "📷 Foto" : content;
}
