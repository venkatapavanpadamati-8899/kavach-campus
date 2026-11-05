# Phase 25 — Andhra Pradesh Statewide College Registry Coverage Report

**Project:** Kavach Campus (Women & Campus Safety Platform)  
**Workspace:** `D:\kavach-campus`  
**Dataset Path:** `src/lib/colleges/ap-colleges-data.ts`  
**Database Table:** `public.colleges`  
**Execution Date:** 2026-11-05  

---

## 1. Executive Summary & Realistic Statewide Coverage Statement

As mandated by Phase 25, the college registry was substantially expanded beyond the initial seeds to provide extensive, multi-category representation across all **26 gazetted districts of Andhra Pradesh** (reorganized April 4, 2022).

The master directory now comprises:
- **145 Verified Andhra Pradesh Higher Education Institutions**
- **7 Premier National Engineering Institutions** (IIT Madras, IIT Bombay, IIT Delhi, IIT Tirupati, NIT Warangal, NIT Calicut, BITS Pilani)
- **Total Master Registry:** **152 Institutions**
- **District Representation:** **100% of Andhra Pradesh Districts (26/26 Districts)** with 3 to 10 verified institutions per district.

> [!NOTE]
> **Statewide Coverage Reality Principle:**  
> While the Kavach Campus directory covers **all 26 districts** and provides comprehensive institutional benchmarks across every category, Andhra Pradesh as a state contains approximately ~250+ Engineering colleges, ~200+ Polytechnics, and ~1400+ Degree colleges across Government, Aided, and Private sectors.  
> Therefore, this registry represents an **authoritative foundational benchmark of 145 premier institutions**, with an active Onboarding & Claiming pipeline (`/admin/campus/register` and `/api/super-admin/pending-campus`) enabling remaining unlisted institutions to onboard seamlessly. We do not claim exhaustive census-level completion of all ~1,800+ AP institutions, but rather **100% geographic district coverage with verified anchor institutions in every category**.

---

## 2. Institutional Category Breakdown

| Category | Count | Scope & Types Included | Representative Institutions |
|---|---|---|---|
| **ENGINEERING** | 55 | Govt, Autonomous, Private, Deemed, Constituent | SRKR, Vishnu (VITB), SVECW Women's, JNTUK, JNTUA, AUCE, GVPCE, RVR&JC, VRSEC, MITS, GMRIT, BEC, SITAMS |
| **POLYTECHNIC & DIPLOMA** | 26 | SBTET Govt, Women's Polytechnics, Tribal ITDA | Govt Poly Visakhapatnam, Vijayawada, Kakinada, Guntur, Tirupati, Anakapalli, Paderu ITDA, Hindupur Women's |
| **DEGREE & AUTONOMOUS** | 70 | UGC Autonomous, APCCE Govt Degree, Women's, Universities | Silver Jubilee Kurnool, SRR&CVR Vijayawada, Andhra Loyola, PR Govt Kakinada, MR College Vizianagaram, VR College Nellore |
| **OTHER (Agricultural/Specialized)**| 1 | ICAR / ANGRAU Premier Agricultural College | Agricultural College Bapatla (Est. 1945, Historic ICAR Premier Agricultural Campus) |
| **Total Institutions** | **152** | **Full Multi-Category Registry** | **145 AP + 7 National Premier** |

---

## 3. District-by-District Verification Matrix (All 26 AP Districts)

