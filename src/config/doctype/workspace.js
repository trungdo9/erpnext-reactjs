/**
 * Workspace & DocType Page Mapping Configuration
 *
 * - PAGE_WORKSPACE_MAP: breadcrumb navigation
 * - CUSTOM_DOCTYPE_PAGES: redirect to custom pages
 * - WORKSPACE_ICONS / DOCTYPE_IMAGES: image resolution
 * - WORKSPACE_SHORTCUT_OVERRIDES: sidebar shortcut customization
 * - NO_PADDING_PAGES, LIST_EXTRA_FIELDS
 */

/**
 * Page → parent Workspace mapping for breadcrumb navigation.
 * Key: pathname (must match route exactly)
 * Value: { workspace, label }
 *   - workspace: Workspace name (used for navigation to /app/workspace/:name)
 *   - label: Display label for this page in breadcrumb
 *
 * Pages NOT listed here will use location.state.workspace from sidebar navigation.
 */
export const PAGE_WORKSPACE_MAP = {
    '/app/tai-san': { workspace: 'Quản Trị Văn Phòng', label: 'page.assetManager' },
    '/app/quan-ly-xe': { workspace: 'Quản Trị Văn Phòng', label: 'page.vehicleHub' },
    '/app/dat-xe': { workspace: 'Quản Trị Văn Phòng', label: 'page.vehicleBooking' },
    '/app/van-phong-pham': { workspace: 'Quản Trị Văn Phòng', label: 'page.officeSupplyManager' },
    '/app/dat-lich-phong-hop': { workspace: 'Quản Trị Văn Phòng', label: 'page.meetingRoomBooking' },
    '/app/ky-van-ban': { workspace: 'Quản Trị Văn Phòng', label: 'page.documentSigning' },
    '/app/chat': { workspace: null, label: 'page.chat' },
    '/app/nhan-su': { workspace: 'Nhân sự', label: 'page.hrDashboard' },
    '/app/danh-ba-nhan-vien': { workspace: 'Nhân sự', label: 'page.employeeDirectory' },
    '/app/nghi-phep': { workspace: 'Nhân sự', label: 'page.leaveManager' },
    '/app/cham-cong': { workspace: 'Nhân sự', label: 'page.attendanceTracker' },
    '/app/crm': { workspace: 'CRM', label: 'page.crmDashboard' },
    // Bán hàng
    '/app/ban-hang': { workspace: 'Bán Hàng', label: 'page.banHang' },
    '/app/giao-hang': { workspace: 'Bán Hàng', label: 'page.giaoHang' },
    // Sản xuất & Kho (gom chung)
    '/app/nhap-cuon': { workspace: 'Sản Xuất Thép', label: 'page.nhapCuon' },
    '/app/xa-bang': { workspace: 'Sản Xuất Thép', label: 'page.xaBang' },
    '/app/cat-tam': { workspace: 'Sản Xuất Thép', label: 'page.catTam' },
    '/app/ton-kho': { workspace: 'Sản Xuất Thép', label: 'page.tonKho' },
    '/app/theo-doi-batch': { workspace: 'Sản Xuất Thép', label: 'page.theodoiBatch' },
    '/app/bao-cao-san-xuat': { workspace: 'Sản Xuất Thép', label: 'page.baoCaoSX' },
    '/app/san-xuat': { workspace: 'Sản Xuất', label: 'production.hub.title' },
    '/app/bc-san-xuat-ngay': { workspace: 'Sản Xuất', label: 'production.dailyReport.title' },
    '/app/ke-hoach-san-luong': { workspace: 'Sản Xuất', label: 'production.plan.title' },
};

/**
 * Custom page redirects for doctypes.
 * When user navigates to /app/doctype/:doctype and the doctype has a custom page,
 * DoctypeScreen will redirect to the custom page instead.
 * Key: doctype name, Value: custom page path
 */
export const CUSTOM_DOCTYPE_PAGES = {
    'Tai San': '/app/tai-san',
    'Loai Tai San': '/app/tai-san',
    'Ban Giao Tai San': '/app/tai-san',
    'Bao Tri Tai San': '/app/tai-san',
    'Xe': '/app/quan-ly-xe',
    'Loai Xe': '/app/quan-ly-xe',
    'Phan Cong Xe': '/app/quan-ly-xe',
    'Bao Tri Xe': '/app/quan-ly-xe',
    'Van Phong Pham': '/app/van-phong-pham',
    'Loai Van Phong Pham': '/app/van-phong-pham',
    'Yeu Cau Van Phong Pham': '/app/van-phong-pham',
    'Phong Hop': '/app/dat-lich-phong-hop',
    'Dat Lich Phong Hop': '/app/dat-lich-phong-hop',
    'Ky Van Ban': '/app/ky-van-ban',
};

