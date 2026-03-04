
-- Create participantes table for visit scheduling
CREATE TABLE public.agendamento_participantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id uuid NOT NULL REFERENCES public.agendamentos_visita(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cpf text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agendamento_participantes ENABLE ROW LEVEL SECURITY;

-- RLS: same access as parent agendamentos_visita
CREATE POLICY "Gestores can manage participantes"
ON public.agendamento_participantes
FOR ALL
TO authenticated
USING (
  is_admin(auth.uid()) OR
  (
    (is_nacional(auth.uid()) OR has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role))
    AND agendamento_id IN (
      SELECT av.id FROM agendamentos_visita av
      WHERE av.os_id IN (
        SELECT os.id FROM ordens_servico os
        WHERE os.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
           OR os.uop_id IN (
             SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id
             WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
           )
      )
    )
  )
)
WITH CHECK (
  is_admin(auth.uid()) OR
  (
    (is_nacional(auth.uid()) OR has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role))
    AND agendamento_id IN (
      SELECT av.id FROM agendamentos_visita av
      WHERE av.os_id IN (
        SELECT os.id FROM ordens_servico os
        WHERE os.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
           OR os.uop_id IN (
             SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id
             WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
           )
      )
    )
  )
);

CREATE POLICY "Preposto can manage own participantes"
ON public.agendamento_participantes
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'preposto'::app_role)
  AND agendamento_id IN (
    SELECT av.id FROM agendamentos_visita av
    WHERE av.os_id IN (
      SELECT os.id FROM ordens_servico os
      WHERE os.contrato_id IN (
        SELECT c.id FROM contratos c WHERE c.preposto_user_id = auth.uid()
      )
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'preposto'::app_role)
  AND agendamento_id IN (
    SELECT av.id FROM agendamentos_visita av
    WHERE av.os_id IN (
      SELECT os.id FROM ordens_servico os
      WHERE os.contrato_id IN (
        SELECT c.id FROM contratos c WHERE c.preposto_user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Terceirizado can manage own participantes"
ON public.agendamento_participantes
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'terceirizado'::app_role)
  AND agendamento_id IN (
    SELECT av.id FROM agendamentos_visita av
    WHERE av.os_id IN (
      SELECT os.id FROM ordens_servico os
      WHERE os.contrato_id = ANY(get_terceirizado_contrato_ids(auth.uid()))
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'terceirizado'::app_role)
  AND agendamento_id IN (
    SELECT av.id FROM agendamentos_visita av
    WHERE av.os_id IN (
      SELECT os.id FROM ordens_servico os
      WHERE os.contrato_id = ANY(get_terceirizado_contrato_ids(auth.uid()))
    )
  )
);

CREATE POLICY "Operador can view participantes"
ON public.agendamento_participantes
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'operador'::app_role)
  AND agendamento_id IN (
    SELECT av.id FROM agendamentos_visita av
    WHERE av.os_id IN (
      SELECT os.id FROM ordens_servico os
      WHERE os.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
         OR os.uop_id IN (
           SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id
           WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
         )
    )
  )
);
