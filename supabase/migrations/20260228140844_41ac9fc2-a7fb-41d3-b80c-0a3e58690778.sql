
-- Trigger function: validates role assignment hierarchy server-side
-- Prevents privilege escalation by ensuring the assigning user
-- has authority over the role being assigned/updated.
CREATE OR REPLACE FUNCTION public.validate_role_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _caller_id uuid;
  _caller_role app_role;
  _target_role app_role;
  _role_level int;
  _caller_level int;
BEGIN
  _caller_id := auth.uid();
  _target_role := NEW.role;

  -- Allow system-level operations (e.g., handle_new_user trigger) where auth.uid() is null
  IF _caller_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get caller's role
  SELECT role INTO _caller_role
  FROM public.user_roles
  WHERE user_id = _caller_id
  LIMIT 1;

  -- If caller has no role, block
  IF _caller_role IS NULL THEN
    RAISE EXCEPTION 'Usuário sem perfil não pode atribuir papéis.';
  END IF;

  -- Define hierarchy levels (higher = more privileged)
  -- gestor_master=100, gestor_nacional=80, gestor_regional=60, fiscal_contrato=40, others=20
  _caller_level := CASE _caller_role
    WHEN 'gestor_master' THEN 100
    WHEN 'gestor_nacional' THEN 80
    WHEN 'gestor_regional' THEN 60
    WHEN 'fiscal_contrato' THEN 40
    ELSE 0
  END;

  _role_level := CASE _target_role
    WHEN 'gestor_master' THEN 100
    WHEN 'gestor_nacional' THEN 80
    WHEN 'gestor_regional' THEN 60
    WHEN 'fiscal_contrato' THEN 40
    WHEN 'operador' THEN 20
    WHEN 'preposto' THEN 20
    WHEN 'terceirizado' THEN 20
    ELSE 20
  END;

  -- Caller level 0 means non-admin role (operador, preposto, terceirizado) - cannot assign any role
  IF _caller_level = 0 THEN
    RAISE EXCEPTION 'Seu perfil (%) não tem permissão para atribuir papéis.', _caller_role;
  END IF;

  -- Caller must have strictly higher level than target role
  IF _caller_level <= _role_level THEN
    RAISE EXCEPTION 'Seu perfil (%) não tem autoridade para atribuir o papel (%). Escalonamento de privilégio bloqueado.', _caller_role, _target_role;
  END IF;

  -- For fiscal_contrato, restrict to only operador/preposto/terceirizado
  IF _caller_role = 'fiscal_contrato' AND _target_role NOT IN ('operador', 'preposto', 'terceirizado') THEN
    RAISE EXCEPTION 'Fiscal de Contrato só pode atribuir os papéis: Operador, Preposto ou Terceirizado.';
  END IF;

  RETURN NEW;
END;
$function$;

-- Create the trigger on INSERT and UPDATE
DROP TRIGGER IF EXISTS trg_validate_role_hierarchy ON public.user_roles;
CREATE TRIGGER trg_validate_role_hierarchy
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_role_hierarchy();
