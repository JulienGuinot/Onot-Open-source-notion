--Editor can delete pages
  (EXISTS ( SELECT 1
   FROM workspace_members wm
  WHERE ((wm.workspace_id = pages.workspace_id) AND (wm.user_id = auth.uid()) AND (wm.role = ANY (ARRAY['owner'::text, 'editor'::text])))))


--Editors can insert pages 
  (EXISTS ( SELECT 1
   FROM workspace_members wm
  WHERE ((wm.workspace_id = pages.workspace_id) AND (wm.user_id = auth.uid()) AND (wm.role = ANY (ARRAY['owner'::text, 'editor'::text])))))


--Editors can update pages
  (EXISTS ( SELECT 1
   FROM workspace_members wm
  WHERE ((wm.workspace_id = pages.workspace_id) AND (wm.user_id = auth.uid()) AND (wm.role = ANY (ARRAY['owner'::text, 'editor'::text]))))) 


--Editors can read pages 
  (EXISTS ( SELECT 1
   FROM workspace_members wm
  WHERE ((wm.workspace_id = pages.workspace_id) AND (wm.user_id = auth.uid()))))