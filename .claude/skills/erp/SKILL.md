# ERP Knowledge Base — KLH SNUOL Banana Farm

> Tổng hợp kiến thức dự án ERP cho KLH SNUOL (THACO AGRI) — Cập nhật: 2026-02-28

## Invocation
- User-invocable: true
- Trigger: When user asks about ERP project knowledge, architecture, doctypes, APIs, or needs context about the system

---

## 1. PROJECT OVERVIEW

**Business**: KLH SNUOL — Khu Liên Hợp nông nghiệp SNUOL, Cambodia (THACO AGRI)
**Domain**: Banana export farm + cattle ranch + rubber plantation + welfare services
**Stack**: React 19 + Vite 7 + Tailwind 4 (frontend) | Frappe v16 + ERPNext v16 (backend)
**Custom App**: `snuol_custom` (d:\ai\snuol_custom)
**Frontend**: `erp-frontend` (d:\ai\erp-frontend)
**Backend Docker**: Containers `erpnext_v16-*`, site `frontend`, port `8081`
**DB**: MariaDB, user `_830f7c4d002adf39`, pwd `zpCx8OKg29vrWJvs`
**Login**: `Administrator/admin`

---

## 2. ORGANIZATION HIERARCHY

```
THACO AGRI
└── KLH SNUOL (Khu Liên Hợp)
    ├── Ban Lãnh Đạo (TGĐ, P.TGĐ)
    ├── Ban Chức Năng (Thu Mua, KH&KPI, QLVH, etc.)
    ├── XN Chuối BP1 (Xí Nghiệp Banana Phase 1)
    ├── XN Chuối BP2
    ├── XN Chuối BP3
    ├── XN ERC (Trung tâm nghiên cứu)
    ├── XN Cao Su
    ├── XN Bò & CAT
    └── Dịch Vụ Tiện Ích (An Sinh & Đời Sống)
```

**Farm Hierarchy**: KLH → Xí Nghiệp → Cụm → Nông Trường → Đội SX → Tổ SX → Lô → Thửa → Mẫu Dây

**Naming Convention**:
- Under Xí Nghiệp → "Phòng" (e.g., Phòng An Sinh & Đời Sống)
- At KLH level → "Ban" (e.g., Ban An Sinh & Đời Sống)

---

## 3. CUSTOM ROLES (27 roles, Vietnamese with diacritics)

| Role | Level | Description |
|------|-------|-------------|
| Tổng Giám Đốc | KLH | General Director |
| Phó Tổng Giám Đốc | KLH | Deputy General Director |
| Ban Giám Đốc | KLH | Board of Directors |
| Giám Đốc Xí Nghiệp | XN | Enterprise Director |
| Phó Giám Đốc Xí Nghiệp | XN | Deputy Enterprise Director |
| Giám Đốc Kỹ Thuật | XN | Technical Director |
| Trưởng Phòng | Ban/Phòng | Department Head |
| Phó Phòng | Ban/Phòng | Deputy Department Head |
| Trưởng Ban Chức Năng | KLH | Functional Department Head |
| Trưởng Bộ Phận Kế Hoạch | Ban/Phòng | Planning Division Head |
| Chuyên Viên Kế Hoạch KPI | Ban/Phòng | KPI Planning Specialist |
| Quản Đốc Xưởng | XN | Factory Supervisor |
| Đội Trưởng | Đội | Team Leader |
| Tổ Trưởng | Tổ | Group Leader |
| Bếp Trưởng | Bếp | Kitchen Manager |
| Agriculture Manager | Farm | Full CRUD on farm doctypes |
| Agriculture User | Farm | Create/write farm doctypes |
| An Sinh Manager | An Sinh | Welfare module manager |
| An Sinh User | An Sinh | Welfare module user |
| Kitchen Manager | Bếp ăn | Canteen module manager |
| Kitchen User | Bếp ăn | Canteen module user |
| TBP Ke Hoach | KH | Planning full access |
| CV KH KPI | KH | KPI specialist with amend |
| Quan Doc Xuong | Xưởng | Factory supervisor role |
| Doi Truong | Đội | Team leader role |
| To Truong | Tổ | Group leader role |
| Employee Self Service | All | Basic self-service access |

