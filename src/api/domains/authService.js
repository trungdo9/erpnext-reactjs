/**
 * Auth Service
 *
 * Handles authentication, session management, and user data.
 */

import { apiClient, cacheManager } from '../gateway';

/**
 * Auth Service class
 */
class AuthServiceClass {
    constructor() {
        this.currentUser = null;
        this.sessionChecked = false;
    }

    /**
     * Login with username and password
     * @param {string} username
     * @param {string} password
     * @returns {Promise<object>}
     */
    async login(username, password) {
        const result = await apiClient.login(username, password);

        // Get user details after login
        if (result) {
            this.currentUser = await this.getCurrentUser();
        }

        return this.currentUser;
    }

    /**
     * Logout current user
     */
    async logout() {
        await apiClient.logout();
        this.currentUser = null;
        this.sessionChecked = false;

        // Clear all caches on logout
        cacheManager.clear();
    }

    /**
     * Get current logged in user
     * @returns {Promise<object|null>}
     */
    async getCurrentUser() {
        try {
            const username = await apiClient.getCurrentUser();

            if (!username || username === 'Guest') {
                this.currentUser = null;
                return null;
            }

            // Get full user details
            const userDoc = await apiClient.getDoc('User', username);

            this.currentUser = this.transformUser(userDoc);
            this.sessionChecked = true;

            return this.currentUser;
        } catch {
            this.currentUser = null;
            this.sessionChecked = true;
            return null;
        }
    }

    /**
     * Check if user is authenticated
     * @returns {Promise<boolean>}
     */
    async isAuthenticated() {
        if (!this.sessionChecked) {
            await this.getCurrentUser();
        }
        return this.currentUser !== null;
    }

    /**
     * Check session validity
     * @returns {Promise<boolean>}
     */
    async checkSession() {
        try {
            const user = await this.getCurrentUser();
            return user !== null;
        } catch {
            return false;
        }
    }

    /**
     * Get user roles
     * @returns {Promise<Array<string>>}
     */
    async getRoles() {
        if (!this.currentUser) {
            await this.getCurrentUser();
        }
        return this.currentUser?.roles || [];
    }

    /**
     * Check if user has a specific role
     * @param {string} role
     * @returns {Promise<boolean>}
     */
    async hasRole(role) {
        const roles = await this.getRoles();
        return roles.includes(role);
    }

    /**
     * Check if user has any of the specified roles
     * @param {Array<string>} roles
     * @returns {Promise<boolean>}
     */
    async hasAnyRole(roles) {
        const userRoles = await this.getRoles();
        return roles.some(r => userRoles.includes(r));
    }

    /**
     * Check if user has all of the specified roles
     * @param {Array<string>} roles
     * @returns {Promise<boolean>}
     */
    async hasAllRoles(roles) {
        const userRoles = await this.getRoles();
        return roles.every(r => userRoles.includes(r));
    }

    /**
     * Get user permissions for a doctype
     * Uses resource probe method - tries to access the resource to check permission
     * @param {string} doctype
     * @returns {Promise<object>}
     */
    async getPermissions(doctype) {
        const cacheKey = `perms:${doctype}`;
        const cached = cacheManager.get(cacheKey);
        if (cached) return cached;

        // Full permissions for Administrator or System Manager
        const fullPermissions = {
            read: true, write: true, create: true, delete: true,
            submit: true, cancel: true, report: true, export: true, import: true,
        };

        // No permissions
        const noPermissions = {
            read: false, write: false, create: false, delete: false,
            submit: false, cancel: false, report: false, export: false, import: false,
        };

        try {
            // Check if user is admin - grant full permissions
            const isAdmin = this.currentUser?.email === 'Administrator' ||
                           this.currentUser?.name === 'Administrator' ||
                           this.currentUser?.roles?.includes('Administrator') ||
                           this.currentUser?.roles?.includes('System Manager');

            if (isAdmin) {
                cacheManager.set(cacheKey, fullPermissions, 10 * 60 * 1000);
                return fullPermissions;
            }

            // Simple GET probe - no CSRF needed, no gateway retry
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(
                `/api/resource/${encodeURIComponent(doctype)}?limit_page_length=1&fields=["name"]`,
                { method: 'GET', credentials: 'include', signal: controller.signal }
            );
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error('No access');

            // If we get here without error, user has read access
            const permissions = {
                read: true,
                write: true,
                create: true,
                delete: false, // Conservative - don't assume delete
                submit: false,
                cancel: false,
                report: true,
                export: true,
                import: false,
            };
            cacheManager.set(cacheKey, permissions, 10 * 60 * 1000);
            return permissions;

        } catch (error) {
            console.warn(`[AuthService] Failed to check permissions for ${doctype}:`, error);
            return noPermissions;
        }
    }

