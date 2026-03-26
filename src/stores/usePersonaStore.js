/**
 * Persona Store - Zustand
 *
 * Manages user persona detection and adaptive UI configuration.
 * 3 tiers: worker (công nhân/tổ trưởng) | manager (quản lý) | executive (giám đốc)
 *
 * Usage:
 * import { usePersonaStore } from '@/stores';
 * const { persona, features, isWorker, isManager, isExecutive } = usePersonaStore();
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Map ERPNext roles to personas.
 * Highest-privilege persona wins (executive > manager > worker).
 */
const ROLE_PERSONA_MAP = {
    // Executive roles
    Director: 'executive',
    'General Manager': 'executive',
    CEO: 'executive',
    CFO: 'executive',
    COO: 'executive',
    'Managing Director': 'executive',

    // Manager roles
    'Quan Ly': 'manager',
    'Ke Toan': 'manager',
    'Ke Hoach': 'manager',
    'HR Manager': 'manager',
    'Production Manager': 'manager',
    'Warehouse Manager': 'manager',
    'Quality Manager': 'manager',
    'System Manager': 'manager',
    Administrator: 'manager',

    // Worker roles (default for field/floor staff)
    'Cong Nhan': 'worker',
    'Nhan Vien Can': 'worker',        // Nhân viên cân
    'Nhan Vien Kho': 'worker',        // Nhân viên kho
    'To Truong San Xuat': 'worker',   // Tổ trưởng sản xuất
    'Nhan Vien': 'worker',
    Employee: 'worker',
};

/**
 * Feature flags per persona
 */
const PERSONA_FEATURES = {
    worker: {
        // UI
        simplifiedNavigation: true,
        bigButtons: true,
        iconFirst: true,
        soundFeedback: true,
        hapticFeedback: true,
        maxFieldsPerScreen: 7,
        touchTargetSize: 56, // px

        // Features
        quickEntry: true,
        camera: true,
        qrScanner: true,
        gpsAutoFill: true,
        offlineMode: true,
        voiceInput: false, // future

        // Disabled for workers
        bulkActions: false,
        reports: false,
        advancedFilters: false,
        exportData: false,
        adminPanel: false,
        keyboardShortcuts: false,
        multiTab: false,

        // Dashboard
        dashboardType: 'simple', // simple task list
        showCharts: false,
        showKPIs: false,
    },

    manager: {
        // UI
        simplifiedNavigation: false,
        bigButtons: false,
        iconFirst: false,
        soundFeedback: false,
        hapticFeedback: false,
        maxFieldsPerScreen: 999,
        touchTargetSize: 44, // px

        // Features
        quickEntry: true,
        camera: true,
        qrScanner: true,
        gpsAutoFill: false,
        offlineMode: true,
        voiceInput: false,

        // Full features
        bulkActions: true,
        reports: true,
        advancedFilters: true,
        exportData: true,
        adminPanel: true,
        keyboardShortcuts: true,
        multiTab: true,

        // Dashboard
        dashboardType: 'full', // full dashboard with charts
        showCharts: true,
        showKPIs: true,
    },

    executive: {
        // UI
        simplifiedNavigation: false,
        bigButtons: false,
        iconFirst: false,
        soundFeedback: false,
        hapticFeedback: false,
        maxFieldsPerScreen: 999,
        touchTargetSize: 44, // px

        // Features
        quickEntry: false,
        camera: false,
        qrScanner: false,
        gpsAutoFill: false,
        offlineMode: false,
        voiceInput: false,

        // Selective features
        bulkActions: false,
        reports: true,
        advancedFilters: false,
        exportData: true,
        adminPanel: false,
        keyboardShortcuts: true,
        multiTab: true,

        // Dashboard
        dashboardType: 'executive', // KPI-focused
        showCharts: true,
        showKPIs: true,

        // Executive-only
        approvals: true,
        drillDown: true,
        alerts: true,
        comparisons: true,
        forwardReports: true,
    },
};

/**
 * Detect persona from ERPNext user roles
 */
const detectPersona = (roles = []) => {
    if (!roles || roles.length === 0) return 'worker'; // default

    const priority = { executive: 3, manager: 2, worker: 1 };
    let detected = 'worker';

    for (const role of roles) {
        const persona = ROLE_PERSONA_MAP[role];
        if (persona && priority[persona] > priority[detected]) {
            detected = persona;
        }
    }

    return detected;
};

const usePersonaStore = create(
    persist(
        (set, get) => ({
            // State
            persona: 'worker', // 'worker' | 'manager' | 'executive'
            features: PERSONA_FEATURES.worker,
            manualOverride: null, // Allow manual persona selection
            roles: [],

            // Computed
            get isWorker() {
                return get().persona === 'worker';
            },
            get isManager() {
                return get().persona === 'manager';
            },
            get isExecutive() {
                return get().persona === 'executive';
            },

            // Actions
            detectFromRoles: (roles) => {
                const override = get().manualOverride;
                const detected = override || detectPersona(roles);
                set({
                    persona: detected,
                    features: PERSONA_FEATURES[detected],
                    roles,
                });
            },

            setPersona: (persona) => {
                if (!PERSONA_FEATURES[persona]) return;
                set({
                    persona,
                    features: PERSONA_FEATURES[persona],
                    manualOverride: persona,
                });
            },

            clearOverride: () => {
                const detected = detectPersona(get().roles);
                set({
                    persona: detected,
                    features: PERSONA_FEATURES[detected],
                    manualOverride: null,
                });
            },

            // Feature check helpers
            hasFeature: (featureName) => {
                return get().features[featureName] === true;
            },

            getFeatureValue: (featureName) => {
                return get().features[featureName];
            },

            reset: () =>
                set({
                    persona: 'worker',
                    features: PERSONA_FEATURES.worker,
                    manualOverride: null,
                    roles: [],
                }),
        }),
        {
            name: 'persona-storage',
            partialize: (state) => ({
                manualOverride: state.manualOverride,
            }),
        }
    )
);

export { ROLE_PERSONA_MAP, PERSONA_FEATURES, detectPersona };
export default usePersonaStore;
