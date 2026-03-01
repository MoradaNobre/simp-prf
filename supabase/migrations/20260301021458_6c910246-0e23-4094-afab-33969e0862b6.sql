-- Recreate contratos_saldo view with security_invoker to enforce RLS of underlying tables
DROP VIEW IF EXISTS public.contratos_saldo;

CREATE VIEW public.contratos_saldo
WITH (security_invoker = on)
AS
SELECT c.id,
    c.numero,
    c.empresa,
    c.valor_total,
    COALESCE(sum(oc.valor), (0)::numeric) AS total_custos,
    COALESCE(( SELECT sum(ca.valor) AS sum
           FROM contrato_aditivos ca
          WHERE (ca.contrato_id = c.id)), (0)::numeric) AS total_aditivos,
    (c.valor_total + COALESCE(( SELECT sum(ca.valor) AS sum
           FROM contrato_aditivos ca
          WHERE (ca.contrato_id = c.id)), (0)::numeric)) AS valor_total_com_aditivos,
    ((c.valor_total + COALESCE(( SELECT sum(ca.valor) AS sum
           FROM contrato_aditivos ca
          WHERE (ca.contrato_id = c.id)), (0)::numeric)) - COALESCE(sum(oc.valor), (0)::numeric)) AS saldo
   FROM ((contratos c
     LEFT JOIN ordens_servico os ON (((os.contrato_id = c.id) AND (os.deleted_at IS NULL))))
     LEFT JOIN os_custos oc ON ((oc.os_id = os.id)))
  WHERE (c.deleted_at IS NULL)
  GROUP BY c.id, c.numero, c.empresa, c.valor_total;