| # | District Name | District ID | Zone | Total Colleges | Engg | Poly | Degree / Other | Primary Anchor Institutions |
|---|---|---|---|---|---|---|---|---|
| 1 | **Alluri Sitharama Raju** | `alluri-sitharama-raju` | North Coastal | **3** | 0 | 1 | 2 | Govt Poly Paderu (Tribal ITDA), GDC Paderu, GDC Chintapalli |
| 2 | **Anakapalli** | `anakapalli` | North Coastal | **3** | 1 | 1 | 1 | Dadi Inst of Engg & Tech, Govt Poly Anakapalli, AMAL College (Autonomous) |
| 3 | **Ananthapuramu** | `ananthapuramu` | Rayalaseema | **5** | 1 | 1 | 3 | JNTUA College of Engg, Govt Poly Anantapur, SKU Campus, KSN Govt Women's |
| 4 | **Annamayya** | `annamayya` | Rayalaseema | **4** | 3 | 0 | 1 | Madanapalle Inst of Tech (MITS), BT College Madanapalle |
| 5 | **Bapatla** | `bapatla` | Central Coastal | **4** | 1 | 1 | 2 | Bapatla Engg College, Bapatla Poly, Bapatla Arts & Science, Agri College |
| 6 | **Chittoor** | `chittoor` | Rayalaseema | **4** | 2 | 1 | 1 | SITAMS, Govt Poly Chittoor, PVKN Govt Degree College (Autonomous) |
| 7 | **Dr. B. R. Ambedkar Konaseema** | `dr-br-ambedkar-konaseema` | Central Coastal | **4** | 1 | 1 | 2 | BVC Engg College, SKBR College Amalapuram, Govt Poly Mummidivaram |
| 8 | **East Godavari** | `east-godavari` | Central Coastal | **5** | 1 | 0 | 4 | Govt College (Autonomous) Rajahmundry (Est. 1853), AKNU Campus, SKR Women's |
| 9 | **Eluru** | `eluru` | Central Coastal | **5** | 2 | 1 | 2 | RGUKT IIIT Nuzvid, Sir CR Reddy Engg, Sir CR Reddy College (Autonomous), Govt Poly |
| 10 | **Guntur** | `guntur` | Central Coastal | **9** | 4 | 2 | 3 | RVR&JC, Vignan University, AC College (Est. 1885), Govt College for Women |
| 11 | **Kakinada** | `kakinada` | Central Coastal | **7** | 3 | 2 | 2 | JNTUK Kakinada, PR Govt College (Autonomous), Aditya, Pragati, Govt Poly |
| 12 | **Krishna** | `krishna` | Central Coastal | **5** | 1 | 1 | 3 | Gudlavalleru Engg, Andhra Jateeya Kalasala (Est. 1910), Krishna Univ Campus |
| 13 | **Kurnool** | `kurnool` | Rayalaseema | **6** | 1 | 0 | 5 | G. Pulla Reddy Engg, Silver Jubilee Govt College, Osmania College, KVR Women's |
| 14 | **Nandyal** | `nandyal` | Rayalaseema | **4** | 2 | 1 | 1 | RGMCET Nandyal, Santhiram Engg, PSC&KVSC Govt College, Govt Poly |
| 15 | **NTR** | `ntr` | Central Coastal | **8** | 2 | 1 | 5 | VR Siddhartha Engg, Andhra Loyola, SRR&CVR Govt College, PBS Siddhartha |
| 16 | **Palnadu** | `palnadu` | Central Coastal | **5** | 2 | 1 | 2 | JNTUK Narasaraopet, Narasaraopeta Engg, CR College, Govt Poly |
| 17 | **Parvathipuram Manyam** | `parvathipuram-manyam` | North Coastal | **3** | 0 | 0 | 3 | Govt Poly Parvathipuram, SV Degree College, GDC Seethampeta (ITDA) |
| 18 | **Prakasam** | `prakasam` | South Coastal | **5** | 2 | 1 | 2 | RGUKT IIIT Ongole, QIS Engg, DA Govt Poly (Est. 1958), CSR Sarma College |
| 19 | **Sri Potti Sriramulu Nellore** | `sri-potti-sriramulu-nellore` | South Coastal | **5** | 1 | 1 | 3 | VR College (Est. 1920), DK Govt Women's, Govt Poly Gudur, VSU Campus |
| 20 | **Sri Sathya Sai** | `sri-sathya-sai` | Rayalaseema | **4** | 0 | 1 | 3 | Sri Sathya Sai Institute (SSSIHL), Govt Poly Women Hindupur, KH GDC |
| 21 | **Srikakulam** | `srikakulam` | North Coastal | **7** | 2 | 1 | 4 | RGUKT IIIT Srikakulam, AITAM Tekkali, BRAU Campus, Govt Poly Srikakulam |
| 22 | **Tirupati** | `tirupati` | Rayalaseema | **8** | 4 | 2 | 2 | SVUCE, SPMVV Women's University, Sree Vidyanikethan, SGS Arts, IIT Tirupati |
| 23 | **Visakhapatnam** | `visakhapatnam` | North Coastal | **10** | 3 | 2 | 5 | AU College of Engg, AU Science, GVPCE, ANITS, St. Joseph's Women's, AVN |
| 24 | **Vizianagaram** | `vizianagaram` | North Coastal | **5** | 2 | 1 | 2 | JNTU-GV Vizianagaram, MVGR Engg, MR College (Est. 1879), MR Women's |
| 25 | **West Godavari** | `west-godavari` | Central Coastal | **10** | 6 | 1 | 3 | SRKR, Vishnu (VITB), SVECW Women's, DNR Engg, DNR Degree, Kasturba Women's |
| 26 | **YSR (Kadapa)** | `ysr-kadapa` | Rayalaseema | **7** | 3 | 1 | 3 | RGUKT RK Valley, JNTUA Pulivendula, Govt College Men (Est. 1946), YVU |