/**
 * Workspace icon images (real photos).
 * Key: workspace name (lowercase, normalized) — matched against workspace.name or workspace.label
 * Value: path to image in public/icons/workspaces/
 *
 * Matching logic: workspace name is lowercased, then checked for substring match.
 * E.g. workspace "Sản Xuất" matches key "sản xuất" → factory.jpg
 */
export const WORKSPACE_ICONS = {
    // No stock photos — workspace pages use icon-only headers
};

/**
 * Get workspace icon image path by workspace name.
 * Uses substring matching (lowercase) against WORKSPACE_ICONS keys.
 * @param {string} workspaceName - Workspace name or label
 * @returns {string|null} Image path or null if no match
 */
export function getWorkspaceImage(workspaceName) {
    if (!workspaceName) return null;
    const lower = workspaceName.toLowerCase();

    // Exact match first
    if (WORKSPACE_ICONS[lower]) return WORKSPACE_ICONS[lower];

    // Substring match (longer keys first for specificity)
    const sortedKeys = Object.keys(WORKSPACE_ICONS).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
        if (lower.includes(key)) return WORKSPACE_ICONS[key];
    }

    return null;
}

/**
 * DocType → image mapping for link items inside workspace pages.
 * Used by LinkCardWidget and individual link blocks.
 * Key: DocType name (exact match)
 * Value: path to image in public/icons/workspaces/
 */
export const DOCTYPE_IMAGES = {
    // No stock photos — use Lucide icons via WORKSPACE_SHORTCUT_OVERRIDES instead
};

/**
 * Get image for a DocType.
 * @param {string} doctype - DocType name
 * @returns {string|null} Image path or null
 */
export function getDoctypeImage(doctype) {
    if (!doctype) return null;
    return DOCTYPE_IMAGES[doctype] || null;
}

/**
 * Workspace shortcut overrides.
 * Key: shortcut's `link_to` value (DocType name, page name, etc.)
 * Value: { icon, description, color, image, imageQuery } — merged on top of ERPNext data.
 *   - icon: Lucide icon name (fallback when no image)
 *   - description: Short text shown below the label
 *   - color: Override the ERPNext color (optional)
 *   - image: Static image path (takes priority over icon)
 *   - imageQuery: { doctype, filters, field } — fetch a random real image (takes priority over static image)
 */
