import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

const STORAGE_KEY = "lgpd_cookie_consent";

export function CookieConsent() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!localStorage.getItem(STORAGE_KEY));
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(STORAGE_KEY, "declined");
    localStorage.removeItem("locale");
    localStorage.removeItem("theme");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex flex-wrap items-center justify-between gap-3 border-t bg-card p-4 text-sm shadow-lg">
      <p className="max-w-2xl text-muted-foreground">
        {t("cookies.message")}{" "}
        <Link to="/privacy" className="underline">
          {t("cookies.learnMore")}
        </Link>
      </p>
      <div className="flex shrink-0 gap-2">
        <Button variant="outline" size="sm" onClick={decline}>
          {t("cookies.decline")}
        </Button>
        <Button size="sm" onClick={accept}>
          {t("cookies.accept")}
        </Button>
      </div>
    </div>
  );
}
