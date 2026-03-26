/**
 * Application Configuration
 *
 * Contains app-wide settings that may change between environments.
 * Move to environment variables if needed for different deployments.
 */

export const APP_CONFIG = {
    // Application info
    name: 'Steel ERP - Quản lý Thép',
    description: 'Hệ thống quản lý kinh doanh thép - Steel ERP',

    // Admin contact for password reset, support, etc.
    admin: {
        name: 'Nguyễn Trọng Triệu',
        title: 'Quản trị viên hệ thống',
        email: 'nguyentrongtrieu@thagrico.com.vn',
        zalo: 'Steel ERP Support',
    },

    // Company info
    company: {
        name: 'Thagrico',
        domain: 'thagrico.com.vn',
    },
};

export default APP_CONFIG;
