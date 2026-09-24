"""Generate src/services/mocks/sageSite.ts from public/Sage Excel reports."""
from __future__ import annotations

import re
from datetime import date, datetime
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[1]
XLSX = ROOT / "public/Sage/Reports/Reports/The Sage Villa stage wise Status  -.xlsx"
OUT = ROOT / "src/services/mocks/sageSite.ts"

COLORS = [
    "#0d9488",
    "#0891b2",
    "#2563eb",
    "#7c3aed",
    "#c026d3",
    "#db2777",
    "#e11d48",
    "#ea580c",
    "#ca8a04",
    "#65a30d",
]
ASOF = date(2026, 8, 30)


def fmt(d: object) -> str | None:
    if isinstance(d, datetime):
        return d.date().isoformat()
    if isinstance(d, date):
        return d.isoformat()
    return None


def pct(v: object) -> int | None:
    if v is None or v == "":
        return None
    try:
        p = float(v)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if p <= 1.5:
        return int(round(p * 100))
    return int(round(p))


def load_villas() -> list[dict]:
    wb = openpyxl.load_workbook(XLSX, data_only=True)
    ws = wb["villa stage wise status"]
    villas: list[dict] = []
    for i, row in enumerate(ws.iter_rows(values_only=True), 1):
        if i <= 5:
            continue
        vals = list(row)
        code = vals[2]
        if not isinstance(code, str):
            continue
        code = code.strip().upper()
        if not re.match(r"^[NS]\d", code):
            continue
        actual = pct(vals[12] if len(vals) > 12 else None)
        committed = pct(vals[11] if len(vals) > 11 else None)
        progress = actual if actual is not None else (committed if committed is not None else 0)
        villas.append(
            {
                "code": code,
                "type": str(vals[3]).strip() if vals[3] else "Villa",
                "contractor": str(vals[4]).strip() if vals[4] else "TBD",
                "startCommitted": fmt(vals[6]),
                "startActual": fmt(vals[7]),
                "possCommitted": fmt(vals[8]),
                "possActual": fmt(vals[9]),
                "progress": progress,
            }
        )
    by: dict[str, dict] = {}
    for v in villas:
        by[v["code"]] = v

    def sort_key(v: dict) -> tuple:
        digits = int(re.sub(r"\D", "", v["code"]) or 0)
        return (v["code"][0], digits, v["code"])

    return sorted(by.values(), key=sort_key)


def status_of(v: dict) -> str:
    p = v["progress"]
    pc, pa = v["possCommitted"], v["possActual"]
    if p >= 95:
        return "completed"
    behind = False
    if pc and pa and pa > pc:
        behind = True
    if pc:
        try:
            if date.fromisoformat(pc) < ASOF and p < 85:
                behind = True
        except ValueError:
            pass
    if behind and p < 90:
        return "behind"
    if p == 0 and pc:
        try:
            if date.fromisoformat(pc) < ASOF:
                return "behind"
        except ValueError:
            pass
    return "on_track"


def remark_of(v: dict, st: str) -> str:
    bits = [v["contractor"]]
    if v["possCommitted"] and v["possActual"] and v["possActual"] > v["possCommitted"]:
        bits.append(f"possession {v['possCommitted']} → {v['possActual']}")
    elif v["possActual"]:
        bits.append(f"poss. {v['possActual']}")
    if st == "completed":
        bits.append("near handover")
    return " · ".join(bits)


def cell(i: int, col0: int, row0: int, cols: int = 4) -> tuple[int, int, str, dict]:
    c = i % cols
    r = i // cols
    x = col0 + c * 55
    y = row0 + r * 48
    return x, y, f"M{x} {y} h48 v36 h-48 Z", {"x": x + 24, "y": y + 18}


def esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace("'", "\\'")