export const WORKSPACE_SHORTCUT_OVERRIDES = {
    // ═══════════════════════════════════════════════════════════════
    // Sản Xuất Thép — URL shortcuts
    // ═══════════════════════════════════════════════════════════════
    'xa-bang':          { icon: 'Scissors',    description: 'Xả cuộn thành strip',      color: 'blue' },
    'cat-tam':          { icon: 'LayoutGrid',  description: 'Cắt strip thành tấm',      color: 'orange' },
    'nhap-cuon':        { icon: 'PackagePlus', description: 'Nhận cuộn vào kho NVL',     color: 'green' },
    'ton-kho':          { icon: 'Warehouse',   description: 'Xem tồn kho tất cả kho',   color: 'cyan' },
    'theo-doi-batch':   { icon: 'Search',      description: 'Truy xuất nguồn gốc',      color: 'purple' },
    'bao-cao-san-xuat': { icon: 'BarChart3',   description: 'Thống kê sản xuất',        color: 'red' },

    // ═══════════════════════════════════════════════════════════════
    // Bán Hàng — URL shortcuts
    // ═══════════════════════════════════════════════════════════════
    'ban-hang':  { icon: 'ShoppingCart', description: 'Tạo & quản lý đơn hàng',  color: 'blue' },
    'giao-hang': { icon: 'Truck',        description: 'Giao hàng cho khách',      color: 'teal' },

    // ═══════════════════════════════════════════════════════════════
    // Bán Hàng — DocType links
    // ═══════════════════════════════════════════════════════════════
    'Sales Order':   { icon: 'ClipboardList', description: 'Đơn hàng bán',        color: 'blue' },
    'Customer':      { icon: 'Users',         description: 'Danh sách khách hàng', color: 'green' },

    // ═══════════════════════════════════════════════════════════════
    // Kho & Vật tư — DocType shortcuts
    // ═══════════════════════════════════════════════════════════════
    'Stock Entry':          { icon: 'ArrowRightLeft', description: 'Nhập / xuất / chuyển kho', color: 'blue' },
    'Warehouse':            { icon: 'Warehouse',      description: 'Quản lý kho',              color: 'green' },
    'Item':                 { icon: 'Package',         description: 'Danh mục sản phẩm',       color: 'purple' },
    'Item Group':           { icon: 'FolderTree',      description: 'Nhóm sản phẩm',           color: 'slate' },
    'Delivery Note':        { icon: 'PackageCheck',    description: 'Phiếu giao hàng',         color: 'amber' },
    'Purchase Receipt':     { icon: 'PackagePlus',     description: 'Phiếu nhận hàng',         color: 'cyan' },
    'Material Request':     { icon: 'ClipboardList',   description: 'Yêu cầu vật tư',          color: 'orange' },
    'Stock Reconciliation': { icon: 'ClipboardCheck',  description: 'Đối chiếu tồn kho',       color: 'indigo' },

    // ═══════════════════════════════════════════════════════════════
    // Mua Hàng — DocType shortcuts
    // ═══════════════════════════════════════════════════════════════
    'Purchase Order':       { icon: 'ShoppingCart',    description: 'Đơn đặt mua',             color: 'blue' },
    'Purchase Invoice':     { icon: 'FileInput',       description: 'Hóa đơn mua',             color: 'red' },
    'Supplier':             { icon: 'Building2',       description: 'Nhà cung cấp',            color: 'purple' },
    'Supplier Quotation':   { icon: 'FileSpreadsheet', description: 'Báo giá NCC',             color: 'amber' },
    'Request for Quotation':{ icon: 'Send',            description: 'Yêu cầu báo giá',         color: 'orange' },

    // ═══════════════════════════════════════════════════════════════
    // Tài Chính Kế Toán — DocType shortcuts
    // ═══════════════════════════════════════════════════════════════
    'Journal Entry':  { icon: 'BookOpen',   description: 'Bút toán kế toán',     color: 'indigo' },
    'Payment Entry':  { icon: 'CreditCard', description: 'Thu / chi tiền',        color: 'green' },
    'Sales Invoice':  { icon: 'FileText',   description: 'Hóa đơn bán hàng',     color: 'amber' },
    'Account':        { icon: 'Landmark',   description: 'Hệ thống tài khoản',   color: 'purple' },
    'Cost Center':    { icon: 'Target',     description: 'Trung tâm chi phí',     color: 'cyan' },

    // ═══════════════════════════════════════════════════════════════
    // Nhân sự — DocType shortcuts
    // ═══════════════════════════════════════════════════════════════
    'Employee':          { icon: 'UserRound',      description: 'Hồ sơ nhân viên',     color: 'blue' },
    'Attendance':        { icon: 'ClipboardCheck',  description: 'Bảng chấm công',      color: 'orange' },
    'Leave Application': { icon: 'CalendarOff',     description: 'Đơn nghỉ phép',       color: 'green' },
    'Salary Slip':       { icon: 'Banknote',        description: 'Phiếu lương',         color: 'purple' },
    'Department':        { icon: 'Building2',       description: 'Phòng ban',            color: 'slate' },
    'Expense Claim':     { icon: 'Receipt',         description: 'Thanh toán chi phí',   color: 'red' },

    // ═══════════════════════════════════════════════════════════════
    // Nhân sự — Tuyển dụng
    // ═══════════════════════════════════════════════════════════════
    'Job Opening':        { icon: 'Briefcase',  description: 'Vị trí tuyển dụng',  color: 'blue' },
    'Job Applicant':      { icon: 'UserPlus',   description: 'Ứng viên',           color: 'green' },
    'Interview':          { icon: 'Mic',        description: 'Phỏng vấn',          color: 'orange' },
    'Job Offer':          { icon: 'FileCheck',  description: 'Thư mời nhận việc',  color: 'purple' },
    'Employee Onboarding':{ icon: 'UserCheck',  description: 'Tiếp nhận nhân viên',color: 'emerald' },

    // ═══════════════════════════════════════════════════════════════
    // Nhân sự — Lương & Chấm công mở rộng
    // ═══════════════════════════════════════════════════════════════
    'Payroll Entry':     { icon: 'Calculator',    description: 'Chạy bảng lương',    color: 'purple' },
    'Salary Structure':  { icon: 'Layers',        description: 'Cơ cấu lương',       color: 'indigo' },
    'Shift Type':        { icon: 'Clock',         description: 'Ca làm việc',         color: 'indigo' },
    'Employee Checkin':  { icon: 'LogIn',         description: 'Check-in / out',      color: 'amber' },
    'Leave Type':        { icon: 'ListChecks',    description: 'Loại nghỉ phép',      color: 'teal' },
    'Holiday List':      { icon: 'CalendarHeart', description: 'Lịch nghỉ lễ',        color: 'red' },

    // ═══════════════════════════════════════════════════════════════
    // Nhân sự — Thủ tục
    // ═══════════════════════════════════════════════════════════════
    'Employee Transfer':   { icon: 'ArrowRightLeft', description: 'Điều chuyển',      color: 'blue' },
    'Employee Promotion':  { icon: 'TrendingUp',     description: 'Thăng chức',       color: 'green' },
    'Employee Separation': { icon: 'LogOut',          description: 'Nghỉ việc',        color: 'red' },
    'Designation':         { icon: 'Award',           description: 'Chức danh',        color: 'amber' },

    // ═══════════════════════════════════════════════════════════════
    // Báo cáo kế toán
    // ═══════════════════════════════════════════════════════════════
    'General Ledger':             { icon: 'BookOpen',    description: 'Sổ cái tổng hợp',    color: 'indigo' },
    'Trial Balance':              { icon: 'Scale',       description: 'Bảng cân đối thử',   color: 'blue' },
    'Balance Sheet':              { icon: 'BarChart3',   description: 'Bảng cân đối kế toán',color: 'purple' },
    'Profit and Loss Statement':  { icon: 'TrendingUp',  description: 'Báo cáo lãi lỗ',     color: 'green' },

    // ═══════════════════════════════════════════════════════════════
    // Báo cáo mua hàng & kho
    // ═══════════════════════════════════════════════════════════════
    'Purchase Analytics': { icon: 'BarChart2',    description: 'Phân tích mua hàng', color: 'orange' },
    'Stock Ledger':       { icon: 'FileBarChart', description: 'Sổ kho chi tiết',    color: 'blue' },
    'Stock Balance':      { icon: 'BarChart',     description: 'Tồn kho tổng hợp',   color: 'cyan' },

    // ═══════════════════════════════════════════════════════════════
    // Sản Xuất chung (ERPNext default)
    // ═══════════════════════════════════════════════════════════════
    'Tổng quan sản xuất': { icon: 'LayoutDashboard', description: 'Tổng quan sản xuất', color: 'blue' },
    'Báo cáo sản xuất':  { icon: 'BarChart3',       description: 'Báo cáo sản xuất',   color: 'purple' },

    // ═══════════════════════════════════════════════════════════════
    // Quản Trị Văn Phòng (hidden but keep config)
    // ═══════════════════════════════════════════════════════════════
    'Tai San':            { icon: 'Package',       description: 'Quản lý tài sản',      color: 'blue' },
    'Loai Tai San':       { icon: 'FileText',      description: 'Loại tài sản',          color: 'grey' },
    'Ban Giao Tai San':   { icon: 'Handshake',     description: 'Bàn giao tài sản',      color: 'green' },
    'Bao Tri Tai San':    { icon: 'Wrench',        description: 'Bảo trì tài sản',       color: 'orange' },
    'Van Phong Pham':     { icon: 'FileText',      description: 'Văn phòng phẩm',        color: 'cyan' },
    'Yeu Cau Van Phong Pham': { icon: 'ClipboardList', description: 'Yêu cầu VPP',      color: 'purple' },
    'ky-van-ban':         { icon: 'FileSignature', description: 'Ký duyệt văn bản',      color: 'indigo' },
    'dat-lich-phong-hop': { icon: 'CalendarClock', description: 'Đặt phòng họp',         color: 'cyan' },
    'Phong Hop':          { icon: 'Building2',     description: 'Danh sách phòng họp',   color: 'blue' },
    'Dat Lich Phong Hop': { icon: 'CalendarClock', description: 'Đặt lịch phòng họp',    color: 'cyan' },
    'quan-ly-xe':         { icon: 'Truck',         description: 'Quản lý xe',             color: 'blue' },
    'Loai Xe':            { icon: 'FileText',      description: 'Loại xe',                color: 'grey' },
    'Phan Cong Xe':       { icon: 'Users',         description: 'Phân công xe',           color: 'purple' },
    'Bao Tri Xe':         { icon: 'Wrench',        description: 'Bảo trì xe',             color: 'orange' },

    // ═══════════════════════════════════════════════════════════════
    // Nhân sự — URL shortcuts
    // ═══════════════════════════════════════════════════════════════
    'nhan-su':           { icon: 'LayoutDashboard', description: 'Tổng quan nhân sự',     color: 'blue' },
    'danh-ba-nhan-vien': { icon: 'ContactRound',    description: 'Danh bạ nhân viên',     color: 'cyan' },
    'nghi-phep':         { icon: 'CalendarOff',      description: 'Quản lý nghỉ phép',    color: 'green' },
    'cham-cong':         { icon: 'Clock',            description: 'Bảng chấm công',       color: 'orange' },
    'quan-ly-ho-chieu':  { icon: 'BookOpen',         description: 'Quản lý hộ chiếu',     color: 'indigo' },
    'Staffing Plan':     { icon: 'Target',           description: 'Kế hoạch nhân sự',     color: 'indigo' },
    'Job Requisition':   { icon: 'Send',             description: 'Yêu cầu tuyển dụng',   color: 'cyan' },
};

