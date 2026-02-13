
-- Add regional_id to profiles so users are linked to their regional
ALTER TABLE public.profiles 
ADD COLUMN regional_id uuid REFERENCES public.regionais(id);

-- Create index for performance
CREATE INDEX idx_profiles_regional_id ON public.profiles(regional_id);
