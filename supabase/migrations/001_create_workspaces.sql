-- ============================================================================
-- Onot Workspaces Table
-- ============================================================================
-- This migration creates the workspaces table for storing user workspace data.
-- Run this in your Supabase SQL editor or via CLI.
-- ============================================================================

-- Create workspaces table
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one workspace per user
    CONSTRAINT workspaces_user_id_unique UNIQUE (user_id)
);

-- Enable Row Level Security
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own workspace
CREATE POLICY "Users can read own workspace"
    ON public.workspaces
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own workspace
CREATE POLICY "Users can insert own workspace"
    ON public.workspaces
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own workspace
CREATE POLICY "Users can update own workspace"
    ON public.workspaces
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own workspace
CREATE POLICY "Users can delete own workspace"
    ON public.workspaces
    FOR DELETE
    USING (auth.uid() = user_id);

-- Index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON public.workspaces(user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on row update
DROP TRIGGER IF EXISTS update_workspaces_updated_at ON public.workspaces;
CREATE TRIGGER update_workspaces_updated_at
    BEFORE UPDATE ON public.workspaces
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;

