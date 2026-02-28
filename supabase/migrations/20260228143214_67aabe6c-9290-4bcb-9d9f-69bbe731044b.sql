
-- Create edge function monitoring table
CREATE TABLE public.edge_function_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name text NOT NULL,
  status_code integer NOT NULL DEFAULT 200,
  success boolean NOT NULL DEFAULT true,
  latency_ms integer NOT NULL DEFAULT 0,
  error_message text,
  request_method text NOT NULL DEFAULT 'POST',
  caller_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for dashboard queries
CREATE INDEX idx_efl_function_name ON public.edge_function_logs (function_name);
CREATE INDEX idx_efl_created_at ON public.edge_function_logs (created_at DESC);
CREATE INDEX idx_efl_success ON public.edge_function_logs (success) WHERE success = false;

-- Enable RLS
ALTER TABLE public.edge_function_logs ENABLE ROW LEVEL SECURITY;

-- System can insert logs (edge functions use service_role)
CREATE POLICY "System can insert logs" ON public.edge_function_logs
  FOR INSERT WITH CHECK (true);

-- Only managers can view logs
CREATE POLICY "Managers can view logs" ON public.edge_function_logs
  FOR SELECT TO authenticated USING (is_manager(auth.uid()));

-- Create alert configuration table
CREATE TABLE public.monitoring_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key text NOT NULL UNIQUE,
  config_value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.monitoring_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage config" ON public.monitoring_config
  FOR ALL TO authenticated USING (is_manager(auth.uid()))
  WITH CHECK (is_manager(auth.uid()));

-- Insert default config
INSERT INTO public.monitoring_config (config_key, config_value) VALUES
  ('alert_threshold_percent', '20'),
  ('alert_check_window_minutes', '60'),
  ('alert_email_recipients', '[]'),
  ('alert_enabled', 'true');
