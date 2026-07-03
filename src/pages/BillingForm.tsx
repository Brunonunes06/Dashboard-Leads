// ============================================================
// PASSO 4: Tela de Cobrança — cartão de crédito + token
// Baseado na imagem: "Hoje tu vai cobrar no cartão (e nunca mais perder dinheiro por pix)"
// ============================================================
import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

// ⚠️ Instale o Stripe: bun add @stripe/stripe-js @stripe/react-stripe-js
// import { loadStripe } from "@stripe/stripe-js";
// import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
// const stripePromise = loadStripe("pk_live_SUA_CHAVE_PUBLICA_STRIPE");

interface BillingFormProps {
  onSuccess?: () => void;
  planName?: string;
  planPrice?: string;
}

export function BillingForm({
  onSuccess,
  planName = "Plano Pro",
  planPrice = "R$ 97/mês",
}: BillingFormProps) {
  const { updateBilling } = useAuth();
  const [step, setStep] = useState<"form" | "processing" | "success" | "error">("form");
  const [cardData, setCardData] = useState({
    number: "",
    name: "",
    expiry: "",
    cvv: "",
  });
  const [errorMsg, setErrorMsg] = useState("");

  // Formata número do cartão com espaços
  function formatCardNumber(value: string) {
    return value
      .replace(/\D/g, "")
      .slice(0, 16)
      .replace(/(.{4})/g, "$1 ")
      .trim();
  }

  // Formata validade MM/AA
  function formatExpiry(value: string) {
    const clean = value.replace(/\D/g, "").slice(0, 4);
    if (clean.length >= 3) return clean.slice(0, 2) + "/" + clean.slice(2);
    return clean;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStep("processing");
    setErrorMsg("");

    try {
      // ──────────────────────────────────────────────
      // INTEGRAÇÃO STRIPE (substitua o mock abaixo):
      // ──────────────────────────────────────────────
      // const stripe = await stripePromise;
      // const { paymentMethod, error } = await stripe!.createPaymentMethod({
      //   type: "card",
      //   card: elements.getElement(CardElement)!,
      //   billing_details: { name: cardData.name },
      // });
      // if (error) throw new Error(error.message);
      //
      // const response = await fetch("/api/billing/subscribe", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ paymentMethodId: paymentMethod!.id }),
      // });
      // if (!response.ok) throw new Error("Falha ao processar pagamento");
      // const { token } = await response.json();
      // ──────────────────────────────────────────────

      // MOCK para demonstração (remova após integrar Stripe):
      await new Promise((r) => setTimeout(r, 2000));
      const mockToken = `pm_mock_${Date.now()}`;

      updateBilling(mockToken);
      setStep("success");
      setTimeout(() => onSuccess?.(), 1500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao processar cartão.");
      setStep("error");
    }
  }

  if (step === "processing") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-12 h-12 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-300 text-sm">Verificando seu cartão...</p>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="text-5xl">✅</div>
        <h3 className="text-xl font-bold text-white">Pagamento confirmado!</h3>
        <p className="text-slate-400 text-sm">
          Acesso liberado. Nunca mais perca dinheiro por PIX.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header com frase da imagem */}
        <div className="text-center mb-8">
          <div className="inline-block bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-5 py-3 mb-6">
            <p className="text-emerald-400 font-semibold text-sm leading-snug">
              💳 Hoje você vai cobrar no cartão
              <br />
              <span className="text-white font-bold">(e nunca mais perder dinheiro por PIX)</span>
            </p>
          </div>
          <h1 className="text-2xl font-bold text-white">{planName}</h1>
          <p className="text-emerald-400 text-3xl font-black mt-1">{planPrice}</p>
        </div>

        {/* Card Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-5">Dados do Cartão</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Número */}
            <div>
              <label className="text-slate-400 text-xs font-medium uppercase tracking-wide block mb-1.5">
                Número do Cartão
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0000 0000 0000 0000"
                value={cardData.number}
                onChange={(e) =>
                  setCardData({ ...cardData, number: formatCardNumber(e.target.value) })
                }
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600 tracking-widest"
                required
              />
            </div>

            {/* Nome */}
            <div>
              <label className="text-slate-400 text-xs font-medium uppercase tracking-wide block mb-1.5">
                Nome no Cartão
              </label>
              <input
                type="text"
                placeholder="NOME COMO NO CARTÃO"
                value={cardData.name}
                onChange={(e) => setCardData({ ...cardData, name: e.target.value.toUpperCase() })}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600 uppercase tracking-wider"
                required
              />
            </div>

            {/* Validade + CVV */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-xs font-medium uppercase tracking-wide block mb-1.5">
                  Validade
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="MM/AA"
                  value={cardData.expiry}
                  onChange={(e) =>
                    setCardData({ ...cardData, expiry: formatExpiry(e.target.value) })
                  }
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
                  required
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs font-medium uppercase tracking-wide block mb-1.5">
                  CVV
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  placeholder="•••"
                  maxLength={4}
                  value={cardData.cvv}
                  onChange={(e) =>
                    setCardData({
                      ...cardData,
                      cvv: e.target.value.replace(/\D/g, "").slice(0, 4),
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            {/* Erro */}
            {step === "error" && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{errorMsg}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 rounded-xl transition-colors text-sm mt-2"
            >
              Confirmar Assinatura {planPrice}
            </button>
          </form>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-4 mt-5">
            <span className="text-slate-600 text-xs flex items-center gap-1">🔒 SSL Seguro</span>
            <span className="text-slate-600 text-xs flex items-center gap-1">💳 Stripe</span>
            <span className="text-slate-600 text-xs flex items-center gap-1">✅ Cancelável</span>
          </div>
        </div>
      </div>
    </div>
  );
}
