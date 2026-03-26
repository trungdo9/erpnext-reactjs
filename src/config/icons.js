/**
 * Icon Registry - Only import icons that are actually used
 * This reduces bundle size from 587KB to ~20KB
 */

import {
    // Sidebar icons
    LayoutDashboard,
    CheckSquare,
    Trees,
    Factory,
    Bug,
    Sprout,
    CalendarDays,
    CalendarRange,
    Calendar,
    FileBarChart,
    FileLineChart,
    FilePieChart,
    Building,
    Building2,
    Group,
    Tractor,
    MapPin,
    Map,
    Package,
    Droplets,
    Wrench,
    // Common UI icons
    FileText,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Plus,
    X,
    Trash2,
    Save,
    ArrowLeft,
    ArrowRight,
    Search,
    Filter,
    Loader2,
    RefreshCw,
    AlertTriangle,
    AlertCircle,
    CheckCircle,
    XCircle,
    Info,
    Home,
    Bell,
    User,
    LogOut,
    Mail,
    Shield,
    ShieldAlert,
    Moon,
    Sun,
    Clipboard,
    Send,
    Ban,
    RotateCcw,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    Users,
    Recycle,
    ArrowDownCircle,
    Truck,
    MousePointerClick,
    Scissors,
    Leaf,
    Hammer,
    Wind,
    ShoppingBasket,
    ShoppingCart,
    ArrowUp,
    // Bếp ăn icons
    Carrot,
    UtensilsCrossed,
    ChefHat,
    ClipboardList,
    Box,
    // Workspace-specific icons
    BarChart3,
    Target,
    ClipboardCheck,
    UserCog,
    Globe,
    Settings,
    Receipt,
    Handshake,
    FolderKanban,
    LifeBuoy,
    TrendingUp,
    Warehouse,
    Award,
    Blocks,
    Contact,
    Banknote,
    BookOpenText,
} from 'lucide-react';

/**
 * ERPNext icon name to Lucide icon name mapping
 * ERPNext uses various formats: module names, FontAwesome, Octicons, etc.
 */
export const ERPNextIconMap = {
    // Dashboard workspaces
    'dashboard': 'LayoutDashboard',
    'dashboard giám đốc': 'LayoutDashboard',
    'dashboard kế hoạch': 'LayoutDashboard',
    'dashboard quản đốc': 'LayoutDashboard',
    'dashboard tổ trưởng': 'LayoutDashboard',
    'dashboard đội trưởng': 'LayoutDashboard',

    // ERPNext module/workspace icons (lowercase)
    'buying': 'ShoppingBasket',
    'selling': 'TrendingUp',
    'stock': 'Warehouse',
    'accounting': 'FileBarChart',
    'manufacturing': 'Factory',
    'quality': 'Award',
    'assets': 'Building2',
    'projects': 'FolderKanban',
    'support': 'LifeBuoy',
    'hr': 'Users',
    'payroll': 'Users',
    'crm': 'Contact',
    'website': 'Globe',
    'settings': 'Settings',
    'erpnext settings': 'Settings',
    'users': 'Users',
    'setup': 'Settings',
    'tools': 'Wrench',
    'utilities': 'Wrench',
    'maintenance': 'Wrench',
    'education': 'FileText',
    'steel': 'Factory',
    'healthcare': 'Activity',
    'build': 'Blocks',
    'invoicing': 'Receipt',
    'subcontracting': 'Handshake',
    'financial reports': 'Banknote',

    // Vietnamese workspace names
    'mua hàng': 'ShoppingBasket',
    'bán hàng': 'TrendingUp',
    'kho': 'Warehouse',
    'kho & vật tư': 'Warehouse',
    'kế toán': 'FileBarChart',
    'nhập liệu kế toán': 'FileBarChart',
    'sản xuất': 'Factory',
    'quản trị sản xuất': 'Factory',
    'chất lượng': 'Award',
    'tài sản': 'Building2',
    'dự án': 'FolderKanban',
    'kỹ thuật': 'Wrench',
    'nhân sự': 'Users',
    'báo cáo': 'FileBarChart',
    'báo cáo tài chính': 'Banknote',
    'payables': 'ArrowDownRight',
    'receivables': 'ArrowUpRight',
    'nhập liệu kho': 'Warehouse',

    // FontAwesome style (fa fa-xxx) - extract just the icon name
    'home': 'Home',
    'shopping-cart': 'ShoppingBasket',
    'truck': 'Truck',
    'file': 'FileText',
    'file-text': 'FileText',
    'folder': 'FileText',
    'user': 'User',
    'cog': 'Wrench',
    'cogs': 'Wrench',
    'wrench': 'Wrench',
    'bar-chart': 'FileBarChart',
    'pie-chart': 'FilePieChart',
    'line-chart': 'FileLineChart',
    'building': 'Building',
    'money': 'ArrowUpRight',
    'credit-card': 'ArrowUpRight',
    'calendar': 'Calendar',
    'check': 'CheckCircle',
    'check-square': 'CheckSquare',
    'star': 'Activity',
    'list': 'FileText',
    'tasks': 'CheckSquare',
    'inbox': 'Mail',
    'envelope': 'Mail',
    'shield': 'Shield',
    'industry': 'Factory',
    'cube': 'Package',
    'cubes': 'Package',
    'archive': 'Package',
    'database': 'Package',
    'sitemap': 'Activity',
    'map-marker': 'MapPin',
    'map': 'Map',
    'leaf': 'Leaf',
    'tree': 'Trees',
    'seedling': 'Sprout',

    // Default
    'default': 'FileText',
};