/**
 * Workspace → custom page redirects.
 * When a workspace name matches, clicking it in the sidebar or visiting its URL
 * redirects to the custom page instead of rendering the ERPNext workspace.
 * Key: workspace name (exact match), Value: redirect path
 */
export const CUSTOM_WORKSPACE_REDIRECTS = {
};

/**
 * Pages where <main> should have no padding (e.g. map page)
 */
export const NO_PADDING_PAGES = ['/app/map', '/app/chat'];

/**
 * Extra fields to prepend in list view for specific doctypes.
 * These fields are added BEFORE the metadata-driven fields.
 * Key: doctype name, Value: array of fieldname strings
 */
export const LIST_EXTRA_FIELDS = {
    'Employee': ['employee_number'],
};

/**
 * Default ERPNext workspaces to hide from the sidebar.
 * These are standard ERPNext/HRMS modules not relevant for this deployment.
 * To reveal a workspace, remove it from this Set.
 *
 * Used by WorkspaceService to filter the workspace list before rendering.
 */
export const HIDDEN_WORKSPACES = new Set([
    // 'Bán Hàng',
    // 'Home',
    // 'Build',
    // 'Invoicing',
    // 'Buying',
    // 'Financial Reports',
    // 'Selling',
    // 'Stock',
    // 'Assets',
    // 'Manufacturing',
    // 'Subcontracting',
    // 'Quality',
    // 'Projects',
    // 'Support',
    // 'Users',
    // 'Website',
    // 'CRM',
    // 'Frappe CRM',
    // 'ERPNext Settings',
    // 'Integrations',
    // 'Settings',
    // 'Customization',
    // 'Utilities',
    // 'HR',         // no such workspace (actual name is 'Nhân sự')
    // 'Loans',
    // // hrms default workspaces - ALL hidden, use custom HR pages instead
    // 'People',
    // 'Tenure',
    // 'Recruitment',
    // 'Shift & Attendance',
    // 'Leaves',
    // 'Expenses',
    // 'Performance',
    // 'Payroll',
    // 'Tax & Benefits',
    // // Legacy (not used in steel ERP)
    // 'Sản xuất & Kỹ thuật thép',
    // 'San xuat & Ky thuat thep',
    // 'Thông tin Quy hoạch',
    // 'Thong tin Quy hoach',
    // 'Nhập liệu Sản xuất',
    // 'Nhap lieu San xuat',
    // 'Quản Lý Vườn',
    // 'Quan Ly Vuon',
    // 'An Sinh Đời Sống',
    // 'An Sinh Doi Song',
    // 'Chăm Sóc Vườn',
    // 'Cham Soc Vuon',
    // // Merged into "Kho"
    // 'VCNB',
    // // Vietnamese-named ERPNext defaults (not needed)
    // 'Quản Trị Văn Phòng',
    // 'Quan Tri Van Phong',
    // // Hidden default
    // 'Welcome Workspace',
]);
