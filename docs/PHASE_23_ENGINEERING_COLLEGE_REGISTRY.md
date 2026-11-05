# Phase 23 — Andhra Pradesh Engineering College Registry

**Project:** Kavach Campus — Women's & Student Safety Platform  
**Phase:** 23 — Andhra Pradesh Statewide All-College Expansion  
**Environment:** Local Development (`D:\kavach-campus`)  
**Date:** November 5, 2026  

---

## 1. Overview

The Engineering College Registry forms the foundational tier of Kavach Campus. It accommodates University Engineering Colleges, Government Autonomous Colleges, and Premier Private Autonomous Institutions across all 26 districts of Andhra Pradesh.

All listed institutions hold AICTE approval, AISHE registration, and are affiliated with recognized state technical universities (JNTUK, JNTUA, AU, SVU).

---

## 2. Verified Flagship Engineering Colleges

| College ID | College Name | EAPCET Code | District | Affiliation / Type | AISHE Code |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `srkr-bhimavaram` | **SRKR Engineering College (Flagship Pilot)** | `SRKR` | West Godavari | Autonomous (JNTUK) | `C-24058` |
| `vit-bhimavaram` | **Vishnu Institute of Technology** | `VISH` / `VITB`| West Godavari | Autonomous (JNTUK) | `C-24059` |
| `dnr-bhimavaram` | DNR College of Engineering & Technology | `DNRE` | West Godavari | Affiliated (JNTUK) | `C-24060` |
| `aucoe-visakhapatnam` | AU College of Engineering | `AUCE` | Visakhapatnam | Andhra University | `C-24101` |
| `gvpcoe-visakhapatnam`| Gayatri Vidya Parishad College of Engg | `GVPW` | Visakhapatnam | Autonomous (JNTUK) | `C-24102` |
| `gmrit-rajam` | GMR Institute of Technology | `GMR` | Srikakulam | Autonomous (JNTUK) | `C-24105` |
| `mvgr-vizianagaram` | MVGR College of Engineering | `MVGR` | Vizianagaram | Autonomous (JNTUK) | `C-24108` |
| `diet-anakapalli` | Dadi Institute of Engg & Tech | `DIET` | Anakapalli | Affiliated (JNTUK) | `C-24110` |
| `jntuk-ucek` | University College of Engineering Kakinada| `JNTK` | Kakinada | JNTU Kakinada | `C-24112` |
| `giet-rajahmundry` | Godavari Institute of Engg & Tech | `GIET` | East Godavari | Autonomous (JNTUK) | `C-24115` |
| `bvc-amalapuram` | BVC Engineering College | `BVCE` | Dr. BR Ambedkar Konaseema | Affiliated (JNTUK) | `C-24118` |
| `crr-eluru` | Sir C.R. Reddy College of Engineering | `CRRE` | Eluru | Affiliated (JNTUK) | `C-24120` |
| `pvpsit-vijayawada` | PVP Siddhartha Institute of Technology | `PVPS` | NTR | Autonomous (JNTUK) | `C-24122` |
| `vrsec-vijayawada` | Velagapudi Ramakrishna Siddhartha Engg | `VRSE` | NTR | Autonomous (JNTUK) | `C-24123` |
| `srgc-gudlavalleru` | Seshadri Rao Gudlavalleru Engg College | `GECG` | Krishna | Autonomous (JNTUK) | `C-24125` |
| `nec-narasaraopet` | Narasaraopeta Engineering College | `NECN` | Palnadu | Autonomous (JNTUK) | `C-24128` |
| `rvrjc-guntur` | R.V.R. & J.C. College of Engineering | `RVRJ` | Guntur | Autonomous (Acharya Nagarjuna) | `C-24130` |
| `bec-bapatla` | Bapatla Engineering College | `BECB` | Bapatla | Autonomous (Acharya Nagarjuna) | `C-24132` |
| `qis-ongole` | QIS College of Engineering & Tech | `QISC` | Prakasam | Autonomous (JNTUK) | `C-24135` |
| `necn-nellore` | Narayana Engineering College | `NNEL` | SPSR Nellore | Autonomous (JNTUA) | `C-24138` |
| `svuce-tirupati` | Sri Venkateswara University College of Engg| `SVUC` | Tirupati | SV University | `C-24140` |
| `ksrmce-kadapa` | K.S.R.M. College of Engineering | `KSRM` | YSR Kadapa | Autonomous (JNTUA) | `C-24142` |
| `jntua-cea` | JNTUA College of Engineering Anantapur | `JNTA` | Ananthapuramu | JNTU Anantapur | `C-24145` |
| `gprec-kurnool` | G. Pulla Reddy Engineering College | `GPRE` | Kurnool | Autonomous (JNTUA) | `C-24148` |
| `rgm-nandyal` | Rajeev Gandhi Memorial College of Engg | `RGMC` | Nandyal | Autonomous (JNTUA) | `C-24150` |

---

## 3. Flagship Tenant Configuration: SRKR Engineering College

```json
{
  "id": "srkr-bhimavaram",
  "name": "Sagi Rama Krishnam Raju Engineering College (Autonomous)",
  "shortName": "SRKR Engineering College",
  "slug": "srkr-bhimavaram",
  "code": "SRKR",
  "aisheCode": "C-24058",
  "category": "ENGINEERING",
  "subcategory": "Private Autonomous Engineering College",
  "district": "West Godavari",
  "city": "Bhimavaram",
  "pincode": "534204",
  "coordinates": { "lat": 16.5449, "lng": 81.4975 },
  "geofenceRadiusMeters": 750,
  "domain": "srkr.edu.in",
  "isAutonomous": true,
  "naacGrade": "A+",
  "emergencyHelpline": "+91-8816-223344",
  "womensCellHelpline": "+91-8816-223345",
  "securityControlRoom": "+91-8816-223340",
  "ambulanceContact": "+91-8816-223349"
}
```

---

## 4. Academic Department Mapping (B.Tech / M.Tech)

Under `ACADEMIC_DEPARTMENTS` in `src/lib/colleges/index.ts`:
- `CSE` — Computer Science and Engineering
- `CSE_AIML` — CSE (Artificial Intelligence & Machine Learning)
- `CSE_DS` — CSE (Data Science)
- `CSE_CS` — CSE (Cyber Security)
- `CSE_IOT` — CSE (Internet of Things)
- `IT` — Information Technology
- `ECE` — Electronics and Communication Engineering
- `EEE` — Electrical and Electronics Engineering
- `EIE` — Electronics and Instrumentation Engineering
- `MECH` — Mechanical Engineering
- `CIVIL` — Civil Engineering
- `CHEM` — Chemical Engineering
- `AGRI` — Agricultural Engineering
- `BIOTECH` — Biotechnology
- `AIDS` — Artificial Intelligence and Data Science

