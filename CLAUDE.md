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
| Recipe files | `recipes/` — one Markdown file per recipe |

## Common Workflows

### Adding a recipe

Create a Markdown file in `recipes/`. Follow the format of existing recipes (ingredient list, then steps).

### Deployment

Push to `main`. GitHub Actions builds and deploys to GitHub Pages automatically.

### Cross-referencing with bookmarks

```bash
# From workspace root — shows which bookmarked recipes are already in the collection
python3 private/bookmarks.py --recipes-dir public/recipes/recipes
```
