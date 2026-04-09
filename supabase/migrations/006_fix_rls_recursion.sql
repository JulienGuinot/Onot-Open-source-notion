-- ============================================================================
-- Migration 006: Fix infinite recursion in RLS policies
-- ============================================================================
-- The workspace_members SELECT/UPDATE/DELETE policies referenced
-- workspace_members itself, causing "infinite recursion detected in policy
-- for relation workspace_members". Other tables (workspaces, pages,
-- workspace_invites) also query workspace_members in their policies, which
-- triggers the same recursion via the workspace_members SELECT policy.
--
-- Fix: SECURITY DEFINER helper functions that bypass RLS when checking
-- membership, breaking the recursion cycle.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Helper functions (SECURITY DEFINER → bypass RLS, no recursion)
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID, uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = ws_id AND user_id = uid
    );
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_editor_or_owner(ws_id UUID, uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = ws_id AND user_id = uid AND role IN ('owner', 'editor')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_owner_member(ws_id UUID, uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = ws_id AND user_id = uid AND role = 'owner'
    );
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Fix workspace_members policies (direct self-recursion)
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Members can view fellow members"     ON public.workspace_members;
DROP POLICY IF EXISTS "Owners can update member roles"      ON public.workspace_members;
DROP POLICY IF EXISTS "Owners can remove members or members can leave" ON public.workspace_members;

CREATE POLICY "Members can view fellow members"
    ON public.workspace_members FOR SELECT
    USING (
        public.is_workspace_member(workspace_id, auth.uid())
    );

CREATE POLICY "Owners can update member roles"
    ON public.workspace_members FOR UPDATE
    USING (
        public.is_workspace_owner_member(workspace_id, auth.uid())
    );

CREATE POLICY "Owners can remove members or members can leave"
    ON public.workspace_members FOR DELETE
    USING (
        public.is_workspace_owner_member(workspace_id, auth.uid())
        OR auth.uid() = user_id
    );

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Fix workspaces policies (cross-table recursion via workspace_members)
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Members can read workspace"              ON public.workspaces;
DROP POLICY IF EXISTS "Members or owners can read workspace"    ON public.workspaces;
DROP POLICY IF EXISTS "Editors and owners can update workspace" ON public.workspaces;

CREATE POLICY "Members can read workspace"
    ON public.workspaces FOR SELECT
    USING (
        auth.uid() = owner_id
        OR public.is_workspace_member(id, auth.uid())
    );

CREATE POLICY "Editors and owners can update workspace"
    ON public.workspaces FOR UPDATE
    USING (
        public.is_workspace_editor_or_owner(id, auth.uid())
    );

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Fix pages policies (cross-table recursion via workspace_members)
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Members can read pages"   ON public.pages;
DROP POLICY IF EXISTS "Editors can insert pages" ON public.pages;
DROP POLICY IF EXISTS "Editors can update pages" ON public.pages;
DROP POLICY IF EXISTS "Editors can delete pages" ON public.pages;

CREATE POLICY "Members can read pages"
    ON public.pages FOR SELECT
    USING (
        public.is_workspace_member(workspace_id, auth.uid())
    );

CREATE POLICY "Editors can insert pages"
    ON public.pages FOR INSERT
    WITH CHECK (
        public.is_workspace_editor_or_owner(workspace_id, auth.uid())
    );

CREATE POLICY "Editors can update pages"
    ON public.pages FOR UPDATE
    USING (
        public.is_workspace_editor_or_owner(workspace_id, auth.uid())
    );

CREATE POLICY "Editors can delete pages"
    ON public.pages FOR DELETE
    USING (
        public.is_workspace_editor_or_owner(workspace_id, auth.uid())
    );

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Fix workspace_invites policies (cross-table recursion via workspace_members)
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Owners can create invites"  ON public.workspace_invites;
DROP POLICY IF EXISTS "Owners can revoke invites"  ON public.workspace_invites;

CREATE POLICY "Owners can create invites"
    ON public.workspace_invites FOR INSERT
    WITH CHECK (
        public.is_workspace_owner_member(workspace_id, auth.uid())
    );

CREATE POLICY "Owners can revoke invites"
    ON public.workspace_invites FOR DELETE
    USING (
        public.is_workspace_owner_member(workspace_id, auth.uid())
    );
