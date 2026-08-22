# Switch web app

This is a dependency-free, responsive study app. It reads the generated JSON;
it never reads or parses the Markdown source files directly.

From the project root, first regenerate data after any content changes:

```bash
python3 scripts/md_to_json.py
```

Then start a local web server:

```bash
python3 -m http.server 8000 --bind 0.0.0.0
```

Open [http://localhost:8000/web/](http://localhost:8000/web/) on your laptop.
To use a phone on the same Wi-Fi network, open
`http://YOUR_LAPTOP_LOCAL_IP:8000/web/` on the phone.

The first version includes responsive Learn, Drill, and Notes views; day/card
navigation; priority and search filters; local completed-card progress;
bookmarks; dark mode; and keyboard navigation on desktop.
