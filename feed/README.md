# INRCLIQ Feed Prototype

Standalone prototype app for the social feed experience, created separately from the web app.

## Run locally

Open `index.html` directly in your browser, or serve the folder:

```powershell
cd "d:\Projects\InrCliq\Cursor\feed"
python -m http.server 8787
```

Then visit `http://localhost:8787`.

## Notes

- Content mirrors the reference prototype feed copy and labels.
- Visual system follows the existing InrCliq web style language (tokens, spacing, radius, shadows, brand blues).
- Fully separate from `web/` and does not affect existing app routes.
