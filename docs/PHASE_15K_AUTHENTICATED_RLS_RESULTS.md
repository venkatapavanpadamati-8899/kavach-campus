# KAVACH CAMPUS — PHASE 15K AUTHENTICATED RLS RESULTS

**Target Environment:** Local Docker PostgreSQL 17 (`127.0.0.1:54322`)  
**Test Suite Script:** `scripts/run_phase15k_authenticated_tests.ts`  
**Execution Timestamp:** 2026-11-05  
**Total Tests Executed:** 32  
**Total Passed:** 32 (100%)  
**Total Failed:** 0 (0%)  
**Overall Verdict:** **`PASS — MULTI-TENANT ISOLATION 100% AIRTIGHT`**  

---

## 1. Synthetic Personas Configured

All tests were executed against real PostgreSQL transactions using `SET LOCAL ROLE = 'authenticated'` and authentic user JWT session claims (`request.jwt.claims`):

1. **Student A (SRKR):** `f1000000-0000-0000-0000-000000000001` (`student.a@srkr.test.local`, `srkr-bhimavaram`)
2. **Student B (SRKR):** `f1000000-0000-0000-0000-000000000002` (`student.b@srkr.test.local`, `srkr-bhimavaram`)
3. **Student C (VITB):** `f1000000-0000-0000-0000-000000000003` (`student.c@vitb.test.local`, `vishnu-bhimavaram`)
4. **Staff A (SRKR):** `f1000000-0000-0000-0000-000000000004` (`staff.a@srkr.test.local`, `srkr-bhimavaram`)
5. **Staff B (VITB):** `f1000000-0000-0000-0000-000000000014` (`staff.b@vitb.test.local`, `vishnu-bhimavaram`)
6. **HOD A (SRKR):** `f1000000-0000-0000-0000-000000000005` (`hod.a@srkr.test.local`, `srkr-bhimavaram`)
7. **Principal A (SRKR):** `f1000000-0000-0000-0000-000000000006` (`principal.a@srkr.test.local`, `srkr-bhimavaram`)
8. **Campus Admin A (SRKR):** `f1000000-0000-0000-0000-000000000007` (`admin.a@srkr.test.local`, `srkr-bhimavaram`)
9. **Super Admin:** `f1000000-0000-0000-0000-000000000008` (`superadmin@governance.test.local`, Global Governance)

---

## 2. Test Results Matrix (32/32 Passed)

### Suite 1: Incident Privacy & Multi-Tenant Boundaries
| Test ID | Test Assertion | Persona | Expected Result | Actual Observed | Verdict |
| :-: | :--- | :--- | :--- | :--- | :-: |
| **1.1** | Student A reads own incident | Student A (SRKR) | 1 row returned | 1 row returned | **PASS** |
| **1.2** | Student B cannot read Student A incident (Peer Isolation) | Student B (SRKR) | 0 rows returned | 0 rows returned | **PASS** |
| **1.3** | Student B cannot update or delete Student A incident | Student B (SRKR) | 0 rows affected | 0 rows affected | **PASS** |
| **1.4** | College B staff cannot read College A incident (Cross-College) | Staff B (VITB) | 0 rows returned | 0 rows returned | **PASS** |
| **1.5** | College A staff cannot read College B incident (Cross-College) | Staff A (SRKR) | 0 rows returned | 0 rows returned | **PASS** |
| **1.6** | College A staff CAN read College A incident (Authorized Access) | Staff A (SRKR) | 1 row returned | 1 row returned | **PASS** |

### Suite 2: Incident Location & GPS Privacy
| Test ID | Test Assertion | Persona | Expected Result | Actual Observed | Verdict |
| :-: | :--- | :--- | :--- | :--- | :-: |
| **2.1** | Student A reads own incident GPS coordinates | Student A (SRKR) | 1 row returned | 1 row returned | **PASS** |
| **2.2** | Student B cannot read Student A GPS coordinates | Student B (SRKR) | 0 rows returned | 0 rows returned | **PASS** |
| **2.3** | College B staff cannot read College A GPS coordinates | Staff B (VITB) | 0 rows returned | 0 rows returned | **PASS** |
| **2.4** | College A staff CAN read same-college incident GPS coordinates | Staff A (SRKR) | 1 row returned | 1 row returned | **PASS** |

