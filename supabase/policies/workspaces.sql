-- Authenticated users can create workspaces
(auth.uid() = owner_id)

--Editors and owners can update workspace
  (EXISTS ( SELECT 1
   FROM workspace_members wm
  WHERE ((wm.workspace_id = workspaces.id) AND (wm.user_id = auth.uid()) AND (wm.role = ANY (ARRAY['owner'::text, 'editor'::text])))))


-- Members can read workspace
  ((auth.uid() = owner_id) OR (EXISTS ( SELECT 1
   FROM workspace_members wm
  WHERE ((wm.workspace_id = workspaces.id) AND (wm.user_id = auth.uid())))))

--Members or owners can read workspace
  ((auth.uid() = owner_id) OR (EXISTS ( SELECT 1
   FROM workspace_members wm
  WHERE ((wm.workspace_id = workspaces.id) AND (wm.user_id = auth.uid())))))

-- Only owners can delete workspace
  (auth.uid() = owner_id)