# XNC Analysis — Phân tích Excel Chuối Xuất Khẩu & ERPNext Migration

> Chuyên gia phân tích dữ liệu Excel nông nghiệp chuối, thiết kế ERPNext v16 DocTypes, migration scripts

## Invocation
- User-invocable: true
- Trigger: When user asks about XNC data analysis, banana Excel files, DATALO structure, migration to ERPNext, or references `D:\Phân tích XNC`

---

## 1. PROJECT CONTEXT

**Dự án**: KLH SNUOL — ERPNext v16 Migration from Excel
**Input**: 1,217 file Excel, ~9.5M records, 5+ years data
**Output**: ERPNext v16 with 46 custom DocTypes
**Scope**: Toàn bộ value chain: Trồng → Chăm sóc → Thu hoạch → Sơ chế → Xuất khẩu
**Scale**: ~1,000 ha, ~200K+ giao dịch/năm, 50-100 concurrent users

### Project Files
```
D:\Phân tích XNC\
├── MEGA_PROMPT_ERPNEXT.md        # 37KB - Full ERPNext spec (46 DocTypes, business rules)
├── MASTER_DATA_SCAN_REPORT.md    # DATALO 136-column analysis
├── MASTER_DATA_QUICK_SUMMARY.md  # 3 main Excel files summary
├── PROMPT_01_TONG_THE.md         # 42KB - Overview spec
├── PROMPT_02_CHITIET_QUITRINH.md # 28KB - Process details
├── PROMPT_03_KY_THUAT_ERD.md     # 34KB - Technical ERD
├── PROMPT_04_TONGHOP_VALIDATION.md # 25KB - Validation spec
├── prompt_chain/
│   ├── CONTEXT.md                # 20KB - Business rules & data catalog
│   ├── TASK_01..05_*.md          # Task specifications
│   └── HUONG_DAN_SU_DUNG.md     # Usage guide
└── output/
    └── OUTPUT_01..05_*.md        # Generated specs & code
```

### Extended Skill Resources
```
C:\Users\trieu\.claude\skills\xnc-analysis\
├── instructions.md               # 650 lines - Full agent instructions
├── QUICK_REFERENCE.md            # 450 lines - Cheat sheets
├── MULTI_AGENT_SYSTEM.md         # 1230 lines - 5-agent ecosystem
├── agents/                       # 7 agent specs (analyst, developer, leader, etc.)
└── templates/                    # 5 production templates (doctype, migration, report, api, server_script)
```

---

## 2. DATALO — Master Table (136 columns)

The central Excel table containing all plot (thửa) information.

### Column Groups
| Group | Cols | Key Fields |
|-------|------|------------|
| Định danh | 16 | ID, Công ty, XN, Cụm, XSX, NT, Lô, Thửa |
| Diện tích | 11 | DT sổ đỏ, DT HTGT, DT TL, DT CTTĐ, **DT Sản xuất** (computed) |
| Trồng trọt | 12 | Ngày trồng, Số luống, Số cây BĐ, **DT Ban đầu** (computed) |
| Đa vụ V2-V6 | 18 | Ngày chọn chồi + Số cây + DT trồng per cycle |
| Vụ hiện hữu | 7 | Vụ HH, Số cây HH, **DT trồng HH** (KPI = Số cây HH/2600) |
| Timeline | 6 | Ngày BĐ TH/ST2/CSB/FSRU |
| KH 10 năm | 20 | 2022→2031, số vụ/năm |
| 18 kỳ SX | 36 | idtnBĐ_1→idtnKT_18 |

### Critical Formulas
```python
DT_Ban_dau = So_cay_BD / 2600        # Mật độ chuẩn
DT_San_xuat = DT_so_do - DT_HTGT - DT_TL - DT_CTTD
DT_trong_HH = So_cay_HH / 2600      # KPI CHÍNH
idtnKT_1 = idtnBD_1 + 12 + IF(DAY(NgàyTrồng)<=2, -1, 0)
idtnBD_k = idtnKT_(k-1) + 1          # 18 kỳ liên tiếp
```

### Normalization Strategy
```
136 Excel columns → 4 ERPNext structures:
  Thua DocType       (identity + area + current crop)
  Crop Cycle         (child table: V2-V6 cycles)
  Annual Plan        (child table: 10-year plan)
  Timeline Period    (child table: 18 production periods)
```

