-- ============================================================================
-- Migration 002: Normalize schema for real-time collaboration
-- ============================================================================
-- Breaks the monolithic JSONB blob into normalized tables:
--   workspaces  → workspace-level settings (one row per workspace)
--   pages       → individual page data
--   workspace_members → access control join table
--   workspace_invites → shareable invite tokens
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Modify workspaces table
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.workspaces
    ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'My Workspace';

-- Back-fill owner_id from existing user_id before we relax constraints
UPDATE public.workspaces SET owner_id = user_id WHERE owner_id IS NULL;

-- Drop the one-workspace-per-user constraint
ALTER TABLE public.workspaces DROP CONSTRAINT IF EXISTS workspaces_user_id_unique;

-- user_id is now redundant (owner_id replaces it) but kept nullable for safety
ALTER TABLE public.workspaces ALTER COLUMN user_id DROP NOT NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Create pages table
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pages (
    id          TEXT        NOT NULL,
    workspace_id UUID       NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    data        JSONB       NOT NULL DEFAULT '{}',
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_by  UUID        REFERENCES auth.users(id),
    PRIMARY KEY (id, workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_pages_workspace_id ON public.pages(workspace_id);

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- Auto-update timestamp
DROP TRIGGER IF EXISTS update_pages_updated_at ON public.pages;
CREATE TRIGGER update_pages_updated_at
    BEFORE UPDATE ON public.pages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Create workspace_members table
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.workspace_members (
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role         TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Create workspace_invites table
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.workspace_invites (
    id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    token        TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    role         TEXT        NOT NULL CHECK (role IN ('editor', 'viewer')),
    created_by   UUID        NOT NULL REFERENCES auth.users(id),
    expires_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_invites_token ON public.workspace_invites(token);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_workspace_id ON public.workspace_invites(workspace_id);

ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Migrate existing data from JSONB blobs into normalized tables
-- ────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
    r          RECORD;
    ws_key     TEXT;
    ws_value   JSONB;
    new_ws_id  UUID;
    page_key   TEXT;
    page_value JSONB;
BEGIN
    FOR r IN SELECT id, user_id, data FROM public.workspaces
             WHERE data ? 'workspaces' AND owner_id IS NOT NULL
    LOOP
        FOR ws_key, ws_value IN
            SELECT * FROM jsonb_each(r.data -> 'workspaces')
        LOOP
            new_ws_id := gen_random_uuid();

            INSERT INTO public.workspaces (id, owner_id, user_id, name, data, created_at, updated_at)
            VALUES (
                new_ws_id,
                r.user_id,
                r.user_id,
                COALESCE(ws_value ->> 'name', 'My Workspace'),
                jsonb_build_object(
                    'darkMode',  COALESCE(ws_value -> 'darkMode',  'false'::jsonb),
                    'pageOrder', COALESCE(ws_value -> 'pageOrder', '[]'::jsonb)
                ),
                NOW(),
                NOW()
            );

            INSERT INTO public.workspace_members (workspace_id, user_id, role)
            VALUES (new_ws_id, r.user_id, 'owner');

            IF ws_value ? 'pages' THEN
                FOR page_key, page_value IN
                    SELECT * FROM jsonb_each(ws_value -> 'pages')
                LOOP
                    INSERT INTO public.pages (id, workspace_id, data, updated_at, updated_by)
                    VALUES (page_key, new_ws_id, page_value, NOW(), r.user_id);
                END LOOP;
            END IF;
        END LOOP;

        DELETE FROM public.workspaces WHERE id = r.id;
    END LOOP;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Drop old RLS policies on workspaces
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can read own workspace"   ON public.workspaces;
DROP POLICY IF EXISTS "Users can insert own workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Users can update own workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Users can delete own workspace" ON public.workspaces;

-- ────────────────────────────────────────────────────────────────────────────
-- 7. New RLS policies — workspaces
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Members can read workspace"
    ON public.workspaces FOR SELECT
    USING (
        auth.uid() = owner_id
        OR EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = id AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can create workspaces"
    ON public.workspaces FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Editors and owners can update workspace"
    ON public.workspaces FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = id
              AND wm.user_id = auth.uid()
              AND wm.role IN ('owner', 'editor')
        )
    );

CREATE POLICY "Only owners can delete workspace"
    ON public.workspaces FOR DELETE
    USING (auth.uid() = owner_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 8. RLS policies — pages
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Members can read pages"
    ON public.pages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = pages.workspace_id AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Editors can insert pages"
    ON public.pages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = pages.workspace_id
              AND wm.user_id = auth.uid()
              AND wm.role IN ('owner', 'editor')
        )
    );

CREATE POLICY "Editors can update pages"
    ON public.pages FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = pages.workspace_id
              AND wm.user_id = auth.uid()
              AND wm.role IN ('owner', 'editor')
        )
    );

CREATE POLICY "Editors can delete pages"
    ON public.pages FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = pages.workspace_id
              AND wm.user_id = auth.uid()
              AND wm.role IN ('owner', 'editor')
        )
    );

-- ────────────────────────────────────────────────────────────────────────────
-- 9. RLS policies — workspace_members
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Members can view fellow members"
    ON public.workspace_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm2
            WHERE wm2.workspace_id = workspace_members.workspace_id
              AND wm2.user_id = auth.uid()
        )
    );

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

CREATE POLICY "Owners can update member roles"
    ON public.workspace_members FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = workspace_members.workspace_id
              AND wm.user_id = auth.uid()
              AND wm.role = 'owner'
        )
    );

CREATE POLICY "Owners can remove members or members can leave"
    ON public.workspace_members FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = workspace_members.workspace_id
              AND wm.user_id = auth.uid()
              AND wm.role = 'owner'
        )
        OR auth.uid() = workspace_members.user_id
    );

-- ────────────────────────────────────────────────────────────────────────────
-- 10. RLS policies — workspace_invites
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Anyone authenticated can read invites by token"
    ON public.workspace_invites FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Owners can create invites"
    ON public.workspace_invites FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = workspace_invites.workspace_id
              AND wm.user_id = auth.uid()
              AND wm.role = 'owner'
        )
    );

CREATE POLICY "Owners can revoke invites"
    ON public.workspace_invites FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = workspace_invites.workspace_id
              AND wm.user_id = auth.uid()
              AND wm.role = 'owner'
        )
    );

-- ────────────────────────────────────────────────────────────────────────────
-- 11. Indexes on workspaces for the new columns
-- ────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON public.workspaces(owner_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 12. Grant permissions
-- ────────────────────────────────────────────────────────────────────────────

GRANT ALL ON public.pages             TO authenticated;
GRANT ALL ON public.pages             TO service_role;
GRANT ALL ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;
GRANT ALL ON public.workspace_invites TO authenticated;
GRANT ALL ON public.workspace_invites TO service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 13. Enable Supabase Realtime for collaboration tables
-- ────────────────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.pages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspaces;
