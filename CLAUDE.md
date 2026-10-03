# CLAUDE.md — recipes

Context for AI-assisted development on this repo.

## Project Overview

Personal recipe collection published as a Jekyll static site on GitHub Pages. Recipes are Markdown files; the site is intentionally simple.

Public GitHub repo.

## Building

There's no Gemfile and no local build. GitHub Pages builds the site in CI (`actions/jekyll-build-pages` with `source: recipes`), so the Jekyll source is the `recipes/` folder, not the repo root. Check rendered changes on the live site after pushing; if a local preview is needed, ask Keith before adding a Gemfile.

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
- **`kind: notes`** — attempt notes about a recipe that lives somewhere else (or nowhere). Use `layout: page` and lead with the source link. See `recipes/improvement-notes.md` for how these get written.

Then add the page to `recipes/index.md` under its section, alphabetically. Notes pages get a badge:

```markdown
- [Crumpets](/recipes/bread/crumpets) <span class="badge">notes</span>
```

The index is hand-maintained on purpose for now. `kind` is in the front matter so it can later be generated from `site.pages` without touching every file.

Note: existing recipe pages predate the `kind` convention and mostly don't have it yet.

### Deployment

Push to `main`. GitHub Actions builds and deploys to GitHub Pages automatically.

### Cross-referencing with bookmarks

The bookmarks tool lives in the sibling content-forge repo. It shows which bookmarked recipes are already in the collection:

```bash
cd ~/code/content/private/content-forge
uv run faq-builder bookmarks --recipes-dir ~/code/content/public/recipes/recipes
```
