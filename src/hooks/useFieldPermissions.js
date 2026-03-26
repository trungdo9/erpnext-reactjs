/**
 * useFieldPermissions Hook
 *
 * Provides role-based field visibility and read-only control.
 * This complements metadata-based visibility (depends_on) with
 * user role-based permissions.
 *
 * Features:
 * - Hide fields from certain roles
 * - Make fields read-only for certain roles
 * - Support for field-level permissions per doctype
 * - Integration with Frappe user roles
 */

import { useMemo } from 'react';
import { useAuth } from '../auth/useAuth';

/**
 * Field permission rules configuration
 *
 * Structure:
 * {
 *   [doctype]: {
 *     [fieldname]: {
 *       hidden: ['Role1', 'Role2'],  // Hide from these roles
 *       readOnly: ['Role3'],          // Read-only for these roles
 *       visibleTo: ['Role4'],         // Only visible to these roles (whitelist)
 *       editableBy: ['Role5'],        // Only editable by these roles (whitelist)
 *     }
 *   }
 * }
 */
const FIELD_PERMISSION_RULES = {
    // ===========================================
    // User Management
    // ===========================================
    'User': {
        'api_key': {
            visibleTo: ['System Manager', 'Administrator'],
        },
        'api_secret': {
            visibleTo: ['System Manager', 'Administrator'],
        },
        'roles': {
            editableBy: ['System Manager', 'Administrator'],
            readOnly: ['HR Manager', 'HR User'],
        },
    },

    // ===========================================
    // Work Management
    // ===========================================
    'Work Report': {
        // Approval fields - only managers can edit
        'approved_by': {
            editableBy: ['Production Manager', 'System Manager'],
            readOnly: ['Production User'],
        },
        'approval_date': {
            editableBy: ['Production Manager', 'System Manager'],
            readOnly: ['Production User'],
        },
        // Cost fields - visible to managers only
        'total_cost': {
            visibleTo: ['Production Manager', 'Accounts Manager', 'System Manager'],
        },
        'labor_cost': {
            visibleTo: ['Production Manager', 'Accounts Manager', 'System Manager'],
        },
    },

    'Purchase Request': {
        // Budget fields - managers only
        'budget_amount': {
            visibleTo: ['Purchase Manager', 'Accounts Manager', 'System Manager'],
        },
        'approved_amount': {
            editableBy: ['Purchase Manager', 'System Manager'],
        },
    },

    // ===========================================
    // Production - Cham Soc Buong
    // ===========================================
    'cat_bap': {
        'chi_phi': {
            visibleTo: ['Production Manager', 'Accounts Manager', 'System Manager'],
        },
    },
    'phun_buong': {
        'chi_phi': {
            visibleTo: ['Production Manager', 'Accounts Manager', 'System Manager'],
        },
        'loai_thuoc': {
            editableBy: ['Production Manager', 'System Manager'],
        },
    },
    'thu_hoach': {
        'san_luong': {
            readOnly: ['Production User'], // Auto-calculated
        },
        'chi_phi': {
            visibleTo: ['Production Manager', 'Accounts Manager', 'System Manager'],
        },
    },

    // ===========================================
    // Production - Xuong San Xuat
    // ===========================================
    'san_xuat': {
        'chi_phi_san_xuat': {
            visibleTo: ['Production Manager', 'Accounts Manager', 'System Manager'],
        },
        'hao_hut': {
            visibleTo: ['Production Manager', 'System Manager'],
        },
    },
    'nhap_kho': {
        'gia_nhap': {
            visibleTo: ['Warehouse Manager', 'Accounts Manager', 'System Manager'],
        },
    },
    'xuat_kho': {
        'gia_xuat': {
            visibleTo: ['Warehouse Manager', 'Accounts Manager', 'System Manager'],
        },
    },

    // ===========================================
    // Kiem Ke (Inventory/Pest Control)
    // ===========================================
    'bvtv': {
        'ghi_chu_kiem_tra': {
            editableBy: ['QC Manager', 'Production Manager', 'System Manager'],
        },
    },
    'fusarium': {
        'muc_do_nhiem': {
            editableBy: ['QC Manager', 'Production Manager', 'System Manager'],
        },
        'xu_ly': {
            editableBy: ['QC Manager', 'Production Manager', 'System Manager'],
        },
    },
};

/**
 * Check if user has any of the specified roles
 */
const hasAnyRole = (userRoles, requiredRoles) => {
    if (!userRoles || !requiredRoles || requiredRoles.length === 0) {
        return false;
    }
    return requiredRoles.some(role => userRoles.includes(role));
};

