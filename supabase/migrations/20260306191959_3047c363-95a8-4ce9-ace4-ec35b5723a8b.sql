
-- Table to store deadline extension requests from preposto during execution
CREATE TABLE public.solicitacoes_prazo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  solicitante_id uuid NOT NULL,
  prazo_solicitado date NOT NULL,
  justificativa text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  respondido_por uuid,
  respondido_em timestamptz,
  resposta text,
  prazo_aprovado date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.solicitacoes_prazo ENABLE ROW LEVEL SECURITY;

-- Preposto/terceirizado can create requests for OS they have access to
CREATE POLICY "Preposto can create prazo requests"
ON public.solicitacoes_prazo FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = solicitante_id
  AND (
    has_role(auth.uid(), 'preposto'::app_role)
    OR has_role(auth.uid(), 'terceirizado'::app_role)
  )
);

-- Everyone who can see the OS can see the requests
CREATE POLICY "Authenticated can view prazo requests"
ON public.solicitacoes_prazo FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid())
  OR is_nacional(auth.uid())
  OR has_role(auth.uid(), 'gestor_regional'::app_role)
  OR has_role(auth.uid(), 'fiscal_contrato'::app_role)
  OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role)
  OR has_role(auth.uid(), 'operador'::app_role)
  OR auth.uid() = solicitante_id
);

-- Gestor/fiscal can update (approve/reject)
CREATE POLICY "Gestores can update prazo requests"
ON public.solicitacoes_prazo FOR UPDATE
TO authenticated
USING (
  is_admin(auth.uid())
  OR is_nacional(auth.uid())
  OR has_role(auth.uid(), 'gestor_regional'::app_role)
  OR has_role(auth.uid(), 'fiscal_contrato'::app_role)
  OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role)
)
WITH CHECK (
  is_admin(auth.uid())
  OR is_nacional(auth.uid())
  OR has_role(auth.uid(), 'gestor_regional'::app_role)
  OR has_role(auth.uid(), 'fiscal_contrato'::app_role)
  OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role)
);
