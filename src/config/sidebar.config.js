/**
 * Sidebar Configuration - Steel Manufacturing ERP
 *
 * Fallback config used when ERPNext API is unavailable.
 * Routes map to steel production workflow pages.
 */

export const SIDEBAR_CONFIG = [
    {
        id: "dashboard",
        label: "Tổng quan",
        type: "group",
        items: [
            {
                id: "main-dashboard",
                type: "page",
                label: "Dashboard",
                page: "main-dashboard",
                icon: "LayoutDashboard"
            }
        ]
    },
    {
        id: "production",
        label: "Sản xuất",
        type: "group",
        items: [
            { id: "nhap-cuon", type: "page", label: "Nhập cuộn", page: "nhap-cuon", icon: "Package" },
            { id: "xa-bang", type: "page", label: "Xả băng", page: "xa-bang", icon: "Scissors" },
            { id: "cat-tam", type: "page", label: "Cắt tấm", page: "cat-tam", icon: "LayoutGrid" }
        ]
    },
    {
        id: "sales",
        label: "Kinh doanh",
        type: "group",
        items: [
            { id: "khach-hang", type: "page", label: "Khách hàng", page: "khach-hang", icon: "Users" },
            { id: "bao-gia", type: "page", label: "Báo giá", page: "bao-gia", icon: "FileText" },
            { id: "ban-hang", type: "page", label: "Đơn hàng", page: "ban-hang", icon: "ShoppingCart" },
            { id: "giao-hang", type: "page", label: "Giao hàng", page: "giao-hang", icon: "Truck" }
        ]
    },
    {
        id: "tracking",
        label: "Theo dõi",
        type: "group",
        items: [
            { id: "theo-doi-batch", type: "page", label: "Theo dõi Batch", page: "theo-doi-batch", icon: "Search" },
            { id: "ton-kho", type: "page", label: "Tồn kho", page: "ton-kho", icon: "Warehouse" },
            { id: "bao-cao-san-xuat", type: "page", label: "Báo cáo SX", page: "bao-cao-san-xuat", icon: "BarChart3" }
        ]
    }
];