---

## 4. CUSTOM DOCTYPES (52 total in snuol_custom)

### 4.1 Organization / Master Data
| Doctype | Key Fields | Notes |
|---------|-----------|-------|
| Xi Nghiep | ma_xi_nghiep, ten_xi_nghiep, company | Enterprise unit (BP1-BP5, ERC, ERC3) |
| Cum | | Cluster under Xi Nghiep |
| Nong Truong | | Farm unit under Cum |
| Doi San Xuat | | Production team |
| To San Xuat | | Production group |
| Lo | | Land lot |
| Mau Day | | Row/bed code |
| Thua | ma_thua, dien_tich, so_cay, trang_thai, kinh_do, vi_do, toa_do_polygon | Individual plot, naming `THUA-.YYYY.-.#####` |

### 4.2 Garden Care Activities (Submittable)
Chich Bup, Cat Bap, Cat Choi, Cat La, Bao Buong, Phun Buong, Phun Men VS, Phun Thuoc BVTV, Lam Co, Phat Co, Trong Dam, Chon Choi, Do Trai, Huy Chuoi, Trong Moi

### 4.3 Harvest & Packing (Submittable)
| Doctype | Key Fields | Naming |
|---------|-----------|--------|
| Thu Hoach | thua, ngay_thu_hoach, pc1..pc9_buong/_kg, tong_trong_luong | `TH-.YYYY.-.#####` |
| So Che Dong Goi | ngay, tong_nl_nhap_kg, tp_pc1..tp_pc9_thung/_kg, ty_le_thanh_pham | `SCDG-.YYYY.-.#####` |
| Container | | Export container |
| Phu Pham | | By-product record |

### 4.4 Kitchen / Canteen (Bếp Ăn)
| Doctype | Description |
|---------|-------------|
| Bep | Kitchen master (ten_bep, trang_thai, warehouse) |
| Thuc Don | Weekly menu (ngay, bua=Sáng/Trưa/Chiều, items child table) |
| Thuc Don Mon An | Child table: menu item rows |
| Dang Ky Suat An (DKSA) | Flat model: 1 doc = 1 user + 1 ngay + 1 bua + 1 bep |
| Bao Cao Bep | Kitchen report |

**DKSA business rules**: Bua values use Unicode diacritics: `Sáng`, `Trưa`, `Chiều`

### 4.5 An Sinh & Đời Sống (Welfare)
| Doctype | Description |
|---------|-------------|
| Khu Nha | Housing block/zone |
| Phong | Room (so_nguoi_hien_tai, suc_chua, trang_thai) |
| Phan Bo Phong | Room allocation (links Employee to Phong) |
| Tai San | Asset |
| Loai Tai San | Asset type |
| Ban Giao Tai San | Asset handover |
| Bao Tri Tai San | Asset maintenance |
| Xe | Vehicle |
| Loai Xe | Vehicle type |
| Phan Cong Xe | Vehicle assignment |
| Bao Tri Xe | Vehicle maintenance → syncs Xe.tinh_trang |
| Phong Hop | Meeting room |
| Dat Lich Phong Hop | Meeting room booking → validates time conflicts |
| Vuon Tang Gia | Garden |
| Thu Hoach Vuon | Garden harvest |
| Van Phong Pham | Office supply |
| Loai Van Phong Pham | Office supply type |
| Yeu Cau Van Phong Pham | Office supply request |

### 4.6 Planning & Reporting
Ky San Xuat, KH San Luong, KH Du Thu, KH Sigatoka, Thong So KHSL, Thong Tin Ket Vu, Bang Chia Vu, Chi Phi San Xuat, Gia Thanh Per Tan, Don Hang XK, Don Gia Ban, Kiem Ke Huy, Nhu Cau Vat Tu, Dinh Muc Vat Tu, Ngay Kinh Doanh, Quy Doi Pham Cap

