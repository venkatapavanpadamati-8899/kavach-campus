# Phase 23 — Official Government & Regulatory Data Source Register

**Project:** Kavach Campus — Women's & Student Safety Platform  
**Phase:** 23 — Andhra Pradesh Statewide All-College Expansion  
**Environment:** Local Development (`D:\kavach-campus`)  
**Date:** November 5, 2026  

---

## 1. Overview

To guarantee accuracy, regulatory authority, and data integrity for all higher education institutions onboarded across Andhra Pradesh, Kavach Campus aligns strictly with official government registers, gazette notifications, and statutory higher education bodies.

---

## 2. Authoritative Data Sources

### 2.1 Government of Andhra Pradesh Official Gazette (G.O.Ms. Nos. 172-197)
- **Authority:** Government of Andhra Pradesh, Revenue (District Administration) Department.
- **Date of Enforcement:** April 4, 2022.
- **Official Scope:** Gazette notification for the restructuring of existing 13 districts into **26 official revenue and administrative districts**.
- **Role in Kavach Campus:** Authoritative master source for all 26 district identifiers, official names, and district headquarters in `public.college_districts`.

### 2.2 Andhra Pradesh State Council of Higher Education (APSCHE)
- **Portal:** `apsche.ap.gov.in`
- **Scope:** Coordinates and monitors university education, state entrance exams (AP EAPCET / EAMCET, AP ICET, AP ECET, AP EDCET), and regulatory standards for all engineering, degree, and professional colleges in the state.
- **Role in Kavach Campus:** Verification of institutional recognition, counseling codes (e.g. `SRKR`, `VDRR`, `AUCE`), and affiliations.

### 2.3 All India Council for Technical Education (AICTE)
- **Portal:** `aicte-india.org`
- **Scope:** Central statutory body for technical and engineering education across India.
- **Role in Kavach Campus:** AICTE approval status, sanctioned intake, and permanent AICTE identification codes for all Engineering and Technology institutions in Andhra Pradesh.

### 2.4 State Board of Technical Education and Training (SBTET), Andhra Pradesh
- **Portal:** `sbtet.ap.gov.in`
- **Scope:** Governing body for diploma courses and polytechnic colleges across Andhra Pradesh.
- **Role in Kavach Campus:** Authoritative directory of Government, Aided, and Private Polytechnic institutions, POLYCET college codes, and district-level polytechnic distribution.

### 2.5 Commissionerate of Collegiate Education (APCCE)
- **Portal:** `apcce.gov.in`
- **Scope:** Administrative oversight of Government Degree Colleges (GDCs) and Private Aided Degree Colleges in Andhra Pradesh.
- **Role in Kavach Campus:** Directory of Government Degree Colleges, NAAC accreditation records, and academic program categories across all 26 districts.

### 2.6 All India Survey on Higher Education (AISHE), Ministry of Education, Govt. of India
- **Portal:** `aishe.gov.in`
- **Scope:** National database covering all higher education institutions across India with unique AISHE Codes (e.g., `C-24058`).
- **Role in Kavach Campus:** Unique institutional identification, AISHE code mapping, and verification of institutional existence across all categories.

### 2.7 University Grants Commission (UGC) & National Assessment and Accreditation Council (NAAC)
- **Portals:** `ugc.ac.in`, `naac.gov.in`
- **Scope:** Autonomous status recognition under Section 2(f) and 12(B) of the UGC Act, 1956; institutional accreditation grades (A++, A+, A, B++).
- **Role in Kavach Campus:** Verification of autonomous status (`is_autonomous: boolean`) and NAAC accreditation grades (`naac_grade: text`).

---

## 3. Data Integrity & Verification Protocol

When new colleges request inclusion via `public.college_onboarding_requests`:
1. **AISHE Code Verification:** The submitted AISHE code must resolve to the valid institution in the national directory.
2. **Regulatory Approval Verification:** Technical institutions must hold active AICTE / SBTET approvals; degree colleges must be recognized by APCCE / UGC.
3. **Official Email Domain Verification:** Institutional domain records (`.edu.in`, `.ac.in`, `.gov.in`) must match the official registered web properties.
4. **Geofencing & Physical Verification:** Institutional address, pincode, and coordinates (`lat`, `lng`) are verified against cadastral survey and official district boundaries.

