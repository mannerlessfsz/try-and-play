-- Create table for user widget preferences
CREATE TABLE public.user_widget_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  position_x INTEGER DEFAULT 20,
  position_y INTEGER DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, empresa_id, widget_type)
);

-- Enable RLS
ALTER TABLE public.user_widget_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view own widget preferences"
ON public.user_widget_preferences
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own widget preferences"
ON public.user_widget_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own widget preferences"
ON public.user_widget_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own preferences
CREATE POLICY "Users can delete own widget preferences"
ON public.user_widget_preferences
FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_user_widget_preferences_updated_at
BEFORE UPDATE ON public.user_widget_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();