### 4.7 Workers
Cong Nhan Vuon (Farm worker), Cong Nhan Xuong (Factory worker)

---

## 5. SERVER SCRIPTS (in DB, not app files)

### Created via set_ansinh_permissions.py + create_ansinh_server_scripts.py:
| Script | Event | Description |
|--------|-------|-------------|
| PBP - Dong Bo Phong | Phan Bo Phong After Save | Syncs Phong.so_nguoi_hien_tai + trang_thai |
| PBP - Dong Bo Phong Xoa | Phan Bo Phong After Delete | Same on delete |
| DLPH - Validate Conflict | Dat Lich Phong Hop Before Save | Prevents booking time overlap |
| BTX - Dong Bo Xe | Bao Tri Xe After Save | Syncs Xe.tinh_trang based on maintenance status |

### Workflow:
- **WF Dang Ky Suat An**: DKSA workflow with role `Bếp Trưởng` (fixed from `Bep Truong`)

---

## 6. BACKEND APIs (snuol_custom/api.py)

| Method | Description |
|--------|-------------|
| `update_bom_items` | Update BOM items on submitted doc (bypass submit-check) |
| `create_user_from_employee` | Creates User from Employee ID with `{id}@farm.local` email |
| `bulk_create_users` | Batch user creation |
| `send_meal_registration_email` | HTML email of weekly meal registrations |
| `save_meal_registrations` | Create/update/delete DKSA for current user |
| `get_bep_list` | List all kitchens |
| `get_meal_registration_data` | DKSA + Thuc Don + item_map for date range |

### AI Chat (snuol_custom/ai_chat.py)
- **Method**: `chat_ai_respond`
- **Fallback chain**: Claude Haiku → Gemini Flash (with tools) → Groq Llama
- **Gemini tools**: `query_list`, `get_count`, `get_document`, `run_report_query`
- **29 allowed doctypes** for AI queries
- **API keys**: `anthropic_api_key`, `gemini_api_key`, `groq_api_key` in `frappe.conf`

---

## 7. FRONTEND ARCHITECTURE

### 7.1 Pages (22 pages)
| Page | Route | Description |
|------|-------|-------------|
| Login | /login | Auth with hero banner |
| DynamicDashboard | /, /dashboard | Main dashboard |
| DynamicForm | /form/:doctype/:name? | Metadata-driven universal form |
| DoctypeScreen | /app/doctype/:doctype | Permission-protected list view |
| WorkspacePage | /app/workspace/:name | ERPNext workspace renderer |
| MapPage | /app/map | OpenLayers full-screen map |
| ChatPage | /app/chat | Zalo-style team chat |
| WeeklyMenuBuilder | /app/thuc-don-tuan | 7×3 menu builder grid |
| MealRegistration | /app/dang-ky-suat-an | Employee meal registration |
| MealSummary | /app/tong-hop-suat-an | Meal report tables |
| DishManager | /app/mon-an | Dish + BOM management |
| KitchenManager | /app/danh-sach-bep | Kitchen CRUD |
| KitchenReport | /app/bao-cao-bep | Kitchen dashboard |
| IngredientManager | /app/nguyen-lieu | Ingredient CRUD |
| IngredientPlan | /app/ke-hoach-nguyen-lieu | Ingredient planning |
| HousingManager | /app/nha-o | Khu Nha + Phong + Phan Bo Phong |
| GardenManager | /app/vuon-tang-gia | Garden + harvest |
| AssetManager | /app/tai-san | 4 asset doctypes |
| VehicleManager | /app/quan-ly-xe | 4 vehicle doctypes |
| OfficeSupplyManager | /app/van-phong-pham | 3 supply doctypes |
| MeetingRoomBooking | /app/dat-lich-phong-hop | Calendar + room list |
| BulkCreatePage | /form/:doctype/bulk | Spreadsheet bulk create |

### 7.2 API Layer
```
Components → React Query Hooks → Domain Services → Gateway → Frappe SDK
```