def main() -> None:
    villas = load_villas()
    n_list = [v for v in villas if v["code"].startswith("N")]
    s_list = [v for v in villas if v["code"].startswith("S")]

    zones: list[dict] = []
    infra = [
        ("sg_gate", "MG", "Main Gate", "Infra · complete", 100, "completed", "Gantt: structure complete", "#115e59", 20, 20),
        ("sg_mat", "MT", "Material Gate", "Infra · complete", 100, "completed", "Gantt: complete", "#0f766e", 90, 20),
        ("sg_wall", "BW", "Plot Boundary Wall", "Infra · complete", 100, "completed", "Gantt: complete", "#134e4a", 160, 20),
        ("sg_land", "CL", "Common Landscaping", "Open spaces", 70, "on_track", "Gantt ~70%", "#15803d", 230, 20),
        ("sg_road", "RD", "Internal Roads (Trimix)", "Infrastructure", 50, "behind", "Gantt ~50%", "#a16207", 300, 20),
        ("sg_club", "CH", "Clubhouse", "Amenities · SketchUp source", 25, "on_track", "3D .skp in public/Sage — export GLB later", "#7c3aed", 370, 20),
    ]
    for id_, code, name, typ, prog, st, rem, color, x, y in infra:
        zones.append(
            {
                "id": id_,
                "code": code,
                "name": name,
                "type": typ,
                "color": color,
                "overallProgress": prog,
                "scheduleStatus": st,
                "remark": rem,
                "floorsPlanned": 2 if id_ == "sg_club" else 1,
                "floorsComplete": 1 if prog >= 50 else 0,
                "pathD": f"M{x} {y} h60 v40 h-60 Z",
                "center": {"x": x + 30, "y": y + 20},
                "kind": "infra",
            }
        )

    for i, v in enumerate(n_list):
        _x, _y, path, center = cell(i, 20, 90, cols=5)
        st = status_of(v)
        zones.append(
            {
                "id": f"sg_{v['code'].lower()}",
                "code": v["code"],
                "name": f"Villa {v['code']}",
                "type": f"Villa · {v['type']}",
                "color": COLORS[i % len(COLORS)],
                "overallProgress": v["progress"],
                "scheduleStatus": st,
                "remark": remark_of(v, st),
                "floorsPlanned": 2,
                "floorsComplete": 2 if v["progress"] >= 90 else (1 if v["progress"] >= 45 else 0),
                "pathD": path,
                "center": center,
                "kind": "villa",
            }
        )

    for i, v in enumerate(s_list):
        _x, _y, path, center = cell(i, 300, 90, cols=4)
        st = status_of(v)
        zones.append(
            {
                "id": f"sg_{v['code'].lower()}",
                "code": v["code"],
                "name": f"Villa {v['code']}",
                "type": f"Villa · {v['type']}",
                "color": COLORS[(i + 3) % len(COLORS)],
                "overallProgress": v["progress"],
                "scheduleStatus": st,
                "remark": remark_of(v, st),
                "floorsPlanned": 2,
                "floorsComplete": 2 if v["progress"] >= 90 else (1 if v["progress"] >= 45 else 0),
                "pathD": path,
                "center": center,
                "kind": "villa",
            }
        )

    villa_only = [z for z in zones if z["kind"] == "villa"]
    avg = round(sum(z["overallProgress"] for z in villa_only) / len(villa_only))
    behind = sum(1 for z in villa_only if z["scheduleStatus"] == "behind")
    completed = sum(1 for z in villa_only if z["scheduleStatus"] == "completed")
    proj_status = "behind" if behind >= 8 else "on_track"

    lines: list[str] = []
    a = lines.append
    a("/** The Sage by Repose — seeded from public/Sage Excel (villa status + Gantt). */")
    a("import type {")
    a("  ComparisonFrame,")
    a("  DelayForecast,")
    a("  Insight,")
    a("  ProgressItem,")
    a("  ProgressSnapshot,")
    a("  Project,")
    a("  ScheduleStatus,")
    a("  SurveyMission,")
    a("  TerrainFeature,")
    a("  VolumeDiff,")
    a("  Zone,")
    a("} from '@/entities/types'")
    a("import { buildFloorComparisons } from '@/shared/lib/floorProgress'")
    a("")
    a("export const sageProject: Project = {")
    a("  id: 'prj_sage_repose',")
    a("  name: 'The Sage by Repose',")
    a("  type: 'township',")
    a("  location: 'Lohr',")
    a("  client: 'Repose',")
    a("  builderId: 'bld_horizon',")
    a("  startDate: '2024-10-01',")
    a("  targetDate: '2027-12-31',")
    a("  totalAreaAcres: 50,")
    a("  description:")
    a(
        "    'Villa township seeded from PM Excel (34 villas + site packages). "
        "Master plan DWG / clubhouse SketchUp in public/Sage — no drone capture yet.',"
    )
    a(f"  overallProgress: {avg},")
    a(f"  scheduleStatus: '{proj_status}',")
    a(f"  zoneCount: {len(zones)},")
    a("  lastSurveyDate: '2026-08-30',")
    a(f"  headline: 'Villa pack · {completed} near-complete · {behind} behind possession',")
    a("  remark: 'Data from Sage villa stage-wise status (30 Aug 2026) + construction Gantt',")
    a("  coverTone: 'forest',")
    a("  hasSiteCapture: false,")
    a("}")
    a("")
    a("export const sageZones: Zone[] = [")
    for z in zones:
        a("  {")
        a(f"    id: '{z['id']}',")
        a(f"    code: '{z['code']}',")
        a(f"    name: '{esc(z['name'])}',")
        a(f"    type: '{esc(z['type'])}',")
        a(f"    color: '{z['color']}',")
        a(f"    overallProgress: {z['overallProgress']},")
        a(f"    scheduleStatus: '{z['scheduleStatus']}',")
        a(f"    remark: '{esc(z['remark'])}',")
        a(f"    floorsPlanned: {z['floorsPlanned']},")
        a(f"    floorsComplete: {z['floorsComplete']},")
        a(f"    pathD: '{z['pathD']}',")
        a(f"    center: {{ x: {z['center']['x']}, y: {z['center']['y']} }},")
        a("  },")
    a("]")
    a("")
    a("function statusFromPct(onsite: number, planned: number): ScheduleStatus {")
    a("  if (onsite >= 95) return 'completed'")
    a("  if (onsite + 8 < planned) return 'behind'")
    a("  if (onsite > planned + 5) return 'ahead'")
    a("  return 'on_track'")
    a("}")
    a("")
    a("function sageProgress(zoneId: string): ProgressItem[] {")
    a("  const z = sageZones.find((x) => x.id === zoneId)")
    a("  if (!z) return []")
    a("  const p = z.overallProgress")
    a("  const civil = Math.min(100, Math.round(p * 1.15))")
    a("  const mep = Math.min(100, Math.round(p * 0.85))")
    a("  const fin = Math.min(100, Math.round(p * 0.55))")
    a("  const land = Math.min(100, Math.round(p * 0.35))")
    a(
        "  const mk = ("
        "id: string, phase: ProgressItem['phase'], label: string, "
        "onsite: number, planned: number, remark: string"
        "): ProgressItem => ({"
    )
    a("    id,")
    a("    zoneId,")
    a("    phase,")
    a("    label,")
    a("    plannedDays: '—',")
    a("    plannedPercent: planned,")
    a("    onsitePercent: Math.min(100, onsite),")
    a("    status: statusFromPct(onsite, planned),")
    a("    remark,")
    a("    lastUpdated: '2026-08-30',")
    a("  })")
    a(
        "  const infraIds = new Set(["
        "'sg_gate', 'sg_mat', 'sg_wall', 'sg_land', 'sg_road', 'sg_club'"
        "])"
    )
    a("  if (infraIds.has(zoneId)) {")
    a("    return [")
    a(
        "      mk(`${zoneId}_civ`, 'plinth', 'Civil / package works', p, "
        "Math.min(100, p + 5), z.remark ?? 'Gantt package'),"
    )
    a("      mk(`${zoneId}_mep`, 'finishing', 'MEP / finishing', mep, Math.min(100, p), z.type),")
    a("    ]")
    a("  }")
    a("  return [")
    a(
        "    mk(`${zoneId}_civ`, 'plinth', 'Civil work', civil, "
        "Math.min(100, civil + 5), 'From villa stage-wise sheet'),"
    )
    a(
        "    mk(`${zoneId}_mep`, 'superstructure', 'MEP work', mep, "
        "Math.min(100, Math.round(p * 0.9) + 10), z.remark ?? ''),"
    )
    a(
        "    mk(`${zoneId}_fin`, 'finishing', 'Finishing', fin, "
        "Math.min(100, Math.round(p * 0.7) + 15), 'Possession-linked'),"
    )
    a(
        "    mk(`${zoneId}_land`, 'landscaping', 'Landscape / handover prep', land, "
        "Math.min(100, Math.round(p * 0.5) + 10), ''),"
    )
    a("  ]")
    a("}")
    a("")
    a("const sageMissions: SurveyMission[] = [")
    missions = [
        ("Baseline · gates & wall", "2024-12-15", "Main gate, material gate, boundary wall packages closed on Gantt."),
        ("Villa wave 1 starts", "2025-04-18", "Early North villas (N10/N05/N62) actual starts."),
        ("Mid build checkpoint", "2025-11-18", "Multiple Real Infra villas in structure."),
        ("Status sheet · 22 Jun 2026", "2026-06-22", "Villa progress report snapshot from site Excel."),
        ("Status sheet · 30 Aug 2026", "2026-08-30", "Latest villa stage-wise % imported into this demo."),
    ]
    for i, (lab, dt, note) in enumerate(missions):
        a("  {")
        a(f"    id: 'sg_m{i}',")
        a(f"    date: '{dt}',")
        a(f"    label: '{esc(lab)}',")
        a(f"    dayOffset: {i * 180},")
        a(f"    notes: '{esc(note)}',")
        a("    layers: ['ortho', 'dem', 'contours'],")
        a("    gsdCm: 2.5,")
        a("    altitudeM: 120,")
        a("    droneId: '—',")
        a("    coverageHa: 20,")
        a(f"    constructionStage: {min(6, i + 1)},")
        a("  },")
    a("]")
    a("")
    a("const sageSnapshots: ProgressSnapshot[] = [")
    snap_dates = ["Dec 24", "Jun 25", "Dec 25", "Jun 26", "Aug 26"]
    for i, dt in enumerate(snap_dates):
        ov = [12, 22, 28, 33, avg][i]
        a("  {")
        a(f"    date: '{dt}',")
        a(f"    residential: {min(100, ov + 5)},")
        a(f"    commercial: {max(0, ov - 10)},")
        a(f"    openSpaces: {min(100, 40 + i * 8)},")
        a(f"    amenities: {min(100, 20 + i * 5)},")
        a(f"    clubHouse: {min(100, 10 + i * 4)},")
        a(f"    plannedResidential: {min(100, ov + 15)},")
        a(f"    plannedCommercial: {min(100, ov + 5)},")
        a(f"    plannedOpenSpaces: {min(100, 55 + i * 5)},")
        a(f"    plannedAmenities: {min(100, 40 + i * 8)},")
        a(f"    plannedClubHouse: {min(100, 30 + i * 5)},")
        a("  },")
    a("]")
    a("")
    behind_v = sorted(
        [z for z in villa_only if z["scheduleStatus"] == "behind"],
        key=lambda z: z["overallProgress"],
    )
    a("const sageInsights: Insight[] = [")
    a("  {")
    a("    id: 'sg_i1',")
    a("    severity: 'warning',")
    a("    title: 'Possession slips on multiple villas',")
    a(
        f"    body: '{behind} of {len(villa_only)} villas show behind/on-slip vs committed "
        f"possession in the 30 Aug 2026 sheet. Avg villa progress ~{avg}%.',"
    )
    a("    action: 'Filter Zone strip · prioritize low-% villas',")
    a("    comparisonMode: 'ortho',")
    a("  },")
    if behind_v:
        z = behind_v[0]
        a("  {")
        a("    id: 'sg_i2',")
        a("    severity: 'critical',")
        a(f"    title: '{esc(z['name'])} at {z['overallProgress']}%',")
        a(
            f"    body: '{esc(z['remark'])}. Lowest progress villas need contractor recovery plans.',"
        )
        a(f"    zoneId: '{z['id']}',")
        a("    action: 'Open Construction Progress for this villa',")
        a("    comparisonMode: 'floor',")
        a("  },")
    a("  {")
    a("    id: 'sg_i3',")
    a("    severity: 'success',")
    a("    title: 'Site gates & boundary complete',")
    a(
        "    body: 'Gantt marks Main Gate, Material Gate, and Plot Boundary Wall at 100% — "
        "site perimeter secured.',"
    )
    a("    zoneId: 'sg_gate',")
    a("    action: 'Keep as site-prep showcase',")
    a("    comparisonMode: 'ortho',")
    a("  },")
    a("  {")
    a("    id: 'sg_i4',")
    a("    severity: 'info',")
    a("    title: 'Clubhouse SketchUp loads in 3D',")
    a(
        "    body: 'Clubhouse .skp is viewable in Periodic Progress / 3D (browser converts SKP→mesh). "
        "Export GLB later only if you need lighter loads. Master plan still DWG→PDF.',"
    )
    a("    zoneId: 'sg_club',")
    a("    action: 'Open 3D tab · DWG→PDF for layout panel',")
    a("    comparisonMode: 'floor',")
    a("  },")
    a("]")
    a("")
    a("const sageForecasts: DelayForecast[] = [")
    if behind_v:
        z = behind_v[0]
        slip = max(14, 60 - int(z["overallProgress"]))
        trend = [max(1, slip // 6) * k for k in range(1, 7)]
        a("  {")
        a("    id: 'sg_df1',")
        a(f"    zoneId: '{z['id']}',")
        a("    phase: 'Villa finishing / possession',")
        a(f"    slipDays: {slip},")
        a(f"    slipRange: '{slip - 5}–{slip + 8} days',")
        a("    probability: 78,")
        a("    criticalPath: true,")
        a("    impact: 'Buyer possession date at risk vs committed sheet',")
        a("    recommendation: 'Daily finish checklist + contractor stand-up',")
        a(f"    trend: {trend},")
        a("  },")
    a("  {")
    a("    id: 'sg_df2',")
    a("    zoneId: 'sg_road',")
    a("    phase: 'Internal roads Trimix',")
    a("    slipDays: 21,")
    a("    slipRange: '14–28 days',")
    a("    probability: 62,")
    a("    criticalPath: false,")
    a("    impact: 'Access / handover logistics for south villas',")
    a("    recommendation: 'Parallel pour bays with greenway civil',")
    a("    trend: [3, 6, 10, 14, 18, 21],")
    a("  },")
    a("]")
    a("")
    a("const sageVolumes: VolumeDiff[] = [")
    a(
        "  { zoneId: 'sg_road', zoneCode: 'RD', zoneName: 'Internal Roads', "
        "cutM3: 420, fillM3: 180, netM3: -240, changeLabel: 'Trimix subgrade prep (est.)' },"
    )
    a(
        "  { zoneId: 'sg_land', zoneCode: 'CL', zoneName: 'Common Landscaping', "
        "cutM3: 60, fillM3: 220, netM3: 160, changeLabel: 'Topsoil / planting beds (est.)' },"
    )
    a("]")
    a("")
    a("const sageTerrain: TerrainFeature[] = [")
    a(
        "  { id: 'sg_t1', zoneId: 'sg_road', type: 'soft_soil', label: 'Road subgrade soft spots', "
        "x: 330, y: 40, severity: 'medium', "
        "detail: 'Trimix package at ~50% — watch monsoon saturation' },"
    )
    a("]")
    a("")
    a("export const sageBundle = {")
    a("  project: sageProject,")
    a("  zones: sageZones,")
    a("  missions: sageMissions,")
    a("  terrain: sageTerrain,")
    a("  snapshots: sageSnapshots,")
    a("  insights: sageInsights,")
    a("  comparisons: [] as ComparisonFrame[],")
    a("  forecasts: sageForecasts,")
    a("  volumes: sageVolumes,")
    a("  getProgress: sageProgress,")
    a("  getFloors: (zoneId) => {")
    a("    const z = sageZones.find((x) => x.id === zoneId)")
    a("    return z ? buildFloorComparisons(z) : []")
    a("  },")
    a("}")
    a("")

    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT} · zones={len(zones)} avg={avg}% behind={behind} completed={completed}")


if __name__ == "__main__":
    main()