---

## 3. DocType PHASES (46 custom + 7 standard)

### Phase 1 — Hierarchy (12 DocTypes)
Xi Nghiep, Cum, Xuong San Xuat, Nong Truong, Doi San Xuat, To San Xuat, Lo, Thua, Crop Cycle (child), Annual Plan (child), Xuong Dong Goi, Thong So XDG

### Phase 2 — Dimensions (4 DocTypes)
Timeline Period (idTN), Rope Color (dmMauDay), Business Date (DM_DateKD), Lot Conversion (dmCĐL)

### Phase 3 — Field Operations (15 DocTypes)
Chich Bup, Cat Bap, Bao Buong, Phun Buong, Do Trai, Chon Choi, Cat Choi, Bon Phan, Cat La, Lam Co, Phat Co, Trong Moi, Trong Dam, Phun Thuoc BVTV, Phun Men VS, Kiem Ke Huy

### Phase 4 — Processing (7 DocTypes)
Thu Hoach, Harvest Row Detail (child), San Xuat, Cong Nhan, Phu Pham, Huy Chuoi, Stock Entry (extended)

### Phase 5 — Planning (8 DocTypes)
Bang Chia Vu, Thong Tin Ket Vu, KH Du Thu, KH San Luong, Thong So KHSL, Sigatoka Plan, Dinh Muc VT, Nhu Cau VT

---

## 4. BUSINESS RULES (40+)

### BR-DL — Master Data (7 rules)
```
001: ID format = {Cty}{Lô}{Thửa0}.{Serial}
002: DT_Ban_dau = So_cay_BD / 2600
003: DT_SX = DT_so_do - DT_HTGT - DT_TL - DT_CTTD
004: DT_trong_HH = So_cay_HH / 2600  (KPI)
005: Max 6 crop cycles
006: Timeline 18-period formula
007: 10-year plan from timeline
```

### BR-BCV — Crop Cycle Control (6 rules)
```
001: KT_CSV = KT_Cat_Bap - 1
002: KT_Chich_Bup = KT_Cat_Bap - 14
003: Stt_BD = MINIFS(CatBap) or prev_KT+1
004: Stt_KT = MAXIFS(CatBap)
005: Ket_vu check from dmMauDay status
006: Cascade update on CatBap save
```

### BR-TH — Harvest (4 rules)
```
001: SL_tan = SB_SC × NS_SC / 1000
002: SL_cont = SL_tan / 18.2
003: sum(L1:L130) == SB_thu_hoach
004: Grade totals (A, B, C)
```

### BR-SX — Production (9 rules)
```
001: TL_SC_TH = SB_SC / SB_TH
002: NS_SC = SL_tan × 1000 / SB_SC
003: SL_thung = sum(all grades)
004-007: Container conversions per grade
008-009: Market splits (TQ/NB)
```

### Other Groups
- **BR-CatB** (3 rules): Rope tying validation
- **BR-NXT** (2 rules): Stock movement
- **BR-KHSL** (8 steps): Production forecast
- **BR-VT** (3 rules): Material requirements

---

## 5. KEY DIMENSIONS

### Rope Color (dmMauDay) — ~52 codes/year
Each 5-day period has a unique rope color for tracking bunch age.
```
Stt | Mã        | Màu         | Ngày BĐ CB | Ngày KT CB | Trạng thái
----|-----------|-------------|------------|------------|----------
1   | 23_24.M01 | Xanh dương  | 2023-06-05 | 2023-06-11 | Đã thu hoạch
2   | 23_25.M02 | Đỏ-Vàng     | 2023-06-12 | 2023-06-18 | Đã thu hoạch
```

### Product Grades (9 grades)
```
TQ Market (5): A456, A789, B456, B789, CL  → 1540 boxes/container
NB Market (3): NB13 (1320), NB15 (1100), NB18 (1098 boxes/container)
Domestic (1):  CP
Conversion:    1 container ≈ 18.2 tấn
```

### Org Hierarchy (10 levels)
```
KLH SNUOL → Công ty (BP/ERC) → Xí nghiệp → Cụm → Xưởng SX
→ Nông trường → Đội SX → Tổ SX → Lô → Thửa
```

---

## 6. CAPABILITIES

When this skill is invoked, the agent can:

