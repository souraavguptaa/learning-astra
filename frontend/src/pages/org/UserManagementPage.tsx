import { ArrowUpDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { RowActionsMenu } from "../../components/common/RowActionsMenu.js";
import { useAuth, type UserRole } from "../../lib/authContext.js";
import {
  useCreateFranchise,
  useCreateUser,
  useDeleteUser,
  useFranchises,
  useResetPassword,
  useSetUserActive,
  useSetUserFranchise,
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

const FRANCHISE_LINKED_ROLES: UserRole[] = ["franchise_owner", "operator", "employee"];

export function UserManagementPage({
  creatableRoles,
  canManageFranchises,
}: {
  creatableRoles: UserRole[];
  canManageFranchises: boolean;
}) {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === "super_admin";
  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: franchises } = useFranchises();
  const createUser = useCreateUser();
  const createFranchise = useCreateFranchise();
  const setActive = useSetUserActive();
  const setFranchise = useSetUserFranchise();
  const resetPassword = useResetPassword();
  const deleteUser = useDeleteUser();

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: creatableRoles[0],
    franchiseId: "",
    location: "",
  });
  const [franchiseForm, setFranchiseForm] = useState({ name: "", code: "", location: "" });
  const [lastCreated, setLastCreated] = useState<{ email: string; tempPassword: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortAsc, setSortAsc] = useState(true);

  const visibleUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users ?? [])
      .filter((u) => (statusFilter === "all" ? true : statusFilter === "active" ? u.isActive : !u.isActive))
      .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .sort((a, b) => (sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
  }, [users, search, statusFilter, sortAsc]);

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

  function handleToggleActive(id: string, name: string, currentlyActive: boolean) {
    const verb = currentlyActive ? "Deactivate" : "Activate";
    if (!window.confirm(`${verb} ${name}'s account?`)) return;
    setActive.mutate({ id, isActive: !currentlyActive });
  }

  async function handleDeleteUser(id: string, name: string, email: string) {
    setDeleteError(null);
    const typed = window.prompt(
      `Permanently delete ${name}'s account (${email})? This destroys their training progress, ` +
        `certificates, and tickets too — it cannot be undone.\n\nType DELETE to confirm.`,
    );
    if (typed !== "DELETE") return;
    try {
      await deleteUser.mutateAsync(id);
    } catch (err) {
      setDeleteError(isAxiosError(err) && err.response?.data?.error ? err.response.data.error : "Could not delete this account. Please try again.");
    }
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
        <section className="bg-white rounded-lg shadow-clay p-5">
          <h2 className="font-semibold text-slate-700 mb-3">Franchises / Stores</h2>
          {/* Bento's inputs.md: "Labels must remain visible; placeholders are not labels." Every
              field gets a real label above it now instead of relying on placeholder text alone. */}
          <form onSubmit={handleCreateFranchise} className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4 items-end">
            <label className="block sm:col-span-2">
              <span className="block text-xs font-medium text-slate-600 mb-1">Franchise name</span>
              <input
                required
                value={franchiseForm.name}
                onChange={(e) => setFranchiseForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-md shadow-clay-inset px-3 h-11 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1">
                Code <span className="font-normal text-slate-400">(optional)</span>
              </span>
              <input
                value={franchiseForm.code}
                onChange={(e) => setFranchiseForm((f) => ({ ...f, code: e.target.value }))}
                className="w-full rounded-md shadow-clay-inset px-3 h-11 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1">
                Location <span className="font-normal text-slate-400">(optional)</span>
              </span>
              <input
                value={franchiseForm.location}
                onChange={(e) => setFranchiseForm((f) => ({ ...f, location: e.target.value }))}
                className="w-full rounded-md shadow-clay-inset px-3 h-11 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={createFranchise.isPending}
              className="sm:col-span-4 justify-self-start rounded-md bg-astra text-white shadow-clay-sm px-4 h-11 text-sm font-medium disabled:opacity-60"
            >
              Add franchise
            </button>
          </form>
          <div className="rounded-md border border-black/[0.06] dark:border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 bg-slate-50">
                  <th className="py-2 px-3 font-medium">Name</th>
                  <th className="py-2 px-3 font-medium">Code</th>
                  <th className="py-2 px-3 font-medium">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {franchises?.map((f) => (
                  <tr key={f.id}>
                    <td className="py-2 px-3 whitespace-nowrap">{f.name}</td>
                    <td className="py-2 px-3 whitespace-nowrap">{f.code ?? "—"}</td>
                    <td className="py-2 px-3 whitespace-nowrap">{f.location ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="bg-white rounded-lg shadow-clay p-5">
        <h2 className="font-semibold text-slate-700 mb-3">Create Account</h2>
        <form onSubmit={handleCreateUser} className="space-y-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1">Full name</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-md shadow-clay-inset px-3 h-11 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1">Email</span>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-md shadow-clay-inset px-3 h-11 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1">Role</span>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                className="w-full rounded-md shadow-clay-inset px-3 h-11 text-sm"
              >
                {creatableRoles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
            {FRANCHISE_LINKED_ROLES.includes(form.role) && (
              <label className="block">
                <span className="block text-xs font-medium text-slate-600 mb-1">Franchise</span>
                <select
                  value={form.franchiseId}
                  onChange={(e) => setForm((f) => ({ ...f, franchiseId: e.target.value }))}
                  className="w-full rounded-md shadow-clay-inset px-3 h-11 text-sm"
                >
                  <option value="">No franchise</option>
                  {franchises?.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block sm:col-span-2">
              <span className="block text-xs font-medium text-slate-600 mb-1">
                Location <span className="font-normal text-slate-400">(optional)</span>
              </span>
              <input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="w-full rounded-md shadow-clay-inset px-3 h-11 text-sm"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={createUser.isPending}
            className="rounded-md bg-astra text-white shadow-clay-sm px-4 h-11 text-sm font-medium disabled:opacity-60"
          >
            Create account
          </button>
        </form>
        {createUser.isError && (
          <p className="text-sm text-red-500 mb-3">
            {(createUser.error as any)?.response?.data?.error ?? "Failed to create account"}
          </p>
        )}
        {deleteError && <p className="text-sm text-red-500 mb-3">{deleteError}</p>}

        {/* Search bar, then a "Show only:" status filter row above the table — Bento's
            filterable-management-data-table pattern. */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md shadow-clay-inset pl-9 pr-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex items-center gap-1 mb-3 text-sm">
          <span className="text-slate-500 mr-1">Show only:</span>
          {(["all", "active", "inactive"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-pill capitalize ${
                statusFilter === s ? "bg-astra-soft text-astra-dark font-medium" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="rounded-md border border-black/[0.06] dark:border-white/10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 bg-slate-50">
                <th className="py-2 px-3 font-medium">
                  <button onClick={() => setSortAsc((v) => !v)} className="inline-flex items-center gap-1 hover:text-astra">
                    Name <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2 px-3 font-medium">Email</th>
                <th className="py-2 px-3 font-medium">Role</th>
                <th className="py-2 px-3 font-medium">Franchise</th>
                <th className="py-2 px-3 font-medium">Status</th>
                <th className="py-2 px-3 font-medium w-9" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usersLoading && (
                <tr>
                  <td colSpan={6} className="py-3 px-3 text-slate-400">
                    Loading…
                  </td>
                </tr>
              )}
              {visibleUsers.map((u) => (
                <tr key={u.id}>
                  <td className="py-2 px-3 whitespace-nowrap max-w-[200px] truncate">{u.name}</td>
                  <td className="py-2 px-3 whitespace-nowrap max-w-[220px] truncate">{u.email}</td>
                  <td className="py-2 px-3 whitespace-nowrap">{ROLE_LABELS[u.role]}</td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    {FRANCHISE_LINKED_ROLES.includes(u.role) ? (
                      <select
                        value={u.franchiseId ?? ""}
                        disabled={setFranchise.isPending}
                        onChange={(e) => setFranchise.mutate({ id: u.id, franchiseId: e.target.value || null })}
                        className="rounded-md shadow-clay-inset px-2 py-1 text-xs"
                      >
                        <option value="">No franchise</option>
                        {franchises?.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span
                      className={`rounded-pill px-2 py-0.5 text-xs font-medium ${
                        u.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-1 px-1 text-right">
                    <RowActionsMenu
                      actions={[
                        { label: u.isActive ? "Deactivate" : "Activate", onClick: () => handleToggleActive(u.id, u.name, u.isActive) },
                        { label: "Reset password", onClick: () => handleResetPassword(u.id) },
                        ...(isSuperAdmin && u.id !== currentUser?.id
                          ? [{ label: "Delete", danger: true, onClick: () => handleDeleteUser(u.id, u.name, u.email) }]
                          : []),
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
          <span>
            {visibleUsers.length} of {users?.length ?? 0} users
          </span>
        </div>
      </section>
    </div>
  );
}
