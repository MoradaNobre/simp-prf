/**
 * Checks if a role has admin-level access (gestor_nacional or gestor_master).
 * Use this instead of checking role === "gestor_nacional" directly.
 */
export function isAdminRole(role: string | null | undefined): boolean {
  return role === "gestor_nacional" || role === "gestor_master";
}
