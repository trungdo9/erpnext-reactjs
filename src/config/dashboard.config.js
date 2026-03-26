/**
 * Dashboard Configuration (Fallback + Default)
 *
 * Dùng khi:
 * - ERPNext API không available
 * - Workspace chưa config
 * - Offline mode
 *
 * Cấu trúc này sẽ được override bởi ERPNext Workspace config nếu available
 */

// Icon mapping - Lucide React icons
export const ICON_MAP = {
    // DocTypes
    'User': 'Users',
    'ToDo': 'CheckSquare',
    'Customer': 'Building',
    'Supplier': 'Truck',
    'Item': 'Package',
    'Sales Order': 'ShoppingCart',
    'Purchase Order': 'ShoppingBag',
    'Sales Invoice': 'Receipt',
    'Purchase Invoice': 'FileText',
    'Stock Entry': 'ArrowRightLeft',
    'Delivery Note': 'PackageCheck',
    'Purchase Receipt': 'PackageOpen',
    'Journal Entry': 'BookOpen',
    'Payment Entry': 'CreditCard',
    'Employee': 'UserCircle',
    'Lead': 'UserPlus',
    'Opportunity': 'Target',
    'Quotation': 'FileQuestion',
    'Project': 'FolderKanban',
    'Task': 'ListTodo',
    'Issue': 'AlertCircle',

    // Custom DocTypes
    'Work Report': 'FileText',
    'Purchase Request': 'FileQuestion',

    // Default
    'default': 'File'
};

// Color palette for stats cards
export const COLOR_PALETTE = [
    'blue', 'amber', 'emerald', 'purple',
    'rose', 'cyan', 'indigo', 'orange',
    'teal', 'pink', 'lime', 'violet'
];

/**
 * Default dashboard stats configuration
 * Sẽ được filter theo user permission runtime
 */
export const DEFAULT_STATS = [
    {
        id: 'users',
        doctype: 'User',
        label: 'Người dùng',
        labelEn: 'Users',
        icon: 'Users',
        color: 'blue',
        filters: { enabled: 1 },
        showTrend: true
    },
    {
        id: 'todos',
        doctype: 'ToDo',
        label: 'Công việc',
        labelEn: 'Tasks',
        icon: 'CheckSquare',
        color: 'amber',
        filters: { status: 'Open' },
        showTrend: true
    },
    {
        id: 'items',
        doctype: 'Item',
        label: 'Vật tư',
        labelEn: 'Items',
        icon: 'Package',
        color: 'purple',
        filters: {},
        showTrend: true
    }
];

/**
 * Default quick actions
 */
export const DEFAULT_QUICK_ACTIONS = [
    {
        id: 'new_todo',
        label: 'Tạo công việc',
        labelEn: 'New Task',
        icon: 'Plus',
        route: '/form/ToDo',
        color: 'amber',
        doctype: 'ToDo',
        permission: 'create'
    },
    {
        id: 'new_user',
        label: 'Thêm người dùng',
        labelEn: 'New User',
        icon: 'UserPlus',
        route: '/form/User',
        color: 'blue',
        doctype: 'User',
        permission: 'create'
    },
    {
        id: 'reports',
        label: 'Báo cáo',
        labelEn: 'Reports',
        icon: 'BarChart3',
        route: '/app/reports',
        color: 'emerald',
        permission: null // Không cần check permission
    }
];

/**
 * Recent activity configuration
 */
export const RECENT_ACTIVITY_CONFIG = {
    doctypes: ['ToDo', 'User'],
    limit: 10,
    orderBy: 'modified desc',
    fields: ['name', 'modified', 'owner', 'docstatus']
};

/**
 * Dashboard refresh intervals (milliseconds)
 */
export const REFRESH_CONFIG = {
    stats: 5 * 60 * 1000,      // 5 phút
    activity: 2 * 60 * 1000,   // 2 phút
    shortcuts: 10 * 60 * 1000, // 10 phút
    background: 5 * 60 * 1000  // Auto refresh mỗi 5 phút
};

/**
 * Get icon for doctype
 */
export const getIconForDoctype = (doctype) => {
    return ICON_MAP[doctype] || ICON_MAP.default;
};

/**
 * Get color for index (cycling through palette)
 */
export const getColorForIndex = (index) => {
    return COLOR_PALETTE[index % COLOR_PALETTE.length];
};

export default {
    ICON_MAP,
    COLOR_PALETTE,
    DEFAULT_STATS,
    DEFAULT_QUICK_ACTIONS,
    RECENT_ACTIVITY_CONFIG,
    REFRESH_CONFIG,
    getIconForDoctype,
    getColorForIndex
};
