-- Authenticated users can create workspaces
(auth.uid() = owner_id)

-- Editors and owners can update workspace (uses SECURITY DEFINER function to avoid recursion)
public.is_workspace_editor_or_owner(id, auth.uid())

-- Members can read workspace (uses SECURITY DEFINER function to avoid recursion)
((auth.uid() = owner_id) OR public.is_workspace_member(id, auth.uid()))

-- Only owners can delete workspace
(auth.uid() = owner_id)
