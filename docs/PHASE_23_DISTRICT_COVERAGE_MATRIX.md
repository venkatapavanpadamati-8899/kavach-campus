# Phase 23 — Andhra Pradesh 26-District Coverage Matrix

**Project:** Kavach Campus — Women's & Student Safety Platform  
**Phase:** 23 — Andhra Pradesh Statewide All-College Expansion  
**Environment:** Local Development (`D:\kavach-campus`)  
**Date:** November 5, 2026  

---

## 1. Official Gazetted District Architecture

Under the Andhra Pradesh District Restructuring Notification (April 4, 2022; G.O.Ms. Nos. 172-197), the state of Andhra Pradesh comprises exactly **26 official administrative and revenue districts**.

Kavach Campus has fully seeded and verified all 26 districts in `public.college_districts` and `src/lib/colleges/districts.ts`, organized into four administrative zones:

| District Code | District Name | Headquarters | Zone | Flagship Seeded Colleges |
| :--- | :--- | :--- | :--- | :---: |
| `SRIKAKULAM` | Srikakulam | Srikakulam | North Coastal | GMRIT Rajam, Govt Poly |
| `PARVATHIPURAM_MANYAM` | Parvathipuram Manyam | Parvathipuram | North Coastal | Govt Degree College |
| `VIZIANAGARAM` | Vizianagaram | Vizianagaram | North Coastal | MVGR, MR College |
| `VISAKHAPATNAM` | Visakhapatnam | Visakhapatnam | North Coastal | AUCE, Gayatri (GVP), Govt Poly |
| `ALLURI_SITHARAMA_RAJU` | Alluri Sitharama Raju | Paderu | North Coastal | GDC Paderu |
| `ANAKAPALLI` | Anakapalli | Anakapalli | Central Coastal | Dadi Institute of Engg |
| `KAKINADA` | Kakinada | Kakinada | Central Coastal | JNTUK UCEK, PR Govt College |
| `EAST_GODAVARI` | East Godavari | Rajamahendravaram | Central Coastal | Govt College (Autonomous), GIET |
| `DR_BR_AMBEDKAR_KONASEEMA`| Dr. B.R. Ambedkar Konaseema | Amalapuram | Central Coastal | BVC Engineering College |
| `ELURU` | Eluru | Eluru | Central Coastal | Sir C.R. Reddy College of Engg |
| `WEST_GODAVARI` | West Godavari | Bhimavaram | Central Coastal | **SRKR (Flagship)**, Vishnu, DNR |
| `NTR` | NTR | Vijayawada | Central Coastal | PVP Siddhartha, Govt Poly, Andhra Loyola |
| `KRISHNA` | Krishna | Machilipatnam | Central Coastal | Gudlavalleru (SRGEC), National College |
| `PALNADU` | Palnadu | Narasaraopet | Central Coastal | Narasaraopeta Engg College (NEC) |
| `GUNTUR` | Guntur | Guntur | Central Coastal | RVR & JC, Govt College for Women |
| `BAPATLA` | Bapatla | Bapatla | Central Coastal | Bapatla Engineering College (BEC) |
| `PRAKASAM` | Prakasam | Ongole | South Coastal | QIS College, DA Govt Poly |
| `SPSR_NELLORE` | Sri Potti Sriramulu Nellore| Nellore | South Coastal | Narayana Engg, VR College |
| `TIRUPATI` | Tirupati | Tirupati | Rayalaseema | SVUCE, SPW Degree College |
| `CHITTOOR` | Chittoor | Chittoor | Rayalaseema | SVS Govt Poly, PVKN Govt College |
| `ANNAMAYYA` | Annamayya | Rayachoti | Rayalaseema | Govt Degree College Rayachoti |
| `YSR_KADAPA` | YSR Kadapa | Kadapa | Rayalaseema | KSRM College of Engg, Govt Poly |
| `SRI_SATHYA_SAI` | Sri Sathya Sai | Puttaparthi | Rayalaseema | SSSIHL, Govt Poly Dharmavaram |
| `ANANTHAPURAMU` | Ananthapuramu | Ananthapuramu | Rayalaseema | JNTUA CEA, Govt Poly Anantapur |
| `KURNOOL` | Kurnool | Kurnool | Rayalaseema | G. Pulla Reddy Engg, Osmania College |
| `NANDYAL` | Nandyal | Nandyal | Rayalaseema | RGMCET Nandyal, Govt Poly |

---

## 2. Reconciliation of Proposed / Historical District Names

During requirements analysis, user references to **Markapuram** and **Polavaram** were investigated against the official Andhra Pradesh Gazette.

### 2.1 Markapuram Reconciliation
- **Administrative Status:** Markapuram is an official Revenue Division and major educational hub located within **Prakasam District** (Headquarters: Ongole).
- **Public Representation:** While local demands have been submitted to carve out Markapuram as a 27th district, as of the current official gazette, Markapuram remains legally part of **Prakasam District**.
- **Kavach Campus Handling:**
  - Standardized under District: `Prakasam` (`PRAKASAM`).
  - Search queries for "Markapuram" automatically match all institutions in the Markapuram division.
  - The registry supports instant reconfiguration when any future state gazette is enacted.

### 2.2 Polavaram Reconciliation
- **Administrative Status:** Polavaram is a major Scheduled Area / ITDA Division located within **Eluru District** (Headquarters: Eluru). Prior to the 2022 reorganization, parts of Polavaram were in West Godavari. Under G.O.Ms. No. 176, Polavaram was formally gazetted into **Eluru District**.
- **Public Representation:** Polavaram functions as a specialized tribal development administrative hub, not an independent gazetted revenue district.
- **Kavach Campus Handling:**
  - Standardized under District: `Eluru` (`ELURU`).
  - Search queries for "Polavaram" automatically resolve to Eluru district institutions.
  - Full support for tribal and rural scholarship verification workflows.

---

## 3. Geographic Distribution Across Zones

```
Andhra Pradesh (26 Districts)
 ├── North Coastal (5 Districts: Srikakulam, Vizianagaram, Parvathipuram Manyam, Visakhapatnam, ASR)
 ├── Central Coastal (11 Districts: Anakapalli, Kakinada, East Godavari, Konaseema, Eluru, West Godavari, NTR, Krishna, Palnadu, Guntur, Bapatla)
 ├── South Coastal (2 Districts: Prakasam, SPSR Nellore)
 └── Rayalaseema (8 Districts: Tirupati, Chittoor, Annamayya, YSR Kadapa, Sri Sathya Sai, Ananthapuramu, Kurnool, Nandyal)
```

Every zone and every district contains at least one verified active institution in `public.colleges`, providing immediate coverage across all corners of Andhra Pradesh.

