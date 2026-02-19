-- Anyone authenticated can read invites by token
  (auth.uid() IS NOT NULL)


-- Owner can create invites
  (EXISTS ( SELECT 1
   FROM workspace_members wm
  WHERE ((wm.workspace_id = workspace_invites.workspace_id) AND (wm.user_id = auth.uid()) AND (wm.role = 'owner'::text))))

  -- Owner can revoke invites
    (EXISTS ( SELECT 1
   FROM workspace_members wm
  WHERE ((wm.workspace_id = workspace_invites.workspace_id) AND (wm.user_id = auth.uid()) AND (wm.role = 'owner'::text))))