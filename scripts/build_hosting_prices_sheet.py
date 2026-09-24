"""Generate Progress Mapping hosting options + prices workbook."""
from __future__ import annotations

from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

header_fill = PatternFill("solid", fgColor="1E3A5F")
header_font = Font(bold=True, color="FFFFFF", size=11)
section_fill = PatternFill("solid", fgColor="DBEAFE")
section_font = Font(bold=True, size=11, color="1E3A5F")
rec_fill = PatternFill("solid", fgColor="DCFCE7")
warn_fill = PatternFill("solid", fgColor="FEF3C7")
thin = Border(
    left=Side(style="thin", color="CBD5E1"),
    right=Side(style="thin", color="CBD5E1"),
    top=Side(style="thin", color="CBD5E1"),
    bottom=Side(style="thin", color="CBD5E1"),
)
wrap = Alignment(wrap_text=True, vertical="top")


def style_header(ws, row: int, cols: int) -> None:
    for c in range(1, cols + 1):
        cell = ws.cell(row=row, column=c)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(wrap_text=True, vertical="center")
        cell.border = thin


def autosize(ws, widths: list[float]) -> None:
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w


def write_rows(ws, start: int, rows: list[list]) -> int:
    for i, row in enumerate(rows):
        for j, val in enumerate(row, 1):
            cell = ws.cell(row=start + i, column=j, value=val)
            cell.alignment = wrap
            cell.border = thin
    return start + len(rows)


