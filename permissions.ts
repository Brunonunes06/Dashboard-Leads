// ============================================================
// PASSO 1: Configure aqui os 3 emails com acesso total ao SaaS
// ============================================================
export const ADMIN_EMAILS: string[] = [
  "myhpc3301@gmail.com", // DEV 
  "dono@seudominio.com", // Kaleb 
  "cruz.gustavo13@escola.pr.gov.br", //  Gustavo
];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase());
}
