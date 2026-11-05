# Phase 23 — Andhra Pradesh Polytechnic & Diploma College Registry

**Project:** Kavach Campus — Women's & Student Safety Platform  
**Phase:** 23 — Andhra Pradesh Statewide All-College Expansion  
**Environment:** Local Development (`D:\kavach-campus`)  
**Date:** November 5, 2026  

---

## 1. Overview

Polytechnic and Diploma institutions educate a large, diverse cohort of students across Andhra Pradesh, including significant numbers of young women in Government Model Residential and Women's Polytechnics.

Kavach Campus provides direct, dedicated safety integration for diploma institutions governed by the **State Board of Technical Education and Training (SBTET), Andhra Pradesh**.

---

## 2. Verified Flagship Polytechnic Institutions

| College ID | College Name | POLYCET Code | District | Category | SBTET Approval |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `govt-poly-vja` | Government Polytechnic, Vijayawada | `GPV` | NTR | Government Polytechnic | Verified |
| `govt-poly-vskp`| Government Polytechnic, Visakhapatnam | `GPVSP` | Visakhapatnam | Government Polytechnic | Verified |
| `smvm-poly-tanuku`| S.M.V.M. Polytechnic, Tanuku | `SMVM` | West Godavari | Aided Polytechnic | Verified |
| `govt-poly-kdp` | Government Polytechnic, Kadapa | `GPK` | YSR Kadapa | Government Polytechnic | Verified |
| `govt-poly-atp` | Government Polytechnic, Ananthapuramu | `GPA` | Ananthapuramu | Government Polytechnic | Verified |
| `govt-poly-sklm`| Government Polytechnic, Srikakulam | `GPSKLM` | Srikakulam | Government Polytechnic | Verified |
| `govt-poly-ongole`| D.A. Government Polytechnic, Ongole | `DAGO` | Prakasam | Government Polytechnic | Verified |
| `svs-poly-chittoor`| S.V.S. Government Polytechnic, Chittoor | `SVSG` | Chittoor | Government Polytechnic | Verified |
| `govt-poly-dharmavaram`| Govt Polytechnic, Dharmavaram | `GPD` | Sri Sathya Sai | Government Polytechnic | Verified |
| `govt-poly-nandyal`| Government Polytechnic, Nandyal | `GPNDL` | Nandyal | Government Polytechnic | Verified |

---

## 3. Polytechnic Institutional Tenant Configuration Example

```json
{
  "id": "govt-poly-vja",
  "name": "Government Polytechnic Vijayawada",
  "shortName": "Govt Poly Vijayawada",
  "slug": "govt-polytechnic-vijayawada",
  "code": "GPV",
  "aisheCode": "S-14201",
  "category": "POLYTECHNIC",
  "subcategory": "Government Polytechnic College",
  "district": "NTR",
  "city": "Vijayawada",
  "pincode": "520008",
  "coordinates": { "lat": 16.5062, "lng": 80.6480 },
  "geofenceRadiusMeters": 600,
  "domain": "gpvijayawada.edu.in",
  "isAutonomous": false,
  "emergencyHelpline": "+91-866-2476001",
  "womensCellHelpline": "+91-866-2476005",
  "securityControlRoom": "+91-866-2476000",
  "ambulanceContact": "+91-866-2476009"
}
```

---

## 4. Diploma Course Support & Academic Structure

In addition to 4-year B.Tech curricula, Kavach Campus supports diploma academic years:
- **1st Year Diploma (C-20 / C-23 curriculum)**
- **2nd Year Diploma**
- **3rd Year Diploma (Industrial Training / Internship)**

Department codes supported for polytechnic students:
- `DME` — Diploma in Mechanical Engineering
- `DEEE` — Diploma in Electrical & Electronics Engineering
- `DECE` — Diploma in Electronics & Communication Engineering
- `DCSE` — Diploma in Computer Engineering
- `DCE` — Diploma in Civil Engineering
- `DCH` — Diploma in Chemical Engineering

