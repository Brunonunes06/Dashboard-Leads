// Porta do padrão beforeLoad do TanStack Router: espera a sessão do Supabase
// resolver antes de mostrar a página, redirecionando se a condição não for
// satisfeita — evita o "flash" de conteúdo protegido antes do auth resolver.
(function () {
  function waitForFirstAuthResolve() {
    return new Promise((resolve) => {
      if (!window.AppAuth) {
        document.addEventListener("app-config-ready", () => waitForFirstAuthResolve().then(resolve), { once: true });
        return;
      }
      const unsubscribe = window.AppAuth.onChange((user) => {
        unsubscribe();
        resolve(user);
      });
      // fallback: se a sessão já tiver resolvido antes deste listener (raro,
      // mas possível se supabase-client.js/auth.js já rodaram síncrono)
      setTimeout(() => {
        unsubscribe();
        resolve(window.AppAuth.getUser());
      }, 4000);
    });
  }

  async function requireSession(redirectTo) {
    const user = await waitForFirstAuthResolve();
    if (!user) {
      window.location.replace(redirectTo || "/index.html");
      return null;
    }
    document.getElementById("page-content")?.removeAttribute("hidden");
    return user;
  }

  async function requireAdmin(redirectTo) {
    const user = await waitForFirstAuthResolve();
    if (!user || user.role !== "admin") {
      window.location.replace(redirectTo || "/index.html");
      return null;
    }
    document.getElementById("page-content")?.removeAttribute("hidden");
    return user;
  }

  window.RouteGuard = { requireSession, requireAdmin };
})();
