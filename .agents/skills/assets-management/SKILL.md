---
name: assets-management
description: Use when adding, searching, organizing, or referencing images, logos, fonts, video, or other slide deck assets.
---

# Assets Management

Target workflow inspired by Open Slide's assets panel and SVGL logo search.

## Rules

- Store final assets locally and deck-scoped.
- Record source URL, license/usage note, and intended deck/slide.
- Prefer SVG for logos/icons.
- Use optimized raster dimensions for image slots.
- Avoid production hotlinks.
- Keep asset references stable for export.

## SVGL-Style Logo Flow

1. Search for a brand/logo.
2. Let the user choose the variant when ambiguous.
3. Save SVG locally.
4. Use the local asset path in slide content.
5. Expose the asset as an Agent Native resource so product and code agents can see it.

## Future Product Actions

The app should grow actions for:

- `search-logo-assets`;
- `import-deck-asset`;
- `list-deck-assets`;
- `update-deck-asset-metadata`;
- `delete-deck-asset`.
