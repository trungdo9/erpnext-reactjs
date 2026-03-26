/* eslint-disable react-hooks/static-components -- dynamic component selection from field metadata registry */
import { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown } from 'lucide-react';
import { getFieldComponent, shouldSkipFieldtype, LAYOUT_FIELDTYPES, TreeLinkField, FilteredLinkField } from './fields';
import { FormSection, groupFieldsIntoSections } from './FormSection';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../hooks/useTranslation';
import { isFieldVisible, isTreeDoctype, hasLinkFieldFilter } from '../../config/doctype.behaviors';
import { safeEvaluateBoolean } from '../../utils/safeEval';

/**
 * Evaluate depends_on expression
 * Supports:
 * - Simple: doc.fieldname
 * - Equality: doc.fieldname == "value" or doc.fieldname === "value"
 * - Inequality: doc.fieldname != "value" or doc.fieldname !== "value"
 * - Array includes: ["value1", "value2"].includes(doc.fieldname)
 * - Negation: !doc.fieldname
 * - Combined with && or ||
 *
 * @param {string} expression - The depends_on expression
 * @param {Object} formData - Current form data (acts as 'doc')
 * @returns {boolean} - Whether the field should be visible
 */
function evaluateDependsOn(expression, formData) {
    if (!expression) return true;

    try {
        // Remove 'eval:' prefix if present
        let expr = expression.replace(/^eval:\s*/, '').trim();

        // Create a safe evaluation context
        // Replace doc.fieldname with actual values
        const doc = formData;

        // Handle array.includes(doc.field) pattern
        // e.g., ["Chich bup", "Phun buong"].includes(doc.loai_hoat_dong)
        const arrayIncludesMatch = expr.match(/\[(.*?)\]\.includes\(doc\.(\w+)\)/);
        if (arrayIncludesMatch) {
            const arrayStr = arrayIncludesMatch[1];
            const fieldName = arrayIncludesMatch[2];
            const fieldValue = doc[fieldName];
            // Parse array values (handle both "string" and 'string')
            const arrayValues = arrayStr.split(',').map(v =>
                v.trim().replace(/^["']|["']$/g, '')
            );
            return arrayValues.includes(fieldValue);
        }

        // Handle simple equality: doc.field == "value" or doc.field === "value"
        const equalityMatch = expr.match(/doc\.(\w+)\s*={2,3}\s*["'](.+?)["']/);
        if (equalityMatch) {
            const fieldName = equalityMatch[1];
            const expectedValue = equalityMatch[2];
            return doc[fieldName] === expectedValue;
        }

        // Handle inequality: doc.field != "value" or doc.field !== "value"
        const inequalityMatch = expr.match(/doc\.(\w+)\s*!={1,2}\s*["'](.+?)["']/);
        if (inequalityMatch) {
            const fieldName = inequalityMatch[1];
            const expectedValue = inequalityMatch[2];
            return doc[fieldName] !== expectedValue;
        }

        // Handle negation: !doc.field
        const negationMatch = expr.match(/^!doc\.(\w+)$/);
        if (negationMatch) {
            const fieldName = negationMatch[1];
            return !doc[fieldName];
        }

        // Handle simple truthy: doc.field
        const simpleMatch = expr.match(/^doc\.(\w+)$/);
        if (simpleMatch) {
            const fieldName = simpleMatch[1];
            return !!doc[fieldName];
        }

        // For complex expressions with AND/OR, use safe expression evaluator
        // This handles combinations like: doc.field1 && doc.field2 || doc.field3
        if (expr.includes('&&') || expr.includes('||')) {
            // Build variables object from doc references
            const variables = {};
            const fieldRefs = expr.match(/doc\.(\w+)/g) || [];
            for (const ref of fieldRefs) {
                const fieldName = ref.replace('doc.', '');
                variables[fieldName] = doc[fieldName];
            }

            // Replace doc.fieldname with just fieldname for expr-eval
            let evalExpr = expr.replace(/doc\./g, '');

            // Use safe expression evaluator (no code injection risk)
            return safeEvaluateBoolean(evalExpr, variables);
        }

        // Default to true if we can't parse
        return true;
    } catch (err) {
        console.warn('[FormRenderer] Failed to evaluate depends_on:', expression, err);
        return true; // Show field on error
    }
}

/**
 * Render a single field
 */
function FieldRenderer({
    field,
    formData,
    onChange,
    disabled,
    errors,
    childMetas,
    doctype,
    isNew,
    readOnlyFields,
    formulaFields,
}) {
    // Resolve field component outside of render (memoized to avoid re-creating during render)
    const FieldComponent = useMemo(() => {
        let Comp = getFieldComponent(field.fieldtype);
        if (field.fieldtype === 'Link' && field.options) {
            if (doctype && hasLinkFieldFilter(doctype, field.fieldname)) {
                Comp = FilteredLinkField;
            } else if (isTreeDoctype(field.options)) {
                Comp = TreeLinkField;
            }
        }
        return Comp;
    }, [field.fieldtype, field.options, field.fieldname, doctype]);

    if (!FieldComponent) {
        // Unknown fieldtype - render a warning in development
        if (import.meta.env.DEV) {
            return (
                <div className="col-span-1 md:col-span-2 p-3 bg-muted border border-border rounded-lg text-xs text-muted-foreground">
                    Unsupported fieldtype: <strong>{field.fieldtype}</strong> for field "{field.fieldname}"
                </div>
            );
        }
        return null;
    }

    // Get child meta for Table fields
    const childMeta = field.fieldtype === 'Table' && field.options
        ? childMetas[field.options]
        : undefined;

    // Determine if field should span full width
    const isFullWidth = ['Table', 'Text Editor', 'Code', 'HTML Editor', 'Text', 'Long Text', 'Geolocation', 'Signature', 'Markdown Editor', 'Heading'].includes(field.fieldtype);

    // Check if field is read-only (from fetch_from or formula)
    const isReadOnly = disabled ||
        field.read_only === 1 ||
        readOnlyFields.includes(field.fieldname) ||
        formulaFields.includes(field.fieldname);

    return (
        <div
            className={cn(
                "form-field",
                isFullWidth ? "col-span-1" : "col-span-1"
            )}
        >
            <FieldComponent
                field={field}
                value={formData[field.fieldname]}
                onChange={onChange}
                disabled={isReadOnly}
                error={errors[field.fieldname]}
                rowErrors={errors[`${field.fieldname}_rows`]}
                formData={formData}
                childMeta={childMeta}
                parentDoctype={doctype}
                isNew={isNew}
            />
        </div>
    );
}

/**
 * Tab Bar Component - renders tab buttons when Tab Break fields are present
 */
function TabBar({ tabs, activeTab, onTabChange }) {
    if (tabs.length <= 1) return null;

    return (
        <div className="col-span-1 md:col-span-2 mb-4">
            <div className="flex gap-0 border-b border-border overflow-x-auto scrollbar-hide" role="tablist" aria-label="Form tabs">
                {tabs.map((tab, index) => (
                    <button
                        key={`tab-${index}-${tab.label}`}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === index}
                        aria-controls={`tabpanel-${index}`}
                        id={`tab-${index}`}
                        onClick={() => onTabChange(index)}
                        className={cn(
                            "px-4 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-200",
                            "border-b-2 -mb-px",
                            activeTab === index
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/20"
                        )}
                    >
                        {tab.label || 'Details'}
                    </button>
                ))}
            </div>
        </div>
    );
}

/**
 * Multi-column section with collapse support
 */
function MultiColumnSection({
    section,
    sectionIndex,
    columnCount,
    formData,
    onChange,
    disabled,
    errors,
    childMetas,
    doctype,
    isNew,
    readOnlyFields,
    formulaFields,
}) {
    const [isOpen, setIsOpen] = useState(!section.collapsed);
    const handleToggle = useCallback(() => setIsOpen(prev => !prev), []);

    return (
        <div className="col-span-1 md:col-span-2">
            {section.label && (
                <SectionHeader
                    label={section.label}
                    collapsible={section.collapsible}
                    defaultOpen={!section.collapsed}
                    isOpen={isOpen}
                    onToggle={handleToggle}
                />
            )}

            <div
                className={cn(
                    "overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out",
                    isOpen ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
                )}
            >
                <div
                    className={cn(
                        "grid gap-4 md:gap-6",
                        columnCount === 2 && "grid-cols-1 md:grid-cols-2",
                        columnCount >= 3 && "grid-cols-1 md:grid-cols-3",
                    )}
                >
                    {section.columns.map((column, colIndex) => (
                        <div
                            key={`col-${sectionIndex}-${colIndex}`}
                            className="flex flex-col gap-4 md:gap-6"
                        >
                            {column.fields.map((field) => (
                                <FieldRenderer
                                    key={field.fieldname}
                                    field={field}
                                    formData={formData}
                                    onChange={onChange}
                                    disabled={disabled}
                                    errors={errors}
                                    childMetas={childMetas}
                                    doctype={doctype}
                                    isNew={isNew}
                                    readOnlyFields={readOnlyFields}
                                    formulaFields={formulaFields}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/**
 * Renders a single section with multi-column support
 */
function SectionRenderer({
    section,
    sectionIndex,
    formData,
    onChange,
    disabled,
    errors,
    childMetas,
    doctype,
    isNew,
    readOnlyFields,
    formulaFields,
}) {
    // Check section depends_on
    if (section.depends_on && !evaluateDependsOn(section.depends_on, formData)) {
        return null;
    }

    // Check if section has any visible fields
    const hasFields = section.columns.some(col => col.fields.length > 0);
    if (!hasFields) return null;

    const columnCount = section.columns.length;

    // For single-column sections, render fields in a 2-col grid (original behavior)
    if (columnCount === 1) {
        return (
            <FormSection
                key={`section-${sectionIndex}-${section.label || 'default'}`}
                label={section.label}
                defaultOpen={!section.collapsed}
                collapsible={section.collapsible}
            >
                {section.columns[0].fields.map((field) => (
                    <FieldRenderer
                        key={field.fieldname}
                        field={field}
                        formData={formData}
                        onChange={onChange}
                        disabled={disabled}
                        errors={errors}
                        childMetas={childMetas}
                        doctype={doctype}
                        isNew={isNew}
                        readOnlyFields={readOnlyFields}
                        formulaFields={formulaFields}
                    />
                ))}
            </FormSection>
        );
    }

    // For multi-column sections, render columns side by side
    return (
        <MultiColumnSection
            key={`section-${sectionIndex}-${section.label || 'default'}`}
            section={section}
            sectionIndex={sectionIndex}
            columnCount={columnCount}
            formData={formData}
            onChange={onChange}
            disabled={disabled}
            errors={errors}
            childMetas={childMetas}
            doctype={doctype}
            isNew={isNew}
            readOnlyFields={readOnlyFields}
            formulaFields={formulaFields}
        />
    );
}

/**
 * Collapsible section header (used for multi-column sections)
 */
function SectionHeader({ label, collapsible, isOpen, onToggle }) {
    if (!collapsible) {
        return (
            <div className="w-full flex items-center gap-2 py-2 mb-3 border-b border-border/50">
                <span className="text-[13px] font-bold text-foreground uppercase tracking-wider">
                    {label}
                </span>
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={onToggle}
            aria-expanded={isOpen}
            aria-label={`${isOpen ? 'Collapse' : 'Expand'} section: ${label}`}
            className="w-full flex items-center gap-2 py-2 mb-3 border-b border-border/50 cursor-pointer hover:border-primary/50 transition-colors"
        >
            <ChevronDown
                aria-hidden="true"
                className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    !isOpen && "-rotate-90"
                )}
            />
            <span className="text-[13px] font-bold text-foreground uppercase tracking-wider">
                {label}
            </span>
        </button>
    );
}

/**
 * FormRenderer - Renders form fields based on metadata
 *
 * This component takes an array of field definitions from DocType metadata
 * and renders the appropriate input components for each field.
 *
 * Features:
 * - Groups fields into collapsible sections based on Section Break
 * - Multi-column layout within sections via Column Break
 * - Tabbed form layout via Tab Break
 * - Supports depends_on for conditional visibility
 * - Handles read-only fields (fetch_from, formulas)
 * - NO HARDCODED FIELDS! Everything is driven by metadata.
 * - Fields render in their original metadata order (no sorting)
 *
 * @param {string} doctype - DocType name (for behavior configuration)
 * @param {Array} fields - Field definitions from useDoctypeMeta
 * @param {Object} formData - Current form data
 * @param {Function} onChange - Callback when a field value changes (fieldname, value)
 * @param {Object} errors - Validation errors by fieldname
 * @param {boolean} disabled - Whether the form is disabled (read-only mode)
 * @param {Object} childMetas - Pre-fetched metadata for child tables
 * @param {boolean} isNew - Whether this is a new document
 * @param {Array} readOnlyFields - Fields that should be read-only (e.g., fetch_from fields)
 * @param {Array} formulaFields - Fields that are auto-calculated (should be read-only)
 * @param {Array} hiddenFields - Fields to hide based on user permissions
 * @param {boolean} isValidating - Whether async validation is in progress
 * @param {boolean} useSections - Whether to group fields into sections (default: true)
 */
export function FormRenderer({
    doctype,
    fields,
    formData,
    onChange,
    errors = {},
    disabled = false,
    childMetas = {},
    isNew = false,
    readOnlyFields = [],
    formulaFields = [],
    hiddenFields = [],
    // eslint-disable-next-line no-unused-vars
    isValidating = false,
    useSections = true,
}) {
    const { t, getFieldLabel, language } = useTranslation();
    const [activeTab, setActiveTab] = useState(0);

    // Translate field labels at the FormRenderer level so all child components
    // automatically receive translated labels without individual changes.
    // This creates shallow copies of field objects with translated label property.
    const translatedFields = useMemo(() => {
        if (!fields || fields.length === 0) return fields;
        return fields.map(field => {
            if (!field.label) return field;
            const translated = getFieldLabel(field.label, field.fieldname);
            if (translated === field.label) return field;
            return { ...field, label: translated };
        });
    }, [fields, getFieldLabel]);

    // Track seen fieldnames to skip duplicates
    const seenFieldnames = useMemo(() => new Set(), []);

    // Filter fields based on visibility conditions
    const filterField = (field) => {
        // Keep layout fieldtypes - they are processed by groupFieldsIntoSections
        if (LAYOUT_FIELDTYPES.includes(field.fieldtype)) {
            return true;
        }

        // Skip non-renderable, non-layout fieldtypes (Fold, Button, Spacer)
        if (shouldSkipFieldtype(field.fieldtype)) {
            return false;
        }

        // Skip hidden fields (from metadata) - handles boolean true, number 1, or string "1"
        if (field.hidden) {
            return false;
        }

        // Skip fields hidden by user permissions (role-based)
        if (hiddenFields.includes(field.fieldname)) {
            return false;
        }

        // For non-layout fields, check duplicates
        if (field.fieldname) {
            if (seenFieldnames.has(field.fieldname)) {
                console.warn(`[FormRenderer] Skipping duplicate field: ${field.fieldname}`);
                return false;
            }
            seenFieldnames.add(field.fieldname);
        }

        // Check depends_on condition using enhanced evaluator
        if (field.depends_on) {
            if (!evaluateDependsOn(field.depends_on, formData)) {
                return false;
            }
        }

        // Check doctype-specific visibility rules (from doctype.behaviors.js)
        if (doctype && !isFieldVisible(doctype, field.fieldname, formData)) {
            return false;
        }

        return true;
    };

    // Group fields into tabs and sections with column support
    const tabData = useMemo(() => {
        // Reset seen fieldnames for each render
        seenFieldnames.clear();

        if (!translatedFields || translatedFields.length === 0) return { tabs: [] };

        // First filter all fields (keeping layout fieldtypes)
        const filteredFields = translatedFields.filter(filterField);

        if (!useSections) {
            // Return single tab with single section, all fields in one column
            const nonLayoutFields = filteredFields.filter(
                f => !LAYOUT_FIELDTYPES.includes(f.fieldtype)
            );
            return {
                tabs: [{
                    label: '',
                    sections: [{
                        label: '',
                        collapsible: false,
                        collapsed: false,
                        depends_on: null,
                        columns: [{ fields: nonLayoutFields }],
                    }],
                }],
            };
        }

        // Group into tabs > sections > columns
        return groupFieldsIntoSections(filteredFields);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [translatedFields, formData, doctype, useSections, hiddenFields, language]);

    if (!translatedFields || translatedFields.length === 0) {
        return (
            <div className="p-6 text-center text-muted-foreground text-[13px]">
                {t('form.noFields')}
            </div>
        );
    }

    const { tabs } = tabData;

    // Check if all tabs/sections are empty
    const hasVisibleFields = tabs.some(tab =>
        tab.sections.some(section =>
            section.columns.some(col => col.fields.length > 0)
        )
    );

    if (!hasVisibleFields) {
        return (
            <div className="p-6 text-center text-muted-foreground text-[13px]">
                {t('form.noFields')}
            </div>
        );
    }

    // Clamp activeTab to valid range
    const safeActiveTab = Math.min(activeTab, tabs.length - 1);
    const hasTabs = tabs.length > 1;
    const currentTab = tabs[safeActiveTab] || tabs[0];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-full" role="form" aria-label={doctype || 'Form'}>
            {/* Tab Bar (only shown when multiple tabs exist) */}
            {hasTabs && (
                <TabBar
                    tabs={tabs}
                    activeTab={safeActiveTab}
                    onTabChange={setActiveTab}
                />
            )}

            {/* Render sections of the active tab */}
            {currentTab && currentTab.sections.map((section, sectionIndex) => (
                <SectionRenderer
                    key={`section-${safeActiveTab}-${sectionIndex}-${section.label || 'default'}`}
                    section={section}
                    sectionIndex={sectionIndex}
                    formData={formData}
                    onChange={onChange}
                    disabled={disabled}
                    errors={errors}
                    childMetas={childMetas}
                    doctype={doctype}
                    isNew={isNew}
                    readOnlyFields={readOnlyFields}
                    formulaFields={formulaFields}
                />
            ))}
        </div>
    );
}

FormRenderer.propTypes = {
    doctype: PropTypes.string,
    fields: PropTypes.arrayOf(PropTypes.shape({
        fieldname: PropTypes.string,
        fieldtype: PropTypes.string.isRequired,
        label: PropTypes.string,
        options: PropTypes.string,
        reqd: PropTypes.number,
        read_only: PropTypes.number,
        hidden: PropTypes.number,
        depends_on: PropTypes.string,
    })).isRequired,
    formData: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
    errors: PropTypes.object,
    disabled: PropTypes.bool,
    childMetas: PropTypes.object,
    isNew: PropTypes.bool,
    readOnlyFields: PropTypes.arrayOf(PropTypes.string),
    formulaFields: PropTypes.arrayOf(PropTypes.string),
    hiddenFields: PropTypes.arrayOf(PropTypes.string),
    isValidating: PropTypes.bool,
    useSections: PropTypes.bool,
};

export default FormRenderer;
