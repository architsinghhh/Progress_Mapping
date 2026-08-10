# Progress Mapping — setup on another PC

This is a **Node.js / Vite / React** app (not Python).  
There is no `requirements.txt`. Dependencies are listed in `package.json` and locked in `package-lock.json`.

---

## 1. What to install on the other PC (once)

| Requirement | Version | Notes |
|-------------|---------|--------|
| **Windows / macOS / Linux** | — | Any modern OS |
| **Node.js** | **20 LTS or 22 LTS** | https://nodejs.org (includes `npm`) |
| **npm** | comes with Node | Check: `node -v` and `npm -v` |
| **Git** (optional) | latest | Only if you clone instead of zip |
| **Browser** | Chrome / Edge / Firefox | For the UI |
| **Internet** | required first run | Downloads `node_modules` + Google Drive GLBs for Greenfield |

Optional for smoother large GLB downloads:

| Optional | Purpose |
|----------|---------|
| `GOOGLE_DRIVE_API_KEY` in `.env` | Helps fetch large public Drive files |

RAM: **16 GB+ recommended** if you open Greenfield 3D / ortho (GLBs are large). Riverside / Lakeview demo models are light.

---

## 2. Should you zip the current folder?

**Yes — but not the whole thing.** Zip the **source project**, not `node_modules`.

### Include
- `src/`
- `public/`
- `package.json`
- `package-lock.json` (important — same versions)
- `vite.config.ts`
- `vite-plugin-drive-model.ts`
- `drive-download.ts` (and any other root `.ts` configs)
- `tsconfig*.json`
- `index.html`
- `.env.example`
- `.gitignore`
- `README.md` / this file

### Exclude (makes zip huge / breaks on other OS)
- `node_modules/` ← **do not zip** (reinstall with `npm install`)
- `.drive-cache/` ← Drive GLB disk cache (re-downloads)
- `dist/` ← build output
- `.vite` / `node_modules/.vite`
- `.env` ← contains secrets; copy separately or recreate from `.env.example`

**PowerShell (this PC) — create a clean zip:**

```powershell
cd "D:\Progress Mapping"
npm run build  # optional; not required just to transfer

# Example: compress without node_modules / cache
$dest = "$env:USERPROFILE\Desktop\Progress-Mapping-transfer.zip"
if (Test-Path $dest) { Remove-Item $dest }
Compress-Archive -Path @(
  'src','public','package.json','package-lock.json',
  'vite.config.ts','vite-plugin-drive-model.ts','drive-download.ts',
  'tsconfig.json','tsconfig.app.json','tsconfig.node.json',
  'index.html','.env.example','.gitignore','README.md','REQUIREMENTS.md'
) -DestinationPath $dest -Force
```

Or use Explorer: copy the folder, delete `node_modules`, `.drive-cache`, `dist`, then zip.

Also copy `.env` separately (USB / private channel) if Greenfield Drive access needs your key.

---

## 3. On the other PC — install & run

```powershell
# 1) Install Node 20+ LTS from nodejs.org, then open a new terminal

# 2) Unzip the project, then:
cd "path\to\Progress Mapping"

# 3) Create env file
copy .env.example .env
# Edit .env if you have GOOGLE_DRIVE_API_KEY (optional)

# 4) Install dependencies (reads package-lock.json)
npm install

# 5) Run
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173/`).

### Useful commands

| Command | What it does |
|---------|----------------|
| `npm install` | Install all deps from lockfile |
| `npm run dev` | Local demo server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | Lint (`oxlint`) |

---

## 4. Dependency list (same as `package.json`)

### Runtime
- `react`, `react-dom`, `react-router-dom`
- `three`, `@react-three/fiber`, `@react-three/drei`, `@types/three`
- `zustand`, `framer-motion`, `recharts`, `lucide-react`
- `clsx`, `date-fns`

### Dev / tooling
- `vite`, `@vitejs/plugin-react`
- `typescript`, `@types/react`, `@types/react-dom`, `@types/node`
- `tailwindcss`, `@tailwindcss/vite`
- `oxlint`

Exact versions: see `package.json` / `package-lock.json`. Prefer **`npm install`** (uses lockfile) over hand-picking packages.

---

## 5. After install checklist

1. Portfolio opens with **3 sites** (Greenfield, Riverside, Lakeview).
2. **Greenfield** → Overview / Survey / 3D need internet the first time (Drive GLBs). Wait for first download; later runs use `.drive-cache/`.
3. **Riverside / Lakeview** → mock plan + demo 3D (no Drive GLB required).
4. If Greenfield 3D fails: share Drive files as **Anyone with the link → Viewer**, or set `GOOGLE_DRIVE_API_KEY` in `.env`. Stage IDs live in `public/models/model-index.json`.

---

## 6. Common issues

| Problem | Fix |
|---------|-----|
| `EJSONPARSE` / bad `package.json` | File must start with `{`, not extra characters |
| `ENOTEMPTY` under `.vite/deps` | Stop all `node` processes, delete `node_modules\.vite`, run `npm run dev` again |
| Rust / “memory allocation … failed” | Only **one** `npm run dev`; kill extra Node processes; free RAM |
| Port 5173 in use | Old Vite still running — `Ctrl+C` or kill Node, then restart |
| Ortho / 3D stuck on Greenfield | Network + Drive sharing / API key |

---

## Short answer

- **Requirements:** Node 20+, then `npm install` (this *is* your requirements install).
- **Transfer:** Zip the project **without** `node_modules` and `.drive-cache`; bring `.env` separately; on the other PC run `npm install` → `npm run dev`.
