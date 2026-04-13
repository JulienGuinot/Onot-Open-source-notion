# Serveur MCP Onot

## Résumé

  Oui, c’est possible. Pour Onot, le plus fiable est un serveur MCP “API métier” qui expose les workspaces, pages et  
  blocs comme outils structurés, au lieu de piloter l’interface au clic. L’agent pourra lire les pages, chercher du  
  contenu, créer/modifier/supprimer/déplacer des blocs, ajouter des notes, et créer des pages, avec les droits d’un  
  utilisateur agent dédié.

## Changements Clés

- Ajouter un serveur MCP Node/TypeScript séparé, par exemple mcp/, basé sur le SDK TypeScript officiel MCP: @modelc
ontextprotocol/sdk ([https://github.com/modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk)) avec zod pour valider les entrées.
- Authentifier le MCP via un compte Supabase “agent” dédié avec MCP_AGENT_EMAIL / MCP_AGENT_PASSWORD, en utilisant
l’URL et l’anon key Supabase existantes; les RLS et rôles workspace restent donc actifs.
- Réutiliser le modèle de données actuel: WorkspaceData, Page, Block, et les tables Supabase workspaces / pages, où
chaque page contient ses blocs en JSON.
- Exposer des ressources MCP lisibles:
  - onot://workspaces
  - onot://workspace/{workspaceId}/pages
  - onot://workspace/{workspaceId}/page/{pageId} en JSON structuré et texte/Markdown simplifié.
- Exposer des outils MCP:
  - list_workspaces, list_pages, read_page, search_pages
  - create_page, rename_page
  - append_block, insert_block, update_block, delete_block, move_block, change_block_type
  - set_todo_checked, update_table_cell pour les blocs spécialisés
  - add_agent_note, implémenté comme ajout d’un bloc texte/callout sans nouveau schéma.
- Reporter la partie “voir l’interface comme un humain” à une phase hybride optionnelle avec Playwright: captures

## Garde-Fous

- Refuser toute mutation si le compte agent n’a pas un rôle owner, admin ou editor sur le workspace.
- Valider les types de blocs avant écriture pour éviter de casser le JSON des pages.
- Mettre à jour updatedAt dans la page et laisser Supabase gérer updated_at.
- Retourner des diffs ou résumés après mutation: bloc créé, bloc modifié, ancien/nouveau contenu court, page cible.
- Garder les opérations destructrices explicites: delete_block et suppression de page nécessitent un argument clair,
pas une suppression implicite par recherche floue.

## Tests

- Tester la lecture: workspaces, pages, page complète, recherche texte dans les blocs.
- Tester les mutations simples: créer une page, ajouter un bloc texte, modifier un titre, modifier un bloc existant.
- Tester les blocs spécialisés: todo, callout, table cell si la table existe.
- Tester les refus: compte viewer, workspace inexistant, page inexistante, block id invalide, type de bloc invalide.
- Vérifier que l’app Next reçoit les changements via Supabase/realtime ou au rechargement.

## Hypothèses

- Le serveur MCP cible d’abord les données cloud Supabase, pas le mode invité/localStorage.
- Le compte agent sera ajouté comme membre aux workspaces qu’il peut manipuler.
- On commence par un transport MCP local stdio pour Codex/Claude Desktop/autres agents locaux; un transport HTTP
pourra être ajouté plus tard si tu veux un serveur partagé.

