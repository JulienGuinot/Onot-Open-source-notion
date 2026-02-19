-- members can view fellow members
is_workspace_member(workspace_id)
  
-- Owners can add members or user can self join via invite
  ((EXISTS ( SELECT 1
   FROM workspaces w
  WHERE ((w.id = workspace_members.workspace_id) AND (w.owner_id = auth.uid())))) OR ((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM workspace_invites wi
  WHERE ((wi.workspace_id = workspace_members.workspace_id) AND (wi.role = workspace_members.role) AND ((wi.expires_at IS NULL) OR (wi.expires_at > now())))))))


-- Owner can remove members or members can leave
  ((EXISTS ( SELECT 1
   FROM workspace_members wm
  WHERE ((wm.workspace_id = workspace_members.workspace_id) AND (wm.user_id = auth.uid()) AND (wm.role = 'owner'::text)))) OR (auth.uid() = user_id))



-- Owners can update member roles
   (EXISTS ( SELECT 1
   FROM workspace_members wm
  WHERE ((wm.workspace_id = workspace_members.workspace_id) AND (wm.user_id = auth.uid()) AND (wm.role = 'owner'::text))))