def main() -> None:
    wb = Workbook()

    # ---- 00 Summary ----
    ws = wb.active
    ws.title = "00_Summary"
    ws["A1"] = "Progress Mapping — Production Hosting Options & Prices"
    ws["A1"].font = Font(bold=True, size=16, color="1E3A5F")
    ws.merge_cells("A1:F1")
    ws["A2"] = (
        "App: Vite + React SPA · Heavy media (GLB/ortho/DEM/PDF) · Target users: 50–100 "
        "(scales higher easily)"
    )
    ws.merge_cells("A2:F2")
    ws["A3"] = (
        "Currency: USD · Approx public list prices as of Aug 2026 — verify before purchase. "
        "Media egress often dominates cost."
    )
    ws.merge_cells("A3:F3")
    ws["A4"] = (
        "Google Sheets: upload this .xlsx to Google Drive → Open with Google Sheets "
        "(or File → Import → Upload)."
    )
    ws.merge_cells("A4:F4")

    headers = [
        "Priority",
        "Recommended stack",
        "Monthly estimate (50–100 users)",
        "Best for",
        "Avoid if",
        "Notes",
    ]
    for i, h in enumerate(headers, 1):
        ws.cell(row=6, column=i, value=h)
    style_header(ws, 6, 6)

    summary = [
        [
            "1 — YOUR CHOICE (login + real data)",
            "Cloudflare Pages + Cloudflare R2 + Supabase",
            "$25–80",
            "Login, save PM data, remarks, roles",
            "Client demands AWS/Azure only day-1",
            "Bundle name in sheet 04: Production Lite",
        ],
        [
            "2 — Media-cheap SPA only (no login yet)",
            "Cloudflare Pages + Cloudflare R2",
            "$0–40",
            "Shareable demo URL before auth exists",
            "You already need accounts / saved data",
            "Upgrade to row 1 when ready",
        ],
        [
            "3 — Best DX alternative",
            "Vercel + R2 + Supabase",
            "$40–120",
            "Easiest Git previews; still use R2 for GLBs",
            "Heavy bandwidth on Vercel alone",
            "Same Supabase login/data as row 1",
        ],
        [
            "4 — Enterprise India",
            "AWS Mumbai or Azure India full stack",
            "$80–300+",
            "Client compliance / Entra / Cognito SSO",
            "You want cheapest / simplest ops",
            "Only when a large client IT team requires it",
        ],
        [
            "5 — Self-host",
            "VPS + Nginx + Postgres + object storage",
            "$10–50 + your time",
            "Full control",
            "You are not comfortable maintaining servers",
            "Skip for now",
        ],
    ]
    write_rows(ws, 7, summary)
    ws.cell(row=7, column=1).fill = rec_fill
    for c in range(1, 7):
        ws.cell(row=7, column=c).fill = rec_fill

    ws["A13"] = "PHASE PLAN (with login + real data from the start)"
    ws["A13"].font = section_font
    ws["A13"].fill = section_fill
    ws.merge_cells("A13:F13")
    for i, h in enumerate(
        ["Phase", "What to host", "Where", "Est. monthly", "Users", "Outcome"], 1
    ):
        ws.cell(row=14, column=i, value=h)
    style_header(ws, 14, 6)
    write_rows(
        ws,
        15,
        [
            [
                "Phase A — Launch",
                "SPA + login + DB + media",
                "Pages + Supabase + R2",
                "$25–80",
                "10–100",
                "Signed-in users see live project data",
            ],
            [
                "Phase B — Harden",
                "Roles, backups, custom domain",
                "Same stack",
                "$30–100",
                "50–150",
                "PM can edit; viewers read-only",
            ],
            [
                "Phase C — Enterprise (only if asked)",
                "SSO + India region + audit",
                "AWS Mumbai / Azure India",
                "$80–300+",
                "100–500+",
                "Client IT approved",
            ],
        ],
    )

    ws["A19"] = "IMPORTANT FOR THIS APP"
    ws["A19"].font = section_font
    ws["A19"].fill = warn_fill
    ws.merge_cells("A19:F19")
    ws["A20"] = (
        "Do NOT host multi-GB GLB/ortho files only on Vercel/Netlify bandwidth forever — "
        "use R2/S3/CloudFront. 50–100 concurrent dashboard users is easy; media download "
        "size is the cost driver."
    )
    ws.merge_cells("A20:F20")
    ws["A20"].alignment = wrap
    ws.row_dimensions[20].height = 45
    autosize(ws, [22, 55, 28, 32, 32, 40])

    # ---- 01 SPA ----
    ws2 = wb.create_sheet("01_SPA_Frontend_Hosts")
    h2 = [
        "Platform",
        "Type",
        "Free tier (approx)",
        "Paid plan start",
        "Est. monthly @ 50–100 users (SPA only)",
        "Bandwidth model",
        "Custom domain + SSL",
        "Git CI/CD",
        "SPA routing support",
        "Preview deploys",
        "India/edge performance",
        "Verdict for Progress Mapping",
        "Official site",
    ]
    for i, x in enumerate(h2, 1):
        ws2.cell(row=1, column=i, value=x)
    style_header(ws2, 1, len(h2))
    spa_rows = [
        [
            "Cloudflare Pages",
            "Static / edge",
            "Generous free; strong bandwidth economics for static",
            "Workers Paid ~$5+; Pages Pro ~$20/mo (team features)",
            "$0–25",
            "Very favorable for static",
            "Yes",
            "Yes",
            "Yes",
            "Yes",
            "Excellent global + Asia",
            "BEST DEFAULT",
            "https://pages.cloudflare.com",
        ],
        [
            "Vercel",
            "Static + serverless",
            "Hobby free (limits; personal)",
            "Pro ~$20/seat/mo",
            "$20–80 (watch bandwidth)",
            "Metered — can spike with GLBs",
            "Yes",
            "Yes",
            "Yes",
            "Yes (excellent)",
            "Excellent",
            "BEST DX — keep media external",
            "https://vercel.com",
        ],
        [
            "Netlify",
            "Static + functions",
            "Free starter (credit/limits)",
            "Pro ~$20/mo (credit model)",
            "$20–80",
            "Metered / credits",
            "Yes",
            "Yes",
            "Yes",
            "Yes",
            "Excellent",
            "Strong alternative to Vercel",
            "https://www.netlify.com",
        ],
        [
            "AWS Amplify Hosting",
            "Static + CI/CD on AWS",
            "Limited free tier / trial",
            "Pay-as-you-go (build + storage + served GB)",
            "$15–100+",
            "CloudFront egress pricing",
            "Yes",
            "Yes",
            "Yes",
            "Yes",
            "Mumbai region available",
            "Good if client is AWS",
            "https://aws.amazon.com/amplify",
        ],
        [
            "Firebase Hosting",
            "Static CDN (Google)",
            "Free Spark limits",
            "Blaze pay-as-you-go",
            "$5–40",
            "Google egress",
            "Yes",
            "Yes",
            "Yes",
            "Yes",
            "Good",
            "OK if Google ecosystem",
            "https://firebase.google.com/products/hosting",
        ],
        [
            "Azure Static Web Apps",
            "Static + Azure functions",
            "Free tier available",
            "Standard ~$9+/app",
            "$10–50",
            "Azure bandwidth",
            "Yes",
            "Yes",
            "Yes",
            "Yes",
            "India regions",
            "Good for Microsoft clients",
            "https://azure.microsoft.com/products/app-service/static",
        ],
        [
            "GitHub Pages",
            "Static only",
            "Free for public",
            "N/A",
            "$0",
            "GitHub limits",
            "Yes",
            "Actions DIY",
            "Needs SPA hack",
            "Limited",
            "OK",
            "Demo only — not production",
            "https://pages.github.com",
        ],
        [
            "Render Static Sites",
            "Static",
            "Free tier (limitations)",
            "Paid plans",
            "$7–40",
            "Included then overage",
            "Yes",
            "Yes",
            "Yes",
            "Yes",
            "Good",
            "OK secondary option",
            "https://render.com",
        ],
        [
            "Railway",
            "App platform",
            "Trial credits",
            "Usage-based",
            "$5–40",
            "Usage",
            "Yes",
            "Yes",
            "Via app config",
            "Yes",
            "Good",
            "Better for API than SPA CDN",
            "https://railway.app",
        ],
        [
            "DigitalOcean App Platform",
            "Static/apps",
            "Paid",
            "Static from ~$3–12",
            "$5–40",
            "Included bandwidth tiers",
            "Yes",
            "Yes",
            "Yes",
            "Yes",
            "Bangalore available",
            "Simple & predictable",
            "https://www.digitalocean.com/products/app-platform",
        ],
        [
            "Fly.io",
            "Edge containers",
            "Free allowance",
            "Usage-based",
            "$5–50",
            "Usage",
            "Yes",
            "Yes",
            "Via app",
            "Yes",
            "Good (choose region)",
            "Overkill for static SPA alone",
            "https://fly.io",
        ],
        [
            "cPanel / GoDaddy / Hostinger shared",
            "Shared PHP hosting",
            "Cheap shared ~$3–10",
            "Same",
            "$3–15 but poor fit",
            "Limited",
            "Yes",
            "FTP/manual",
            "Painful for Vite SPA",
            "No",
            "Local POP only",
            "NOT RECOMMENDED",
            "various",
        ],
    ]
    write_rows(ws2, 2, spa_rows)
    for r in range(2, 5):
        ws2.cell(row=r, column=12).fill = rec_fill
    ws2.cell(row=13, column=12).fill = warn_fill
    autosize(ws2, [22, 16, 28, 28, 28, 24, 12, 12, 16, 12, 18, 28, 36])

    # ---- 02 Media ----
    ws3 = wb.create_sheet("02_Media_Storage_CDN")
    h3 = [
        "Platform",
        "Role",
        "Storage price (approx)",
        "Egress / bandwidth",
        "Est. monthly media (pilot)",
        "Est. monthly media (heavier ortho/GLB)",
        "India region",
        "Fits Progress Mapping?",
        "Notes",
    ]
    for i, x in enumerate(h3, 1):
        ws3.cell(row=1, column=i, value=x)
    style_header(ws3, 1, len(h3))
    media = [
        [
            "Cloudflare R2",
            "Object storage",
            "~$0.015/GB-mo",
            "No egress fees to internet (R2 model); ops billed",
            "$1–10",
            "$10–40",
            "Global edge",
            "YES — top pick",
            "Ideal for GLB/ortho/DEM/PDF",
        ],
        [
            "AWS S3 + CloudFront",
            "Storage + CDN",
            "S3 ~$0.023/GB-mo (varies) + CF",
            "CloudFront egress ~$0.08/GB tiered",
            "$5–25",
            "$30–150+",
            "ap-south-1 Mumbai",
            "YES — enterprise",
            "Standard for big clients",
        ],
        [
            "Google Cloud Storage + CDN",
            "Storage + CDN",
            "~$0.02/GB-mo class dependent",
            "Egress billed",
            "$5–25",
            "$30–150+",
            "asia-south1",
            "YES",
            "If already on GCP",
        ],
        [
            "Azure Blob + CDN/Front Door",
            "Storage + CDN",
            "Hot blob ~$0.018/GB-mo+",
            "Egress billed",
            "$5–25",
            "$30–150+",
            "Central/South India",
            "YES",
            "Microsoft stack",
        ],
        [
            "Backblaze B2 + CDN",
            "Cheap object storage",
            "~$0.006/GB-mo",
            "Low / partner CDN egress",
            "$1–15",
            "$10–50",
            "US-heavy",
            "Possible",
            "Budget media",
        ],
        [
            "Google Drive (current demo)",
            "File links",
            "Drive plan",
            "Not a CDN",
            "Unreliable for prod",
            "Unreliable",
            "N/A",
            "NO for production",
            "OK for demos only",
        ],
        [
            "Inside Vercel/Netlify deploy",
            "In repo / artifacts",
            "N/A",
            "Uses host bandwidth",
            "Risky",
            "Expensive / timeouts",
            "N/A",
            "NO",
            "Keep media out of Git",
        ],
    ]
    write_rows(ws3, 2, media)
    ws3.cell(row=2, column=8).fill = rec_fill
    ws3.cell(row=7, column=8).fill = warn_fill
    ws3.cell(row=8, column=8).fill = warn_fill
    autosize(ws3, [26, 22, 24, 36, 22, 28, 16, 18, 32])

    # ---- 03 Backend ----
    ws4 = wb.create_sheet("03_Backend_DB_Auth")
    h4 = [
        "Platform",
        "Provides",
        "Free / start price",
        "Est. monthly @ 50–100 users",
        "Auth",
        "DB",
        "Good when",
        "Skip when",
    ]
    for i, x in enumerate(h4, 1):
        ws4.cell(row=1, column=i, value=x)
    style_header(ws4, 1, len(h4))
    backend = [
        [
            "Supabase",
            "Postgres + Auth + Storage + API",
            "Free tier; Pro ~$25/mo",
            "$25–50",
            "Yes",
            "Postgres",
            "Need real PM data fast",
            "On-prem only mandate",
        ],
        [
            "Firebase (Auth+Firestore)",
            "Auth + NoSQL",
            "Spark/Blaze",
            "$0–40",
            "Yes",
            "Firestore",
            "Google stack",
            "Need relational reporting",
        ],
        [
            "Railway",
            "Postgres + Node/Python services",
            "Usage / trial credits",
            "$5–40",
            "DIY",
            "Postgres",
            "Simple full-stack API",
            "Strict enterprise procurement",
        ],
        [
            "Render",
            "Web services + Postgres",
            "Free limited; paid from ~$7",
            "$15–60",
            "DIY",
            "Postgres",
            "Straightforward deploys",
            "Need max edge perf",
        ],
        [
            "Cloudflare Workers + D1/KV",
            "Edge API + SQL/KV",
            "Free + Workers Paid ~$5",
            "$5–30",
            "Via Clerk/Auth0/etc",
            "D1",
            "Stay on Cloudflare stack",
            "Heavy relational analytics",
        ],
        [
            "AWS Lambda + API GW + RDS",
            "Serverless API + DB",
            "Pay-as-you-go",
            "$30–150+",
            "Cognito",
            "RDS",
            "AWS enterprise",
            "Want simplest DX",
        ],
        [
            "Azure App Service + SQL",
            "API + DB",
            "Plan-based",
            "$40–200+",
            "Entra ID",
            "SQL/Cosmos",
            "Microsoft clients",
            "Cost sensitivity",
        ],
        [
            "Auth0 / Clerk / WorkOS",
            "Login/SSO only",
            "Free tiers; paid seats",
            "$0–50+",
            "Yes",
            "N/A",
            "Add SSO to any stack",
            "Need DB too",
        ],
        [
            "Self-host API on VPS",
            "Custom API",
            "VPS $5–20",
            "$10–40 + labor",
            "DIY",
            "Postgres",
            "Full control",
            "No DevOps capacity",
        ],
    ]
    write_rows(ws4, 2, backend)
    ws4.cell(row=2, column=1).fill = rec_fill
    autosize(ws4, [30, 28, 26, 26, 14, 14, 28, 26])

    # ---- 04 Bundles ----
    ws5 = wb.create_sheet("04_Recommended_Bundles")
    h5 = [
        "Bundle name",
        "Frontend",
        "Media",
        "Backend/Auth",
        "Est. monthly low USD",
        "Est. monthly typical USD",
        "Est. monthly heavy media USD",
        "Setup difficulty",
        "Recommendation",
    ]
    for i, x in enumerate(h5, 1):
        ws5.cell(row=1, column=i, value=x)
    style_header(ws5, 1, len(h5))
    bundles = [
        [
            "Pilot",
            "Cloudflare Pages",
            "R2 (or Drive temporary)",
            "None (mocks)",
            0,
            10,
            25,
            "Easy",
            "START HERE",
        ],
        [
            "DX Pilot",
            "Vercel",
            "R2 or S3",
            "None",
            20,
            40,
            90,
            "Easy",
            "If team loves Vercel",
        ],
        [
            "Production Lite ★ YOUR CHOICE",
            "Cloudflare Pages",
            "R2",
            "Supabase (Auth + Postgres)",
            25,
            45,
            80,
            "Easy-Medium",
            "Login + real PM data — pick this",
        ],
        [
            "AWS Enterprise",
            "Amplify or S3+CloudFront",
            "S3 + CloudFront",
            "Cognito + API GW + RDS",
            60,
            120,
            250,
            "Medium-Hard",
            "Corporate AWS clients",
        ],
        [
            "Azure Enterprise",
            "Static Web Apps",
            "Blob + CDN",
            "Entra + App Service + SQL",
            50,
            110,
            220,
            "Medium-Hard",
            "Corporate Microsoft clients",
        ],
        [
            "Budget Self-host",
            "Nginx on DO/Hetzner",
            "R2 (preferred)",
            "Node + Postgres on VPS",
            12,
            25,
            50,
            "Hard (ops)",
            "Only if you maintain it",
        ],
    ]
    write_rows(ws5, 2, bundles)
    for r in range(2, 5):
        ws5.cell(row=r, column=9).fill = rec_fill
    autosize(ws5, [18, 24, 22, 28, 16, 18, 22, 14, 24])

    # ---- 05 Scenarios ----
    ws6 = wb.create_sheet("05_Cost_Scenarios")
    h6 = [
        "Scenario",
        "Users",
        "SPA host",
        "Media GB stored",
        "Media GB transferred / month",
        "Backend",
        "Low USD",
        "Likely USD",
        "High USD",
        "Assumptions",
    ]
    for i, x in enumerate(h6, 1):
        ws6.cell(row=1, column=i, value=x)
    style_header(ws6, 1, len(h6))
    scenarios = [
        [
            "Internal demo",
            "10–20",
            "Pages free",
            20,
            50,
            "None",
            0,
            5,
            15,
            "Light demos; Drive or small R2",
        ],
        [
            "Pilot with client",
            "30–50",
            "Pages / Vercel",
            100,
            200,
            "None or Supabase free",
            0,
            25,
            60,
            "Few heavy GLB opens/day",
        ],
        [
            "Production 50–100 users",
            "50–100",
            "Pages or Vercel Pro",
            300,
            "500–1000",
            "Supabase Pro",
            25,
            55,
            120,
            "Daily use; media on R2/S3",
        ],
        [
            "Production + heavy 3D viewing",
            "50–150",
            "Pages + R2",
            "500+",
            "2000+",
            "Supabase + Workers",
            40,
            90,
            200,
            "Many full GLB downloads",
        ],
        [
            "Enterprise 200+ users India",
            "200–500",
            "AWS/Azure India",
            "1000+",
            "3000+",
            "Managed DB + SSO",
            100,
            220,
            500,
            "SSO, SLA, support contracts",
        ],
    ]
    write_rows(ws6, 2, scenarios)
    ws6["A9"] = "Calculator tip"
    ws6["A9"].font = section_font
    ws6["A10"] = (
        "Rough media cost: (GB transferred × egress $/GB) + (GB stored × storage $/GB). "
        "On Cloudflare R2, egress to internet is $0 — usually cheapest for this app's GLBs."
    )
    ws6.merge_cells("A10:J10")
    ws6["A10"].alignment = wrap
    ws6.row_dimensions[10].height = 40
    autosize(ws6, [28, 12, 16, 14, 22, 16, 10, 10, 10, 40])

    # ---- 06 Checklist ----
    ws7 = wb.create_sheet("06_Deploy_Checklist")
    h7 = ["Step", "Task", "Owner", "Status", "Notes"]
    for i, x in enumerate(h7, 1):
        ws7.cell(row=1, column=i, value=x)
    style_header(ws7, 1, len(h7))
    checks = [
        [1, "Choose bundle from sheet 04", "You", "Todo", "Recommend: Production Lite"],
        [2, "Create private GitHub repo if client data", "You", "Todo", ""],
        [
            3,
            "Connect repo to Cloudflare Pages / Vercel",
            "You",
            "Todo",
            "Build: npm run build · Output: dist",
        ],
        [4, "Add SPA fallback (/* → /index.html)", "You", "Todo", "Required for React Router"],
        [5, "Create R2/S3 bucket for media", "You", "Todo", "Separate from frontend deploy"],
        [
            6,
            "Upload GLB/ortho/DEM/PDF; use HTTPS URLs",
            "You",
            "Todo",
            "Don't commit binaries to Git",
        ],
        [7, "Custom domain + HTTPS", "You / client IT", "Todo", "e.g. progress.client.com"],
        [8, "Add auth before public launch", "You", "Todo", "Supabase Auth / Cognito / Entra"],
        [9, "Wire real API (replace mocks)", "You", "Todo", "projectApi facade"],
        [10, "Backup DB + media lifecycle rules", "You", "Todo", "Versioned buckets"],
        [11, "Load test media + ~50 concurrent sessions", "You", "Todo", "CDN cache headers"],
        [12, "Client UAT + SSO if required", "Client IT", "Todo", "India region if mandated"],
    ]
    write_rows(ws7, 2, checks)
    autosize(ws7, [8, 48, 14, 10, 36])

    # ---- 07 Assumptions ----
    ws8 = wb.create_sheet("07_Price_Assumptions")
    ws8["A1"] = "Price assumptions & disclaimer"
    ws8["A1"].font = Font(bold=True, size=14, color="1E3A5F")
    notes = [
        "Prices are approximate public list prices around Aug 2026 and rounded for planning.",
        "Vendors change plans often (Netlify credits, Vercel bandwidth, AWS egress). Confirm on vendor pages before budgeting.",
        "Progress Mapping cost driver #1 = media transfer (GLB/ortho/DEM), not the 50–100 user count.",
        "Estimates exclude: domain (~$10–15/yr), paid support, agency hours, Drive API costs, processing pipelines.",
        "INR: multiply USD by current FX. Add 18% GST where applicable for Indian billing.",
        "Self-host cheap plans hide labor — include engineer time for patches, SSL, backups, uptime.",
        "For client proposals, quote a range (Likely–High), not a single number.",
    ]
    for i, n in enumerate(notes, 3):
        ws8.cell(row=i, column=1, value=n)
        ws8.cell(row=i, column=1).alignment = wrap
        ws8.row_dimensions[i].height = 32
    ws8.column_dimensions["A"].width = 110
    ws8["A11"] = "Quick links"
    ws8["A11"].font = section_font
    for i, n in enumerate(
        [
            "Cloudflare Pages: https://developers.cloudflare.com/pages/",
            "Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/",
            "Vercel pricing: https://vercel.com/pricing",
            "Netlify pricing: https://www.netlify.com/pricing/",
            "AWS Amplify pricing: https://aws.amazon.com/amplify/pricing/",
            "Supabase pricing: https://supabase.com/pricing",
            "Azure Static Web Apps pricing: https://azure.microsoft.com/pricing/details/app-service/static/",
        ],
        12,
    ):
        ws8.cell(row=i, column=1, value=n)

    # ---- READ ME FIRST (beginner path with login + real data) ----
    ws0 = wb.create_sheet("00_READ_ME_FIRST", 0)
    ws0["A1"] = "Read this first — your hosting decision (login + real project data)"
    ws0["A1"].font = Font(bold=True, size=16, color="1E3A5F")
    ws0.merge_cells("A1:B1")

    guide = [
        ["", ""],
        ["What you need", "Meaning in plain English"],
        [
            "1. Website host",
            "Where the React app lives so people open it in a browser (Cloudflare Pages).",
        ],
        [
            "2. Media storage",
            "Where big GLB / ortho / DEM / PDF files live (Cloudflare R2). Not on your laptop.",
        ],
        [
            "3. Login (Auth)",
            "Email/password or magic link so only allowed people see projects (Supabase Auth).",
        ],
        [
            "4. Database",
            "Where real project / zone / floor / remarks data is saved (Supabase Postgres).",
        ],
        ["", ""],
        ["YOUR STACK (do this)", "Cloudflare Pages + Cloudflare R2 + Supabase"],
        ["Bundle name in sheet 04", "Production Lite"],
        ["Typical monthly cost", "About $25–80 USD for ~50–100 users (media size drives the high end)"],
        ["INR rough guide", "Often ~₹2,000–7,000/month + GST; confirm FX and vendor bills"],
        ["", ""],
        ["Who does what", ""],
        ["Cloudflare Pages", "Hosts the UI. Connect your GitHub repo → auto deploy on push."],
        ["Cloudflare R2", "Stores heavy media. App loads files via public or signed URLs."],
        [
            "Supabase",
            "Handles signup/login + stores project JSON/tables. Free tier to start; Pro ~$25/mo when serious.",
        ],
        ["", ""],
        ["What you save in Supabase (examples)", ""],
        ["Projects / sites", "Name, location, active flag"],
        ["Zones / wings / floors / stages", "Progress %, status, planned dates"],
        ["Missions / survey dates", "Timeline points for timelapse"],
        ["Work remarks", "User notes (instead of only localStorage)"],
        ["Users & roles", "Who can view vs edit (PM vs client viewer)"],
        ["", ""],
        ["What stays in R2 (not in the database)", ""],
        ["GLB / ortho / DEM / PDF files", "Database only stores the URL/path to each file"],
        ["", ""],
        ["Order of work (do in this order)", ""],
        ["Step 1", "Create Cloudflare account → Pages project from this repo → get a public URL"],
        ["Step 2", "Create R2 bucket → upload Greenfield media → copy URLs into app config"],
        ["Step 3", "Create Supabase project → enable Email Auth → create tables for projects/progress"],
        ["Step 4", "Wire the React app to Supabase (login screen + load/save instead of mocks)"],
        ["Step 5", "Invite 2–3 test users → then replace mocks with PM Excel imports"],
        ["", ""],
        ["Ignore for now", "Buying a VPS, AWS EC2, Kubernetes, self-hosting Postgres, Auth0 alone"],
        ["Only switch to AWS/Azure later if", "A big client’s IT team requires their cloud + company SSO"],
        ["", ""],
        ["Other Excel tabs", "Optional detail — you already have a decision from this sheet"],
        ["01–03", "Price comparison tables (optional reading)"],
        ["04 Recommended Bundles", "Production Lite = your row"],
        ["05 Cost Scenarios", "Rough money by traffic"],
        ["06 Deploy Checklist", "Tick-list when you start deploying"],
        ["07 Assumptions", "Why prices are approximate"],
    ]
    for i, (a, b) in enumerate(guide, 2):
        ws0.cell(row=i, column=1, value=a)
        ws0.cell(row=i, column=2, value=b)
        ws0.cell(row=i, column=1).alignment = wrap
        ws0.cell(row=i, column=2).alignment = wrap
        if a in ("What you need", "Who does what", "What you save in Supabase (examples)",
                 "What stays in R2 (not in the database)", "Order of work (do in this order)",
                 "Other Excel tabs"):
            ws0.cell(row=i, column=1).fill = header_fill
            ws0.cell(row=i, column=1).font = header_font
            ws0.cell(row=i, column=2).fill = header_fill
            ws0.cell(row=i, column=2).font = header_font
        if a == "YOUR STACK (do this)":
            ws0.cell(row=i, column=1).fill = rec_fill
            ws0.cell(row=i, column=2).fill = rec_fill
            ws0.cell(row=i, column=1).font = Font(bold=True)
            ws0.cell(row=i, column=2).font = Font(bold=True)
    autosize(ws0, [36, 95])

    # Highlight Production Lite recommendation column
    for ws_name in wb.sheetnames:
        if ws_name != "04_Recommended_Bundles":
            continue
        wsb = wb[ws_name]
        for row in wsb.iter_rows(min_row=1, max_row=20, max_col=9):
            if row[0].value and "Production Lite" in str(row[0].value):
                for cell in row:
                    cell.fill = rec_fill

    out = Path(__file__).resolve().parents[1] / "docs" / "Progress_Mapping_Hosting_Options_Prices.xlsx"
    out.parent.mkdir(parents=True, exist_ok=True)
    try:
        wb.save(out)
    except PermissionError:
        out = out.with_name("Progress_Mapping_Hosting_YOUR_PATH.xlsx")
        wb.save(out)
    print(out)


if __name__ == "__main__":
    main()
