import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6 text-sm leading-relaxed">
      <div>
        <h1 className="text-2xl font-semibold">Política de Privacidade</h1>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
        </p>
      </div>

      <section>
        <h2 className="font-semibold">1. Quais dados coletamos</h2>
        <p className="mt-1 text-muted-foreground">
          Nome, e-mail, telefone e foto de perfil (quando você faz login com o Google); dados de
          leads e conversas de WhatsApp/Instagram que você gerencia na plataforma; endereço IP,
          para prevenção de fraude e abuso de conta.
        </p>
      </section>

      <section>
        <h2 className="font-semibold">2. Para que usamos</h2>
        <p className="mt-1 text-muted-foreground">
          Autenticação e identificação da sua conta; qualificação de leads via inteligência
          artificial; comunicação por e-mail/WhatsApp relacionada ao serviço; segurança (detecção
          de fraude, limite de contas por IP).
        </p>
      </section>

      <section>
        <h2 className="font-semibold">3. Com quem compartilhamos</h2>
        <p className="mt-1 text-muted-foreground">
          Provedores usados para operar o serviço: Supabase (banco de dados e autenticação),
          Google (login), OpenAI (geração de respostas por IA) e Mercado Pago (pagamentos via
          Pix). Não vendemos seus dados a terceiros.
        </p>
      </section>

      <section>
        <h2 className="font-semibold">4. Seus direitos (Art. 18 da LGPD)</h2>
        <p className="mt-1 text-muted-foreground">
          Você pode solicitar a confirmação, correção, portabilidade ou eliminação dos seus dados
          a qualquer momento. Para solicitar a exclusão da sua conta e dados, acesse{" "}
          <span className="font-medium text-foreground">Perfil → Excluir meus dados</span>.
        </p>
      </section>

      <section>
        <h2 className="font-semibold">5. Cookies</h2>
        <p className="mt-1 text-muted-foreground">
          Usamos cookies essenciais (sessão de login) e, quando você aceita, cookies de idioma e
          preferências de tema. Você pode gerenciar isso no banner de cookies exibido na primeira
          visita.
        </p>
      </section>

      <p className="text-xs text-muted-foreground">
        Este texto é um modelo técnico de base — recomendamos revisão por um profissional jurídico
        antes de publicar como sua política oficial.
      </p>
    </div>
  );
}
