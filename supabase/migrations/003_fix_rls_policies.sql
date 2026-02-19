-- ============================================================================
-- Migration 003: Fix RLS policies (chicken-and-egg bootstrap issues)
-- ============================================================================
-- Run this if you already applied migration 002. It replaces two broken
-- policies that prevented workspace creation and membership bootstrapping.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Fix workspaces SELECT — allow owner to read even before membership row
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Members can read workspace" ON public.workspaces;

CREATE POLICY "Members can read workspace"
    ON public.workspaces FOR SELECT
    USING (
        auth.uid() = owner_id
        OR EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = id AND wm.user_id = auth.uid()
        )
    );

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Fix workspace_members INSERT — let workspace owner bootstrap first member
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Owners can add members or user can self-join via invite"
    ON public.workspace_members;

CREATE POLICY "Owners can add members or user can self-join via invite"
    ON public.workspace_members FOR INSERT
    WITH CHECK (
        -- Workspace owner (from workspaces table) can always add members
        EXISTS (
            SELECT 1 FROM public.workspaces w
            WHERE w.id = workspace_members.workspace_id
              AND w.owner_id = auth.uid()
        )
        OR (
            auth.uid() = workspace_members.user_id
            AND EXISTS (
                SELECT 1 FROM public.workspace_invites wi
                WHERE wi.workspace_id = workspace_members.workspace_id
                  AND wi.role = workspace_members.role
                  AND (wi.expires_at IS NULL OR wi.expires_at > NOW())
            )
        )
    );