// Icon map for dynamic icon resolution
export const IconMap = {
    // Sidebar icons
    LayoutDashboard,
    CheckSquare,
    Trees,
    Factory,
    Bug,
    Sprout,
    CalendarDays,
    CalendarRange,
    Calendar,
    FileBarChart,
    FileLineChart,
    FilePieChart,
    Building,
    Building2,
    Group,
    Tractor,
    MapPin,
    Map,
    Package,
    Droplets,
    Wrench,
    // Common UI icons
    FileText,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Plus,
    X,
    Trash2,
    Save,
    ArrowLeft,
    ArrowRight,
    Search,
    Filter,
    Loader2,
    RefreshCw,
    AlertTriangle,
    AlertCircle,
    CheckCircle,
    XCircle,
    Info,
    Home,
    Bell,
    User,
    LogOut,
    Mail,
    Shield,
    ShieldAlert,
    Moon,
    Sun,
    Clipboard,
    Send,
    Ban,
    RotateCcw,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    Users,
    Recycle,
    ArrowDownCircle,
    Truck,
    MousePointerClick,
    Scissors,
    Leaf,
    Hammer,
    Wind,
    ShoppingBasket,
    ShoppingCart,
    ArrowUp,
    // Bếp ăn icons
    Carrot,
    UtensilsCrossed,
    ChefHat,
    ClipboardList,
    BookOpenText,
    Box,
    // Workspace-specific icons
    BarChart3,
    Target,
    ClipboardCheck,
    UserCog,
    Globe,
    Settings,
    Receipt,
    Handshake,
    FolderKanban,
    LifeBuoy,
    TrendingUp,
    Warehouse,
    Award,
    Blocks,
    Contact,
    Banknote,
};

/**
 * Get icon component by name
 * Supports both Lucide icon names and ERPNext icon formats
 *
 * @param {string} name - Icon name (e.g., "FileText", "buying", "fa fa-home")
 * @param {React.ComponentType} [fallback] - Fallback icon if not found
 * @returns {React.ComponentType}
 */
export const getIcon = (name, fallback = FileText) => {
    if (!name) return fallback;

    // 1. Try direct match in IconMap (Lucide icon names)
    if (IconMap[name]) {
        return IconMap[name];
    }

    // 2. Try lowercase match in ERPNextIconMap
    const lowerName = name.toLowerCase();
    const mappedName = ERPNextIconMap[lowerName];
    if (mappedName && IconMap[mappedName]) {
        return IconMap[mappedName];
    }

    // 2.5 Check for dashboard-like names (substring match)
    if (lowerName.includes('dashboard')) {
        return IconMap['LayoutDashboard'] || fallback;
    }

    // 3. Try to extract icon name from FontAwesome format (fa fa-xxx)
    if (name.includes('fa-')) {
        const faMatch = name.match(/fa[sb]?\s+fa-([a-z-]+)/i);
        if (faMatch) {
            const faIconName = faMatch[1];
            const faMapped = ERPNextIconMap[faIconName];
            if (faMapped && IconMap[faMapped]) {
                return IconMap[faMapped];
            }
        }
    }

    // 4. Try to extract icon name from Octicon format (octicon octicon-xxx)
    if (name.includes('octicon-')) {
        const octiMatch = name.match(/octicon-([a-z-]+)/i);
        if (octiMatch) {
            const octiIconName = octiMatch[1];
            const octiMapped = ERPNextIconMap[octiIconName];
            if (octiMapped && IconMap[octiMapped]) {
                return IconMap[octiMapped];
            }
        }
    }

    return fallback;
};

export default IconMap;