**Domain Services** (src/api/domains/):
DocumentService, MetadataService, AuthService, ProductionService, InventoryService, WorkflowService, SearchService, FileService, WorkspaceService, TranslationService, AiService, TreeService

**React Query Hooks** (src/api/queries/):
useDocumentList, useDocument, useCreateDocument, useUpdateDocument, useDeleteDocument, useDocTypeMeta, useCurrentUser, useLinkSearch, useWorkflowTransitions, useProductionDashboard, useStockBalance

### 7.3 State Management (Zustand stores)
| Store | Purpose |
|-------|---------|
| useNetworkStore | Online/offline, sync queue |
| useToastStore | Toast notifications |
| useSidebarStore | Sidebar open/collapsed state |
| useLanguageStore | i18n language + translations |
| usePersonaStore | Role-based persona (worker/manager/executive) |
| useChatStore | Chat rooms, messages, reactions |

### 7.4 Config Files
| File | Key Exports |
|------|-------------|
| doctype.behaviors.js | PAGE_WORKSPACE_MAP, CUSTOM_DOCTYPE_PAGES, DOCTYPE_IMAGES, WORKSPACE_SHORTCUT_OVERRIDES, NUMBER_FORMAT, BOM config, LINK_FIELD_FILTERS, FIELD_CHANGE_HANDLERS |
| layout.js | Z_INDEX, SIDEBAR, BOTTOM_NAV_TABS, HIDE_BOTTOM_NAV_PAGES, MOBILE, LIST_VIEW, NO_PADDING_PAGES |
| colors.js | CARD_COLORS, STATUS_COLORS, DOCTYPE_COLORS, GRADIENTS, SHADOWS, BORDERS |
| styles.js | CARD, LIST_ITEM, ICON, TABLE, BUTTON, INPUT, BADGE, OVERLAY, TEXT, LAYOUT, SIDEBAR, LOADING, TRANSITION |
| icons.js | Icon mappings |

### 7.5 i18n
- 5 languages: vi, en, km, lo, zh
- ~2,250 keys in 54 namespaces
- Key namespaces: auth, common, form, list, kitchen, garden, housing, asset, vehicle, vpp, booking, workspace, page

---

## 8. DOCKER COMMANDS (Windows + Git Bash)

```bash
# MUST prefix with MSYS_NO_PATHCONV=1

# DB Query
MSYS_NO_PATHCONV=1 docker exec erpnext_v16-db-1 sh -c 'mariadb -u_830f7c4d002adf39 -pzpCx8OKg29vrWJvs _830f7c4d002adf39 <<ENDOFSQL
SELECT ... FROM ...;
ENDOFSQL'

# Deploy Python code
docker cp <file> erpnext_v16-backend-1:/home/frappe/frappe-bench/apps/snuol_custom/snuol_custom/<path>
docker restart erpnext_v16-backend-1
docker restart erpnext_v16-queue-short-1
docker restart erpnext_v16-queue-long-1

# Execute script
MSYS_NO_PATHCONV=1 docker exec erpnext_v16-backend-1 bench --site frontend execute snuol_custom.<module>.run

# Clear cache
MSYS_NO_PATHCONV=1 docker exec erpnext_v16-backend-1 bench --site frontend clear-cache

# Build frontend (Vite)
cd d:/ai/erp-frontend && npx vite build
```

---

## 9. PERMISSIONS MODEL

- Custom doctypes use **`tabCustom DocPerm`** (NOT `tabDocPerm`)
- Standard doctypes use `tabDocPerm`
- Permission check: `frappe.has_permission(doctype, ptype, doc, user)`
- DKSA: Employee Self Service = read Bep + read Thuc Don + CRUD own DKSA
- An Sinh doctypes: An Sinh Manager (full) + An Sinh User (read + create own) + Employee Self Service (read only)

---

## 10. KNOWN ISSUES & PENDING WORK

