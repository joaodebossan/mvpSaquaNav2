# SaquaNav

SaquaNav is a community-driven map application built for the city of Saquarema, RJ, Brazil. It allows residents to report road incidents, public works, traffic, accidents and other events directly on an interactive map. Administrators can review, approve and manage reports in real time through a dedicated panel.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

SaquaNav operates as a fully static front-end application. There is no custom back-end server. All data persistence is handled by [Supabase](https://supabase.com), which provides a managed PostgreSQL database with a RESTful API and real-time WebSocket subscriptions. The application is hosted on [Vercel](https://vercel.com) and redeployed automatically on every push to the `main` branch.

---

## Features

### User Interface

- Interactive map powered by [Leaflet.js](https://leafletjs.com) with OpenStreetMap tiles.
- Create reports by pressing and holding (mobile) or double-clicking (desktop) on the map.
- Report types: roadworks, traffic, accidents, events, potholes.
- Optional photo attachment with separate camera and gallery buttons on mobile.
- Automatic address detection via reverse geocoding (Nominatim API).
- Personal favorites system: save and manage locations per user account.
- Real-time map updates when administrators approve, reject or delete reports.
- Light and dark mode support with persistent theme preference.
- Search bar with address autocomplete.
- Location filter buttons to toggle individual event categories.
- Favorites badge displayed on report markers when the user is logged in.

### Administrator Interface

- Secure login panel separate from the user interface.
- Live list of all submitted reports with horizontal card carousel on mobile.
- Approve, reject or delete reports with immediate Supabase updates.
- Lazy-loading photo viewer in both list cards and map popups.
- Manual report creation by long-pressing or double-clicking the map.
- Real-time report updates via Supabase Realtime WebSocket channel.
- Statistics panel showing total, pending, approved and rejected counts.

---

## Architecture

```
Browser (User / Admin)
        |
        | HTTPS
        v
   Vercel CDN
   (Static HTML, CSS, JS)
        |
        | Supabase JS SDK (REST + WebSocket)
        v
  Supabase (PostgreSQL)
  - reports table
  - Row Level Security policies
  - Realtime publication
```

The application uses the Supabase JavaScript client library (`@supabase/supabase-js`) loaded via CDN. No build step or bundler is required. Deployments are triggered automatically by GitHub pushes.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Front-end | Vanilla HTML5, CSS3, JavaScript (ES2020+) |
| Map | Leaflet.js 1.9.4 |
| Database | Supabase (PostgreSQL) |
| Real-time | Supabase Realtime (WebSocket) |
| Geocoding | OpenStreetMap Nominatim API |
| Hosting | Vercel (static site) |
| Version control | Git / GitHub |

---

## Project Structure

```
SaquaNav-Mobile/
├── index.html              # User-facing page
├── admin.html              # Administrator panel
├── vercel.json             # Vercel deployment configuration
├── .gitignore
├── css/
│   ├── usuario.css         # Styles for the user interface
│   └── admin.css           # Styles for the admin interface
└── js/
    ├── supabase-config.js  # Supabase client initialization (shared)
    ├── usuario.js          # User interface logic
    └── admin.js            # Administrator panel logic
```

---

## Database Schema

The application uses a single table in Supabase.

```sql
CREATE TABLE reports (
  id            BIGSERIAL PRIMARY KEY,
  tipo          TEXT NOT NULL,
  lat           REAL,
  lng           REAL,
  endereco      TEXT,
  descricao     TEXT,
  imagem_base64 TEXT,
  timestamp     TIMESTAMPTZ DEFAULT NOW(),
  status        TEXT DEFAULT 'pendente'
);
```

### Row Level Security Policies

The following policies allow public read access and authenticated write access. Adjust these policies according to your security requirements before going to production.

```sql
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read"   ON reports FOR SELECT USING (true);
CREATE POLICY "Public insert" ON reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin update"  ON reports FOR UPDATE USING (true);
CREATE POLICY "Admin delete"  ON reports FOR DELETE USING (true);
```

### Realtime Publication

To enable real-time updates, add the `reports` table to the Supabase Realtime publication:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE reports;
```

---

## Getting Started

### Prerequisites

- A modern web browser.
- A [Supabase](https://supabase.com) project with the `reports` table created as described above.
- Python 3 (optional, for local development server).

### Running Locally

Because OpenStreetMap tiles require an HTTP `Referer` header, the application cannot be opened directly from the file system. Use a local web server instead.

```bash
# Navigate to the project directory
cd "SaquaNav-Mobile"

# Start a local server on port 8080
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080) in your browser.

> **Note:** The admin panel is available at [http://localhost:8080/admin.html](http://localhost:8080/admin.html).

---

## Deployment

The project is configured to deploy automatically to Vercel. The `vercel.json` file at the project root instructs Vercel to serve the project as a static site with clean URLs.

### Steps

1. Push the repository to GitHub.
2. Log in to [vercel.com](https://vercel.com) and import the repository.
3. Set the **Framework Preset** to `Other`.
4. Leave the build command and output directory fields empty.
5. Click **Deploy**.

Every subsequent `git push origin main` will trigger an automatic redeploy with zero downtime.

---

## Configuration

All Supabase credentials are stored in `js/supabase-config.js`. This file is loaded before the main application scripts in both `index.html` and `admin.html`.

```js
// js/supabase-config.js
const SUPABASE_URL = 'https://your-project-ref.supabase.co';
const SUPABASE_KEY = 'your-anon-public-key';

const { createClient } = window.supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);
```

> **Warning:** The `anon` key used here is the public API key. It is safe to expose in client-side code as long as Row Level Security policies are correctly configured on all tables.

---

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature-name`.
3. Commit your changes: `git commit -m "feat: description of change"`.
4. Push to your fork: `git push origin feature/your-feature-name`.
5. Open a pull request against the `main` branch.

### Commit Message Convention

This project follows a simplified version of the [Conventional Commits](https://www.conventionalcommits.org/) specification.

| Prefix | Purpose |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `style:` | CSS or visual changes |
| `refactor:` | Code restructuring without behavior change |
| `docs:` | Documentation updates |

---

## License

This project is developed for the city of Saquarema, RJ, Brazil. All rights reserved.