# The Sage by Repose — source pack

Raw PM / CAD files for the Progress Mapping site `prj_sage_repose`.

| File | Use in app |
|------|------------|
| `Reports/Reports/The sage by repose.xlsx` | **Home zones** — Sheet2 `Zones` row + North/South villa averages (loaded at runtime) |
| `Reports/.../The Sage Villa stage wise Status  -.xlsx` | Older villa sheet (optional / codegen) |
| `Reports/.../GANTT CHART THE SAGE BY REPOSE-27726.xlsx` | Infra packages → `sageGantt.ts` |
| `Master plan_Villa Plotting.dwg` | Convert to DXF for Site Prep viewer |
| `Master plan_Villa Plotting.dxf` | Site Preparation drawing canvas |
| `clubhouse 3D.skp` | Clubhouse model in Periodic Monitoring |

## Excel → home zones (no hardcode)

1. Keep `The sage by repose.xlsx` under `public/Sage/Reports/Reports/`.
2. **Sheet2** must have:
   - Villa blocks under **North Zone** / **South Zone** (Wings + Actual % + Status)
   - A **Zones** row listing the home packages (e.g. North Zone, South Zone, Recreation Lounge, Club House, ROADS, Common Area Landscaping…)
3. Open **The Sage** — zones load from that file automatically.
4. After PM updates the workbook, click **Reload** on the zone strip (or **Import** another `.xlsx`).

URL: `/Sage/Reports/Reports/The%20sage%20by%20repose.xlsx`  
Other projects: set `project.excelSource` (or add to `SITE_EXCEL_SOURCES`).

## Master plan (DXF)

1. Open `Master plan_Villa Plotting.dwg` in AutoCAD / BricsCAD / LibreCAD.
2. **Save As** / **Export** → **DXF** (R2000+ ASCII preferred).
3. Save as `public/Sage/Master plan_Villa Plotting.dxf`.
4. Open **The Sage** → **Site Preparation**.

## 3D (SketchUp)

Clubhouse `.skp` loads via **openskp**.  
URL: `/Sage/clubhouse%203D.skp`
