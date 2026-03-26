/**
 * API Layer Type Definitions
 *
 * Defines contracts between frontend and API gateway.
 * These types are decoupled from Frappe/ERPNext internals.
 */

// =============================================================================
// Generic Types
// =============================================================================

/**
 * Paginated list response
 */
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page?: number;
    pageSize?: number;
    hasMore?: boolean;
}

/**
 * Bulk operation result
 */
export interface BulkOperationResult<T> {
    results: Array<{ success: true; data: T } | { success: true; name: string }>;
    errors: Array<{ success: false; error: string; item?: unknown; name?: string }>;
    total: number;
    successful: number;
}

/**
 * API Error
 */
export interface ApiErrorResponse {
    code: string;
    message: string;
    httpStatus: number;
    details?: Record<string, unknown>;
    validationErrors?: ValidationError[];
}

/**
 * Validation error
 */
export interface ValidationError {
    field: string;
    message: string;
    code?: string;
}

// =============================================================================
// List Options
// =============================================================================

/**
 * Options for list queries
 */
export interface ListOptions {
    fields?: string[];
    filters?: Filter[];
    orderBy?: string;
    limit?: number;
    start?: number;
    useCache?: boolean;
}

/**
 * Filter definition
 */
export type Filter = [string, FilterOperator, FilterValue];

/**
 * Filter operators
 */
export type FilterOperator =
    | '='
    | '!='
    | '>'
    | '>='
    | '<'
    | '<='
    | 'like'
    | 'not like'
    | 'in'
    | 'not in'
    | 'between'
    | 'is';

/**
 * Filter value types
 */
export type FilterValue = string | number | boolean | null | string[] | number[];

// =============================================================================
// Document Types
// =============================================================================

/**
 * Base document interface
 */
export interface BaseDocument {
    name: string;
    doctype?: string;
    creation?: string;
    modified?: string;
    owner?: string;
    modified_by?: string;
    docstatus?: 0 | 1 | 2;
}

/**
 * Document with standard fields
 */
export interface Document extends BaseDocument {
    [key: string]: unknown;
}

// =============================================================================
// Metadata Types
// =============================================================================

/**
 * DocType metadata
 */
export interface DocTypeMeta {
    name: string;
    doctype: string;
    module: string;
    title_field?: string;
    image_field?: string;
    search_fields: string[];
    sort_field: string;
    sort_order: 'asc' | 'desc';

    // Flags
    is_submittable: boolean;
    is_single: boolean;
    is_tree: boolean;
    is_child_table: boolean;
    quick_entry: boolean;
    track_changes: boolean;
    allow_rename: boolean;

    // Workflow
    workflow: boolean;
    workflow_state_field?: string;

    // Naming
    autoname?: string;

    // Fields
    fields: FieldMeta[];
}

/**
 * Field metadata
 */
export interface FieldMeta {
    name: string;
    fieldname: string;
    label: string;
    fieldtype: FieldType;
    uiType: UIFieldType;

    // Options
    options?: string;
    default?: string | number | boolean;

    // Validation
    required: boolean;
    unique: boolean;
    readOnly: boolean;
    hidden: boolean;

    // Link field
    linkDoctype?: string;
    linkFilters?: Record<string, unknown>;

    // Select options
    selectOptions: string[];

    // Table
    childDoctype?: string;

    // Layout
    inListView: boolean;
    inStandardFilter: boolean;
    inGlobalSearch: boolean;

    // Display
    description?: string;
    placeholder?: string;
    columns?: number;
    precision?: number;

    // Conditional
    depends_on?: string;
    mandatory_depends_on?: string;
    read_only_depends_on?: string;
}

/**
 * Frappe field types
 */
export type FieldType =
    | 'Data'
    | 'Text'
    | 'Small Text'
    | 'Long Text'
    | 'Text Editor'
    | 'Code'
    | 'Password'
    | 'Int'
    | 'Float'
    | 'Currency'
    | 'Percent'
    | 'Date'
    | 'Datetime'
    | 'Time'
    | 'Select'
    | 'Link'
    | 'Dynamic Link'
    | 'Check'
    | 'Attach'
    | 'Attach Image'
    | 'Table'
    | 'Table MultiSelect'
    | 'HTML'
    | 'Read Only'
    | 'Signature'
    | 'Color'
    | 'Rating'
    | 'Geolocation'
    | 'Duration'
    | 'Phone'
    | 'Section Break'
    | 'Column Break'
    | 'Tab Break';

/**
 * UI field types (mapped from Frappe types)
 */
export type UIFieldType =
    | 'text'
    | 'textarea'
    | 'richtext'
    | 'code'
    | 'password'
    | 'integer'
    | 'decimal'
    | 'currency'
    | 'percent'
    | 'date'
    | 'datetime'
    | 'time'
    | 'select'
    | 'link'
    | 'dynamiclink'
    | 'checkbox'
    | 'file'
    | 'image'
    | 'table'
    | 'multiselect'
    | 'html'
    | 'readonly'
    | 'signature'
    | 'color'
    | 'rating'
    | 'geolocation'
    | 'duration'
    | 'phone'
    | 'section'
    | 'column'
    | 'tab';

// =============================================================================
// Auth Types
// =============================================================================

