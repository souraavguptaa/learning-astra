import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { LanguageSwitcher } from "../../components/common/LanguageSwitcher.js";
import { Spinner } from "../../components/common/Spinner.js";
import { ThemeToggle } from "../../components/common/ThemeToggle.js";
import { useAuth } from "../../lib/authContext.js";

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [slow, setSlow] = useState(false);
  const slowTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (submitting) {
      slowTimer.current = setTimeout(() => setSlow(true), 4000);
    } else {
      clearTimeout(slowTimer.current);
      setSlow(false);
    }
    return () => clearTimeout(slowTimer.current);
  }, [submitting]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError(t("login.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-clay-bg flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient drifting blobs — slow, decorative depth for an otherwise single-viewport page
          (no scrollable hero content here for true scroll-tied parallax). */}
      <div
        aria-hidden="true"
        className="drift-slow absolute -top-24 -left-24 w-72 h-72 rounded-full bg-astra/10 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="drift-slow-reverse absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-astra/10 blur-3xl pointer-events-none"
      />
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <div className="modal-panel relative w-full max-w-sm bg-white rounded-xl shadow-clay p-8 space-y-6">
        <div className="text-center space-y-1">
          <img src="/images/sastasundar-logo.png" alt="SastaSundar" className="h-10 w-auto mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-astra flex items-center justify-center gap-2">
            <img src="/images/learning-astra-logo.png" alt="" className="h-7 w-7 rounded-full" />
            Learning Astra
          </h1>
          <p className="text-sm text-slate-500">{t("login.subtitle")}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("login.emailLabel")}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md shadow-clay-inset px-3 py-2 focus:outline-none focus:ring-2 focus:ring-astra"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("login.passwordLabel")}</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md shadow-clay-inset px-3 py-2 focus:outline-none focus:ring-2 focus:ring-astra"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          {slow && <p className="text-sm text-slate-500">{t("login.slow")}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-astra hover:bg-astra-dark text-white py-2 font-medium disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {submitting && <Spinner className="w-4 h-4" />}
            {submitting ? t("login.signingIn") : t("login.signIn")}
          </button>
        </form>
        <p className="text-xs text-center text-slate-400">{t("login.noSignup")}</p>
      </div>
    </div>
  );
}
