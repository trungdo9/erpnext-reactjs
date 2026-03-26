/**
 * DocType Behaviors Configuration
 *
 * THIS FILE IS A RE-EXPORT SHIM.
 * All config has been split into sub-modules under src/config/doctype/.
 * Existing imports from '@/config/doctype.behaviors' continue to work.
 *
 * Sub-modules:
 *   - behaviors.js  — NUMBER_FORMAT, DOCTYPE_BEHAVIORS, tree/luong helpers
 *   - production.js — PRODUCTION_CONFIG (steel manufacturing)
 *   - vehicle.js    — VEHICLE_HUB_CONFIG
 *   - hr.js         — HR_CONFIG
 *   - crm.js        — CRM_CONFIG
 *   - handlers.js   — LINK_FIELD_FILTERS, FIELD_CHANGE_HANDLERS, etc.
 *   - workspace.js  — PAGE_WORKSPACE_MAP, WORKSPACE_ICONS, DOCTYPE_IMAGES, etc.
 */

export * from './doctype/index.js';

// Preserve default export for backward compatibility
export { default } from './doctype/behaviors.js';