/**
 * User data
 */
export interface User {
    name: string;
    email: string;
    fullName: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    avatar?: string;
    language?: string;
    timeZone?: string;
    enabled: boolean;
    roles: string[];
    userType?: string;
    lastLogin?: string;
    lastActive?: string;
}

/**
 * User permissions for a doctype
 */
export interface DocTypePermissions {
    read: boolean;
    write: boolean;
    create: boolean;
    delete: boolean;
    submit: boolean;
    cancel: boolean;
    report: boolean;
    export: boolean;
    import: boolean;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
    username: string;
    password: string;
}

// =============================================================================
// Workflow Types
// =============================================================================

/**
 * Workflow transition
 */
export interface WorkflowTransition {
    action: string;
    nextState: string;
    allowed: boolean;
    doc_status?: number;
}

/**
 * Workflow history entry
 */
export interface WorkflowHistoryEntry {
    date: string;
    fromState?: string;
    toState: string;
    action: string;
    user: string;
    comment?: string;
}

// =============================================================================
// Search Types
// =============================================================================

/**
 * Link search result
 */
export interface LinkSearchResult {
    value: string;
    label: string;
    description?: string;
}

/**
 * Search options
 */
export interface SearchOptions {
    limit?: number;
    filters?: Filter[];
    reference_doctype?: string;
    useCache?: boolean;
}

// =============================================================================
// File Types
// =============================================================================

/**
 * Uploaded file info
 */
export interface FileInfo {
    name: string;
    url: string;
    fileName: string;
    fileSize?: number;
    isPrivate: boolean;
    contentType?: string;
}

/**
 * File upload options
 */
export interface FileUploadOptions {
    doctype?: string;
    docname?: string;
    fieldname?: string;
    isPrivate?: boolean;
    folder?: string;
}

/**
 * File validation options
 */
export interface FileValidationOptions {
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
}

// =============================================================================
// Production Domain Types
// =============================================================================

/**
 * Production status
 */
export type ProductionStatus =
    | 'Draft'
    | 'Pending'
    | 'In Progress'
    | 'Completed'
    | 'Cancelled';

/**
 * Work order record
 */
export interface WorkOrderRecord {
    id: string;
    name: string;
    productionItem: string;
    itemName: string;
    status: ProductionStatus;
    qty: number;
    producedQty: number;
    plannedStartDate: string;
    expectedDeliveryDate?: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * Job card record
 */
export interface JobCardRecord {
    id: string;
    name: string;
    workOrder: string;
    operation: string;
    workstation: string;
    status: ProductionStatus;
    forQuantity: number;
    totalCompletedQty: number;
    postingDate: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * Production dashboard stats
 */
export interface ProductionDashboardStats {
    workOrders: TaskStats;
    overall: TaskStats;
}

/**
 * Task statistics
 */
export interface TaskStats {
    total: number;
    completed: number;
    pending: number;
    completionRate: number;
}

// =============================================================================
// Inventory Domain Types
// =============================================================================

/**
 * Stock entry types
 */
export type StockEntryType =
    | 'Material Receipt'
    | 'Material Issue'
    | 'Material Transfer'
    | 'Manufacture'
    | 'Repack'
    | 'Stock Adjustment';

/**
 * Inventory item
 */
export interface InventoryItem {
    id: string;
    code: string;
    name: string;
    group: string;
    uom: string;
    isStockItem: boolean;
    image?: string;
    description?: string;
    barcode?: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * Stock balance
 */
export interface StockBalance {
    itemCode: string;
    warehouses: WarehouseStock[];
    totalQty: number;
    totalAvailable: number;
}

/**
 * Stock in a warehouse
 */
export interface WarehouseStock {
    warehouse: string;
    actualQty: number;
    plannedQty: number;
    reservedQty: number;
    orderedQty: number;
    availableQty: number;
}

/**
 * Stock entry data
 */
export interface StockEntryData {
    type: StockEntryType;
    date?: string;
    time?: string;
    fromWarehouse?: string;
    toWarehouse?: string;
    remarks?: string;
    items: StockEntryItem[];
}

/**
 * Stock entry item
 */
export interface StockEntryItem {
    itemCode: string;
    qty: number;
    rate?: number;
    sourceWarehouse?: string;
    targetWarehouse?: string;
}

// =============================================================================
// Cache Types
// =============================================================================

/**
 * Cache configuration
 */
export interface CacheConfig {
    maxSize?: number;
    defaultTTL?: number;
    persistKey?: string;
}

/**
 * Cache statistics
 */
export interface CacheStats {
    hits: number;
    misses: number;
    sets: number;
    invalidations: number;
    size: number;
    hitRate: number;
}

// =============================================================================
// Request Queue Types
// =============================================================================

/**
 * Queued request
 */
export interface QueuedRequest {
    id: string;
    timestamp: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    retries: number;
    method?: string;
    endpoint?: string;
    data?: unknown;
    lastError?: string;
}

/**
 * Queue event types
 */
export type QueueEvent =
    | 'enqueue'
    | 'dequeue'
    | 'online'
    | 'offline'
    | 'processing:start'
    | 'processing:end'
    | 'success'
    | 'failed'
    | 'clear';