### Suite 3: Evidence & Storage Isolation
| Test ID | Test Assertion | Persona | Expected Result | Actual Observed | Verdict |
| :-: | :--- | :--- | :--- | :--- | :-: |
| **3.1** | Student A reads own evidence record | Student A (SRKR) | 1 row returned | 1 row returned | **PASS** |
| **3.2** | Student B cannot read Student A evidence record | Student B (SRKR) | 0 rows returned | 0 rows returned | **PASS** |
| **3.3** | College B staff cannot read College A evidence record | Staff B (VITB) | 0 rows returned | 0 rows returned | **PASS** |
| **3.4** | College B staff cannot read College A storage file object | Staff B (VITB) | 0 rows returned | 0 rows returned | **PASS** |
| **3.5** | College A staff CAN read same-college evidence storage file | Staff A (SRKR) | 1 row returned | 1 row returned | **PASS** |

### Suite 4: Student Profile Privacy
| Test ID | Test Assertion | Persona | Expected Result | Actual Observed | Verdict |
| :-: | :--- | :--- | :--- | :--- | :-: |
| **4.1** | Student A reads own student profile | Student A (SRKR) | 1 row returned | 1 row returned | **PASS** |
| **4.2** | Student B cannot read Student A student profile | Student B (SRKR) | 0 rows returned | 0 rows returned | **PASS** |
| **4.3** | College B staff cannot read College A student profile | Staff B (VITB) | 0 rows returned | 0 rows returned | **PASS** |
| **4.4** | College A staff CAN read same-college student profile | Staff A (SRKR) | 1 row returned | 1 row returned | **PASS** |

### Suite 5: Safe Box Private Notes Locker
| Test ID | Test Assertion | Persona | Expected Result | Actual Observed | Verdict |
| :-: | :--- | :--- | :--- | :--- | :-: |
| **5.1** | Student A reads own confidential Safe Box note | Student A (SRKR) | 1 row returned | 1 row returned | **PASS** |
| **5.2** | Student B cannot read Student A Safe Box note | Student B (SRKR) | 0 rows returned | 0 rows returned | **PASS** |
| **5.3** | Campus Staff cannot read Safe Box note | Staff A (SRKR) | 0 rows returned | 0 rows returned | **PASS** |
| **5.4** | Department HOD cannot read Safe Box note | HOD A (SRKR) | 0 rows returned | 0 rows returned | **PASS** |
| **5.5** | College Principal cannot read Safe Box note | Principal A (SRKR) | 0 rows returned | 0 rows returned | **PASS** |
| **5.6** | College Campus Admin cannot read Safe Box note | Admin A (SRKR) | 0 rows returned | 0 rows returned | **PASS** |
| **5.7** | Student B unauthorized update on Student A note | Student B (SRKR) | 0 rows affected | 0 rows affected | **PASS** |

### Suite 6: Administrative Governance Boundaries
| Test ID | Test Assertion | Persona | Expected Result | Actual Observed | Verdict |
| :-: | :--- | :--- | :--- | :--- | :-: |
| **6.1** | Campus Admin A cannot modify College B student profile | Admin A (SRKR) | 0 rows affected | 0 rows affected | **PASS** |
| **6.2** | Super Admin can oversee both College A and College B incidents | Super Admin | 2 rows returned | 2 rows returned | **PASS** |

### Suite 7: Anonymous Access Rejection
| Test ID | Test Assertion | Persona | Expected Result | Actual Observed | Verdict |
| :-: | :--- | :--- | :--- | :--- | :-: |
| **7.1** | Anonymous user cannot read incidents | Anonymous | 0 rows returned | 0 rows returned | **PASS** |
| **7.2** | Anonymous user cannot read profiles | Anonymous | 0 rows returned | 0 rows returned | **PASS** |
| **7.3** | Anonymous user cannot read evidence | Anonymous | 0 rows returned | 0 rows returned | **PASS** |
| **7.4** | Anonymous user cannot read Safe Box private notes | Anonymous | 0 rows returned | 0 rows returned | **PASS** |

---

## 3. Conclusion

Every test passed with zero failures. With legacy permissive policies purged in Migration 018, PostgreSQL RLS enforces **strict multi-tenant isolation** across incidents, GPS locations, evidence, student profiles, and storage objects without compromising student ownership or authorized campus responder queues.