    /**
     * Check if user can perform action on doctype
     * @param {string} doctype
     * @param {string} action - 'read', 'write', 'create', 'delete', 'submit', 'cancel'
     * @returns {Promise<boolean>}
     */
    async canPerform(doctype, action) {
        const perms = await this.getPermissions(doctype);
        return !!perms[action];
    }

    /**
     * Update current user profile
     * @param {object} data
     * @returns {Promise<object>}
     */
    async updateProfile(data) {
        if (!this.currentUser) {
            throw new Error('No user logged in');
        }

        await apiClient.updateDoc('User', this.currentUser.email, data);

        // Refresh user data
        return this.getCurrentUser();
    }

    /**
     * Change password
     * @param {string} oldPassword
     * @param {string} newPassword
     * @returns {Promise<void>}
     */
    async changePassword(oldPassword, newPassword) {
        await apiClient.post('frappe.core.doctype.user.user.update_password', {
            old_password: oldPassword,
            new_password: newPassword,
        });
    }

    /**
     * Request password reset
     * @param {string} email
     * @returns {Promise<void>}
     */
    async requestPasswordReset(email) {
        await apiClient.post('frappe.core.doctype.user.user.reset_password', {
            user: email,
        });
    }

    /**
     * Lookup employee for self-registration (guest context)
     * @param {string} employeeId
     * @returns {Promise<object>} {ok, employee_name} or {ok: false, error}
     */
    async lookupEmployeeForRegistration(employeeId) {
        const response = await fetch('/api/method/frappe.handler.not_implemented', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ employee_id: employeeId }),
        });
        const data = await response.json();
        return data.message || data;
    }

    /**
     * Register employee account (guest context)
     * @param {string} employeeId
     * @param {string} password
     * @returns {Promise<object>} {ok, user, employee_name} or {ok: false, error}
     */
    async registerEmployeeAccount(employeeId, password) {
        const response = await fetch('/api/method/frappe.handler.not_implemented', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ employee_id: employeeId, password }),
        });
        const data = await response.json();
        return data.message || data;
    }

    /**
     * Transform user document to clean format
     */
    transformUser(userDoc) {
        if (!userDoc) return null;

        return {
            name: userDoc.name,
            email: userDoc.email || userDoc.name,
            fullName: userDoc.full_name,
            firstName: userDoc.first_name,
            lastName: userDoc.last_name,
            username: userDoc.username,
            avatar: userDoc.user_image,
            language: userDoc.language,
            timeZone: userDoc.time_zone,
            enabled: !!userDoc.enabled,
            roles: (userDoc.roles || []).map(r => r.role),
            userType: userDoc.user_type,
            lastLogin: userDoc.last_login,
            lastActive: userDoc.last_active,

            // Additional user info
            bio: userDoc.bio,
            phone: userDoc.phone,
            mobile: userDoc.mobile_no,
            location: userDoc.location,
            gender: userDoc.gender,
            birthDate: userDoc.birth_date,

            // Preferences
            defaults: userDoc.__defaults || {},
        };
    }

    /**
     * Get cached current user without API call
     */
    getCachedUser() {
        return this.currentUser;
    }
}

// Export singleton
export const AuthService = new AuthServiceClass();
export default AuthService;