/**
 * Get permission status for a field based on user roles
 *
 * @param {Object} rule - Permission rule for the field
 * @param {string[]} userRoles - User's roles
 * @returns {Object} - { hidden, readOnly }
 */
const getFieldPermission = (rule, userRoles) => {
    if (!rule) {
        return { hidden: false, readOnly: false };
    }

    let hidden = false;
    let readOnly = false;

    // Check hidden (blacklist) - hide from these roles
    if (rule.hidden && hasAnyRole(userRoles, rule.hidden)) {
        hidden = true;
    }

    // Check visibleTo (whitelist) - only visible to these roles
    if (rule.visibleTo && rule.visibleTo.length > 0) {
        if (!hasAnyRole(userRoles, rule.visibleTo)) {
            hidden = true;
        }
    }

    // Check readOnly (blacklist) - read-only for these roles
    if (rule.readOnly && hasAnyRole(userRoles, rule.readOnly)) {
        readOnly = true;
    }

    // Check editableBy (whitelist) - only editable by these roles
    if (rule.editableBy && rule.editableBy.length > 0) {
        if (!hasAnyRole(userRoles, rule.editableBy)) {
            readOnly = true;
        }
    }

    return { hidden, readOnly };
};

/**
 * Main hook for field-level permissions
 *
 * @param {string} doctype - The DocType name
 * @param {Object} options - Configuration options
 * @returns {Object} - Permission checking methods and field lists
 */
export function useFieldPermissions(doctype, options = {}) {
    const { customRules = {} } = options;
    const { roles = [], isAuthenticated } = useAuth();

    // Merge default rules with custom rules
    const doctypeRules = useMemo(() => {
        const defaultRules = FIELD_PERMISSION_RULES[doctype] || {};
        const custom = customRules[doctype] || {};
        return { ...defaultRules, ...custom };
    }, [doctype, customRules]);

    /**
     * Check if a field should be hidden based on user roles
     */
    const isFieldHidden = useMemo(() => {
        return (fieldname) => {
            if (!isAuthenticated) return false;
            const rule = doctypeRules[fieldname];
            return getFieldPermission(rule, roles).hidden;
        };
    }, [doctypeRules, roles, isAuthenticated]);

    /**
     * Check if a field should be read-only based on user roles
     */
    const isFieldReadOnly = useMemo(() => {
        return (fieldname) => {
            if (!isAuthenticated) return false;
            const rule = doctypeRules[fieldname];
            return getFieldPermission(rule, roles).readOnly;
        };
    }, [doctypeRules, roles, isAuthenticated]);

    /**
     * Get all hidden fields for this doctype
     */
    const hiddenFields = useMemo(() => {
        if (!isAuthenticated) return [];

        return Object.entries(doctypeRules)
            .filter(([, rule]) => getFieldPermission(rule, roles).hidden)
            .map(([fieldname]) => fieldname);
    }, [doctypeRules, roles, isAuthenticated]);

    /**
     * Get all read-only fields for this doctype (by permission, not metadata)
     */
    const permissionReadOnlyFields = useMemo(() => {
        if (!isAuthenticated) return [];

        return Object.entries(doctypeRules)
            .filter(([, rule]) => getFieldPermission(rule, roles).readOnly)
            .map(([fieldname]) => fieldname);
    }, [doctypeRules, roles, isAuthenticated]);

    /**
     * Filter fields array to remove permission-hidden fields
     */
    const filterFields = useMemo(() => {
        return (fields) => {
            if (!isAuthenticated || !fields) return fields;

            return fields.filter(field => {
                const rule = doctypeRules[field.fieldname];
                return !getFieldPermission(rule, roles).hidden;
            });
        };
    }, [doctypeRules, roles, isAuthenticated]);

    /**
     * Check if current user has a specific role
     */
    const hasRole = useMemo(() => {
        return (role) => roles.includes(role);
    }, [roles]);

    /**
     * Check if current user has any of the specified roles
     */
    const hasAnyOfRoles = useMemo(() => {
        return (requiredRoles) => hasAnyRole(roles, requiredRoles);
    }, [roles]);

    return {
        // Field-level checks
        isFieldHidden,
        isFieldReadOnly,

        // Bulk lists
        hiddenFields,
        permissionReadOnlyFields,

        // Utility functions
        filterFields,
        hasRole,
        hasAnyOfRoles,

        // User info
        userRoles: roles,
        isAuthenticated,
    };
}

export default useFieldPermissions;
