# Cycle Compass Period Tracker

Static files for GitHub Pages and ArcGIS StoryMaps.

## Files

- `tracker.html` - the interactive period tracker app
- `dashboard.html` - the local dashboard view
- `styles.css` - shared styling
- `tracker.js` - tracker logic and local response saving
- `dashboard.js` - dashboard charts from local browser storage

## GitHub Pages Setup

1. Create a new GitHub repository.
2. Upload all files in this folder to the repository root.
3. Go to repository `Settings`.
4. Open `Pages`.
5. Under `Build and deployment`, choose:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
6. Click `Save`.
7. Wait 1-3 minutes for GitHub Pages to publish.

Your links will look like:

- `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/tracker.html`
- `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/dashboard.html`

Use the `tracker.html` link inside ArcGIS StoryMaps.

## Important Data Note

This GitHub Pages version uses `localStorage`, so responses are stored only in the viewer's own browser. It works as a static interactive app, but it will not collect all public responses into one shared dashboard.

For a public dashboard collecting everyone, connect the tracker to shared storage such as ArcGIS Survey123, an ArcGIS Feature Layer, Firebase, or Supabase.
