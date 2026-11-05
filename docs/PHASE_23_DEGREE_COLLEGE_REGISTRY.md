# Phase 23 — Andhra Pradesh Degree College Registry

**Project:** Kavach Campus — Women's & Student Safety Platform  
**Phase:** 23 — Andhra Pradesh Statewide All-College Expansion  
**Environment:** Local Development (`D:\kavach-campus`)  
**Date:** November 5, 2026  

---

## 1. Overview

Degree Colleges represent the largest demographic of undergraduate students in Andhra Pradesh. Kavach Campus provides full campus safety features for students in Government Degree Colleges (GDC), Autonomous Colleges, and Recognized Aided/Private institutions.

All listed institutions fall under the regulatory umbrella of the **Commissionerate of Collegiate Education (APCCE)** and the **University Grants Commission (UGC)**.

---

## 2. Verified Flagship Degree Colleges

| College ID | College Name | District | Category | University Affiliation | NAAC Grade |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `andhra-loyola-vja` | Andhra Loyola College (Autonomous) | NTR | Autonomous Degree | Krishna University | `A+` |
| `pr-govt-kakinada` | P.R. Govt College (Autonomous) | Kakinada | Govt Autonomous | Adikavi Nannaya University | `A` |
| `govt-college-rjmy` | Government College (Autonomous), RJY | East Godavari | Govt Autonomous | Adikavi Nannaya University | `A+` |
| `gcw-guntur` | Govt College for Women (Autonomous), Guntur| Guntur | Govt Autonomous (Women)| Acharya Nagarjuna University | `A+` |
| `spw-degree-tirupati`| S.P.W. Degree & PG College, Tirupati | Tirupati | TTD / Aided (Women) | Sri Padmavati Mahila Visvavidyalayam| `A` |
| `mr-degree-vzm` | M.R. College (Autonomous), Vizianagaram | Vizianagaram | Aided Autonomous | Andhra University | `A` |
| `gdc-paderu` | Govt Degree College, Paderu | Alluri Sitharama Raju | Government Degree | Andhra University | `B` |
| `gdc-parvathipuram`| Govt Degree College, Parvathipuram | Parvathipuram Manyam| Government Degree | Andhra University | `B+` |
| `gdc-rayachoti` | Govt Degree College, Rayachoti | Annamayya | Government Degree | Yogi Vemana University | `B` |
| `vr-college-nellore` | V.R. College, Nellore | SPSR Nellore | Aided Degree | Vikrama Simhapuri University | `A` |
| `pvkn-chittoor` | PVKN Govt College (Autonomous), Chittoor | Chittoor | Govt Autonomous | Sri Venkateswara University | `A` |
| `osmania-kurnool` | Osmania College (Autonomous), Kurnool | Kurnool | Aided Autonomous | Rayalaseema University | `A` |
| `national-college-mbt`| National College, Machilipatnam | Krishna | Aided Degree | Krishna University | `B++` |
| `sssihl-puttaparthi` | Sri Sathya Sai Institute of Higher Learning| Sri Sathya Sai | Deemed University | SSSIHL Central | `A++` |

---

## 3. Degree Institutional Configuration Example

```json
{
  "id": "andhra-loyola-vja",
  "name": "Andhra Loyola College (Autonomous)",
  "shortName": "Andhra Loyola College",
  "slug": "andhra-loyola-college-vijayawada",
  "code": "ALCV",
  "aisheCode": "C-25101",
  "category": "DEGREE",
  "subcategory": "Private Autonomous Degree College",
  "district": "NTR",
  "city": "Vijayawada",
  "pincode": "520008",
  "coordinates": { "lat": 16.5015, "lng": 80.6542 },
  "geofenceRadiusMeters": 650,
  "domain": "andhraloyolacollege.ac.in",
  "isAutonomous": true,
  "naacGrade": "A+",
  "emergencyHelpline": "+91-866-2476082",
  "womensCellHelpline": "+91-866-2476085",
  "securityControlRoom": "+91-866-2476080",
  "ambulanceContact": "+91-866-2476089"
}
```

---

## 4. Degree Programs & Academic Curriculum Mapping

Supported degree streams in `ACADEMIC_DEPARTMENTS` (`src/lib/colleges/index.ts`):
- `BSC_CS` — B.Sc. Computer Science / Data Analytics
- `BSC_MATH` — B.Sc. Mathematics
- `BSC_PHYS` — B.Sc. Physics
- `BSC_CHEM` — B.Sc. Chemistry
- `BCOM` — B.Com. (General / Computer Applications / Honours)
- `BBA` — Bachelor of Business Administration
- `BA` — Bachelor of Arts (History, Economics, Political Science, Journalism)
- `OTHER_DEGREE` — Other Recognised Degree Programs

