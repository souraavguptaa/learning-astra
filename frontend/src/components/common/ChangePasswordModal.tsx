import { useState } from "react";
import { useChangePassword } from "../../features/auth.js";
import { useAuth } from "../../lib/authContext.js";

export function ChangePasswordModal({ onClose, forced }: { onClose?: () => void; forced?: boolean }) {
  const { logout } = useAuth();
  const changePassword = useChangePassword();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.newPassword !== form.confirmPassword) {
      setError("New passwords don't match.");
      return;
    }
    try {
      await changePassword.mutateAsync(form);
      await logout(); // sessions were revoked server-side too — sign back in with the new password
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not change password. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[150] p-6">
      <div className="bg-white rounded-lg max-w-sm w-full p-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">{forced ? "Set a new password to continue" : "Change Password"}</h3>
          {!forced && (
            <button className="text-slate-500" onClick={onClose}>
              Close
            </button>
          )}
        </div>
        {forced && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mb-2">
            You're using a temporary password. Set your own password to keep using your account.
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            type="password"
            placeholder="Current password"
            required
            value={form.currentPassword}
            onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
            className="w-full rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
          />
          <input
            type="password"
            placeholder="New password (min 8 characters)"
            required
            minLength={8}
            value={form.newPassword}
            onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
            className="w-full rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            required
            minLength={8}
            value={form.confirmPassword}
            onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
            className="w-full rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            disabled={changePassword.isPending}
            className="w-full rounded-md bg-astra text-white shadow-clay-sm py-1.5 text-sm font-medium disabled:opacity-60"
          >
            {changePassword.isPending ? "Changing…" : "Change password"}
          </button>
          <p className="text-[11px] text-slate-400">You'll be signed out and need to log back in with your new password.</p>
        </form>
      </div>
    </div>
  );
}
