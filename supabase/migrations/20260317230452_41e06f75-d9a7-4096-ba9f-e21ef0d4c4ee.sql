
-- Fix OS sequence counters to match actual max OS numbers per regional
UPDATE regional_os_seq s
SET last_number = COALESCE(
  (SELECT MAX(CAST(SUBSTRING(o.codigo FROM '[0-9]+$') AS int))
   FROM ordens_servico o
   WHERE o.regional_id = s.regional_id),
  s.last_number
);
