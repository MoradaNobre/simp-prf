
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _regional_id uuid;
  _email text;
  _default_role app_role;
BEGIN
  _email := LOWER(COALESCE(NEW.email, ''));
  
  -- Determine default role based on email domain
  IF _email LIKE '%@prf.gov.br' THEN
    _default_role := 'operador';
  ELSE
    _default_role := 'preposto';
  END IF;

  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL)
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _default_role);

  -- If regional_id was provided in signup metadata, link user to that regional
  _regional_id := (NEW.raw_user_meta_data->>'regional_id')::uuid;
  IF _regional_id IS NOT NULL THEN
    UPDATE public.profiles SET regional_id = _regional_id WHERE user_id = NEW.id;
    INSERT INTO public.user_regionais (user_id, regional_id)
    VALUES (NEW.id, _regional_id)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;
