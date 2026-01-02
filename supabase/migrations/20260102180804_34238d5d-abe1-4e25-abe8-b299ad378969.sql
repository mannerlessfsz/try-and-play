-- Add 'ativo' column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

-- Create index for faster queries on active users
CREATE INDEX IF NOT EXISTS idx_profiles_ativo ON public.profiles(ativo);