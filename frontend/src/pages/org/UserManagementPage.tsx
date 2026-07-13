import { useState } from "react";
import type { UserRole } from "../../lib/authContext.js";
import {
  useCreateFranchise,
  useCreateUser,
  useFranchises,
  useResetPassword,
  useSetUserActive,
  useUsers,
} from "../../features/org.js";

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  trainer: "Trainer",
  franchise_owner: "Franchise Owner",
  operator: "Operator",
  employee: "Employee",
};

const FRANCHISE_LINKED_ROLES: UserRole[] = ["franchise_owner", "operator"];

export function UserManagementPage({ creatableRoles }: { creatableRoles: UserRole[] }) {
  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: franchises } = useFranchises();
  const createUser = useCreateUser();
  const createFranchise = useCreateFranchise();
  const setActive = useSetUserActive();
  const resetPassword = useResetPassword();

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: creatableRoles[0],
    franchiseId: "",
    location: "",
  });
  const [franchiseForm, setFranchiseForm] = useState({ name: "", code: "", location: "" });
  const [lastCreated, setLastCreated] = useState<{ email: string; tempPassword: string } | null>(null);

  const canManageFranchises = creatableRoles.some((r) => FRANCHISE_LINKED_ROLES.includes(r));

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    const result = await createUser.mutateAsync({
      name: form.name,
      email: form.email,
      role: form.role,
      franchiseId: form.franchiseId || undefined,
      location: form.location || undefined,
    });
    setLastCreated({ email: result.user.email, tempPassword: result.tempPassword });
    setForm({ name: "", email: "", role: creatableRoles[0], franchiseId: "", location: "" });
  }

  async function handleCreateFranchise(e: React.FormEvent) {
    e.preventDefault();
    await createFranchise.mutateAsync({
      name: franchiseForm.name,
      code: franchiseForm.code || undefined,
      location: franchiseForm.location || undefined,
    });
    setFranchiseForm({ name: "", code: "", location: "" });
  }

  async function handleResetPassword(id: string) {
    const result = await resetPassword.mutateAsync(id);
    setLastCreated(result);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Users & Org</h1>
        <p className="text-slate-500 mt-1">Create and manage accounts. There is no self-signup.</p>
      </div>

      {lastCreated && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
          Temporary password for <strong>{lastCreated.email}</strong>:{" "}
          <code className="bg-emerald-100 px-1.5 py-0.5 rounded">{lastCreated.tempPassword}</code>
          <button className="ml-3 text-emerald-600 underline" onClick={() => setLastCreated(null)}>
            dismiss
          </button>
        </div>
      )}

      {canManageFranchises && (
        <section className="bg-white rounded-lg border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-700 mb-3">Franchises / Stores</h2>
          <form onSubmit={handleCreateFranchise} className="flex flex-wrap gap-2 mb-4">
            <input
              placeholder="Franchise name"
              required
              value={franchiseForm.name}
              onChange={(e) => setFranchiseForm((f) => ({ ...f, name: e.target.value }))}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
            <input
              placeholder="Code (optional)"
              value={franchiseForm.code}
              onChange={(e) => setFranchiseForm((f) => ({ ...f, code: e.target.value }))}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
            <input
              placeholder="Location (optional)"
              value={franchiseForm.location}
              onChange={(e) => setFranchiseForm((f) => ({ ...f, location: e.target.value }))}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
            <button
              type="submit"
              disabled={createFranchise.isPending}
              className="rounded-md bg-astra text-white px-3 py-1.5 text-sm font-medium disabled:opacity-60"
            >
              Add franchise
            </button>
          </form>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-1.5">Name</th>
                <th className="py-1.5">Code</th>
                <th className="py-1.5">Location</th>
              </tr>
            </thead>
            <tbody>
              {franchises?.map((f) => (
                <tr key={f.id} className="border-b border-slate-100">
                  <td className="py-1.5">{f.name}</td>
                  <td className="py-1.5">{f.code ?? "—"}</td>
                  <td className="py-1.5">{f.location ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="bg-white rounded-lg border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-700 mb-3">Create Account</h2>
        <form onSubmit={handleCreateUser} className="flex flex-wrap gap-2 mb-4">
          <input
            placeholder="Full name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <input
            type="email"
            placeholder="Email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            {creatableRoles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          {FRANCHISE_LINKED_ROLES.includes(form.role) && (
            <select
              value={form.franchiseId}
              onChange={(e) => setForm((f) => ({ ...f, franchiseId: e.target.value }))}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option value="">No franchise</option>
              {franchises?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}
          <input
            placeholder="Location (optional)"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={createUser.isPending}
            className="rounded-md bg-astra text-white px-3 py-1.5 text-sm font-medium disabled:opacity-60"
          >
            Create account
          </button>
        </form>
        {createUser.isError && (
          <p className="text-sm text-red-500 mb-3">
            {(createUser.error as any)?.response?.data?.error ?? "Failed to create account"}
          </p>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-1.5">Name</th>
              <th className="py-1.5">Email</th>
              <th className="py-1.5">Role</th>
              <th className="py-1.5">Status</th>
              <th className="py-1.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {usersLoading && (
              <tr>
                <td colSpan={5} className="py-3 text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {users?.map((u) => (
              <tr key={u.id} className="border-b border-slate-100">
                <td className="py-1.5">{u.name}</td>
                <td className="py-1.5">{u.email}</td>
                <td className="py-1.5">{ROLE_LABELS[u.role]}</td>
                <td className="py-1.5">
                  <span className={u.isActive ? "text-emerald-600" : "text-slate-400"}>
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-1.5 space-x-3">
                  <button
                    className="text-astra hover:underline"
                    onClick={() => setActive.mutate({ id: u.id, isActive: !u.isActive })}
                  >
                    {u.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button className="text-astra hover:underline" onClick={() => handleResetPassword(u.id)}>
                    Reset password
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
