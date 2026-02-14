-- Add ativo column to profiles for user deactivation
ALTER TABLE public.profiles ADD COLUMN ativo boolean NOT NULL DEFAULT true;

-- Allow gestor_regional to manage delegacias in their regional
CREATE POLICY "Gestor regional can manage delegacias"
ON public.delegacias FOR ALL
USING (
  has_role(auth.uid(), 'gestor_regional'::app_role)
  AND regional_id IN (
    SELECT regional_id FROM public.user_regionais WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'gestor_regional'::app_role)
  AND regional_id IN (
    SELECT regional_id FROM public.user_regionais WHERE user_id = auth.uid()
  )
);

-- Allow gestor_regional to manage UOPs in their regional's delegacias
CREATE POLICY "Gestor regional can manage uops"
ON public.uops FOR ALL
USING (
  has_role(auth.uid(), 'gestor_regional'::app_role)
  AND delegacia_id IN (
    SELECT d.id FROM public.delegacias d
    JOIN public.user_regionais ur ON ur.regional_id = d.regional_id
    WHERE ur.user_id = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'gestor_regional'::app_role)
  AND delegacia_id IN (
    SELECT d.id FROM public.delegacias d
    JOIN public.user_regionais ur ON ur.regional_id = d.regional_id
    WHERE ur.user_id = auth.uid()
  )
);

-- Allow gestor_regional to view profiles of users in their regional
CREATE POLICY "Gestor regional can view regional profiles"
ON public.profiles FOR SELECT
USING (
  has_role(auth.uid(), 'gestor_regional'::app_role)
  AND user_id IN (
    SELECT ur.user_id FROM public.user_regionais ur
    WHERE ur.regional_id IN (
      SELECT ur2.regional_id FROM public.user_regionais ur2 WHERE ur2.user_id = auth.uid()
    )
  )
);

-- Allow gestor_regional to view roles (needed for user management view)
CREATE POLICY "Gestor regional can view roles"
ON public.user_roles FOR SELECT
USING (
  has_role(auth.uid(), 'gestor_regional'::app_role)
);

-- Allow gestor_regional to view user_regionais for users in their regional
CREATE POLICY "Gestor regional can view regional user_regionais"
ON public.user_regionais FOR SELECT
USING (
  has_role(auth.uid(), 'gestor_regional'::app_role)
  AND regional_id IN (
    SELECT ur.regional_id FROM public.user_regionais ur WHERE ur.user_id = auth.uid()
  )
);
