-- ============================================================================
-- Migration 007: Personal access tokens for MCP / agent integrations
-- ============================================================================
-- Each token belongs to a single user and grants the bearer the same Supabase
-- access as that user (subject to existing RLS on workspaces / pages / etc.).
-- The full token value is shown to the user once at creation; only the
-- sha256 hash is persisted.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.agent_tokens (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name          TEXT         NOT NULL,
    token_prefix  TEXT         NOT NULL,
    token_hash    TEXT         NOT NULL UNIQUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_used_at  TIMESTAMPTZ,
    revoked_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_tokens_user_id
    ON public.agent_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_agent_tokens_active_hash
    ON public.agent_tokens(token_hash)
    WHERE revoked_at IS NULL;

ALTER TABLE public.agent_tokens ENABLE ROW LEVEL SECURITY;

-- Users can see, create, update and delete their own tokens.
DROP POLICY IF EXISTS "agent_tokens_owner_all" ON public.agent_tokens;
CREATE POLICY "agent_tokens_owner_all"
    ON public.agent_tokens
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
