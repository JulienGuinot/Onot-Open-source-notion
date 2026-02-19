-- ============================================================================
-- Migration 004: Enable REPLICA IDENTITY FULL for Realtime + RLS
-- ============================================================================
-- Supabase Realtime needs the full old record to evaluate RLS policies on
-- UPDATE and DELETE events. Without this, events may be silently dropped.
-- ============================================================================

ALTER TABLE public.pages      REPLICA IDENTITY FULL;
ALTER TABLE public.workspaces REPLICA IDENTITY FULL;
