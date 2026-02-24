
-- Tabela de agendamentos de visita vinculados a OS
CREATE TABLE public.agendamentos_visita (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  data_agendamento timestamp with time zone NOT NULL,
  descricao text NOT NULL,
  responsavel_tecnico text NOT NULL,
  status text NOT NULL DEFAULT 'agendada',
  observacoes_pos_visita text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_agendamentos_visita_updated_at
  BEFORE UPDATE ON public.agendamentos_visita
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.agendamentos_visita ENABLE ROW LEVEL SECURITY;

-- Preposto/Terceirizado podem criar agendamentos para OS dos seus contratos
CREATE POLICY "Preposto can manage agendamentos"
  ON public.agendamentos_visita
  FOR ALL
  USING (
    has_role(auth.uid(), 'preposto'::app_role)
    AND os_id IN (
      SELECT os.id FROM ordens_servico os
      WHERE os.contrato_id IN (
        SELECT c.id FROM contratos c WHERE c.preposto_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'preposto'::app_role)
    AND os_id IN (
      SELECT os.id FROM ordens_servico os
      WHERE os.contrato_id IN (
        SELECT c.id FROM contratos c WHERE c.preposto_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Terceirizado can manage agendamentos"
  ON public.agendamentos_visita
  FOR ALL
  USING (
    has_role(auth.uid(), 'terceirizado'::app_role)
    AND os_id IN (
      SELECT os.id FROM ordens_servico os
      WHERE os.contrato_id IN (
        SELECT cc.contrato_id FROM contrato_contatos cc WHERE cc.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'terceirizado'::app_role)
    AND os_id IN (
      SELECT os.id FROM ordens_servico os
      WHERE os.contrato_id IN (
        SELECT cc.contrato_id FROM contrato_contatos cc WHERE cc.user_id = auth.uid()
      )
    )
  );

-- Gestores e fiscais podem gerenciar todos os agendamentos de suas regionais
CREATE POLICY "Gestores can manage agendamentos"
  ON public.agendamentos_visita
  FOR ALL
  USING (
    is_admin(auth.uid())
    OR (
      (is_nacional(auth.uid()) OR has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'fiscal_contrato'::app_role))
      AND os_id IN (
        SELECT os.id FROM ordens_servico os
        WHERE os.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
          OR os.uop_id IN (
            SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id
            WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
          )
      )
    )
  )
  WITH CHECK (
    is_admin(auth.uid())
    OR (
      (is_nacional(auth.uid()) OR has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'fiscal_contrato'::app_role))
      AND os_id IN (
        SELECT os.id FROM ordens_servico os
        WHERE os.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
          OR os.uop_id IN (
            SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id
            WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
          )
      )
    )
  );

-- Operadores podem visualizar agendamentos de suas regionais
CREATE POLICY "Operador can view agendamentos"
  ON public.agendamentos_visita
  FOR SELECT
  USING (
    has_role(auth.uid(), 'operador'::app_role)
    AND os_id IN (
      SELECT os.id FROM ordens_servico os
      WHERE os.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
        OR os.uop_id IN (
          SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id
          WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
        )
    )
  );
