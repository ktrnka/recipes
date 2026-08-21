# CLAUDE.md — recipes

Context for AI-assisted development on this repo.

## Project Overview

Personal recipe collection published as a Jekyll static site on GitHub Pages. Recipes are Markdown files; the site is intentionally simple.

Public GitHub repo.

## Quick Start

```bash
cd public/recipes
bundle install
bundle exec jekyll serve   # http://localhost:4000
```

`bundle exec` is required — bare `jekyll` won't find the right gem version.

## Key Architecture

| What | Where |
|------|-------|
| Site config | `_config.yml` |
| Homepage / index | `recipes/index.md` — hand-maintained list of every page |
| Bread | `recipes/bread/` |
| Pastry | `recipes/pastry/` — laminated doughs, choux, macarons, sweet bakery items |
| Soup | `recipes/soup/` |
| Sweet | `recipes/sweet/` — cookies, bars, desserts |
| Other | `recipes/` root |
| Cross-cutting notes | `recipes/notes/` — experiments not tied to one dish |
| Images | `recipes/img/` (referenced as `../img/...` from subfolders) |

## Common Workflows

### Adding a recipe or a set of notes

Every page is one Markdown file in the folder for its category, with front matter:

```yaml
---
title: Bagels
layout: cook-mode   # or `page` for notes-only pages
kind: recipe        # or `notes`
---
```

`kind` distinguishes the two things that live here:

- **`kind: recipe`** — ingredients and steps are on the page, so you can cook from it alone. Use `layout: cook-mode` and wrap the ingredient list in `<div class="ingredients" markdown="1">` so the checkboxes and cook-mode toggle work.
- **`kind: notes`** — attempt notes about a recipe that lives somewhere else (or nowhere). Use `layout: page` and lead with the source link. See `improvement-notes.md` for how these get written.

Then add the page to `recipes/index.md` under its section, alphabetically. Notes pages get a badge:

```markdown
- [Crumpets](/recipes/bread/crumpets) <span class="badge">notes</span>
```

The index is hand-maintained on purpose for now. `kind` is in the front matter so it can later be generated from `site.pages` without touching every file.

Note: existing recipe pages predate the `kind` convention and mostly don't have it yet.

### Deployment

Push to `main`. GitHub Actions builds and deploys to GitHub Pages automatically.

### Cross-referencing with bookmarks

```bash
# From workspace root — shows which bookmarked recipes are already in the collection
python3 private/bookmarks.py --recipes-dir public/recipes/recipes
```