### Critical
- **@klhsnuol.com emails don't exist**: 121 role assignments from `create_roles_sdtc.py` used fake emails. Need to match SĐTC names → real emails (@gmail.com, @thaco.com.vn, @thagrico.vn)
- **10 people not in system**: Huỳnh Văn Quang, Nguyễn Thế Phương, Nguyễn Đức Huấn, Phạm Trọng Hiếu, Nguyễn Ngọc Thùy, Trần Phú Đại, Trần Lê Thanh, Sit Ory, Võ Văn Hoàng, Mr. Ariel

### Backend
- 3 custom reports are stubs (placeholder data only)
- No scheduler_events (no cron jobs for automated reports)
- Server scripts live in DB only (not in app fixtures) — risk of loss on migration
- `frappe.client.set_value` triggers full validation → use `frappe.db.set_value` via Server Script

### Frontend
- Build: `npx vite build` only, do NOT copy to dist-serve
- Vite builds directly to `dist/` served by nginx

---

## 11. BUSINESS PROCESSES

### 11.1 Banana Production Flow
```
Planting (Trong Moi) → Garden Care (15 activities) → Harvest (Thu Hoach)
→ Post-Harvest/Packing (So Che Dong Goi) → Container → Export (Don Hang XK)
```
- 9 quality grades: PC1-PC9
- Metrics: buong (bunch), kg, ty_le_thanh_pham (yield %)

### 11.2 Meal Registration Flow
```
Admin creates Bep → Admin builds Thuc Don (weekly menu)
→ Employee registers DKSA (per day, per bua)
→ Kitchen gets summary → Ingredient Plan auto-calculated
→ Kitchen Report (daily/weekly/monthly)
```

### 11.3 Housing Management Flow
```
Admin creates Khu Nha → Phong (rooms with capacity)
→ HR allocates via Phan Bo Phong → Server Script syncs count/status
```

### 11.4 Vehicle Management Flow
```
Admin registers Xe → Phan Cong Xe (assignment)
→ Bao Tri Xe (maintenance) → Server Script syncs Xe.tinh_trang
```

### 11.5 Meeting Room Booking Flow
```
Admin creates Phong Hop → Users create Dat Lich Phong Hop
→ Server Script validates no time overlap
```

---

## 12. KEY PEOPLE & EMAILS (Confirmed working)

| Name | Email | Role |
|------|-------|------|
| Nguyễn Ngọc Anh Tú | nguyenngocanhtu@thagrico.vn | TGĐ KLH SNUOL |
| Võ Văn Đồng | vovandong@thaco.com.vn | P.TGĐ PT Chuối |
| Lê Tấn Kỳ | letanky@thaco.com.vn | GĐ XN BP1 |
| Nguyễn Văn Cường | nguyenvancuong3@thagrico.vn | GĐ XN BP2 |
| Võ Lên | volen@thaco.com.vn | GĐ XN BP3 |
| Mai Xuân Thành | maixuanthanh@thaco.com.vn | GĐ XN ERC |
| Đoàn Ngọc Tuấn | doanngoctuan@thagrico.vn | TP NS&HC (kiêm TBP KH) |

---

## 13. DEPLOYMENT CHECKLIST

### Python/Backend changes:
1. Edit file locally (d:\ai\snuol_custom\snuol_custom\...)
2. `docker cp <file> erpnext_v16-backend-1:<path>`
3. `docker restart erpnext_v16-backend-1`
4. `docker restart erpnext_v16-queue-short-1` (if async tasks)
5. `docker restart erpnext_v16-queue-long-1` (if async tasks)
6. `bench --site frontend clear-cache` (if needed)

### Frontend changes:
1. Edit files in d:\ai\erp-frontend\src\...
2. `npx vite build` (builds to dist/)
3. Nginx serves dist/ directly

### DB changes (permissions, workflows):
1. Use `docker exec` with MariaDB heredoc
2. Always prefix `MSYS_NO_PATHCONV=1` on Windows Git Bash
3. Custom doctype perms → `tabCustom DocPerm`
4. Standard doctype perms → `tabDocPerm`
