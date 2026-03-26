/**
 * Global Type Definitions
 *
 * Central location for shared types across the ERP application.
 */

// ============================================
// Frappe/ERPNext Types
// ============================================

/**
 * Frappe Document base type
 */
export interface FrappeDoc {
    name: string;
    doctype: string;
    docstatus?: 0 | 1 | 2; // 0=Draft, 1=Submitted, 2=Cancelled
    owner?: string;
    creation?: string;
    modified?: string;
    modified_by?: string;
}

/**
 * Frappe Field Definition
 */
export interface FrappeField {
    fieldname: string;
    fieldtype: FrappeFieldtype;
    label?: string;
    options?: string;
    reqd?: 0 | 1;
    read_only?: 0 | 1;
    hidden?: 0 | 1;
    default?: string | number;
    description?: string;
    depends_on?: string;
    mandatory_depends_on?: string;
    read_only_depends_on?: string;
    in_list_view?: 0 | 1;
    in_standard_filter?: 0 | 1;
    columns?: number;
    length?: number;
    precision?: number;
}

/**
 * Frappe Fieldtypes
 */
export type FrappeFieldtype =
    | 'Data'
    | 'Text'
    | 'Long Text'
    | 'Text Editor'
    | 'HTML Editor'
    | 'Markdown Editor'
    | 'Code'
    | 'Int'
    | 'Float'
    | 'Currency'
    | 'Percent'
    | 'Check'
    | 'Select'
    | 'Link'
    | 'Dynamic Link'
    | 'Table'
    | 'Table MultiSelect'
    | 'Date'
    | 'Datetime'
    | 'Time'
    | 'Duration'
    | 'Attach'
    | 'Attach Image'
    | 'Signature'
    | 'Color'
    | 'Geolocation'
    | 'Password'
    | 'Read Only'
    | 'Section Break'
    | 'Column Break'
    | 'Tab Break'
    | 'HTML'
    | 'Heading'
    | 'Button'
    | 'Barcode'
    | 'Rating'
    | 'Small Text'
    | 'Phone'
    | 'Autocomplete'
    | 'JSON';

/**
 * DocType Metadata
 */
export interface DocTypeMeta {
    name: string;
    module?: string;
    fields: FrappeField[];
    permissions?: DocTypePermission[];
    is_submittable?: 0 | 1;
    is_tree?: 0 | 1;
    track_changes?: 0 | 1;
    allow_import?: 0 | 1;
}

/**
 * DocType Permission
 */
export interface DocTypePermission {
    role: string;
    read?: 0 | 1;
    write?: 0 | 1;
    create?: 0 | 1;
    delete?: 0 | 1;
    submit?: 0 | 1;
    cancel?: 0 | 1;
    amend?: 0 | 1;
    report?: 0 | 1;
    import?: 0 | 1;
    export?: 0 | 1;
    print?: 0 | 1;
    email?: 0 | 1;
    share?: 0 | 1;
}

// ============================================
// API Types
// ============================================

/**
 * API Error Response
 */
export interface ApiError {
    message: string;
    exc_type?: string;
    exc?: string;
    _error_message?: string;
    httpStatus?: number;
    code?: string;
}

/**
 * API List Response
 */
export interface ListResponse<T = FrappeDoc> {
    data: T[];
    total_count?: number;
}

/**
 * API Filter
 */
export type ApiFilter = [string, string, unknown] | [string, unknown];

/**
 * List Query Options
 */
export interface ListQueryOptions {
    doctype: string;
    fields?: string[];
    filters?: ApiFilter[];
    order_by?: string;
    limit_start?: number;
    limit_page_length?: number;
}

// ============================================
// UI Types
// ============================================

/**
 * Toast notification
 */
export interface Toast {
    id: number;
    title: string;
    description?: string;
    type: 'default' | 'success' | 'error' | 'warning' | 'info';
    duration?: number;
}

/**
 * Table column definition
 */
export interface TableColumn {
    fieldname: string;
    label: string;
    width?: string | number;
    sortable?: boolean;
    render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

/**
 * Form validation error
 */
export interface ValidationError {
    field: string;
    message: string;
}

// ============================================
// Auth Types
// ============================================

/**
 * User
 */
export interface User {
    name: string;
    email: string;
    full_name?: string;
    user_image?: string;
    roles?: string[];
    language?: string;
}

/**
 * Auth State
 */
export interface AuthState {
    currentUser: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: Error | null;
}

// ============================================
// Form Types
// ============================================

/**
 * Form State
 */
export interface FormState<T = Record<string, unknown>> {
    data: T;
    originalData: T;
    isDirty: boolean;
    errors: Record<string, string>;
    isLoading: boolean;
    isSubmitting: boolean;
}

/**
 * Form Field Props
 */
export interface FieldProps {
    field: FrappeField;
    value: unknown;
    onChange: (fieldname: string, value: unknown) => void;
    disabled?: boolean;
    error?: string;
    formData?: Record<string, unknown>;
}

// ============================================
// Store Types
// ============================================

/**
 * UI Store State
 */
export interface UIState {
    sidebarOpen: boolean;
    isMobile: boolean;
    theme: 'light' | 'dark' | 'system';
    resolvedTheme: 'light' | 'dark';
    activeModal: string | null;
    modalData: unknown;
    globalLoading: boolean;
    loadingMessage: string;
}

/**
 * Form Draft
 */
export interface FormDraft {
    data: Record<string, unknown>;
    savedAt: number;
}

// ============================================
// Utility Types
// ============================================

/**
 * Make properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make properties required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Extract props from component
 */
export type PropsOf<T> = T extends React.ComponentType<infer P> ? P : never;
