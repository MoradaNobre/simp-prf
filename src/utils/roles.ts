/**
 * Checks if a role has management-level access (gestor_nacional or gestor_master).
 * Use for page/feature access control (menus, CRUD permissions).
 */
export function isAdminRole(role: string | null | undefined): boolean {
  return role === "gestor_nacional" || role === "gestor_master";
}

/**
 * Checks if a role has global access to ALL regionais (only gestor_master).
 * Use for data scope control (which regionais the user can see/filter).
 * gestor_nacional is restricted to their linked regionais.
 */
export function isGlobalRole(role: string | null | undefined): boolean {
  return role === "gestor_master";
}

/**
 * Checks if a role is fiscal_contrato or auxiliar_fiscal.
 * Both share the same permissions and access level.
 */
export function isFiscalRole(role: string | null | undefined): boolean {
  return role === "fiscal_contrato" || role === "auxiliar_fiscal";
}
