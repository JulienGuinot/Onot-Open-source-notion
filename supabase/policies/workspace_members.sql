-- Members can view fellow members (uses SECURITY DEFINER function to avoid recursion)
public.is_workspace_member(workspace_id, auth.uid())

-- Owners can add members or user can self-join via invite
((EXISTS ( SELECT 1
   FROM workspaces w
  WHERE ((w.id = workspace_members.workspace_id) AND (w.owner_id = auth.uid())))) OR ((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM workspace_invites wi
  WHERE ((wi.workspace_id = workspace_members.workspace_id) AND (wi.role = workspace_members.role) AND ((wi.expires_at IS NULL) OR (wi.expires_at > now())))))))

-- Owners can update member roles (uses SECURITY DEFINER function to avoid recursion)
public.is_workspace_owner_member(workspace_id, auth.uid())

-- Owners can remove members or members can leave (uses SECURITY DEFINER function to avoid recursion)
(public.is_workspace_owner_member(workspace_id, auth.uid()) OR (auth.uid() = user_id))
