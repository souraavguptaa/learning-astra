import { useAuth } from "../../lib/authContext.js";
import { UserManagementPage } from "./UserManagementPage.js";

export function UsersRoute() {
  const { user } = useAuth();
  if (!user) return null;

  if (user.role === "super_admin") {
    return <UserManagementPage creatableRoles={["trainer", "admin"]} />;
  }
  if (user.role === "admin") {
    return <UserManagementPage creatableRoles={["franchise_owner", "operator", "employee"]} />;
  }
  return <p className="text-slate-500">You don't have access to this page.</p>;
}
