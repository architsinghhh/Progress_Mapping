# AJNHAWK — Construction Progress Intelligence

Pilot demo for builders: drone orthos, DEM, contours, 3D timelapse, and detailed structural progress (columns / beams / slabs) across multi-zone townships.

## Quick start

```bash
npm install
npm run dev
```

## Architecture

Designed so auth, APIs, and a real database can plug in without rewriting the UI.

```
src/
  app/           # shell, layout, future auth providers
  entities/      # domain types (= future DB / API contracts)
  features/      # UI by domain (site-plan, progress, comparison…)
  services/
    api/         # facade (swap mock → REST/GraphQL here)
    mocks/       # pilot dataset for demos
  shared/        # reusable UI + utils
  store/         # Zustand client state
```

### Future plugs

| Concern | Where it lands |
|--------|----------------|
| Login / logout | `app/providers` + route guards in `App.tsx` |
| REST / GraphQL | Replace bodies in `services/api/projectApi.ts` |
| Database models | Mirror `entities/types.ts` |
| Multi-project | `/projects/:projectId` route already stubbed |

## Demo project

**Greenfield Township · Sector 7** — residential towers, school, clubhouse, parks, retail plaza. Six survey missions (~18-day cadence) with delay insights and comparison modes (ortho / DEM / contours / 3D / floor-wise).