### 6.1 Analyze Excel Structure
- Read any Excel from `D:\Phân tích XNC\` and analyze columns, data types, relationships
- Map Excel sheets to ERPNext DocTypes
- Identify normalization opportunities (pivot → child tables)

### 6.2 Generate ERD
- Full ERD (46 DocTypes) or scoped (hierarchy/transactions/planning)
- Mermaid format with PK/FK, cardinality, computed fields
- Scope: `full`, `hierarchy`, `transactions`, `planning`

### 6.3 DocType Specification
- Complete JSON spec with all fields, permissions, links
- Vietnamese labels with diacritics
- fetch_from, read_only for computed fields, validation rules

### 6.4 Migration Scripts
- Excel → ERPNext Python scripts with pandas
- Batch insert (500/batch), error handling, rollback
- Normalization: pivot columns → child tables

### 6.5 Workflow Design
- Workflow JSON (states, transitions, roles)
- Server Script (validate, before_save, on_submit)
- Client Script (field visibility, calculations)

### 6.6 Report Development
- Query Reports (SQL aggregation)
- Script Reports (complex Python logic)
- Dashboard Charts

### 6.7 Business Rules Validation
- Generate test cases for any BR group
- Validation scripts with edge cases

### 6.8 SQL Optimization
- MariaDB query optimization
- Index recommendations
- Case-sensitive table handling (backtick required)

---

## 7. SQL PATTERNS

### MariaDB Case-Sensitive Tables
```sql
-- CORRECT (exact casing with backticks):
SELECT * FROM `tabThua` WHERE xi_nghiep = 'XNC-BP1'

-- WRONG (lowercased):
SELECT * FROM tabthua
```

### Frappe SQL Pattern
```python
data = frappe.db.sql("""
    SELECT * FROM `tabThua`
    WHERE xi_nghiep = %(xi_nghiep)s
""", {"xi_nghiep": "XNC-BP1"}, as_dict=1)
```

### Batch Insert
```python
BATCH_SIZE = 500
for i in range(0, len(data), BATCH_SIZE):
    batch = data[i:i+BATCH_SIZE]
    for record in batch:
        doc = frappe.get_doc(record)
        doc.insert(ignore_permissions=True)
    frappe.db.commit()
```

---

## 8. TEMPLATES

Production-ready templates available at `C:\Users\trieu\.claude\skills\xnc-analysis\templates\`:

| Template | Purpose |
|----------|---------|
| `doctype_template.json` | Base DocType JSON structure |
| `migration_template.py` | Excel → ERPNext migration script |
| `report_query_template.py` | Query Report with filters |
| `api_template.py` | Whitelisted API endpoint |
| `server_script_template.py` | DocType controller hooks |

---

## 9. KEY NUMBERS

```
Excel Files:        1,217
Master Columns:     136 (DATALO)
Custom DocTypes:    46
Standard DocTypes:  7 (extended)
Business Rules:     40+
Total Records:      ~9.5M (5 years)
Transactions/Year:  ~200K+
Farm Size:          ~1,000 ha
Rope Color Codes:   ~52/year
Product Grades:     9
Crop Cycles/Plot:   Max 6
Timeline Periods:   18/plot
```

---

## 10. WORKFLOW

### Typical Usage
1. User invokes skill (mentions XNC, banana Excel, DATALO, migration)
2. Agent loads context from `D:\Phân tích XNC\` files as needed
3. Agent reads relevant MEGA_PROMPT, CONTEXT, or OUTPUT files
4. Generates production-ready output (DocType spec, migration script, etc.)

### Context Files (read on demand)
- `D:\Phân tích XNC\MEGA_PROMPT_ERPNEXT.md` — Full 46-DocType spec
- `D:\Phân tích XNC\prompt_chain\CONTEXT.md` — Business rules & data catalog
- `D:\Phân tích XNC\MASTER_DATA_SCAN_REPORT.md` — Excel structure analysis

### For detailed agent instructions
- `C:\Users\trieu\.claude\skills\xnc-analysis\instructions.md` — 650 lines
- `C:\Users\trieu\.claude\skills\xnc-analysis\QUICK_REFERENCE.md` — 450 lines

---

**Version**: 1.0.0
**Created**: 2026-03-07
**Project**: KLH SNUOL ERPNext Migration
