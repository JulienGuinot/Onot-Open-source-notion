-- Members can read pages (uses SECURITY DEFINER function to avoid recursion)
public.is_workspace_member(workspace_id, auth.uid())

-- Editors can insert pages (uses SECURITY DEFINER function to avoid recursion)
public.is_workspace_editor_or_owner(workspace_id, auth.uid())

-- Editors can update pages (uses SECURITY DEFINER function to avoid recursion)
public.is_workspace_editor_or_owner(workspace_id, auth.uid())

-- Editors can delete pages (uses SECURITY DEFINER function to avoid recursion)
public.is_workspace_editor_or_owner(workspace_id, auth.uid())
