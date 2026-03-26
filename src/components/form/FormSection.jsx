/**
 * FormSection - Collapsible Section Component with Column Layout
 *
 * Groups form fields into collapsible sections based on Section Break
 * metadata from Frappe DocType. Supports multi-column layouts via
 * Column Break and tabbed sections via Tab Break.
 *
 * Features:
 * - Collapsible/expandable sections
 * - Multi-column layout within sections (Column Break)
 * - Tab Break grouping (handled by FormRenderer)
 * - Smooth animations
 * - Supports depends_on for conditional visibility
 * - Default open/closed state from metadata
 */

import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Collapsible Section Component with multi-column support
 */
export function FormSection({
    label,
    children,
    columns,
    defaultOpen = true,
    collapsible = true,
    className,
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const handleToggle = useCallback(() => {
        if (collapsible) {
            setIsOpen(prev => !prev);
        }
    }, [collapsible]);

    // If columns prop is provided, render column-based layout
    // Otherwise fall back to children-based rendering (backward compat)
    const hasColumns = columns && columns.length > 0;

    // If no label and no columns, just render children without section wrapper
    if (!label && !hasColumns) {
        return <>{children}</>;
    }

    const columnCount = hasColumns ? columns.length : 1;

    return (
        <div className={cn("col-span-1 md:col-span-2", className)}>
            {/* Section Header */}
            {label && (
                <button
                    type="button"
                    onClick={handleToggle}
                    disabled={!collapsible}
                    aria-expanded={isOpen}
                    className={cn(
                        "w-full flex items-center gap-2 py-2 mb-3",
                        "border-b border-border",
                        collapsible && "cursor-pointer hover:border-primary/50 transition-colors",
                        !collapsible && "cursor-default"
                    )}
                >
                    {collapsible && (
                        <ChevronDown
                            className={cn(
                                "h-4 w-4 text-muted-foreground transition-transform duration-300 ease-in-out",
                                !isOpen && "-rotate-90"
                            )}
                        />
                    )}
                    <span className="text-sm font-bold text-foreground uppercase tracking-wide">
                        {label}
                    </span>
                </button>
            )}

            {/* Section Content */}
            <div
                className={cn(
                    "overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out",
                    isOpen ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
                )}
            >
                {hasColumns ? (
                    <div
                        className={cn(
                            "grid gap-4 md:gap-6",
                            columnCount === 1 && "grid-cols-1",
                            columnCount === 2 && "grid-cols-1 md:grid-cols-2",
                            columnCount >= 3 && "grid-cols-1 md:grid-cols-3",
                        )}
                    >
                        {columns.map((column, colIndex) => (
                            <div
                                key={`col-${colIndex}`}
                                className="grid grid-cols-1 gap-4 md:gap-6 content-start"
                            >
                                {column.fields.map((field) => (
                                    <div key={field.fieldname} className="form-field">
                                        {/* Field rendering is handled by FormRenderer via renderField prop */}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
}

FormSection.propTypes = {
    label: PropTypes.string,
    children: PropTypes.node,
    columns: PropTypes.arrayOf(PropTypes.shape({
        fields: PropTypes.array.isRequired,
    })),
    defaultOpen: PropTypes.bool,
    collapsible: PropTypes.bool,
    className: PropTypes.string,
};

/**
 * Utility function to group fields into tabs and sections with column support.
 *
 * Processes field metadata to produce a structure like:
 * {
 *   tabs: [
 *     {
 *       label: "Details",
 *       sections: [
 *         {
 *           label: "Section Name",
 *           collapsible: true,
 *           collapsed: false,
 *           depends_on: null,
 *           columns: [
 *             { fields: [field1, field2] },   // Column 1
 *             { fields: [field3, field4] },   // Column 2 (after Column Break)
 *           ]
 *         }
 *       ]
 *     }
 *   ]
 * }
 *
 * @param {Array} fields - Array of field definitions (including Section Break, Column Break, Tab Break)
 * @returns {Object} { tabs: Array<{ label, sections: Array<Section> }> }
 */
// eslint-disable-next-line react-refresh/only-export-components
export function groupFieldsIntoSections(fields) {
    if (!fields || fields.length === 0) return { tabs: [] };

    const tabs = [];
    let currentTab = {
        label: '',  // Default tab (no label = "Details" or first unnamed tab)
        sections: [],
    };

    let currentSection = {
        label: '',
        collapsible: false,
        collapsed: false,
        depends_on: null,
        columns: [{ fields: [] }],
    };

    const finalizeSection = () => {
        // Only add section if it has at least one field in any column
        const hasFields = currentSection.columns.some(col => col.fields.length > 0);
        if (hasFields) {
            currentTab.sections.push(currentSection);
        }
    };

    const finalizeTab = () => {
        finalizeSection();
        if (currentTab.sections.length > 0) {
            tabs.push(currentTab);
        }
    };

    for (const field of fields) {
        if (field.fieldtype === 'Tab Break') {
            // Finalize current section and tab
            finalizeSection();
            if (currentTab.sections.length > 0) {
                tabs.push(currentTab);
            }

            // Start new tab
            currentTab = {
                label: field.label || '',
                sections: [],
            };

            // Start fresh section within new tab
            currentSection = {
                label: '',
                collapsible: false,
                collapsed: false,
                depends_on: null,
                columns: [{ fields: [] }],
            };
        } else if (field.fieldtype === 'Section Break') {
            // Finalize current section
            finalizeSection();

            // Start new section
            currentSection = {
                label: field.label || '',
                collapsible: !!field.collapsible,
                collapsed: field.collapsible_depends_on ? false : !!field.collapsed,
                depends_on: field.depends_on || null,
                columns: [{ fields: [] }],
            };
        } else if (field.fieldtype === 'Column Break') {
            // Start a new column within the current section
            currentSection.columns.push({ fields: [] });
        } else {
            // Regular field - add to the last column of the current section
            const lastColumn = currentSection.columns[currentSection.columns.length - 1];
            lastColumn.fields.push(field);
        }
    }

    // Finalize the last tab
    finalizeTab();

    return { tabs };
}

/**
 * Legacy wrapper: returns flat sections array (backward compat)
 * Used when Tab Break is not present and callers expect Array<Section>.
 *
 * @param {Array} fields - Array of field definitions
 * @returns {Array} Array of sections (flat, no tab grouping)
 */
// eslint-disable-next-line react-refresh/only-export-components
export function groupFieldsIntoFlatSections(fields) {
    const { tabs } = groupFieldsIntoSections(fields);
    // Flatten all tabs' sections into a single array
    return tabs.reduce((acc, tab) => acc.concat(tab.sections), []);
}

export default FormSection;
