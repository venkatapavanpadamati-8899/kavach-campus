# KAVACH CAMPUS — IMAGE ASSET & THEME AUDIT

**Workspace:** `D:\kavach-campus`  
**Date:** 2026-11-05  
**Directory Scanned:** `public/images/`, `public/icons/`  

---

## 1. Asset Inventory & Verification Table

Every image asset referenced in the code was physically inspected on disk:

| Relative Path | Size (Bytes) | Format | Usage Scope | Status |
| :--- | :--- | :--- | :--- | :--- |
| `public/images/colleges/srkr/login.jpg` | 961,590 | JPEG | SRKR Engineering College login & auth background | **VERIFIED** |
| `public/images/colleges/srkr/student-dashboard.jpg` | 1,116,381 | JPEG | SRKR student portal & safe box background | **VERIFIED** |
| `public/images/colleges/vishnu/login.jpg` | 1,076,733 | JPEG | Vishnu Institute of Tech login background | **VERIFIED** |
| `public/images/colleges/vishnu/student-dashboard.jpg`| 1,043,062 | JPEG | Vishnu student portal background | **VERIFIED** |
| `public/images/auth_campus_bg.jpg` | 1,126,557 | JPEG | Global institutional authentication fallback | **VERIFIED** |
| `public/images/campus_hero_bg.jpg` | 856,809 | JPEG | Landing page hero background | **VERIFIED** |
| `public/images/desktop_hero_banner.jpg` | 387,641 | JPEG | High-resolution widescreen banner | **VERIFIED** |
| `public/images/sos_emergency_bg.jpg` | 800,974 | JPEG | Emergency SOS modal & `/student/sos` backdrop | **VERIFIED** |
| `public/images/staff_admin_bg.jpg` | 966,262 | JPEG | First responder & admin command center backdrop | **VERIFIED** |
| `public/images/student_safewalk_bg.jpg` | 1,042,506 | JPEG | Safe Walk route companion tracking backdrop | **VERIFIED** |
| `public/icons/kavach-icon.svg` | 545 | SVG | Vector shield logo icon | **VERIFIED** |

---

## 2. Dynamic College Theming Engine (`src/lib/college-branding.ts`)

The theming engine dynamically selects backgrounds and color accents based on the user's institutional affiliation:

### 2.1 Supported College Tenants
1. **SRKR Engineering College (`srkr`):**
   * Primary: Deep Navy `#0F2C59`
   * Accent: Gold / Amber `#D4AF37`
   * Dedicated campus photography for login and dashboards.
2. **Vishnu Institute of Technology (`vishnu`):**
   * Primary: Royal Maroon `#58111A`
   * Accent: Emerald `#00A86B`
   * Dedicated campus photography for login and dashboards.
3. **Default Institutional Fallback (`default`):**
   * Primary: Slate Blue `#1E293B`
   * Accent: Cyan `#06B6D4`
   * Modern architectural campus assets.

### 2.2 Contrast & Readability Layer
To ensure accessibility compliance (WCAG AAA contrast ratio > 7:1) when placing white or light text over photographic images, all backgrounds are rendered with multi-stage gradient overlays:
```css
linear-gradient(
  rgba(10, 15, 29, 0.88),
  rgba(10, 15, 29, 0.94)
)
```
This guarantees crisp legibility for all emergency buttons, statistical charts, incident details, and form fields regardless of the brightness of the underlying campus photo.

