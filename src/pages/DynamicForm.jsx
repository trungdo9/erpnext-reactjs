/**
 * DynamicForm - Metadata-Driven Form Component
 *
 * MIGRATED TO REACT QUERY
 *
 * Before (useEffect + manual state):
 * - Manual workflow transitions fetch with useEffect
 * - Manual save/submit/cancel with async handlers
 * - No cache invalidation on mutations
 *
 * After (React Query):
 * - useWorkflowTransitions for automatic caching
 * - useMutation for save/submit/cancel with cache invalidation
 * - Optimistic updates where applicable
 *
 * This is the ORCHESTRATOR component that:
 * 1. Gets doctype and name from router params
 * 2. Fetches metadata using useDoctypeMeta (React Query)
 * 3. Fetches document data using useDocumentData (React Query)
 * 4. Manages form state using useFormState
 * 5. Delegates rendering to FormRenderer
 *
 * NO HARDCODED FIELDS - Everything is driven by API metadata!
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DocumentService, WorkflowService } from '../api/domains';
import { useWorkflowTransitions } from '../api/queries';
import { useDoctypeMeta } from '../hooks/useDoctypeMeta';
import { useDocumentData } from '../hooks/useDocumentData';
import { useFormState } from '../hooks/useFormState';
import { useFetchFrom } from '../hooks/useFetchFrom';
import { useFormulas } from '../hooks/useFormulas';
import { useFormDraft } from '../hooks/useFormDraft';
import { useAsyncValidation } from '../hooks/useAsyncValidation';
import { useFieldPermissions } from '../hooks/useFieldPermissions';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useDocumentNavigation } from '../hooks/useDocumentNavigation';
import { useTranslation } from '../hooks/useTranslation';
import { useToast } from '../hooks/useToast';
import { FormRenderer, FormHeader, FormActions, FormSkeleton, FormSidebar } from '../components/form';
import Card from '../components/ui/Card';
import { PanelRightOpen } from 'lucide-react';
import { InlineError } from '../components/common/ErrorBoundary';
import { getErrorMessage, parseServerErrors } from '../utils/errors';
import { AUTO_POPULATE_DOCTYPES, LUONG_CHILD_DOCTYPES, LUONG_ROW_COUNT, getFieldChangeAutoSets, getDynamicReadOnlyFields } from '../config/doctype.behaviors';
import { usePersonaStore } from '../stores';
import { CARD, TRANSITION } from '../config/styles';

const DynamicForm = () => {
    const { doctype, name } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const isNew = !name || name === 'new';

    // Persona-aware layout
    const persona = usePersonaStore((s) => s.persona);

    // 1. Fetch doctype metadata (React Query via useDoctypeMeta)
    const {
        meta,
        fields,
        childMetas,
        loading: metaLoading,
        error: metaError
    } = useDoctypeMeta(doctype, { skipLayoutFields: false });

    // 2. Fetch document data (React Query via useDocumentData)
    const {
        data: docData,
        isLoading: docLoading,
        error: docError
    } = useDocumentData(doctype, name);

    // 3. Compute initial form data with auto-populated child tables
    // Check data object directly to ensure only ONE luống table is populated
    const initialFormData = useMemo(() => {
        // For existing documents, just use docData
        if (!isNew) return docData || {};

        // For new documents, auto-populate child tables
        const data = { ...(docData || {}) };

        // Check if this doctype should auto-populate
        if (!AUTO_POPULATE_DOCTYPES.includes(doctype)) return data;

        if (fields.length > 0) {
            // Get all Table fields that use luống child doctype
            const luongTableFields = fields.filter(f =>
                f.fieldtype === 'Table' && LUONG_CHILD_DOCTYPES.includes(f.options)
            );

            // Sort by idx to ensure consistent order
            luongTableFields.sort((a, b) => (a.idx || 0) - (b.idx || 0));

            // Check if ANY luống table already has data in the data object
            const existingLuongField = luongTableFields.find(f =>
                data[f.fieldname] && Array.isArray(data[f.fieldname]) && data[f.fieldname].length > 0
            );

            if (existingLuongField) return data;

            // Populate ONLY the FIRST luống table (by idx order)
            if (luongTableFields.length > 0) {
                const firstLuongField = luongTableFields[0];
                const fieldname = firstLuongField.fieldname;
                const childDoctype = firstLuongField.options;

                const rows = [];
                for (let i = 0; i < LUONG_ROW_COUNT; i++) {
                    rows.push({
                        doctype: childDoctype,
                        __islocal: 1,
                        idx: i + 1,
                        so_luong: `L${i + 1}`,
                        gia_tri: 0,
                    });
                }
                data[fieldname] = rows;
            }
        }

        // Auto-populate Date/Datetime/Time fields with current time for new documents
        if (fields.length > 0) {
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const datetimeStr = now.toISOString().slice(0, 16);
            const timeStr = now.toTimeString().slice(0, 5);

            for (const field of fields) {
                if (data[field.fieldname] !== undefined && data[field.fieldname] !== null && data[field.fieldname] !== '') continue;
                if (field.read_only === 1 || field.hidden === 1) continue;

                switch (field.fieldtype) {
                    case 'Date': data[field.fieldname] = dateStr; break;
                    case 'Datetime': data[field.fieldname] = datetimeStr; break;
                    case 'Time': data[field.fieldname] = timeStr; break;
                }
            }
        }

        return data;
    }, [isNew, docData, fields, doctype]);

    // 4. Manage form state with auto-populated initial data
    const {
        formData,
        setField,
        isDirty,
        validate,
        errors,
        reset,
        markSaved,
        getCleanData,
        setFormErrors,
        clearErrors,
    } = useFormState(initialFormData, fields, { childMetas });

    // 4.1 Draft auto-save/restore (disabled - not useful for this project)
    const draftKey = doctype + ':' + (name || 'new');

    const {
        clearDraft,
    } = useFormDraft(doctype, draftKey, {
        data: formData,
        autoSave: false,
        debounceMs: 2000,
    });

    // 5. Fetch_from auto-population hook
    const { handleLinkChange, linkFieldsWithFetch, fetchFromTargetFields } = useFetchFrom(
        doctype,
        formData,
        setField,
        { enabled: true }
    );

    // 5.1 Ensure Date/Time fields are auto-populated for new documents
    // This handles race conditions where initialFormData might not sync properly
    const hasAutoPopulatedRef = useRef(false);
    useEffect(() => {
        if (!isNew || fields.length === 0 || hasAutoPopulatedRef.current) {
            return;
        }

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const datetimeStr = now.toISOString().slice(0, 16);
        const timeStr = now.toTimeString().slice(0, 5);

        for (const field of fields) {
            if (formData[field.fieldname]) continue;
            if (field.read_only === 1 || field.readOnly === true || field.hidden === 1) continue;

            switch (field.fieldtype) {
                case 'Date': setField(field.fieldname, dateStr); break;
                case 'Datetime': setField(field.fieldname, datetimeStr); break;
                case 'Time': setField(field.fieldname, timeStr); break;
            }
        }

        hasAutoPopulatedRef.current = true;
    }, [isNew, fields, formData, setField]);

    // 6. Formula auto-calculation hook
    const { handleFieldChangeForFormulas, formulaFields } = useFormulas(
        doctype,
        formData,
        setField,
        { enabled: true }
    );

    // 7. Async validation hook (unique checks, exists validation)
    const {
        asyncErrors,
        handleFieldChangeForValidation,
        isValidating,
    } = useAsyncValidation(doctype, formData, {
        documentName: isNew ? null : name,
        debounceMs: 500,
    });

    // 8. Field permissions hook (role-based visibility/read-only)
    const {
        hiddenFields: permissionHiddenFields,
        permissionReadOnlyFields,
    } = useFieldPermissions(doctype);

    // 9. Fetch workflow transitions (React Query)
    const { data: transitions = [] } = useWorkflowTransitions(
        doctype,
        formData?.name,
        { enabled: !isNew && !!formData?.name }
    );

    // 9.1 Document navigation (prev/next)
    const {
        prevName,
        nextName,
        hasPrev,
        hasNext,
    } = useDocumentNavigation(doctype, name, {
        creation: formData?.creation || null,
        enabled: !isNew && !!formData?.creation,
    });

    const handleNavigatePrev = useCallback(() => {
        if (prevName) {
            navigate(`/form/${doctype}/${prevName}`);
        }
    }, [prevName, doctype, navigate]);

    const handleNavigateNext = useCallback(() => {
        if (nextName) {
            navigate(`/form/${doctype}/${nextName}`);
        }
    }, [nextName, doctype, navigate]);

    // 10. Merge form errors with async validation errors
    const combinedErrors = useMemo(() => ({
        ...errors,
        ...asyncErrors,
    }), [errors, asyncErrors]);

    // 11. Combine readOnly fields from fetch_from, formulas, permissions, and dynamic behaviors
    const dynamicReadOnly = useMemo(() => getDynamicReadOnlyFields(doctype, formData), [doctype, formData]);
    const allReadOnlyFields = useMemo(() => {
        const combined = new Set([
            ...fetchFromTargetFields,
            ...formulaFields,
            ...permissionReadOnlyFields,
            ...dynamicReadOnly,
        ]);
        return Array.from(combined);
    }, [fetchFromTargetFields, formulaFields, permissionReadOnlyFields, dynamicReadOnly]);

    // Local state
    const [saveError, setSaveError] = useState(null);
    // Determine if form is editable (derived from formData)
    const canWrite = !formData || (formData.docstatus ?? 0) === 0;
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Create document mutation
    const createMutation = useMutation({
        mutationFn: (data) => DocumentService.create(doctype, data),
        onSuccess: (result) => {
            const savedName = result?.name || result?.data?.name;
            if (savedName) {
                markSaved(result.data || result);
                clearDraft();
                toast.success(t('common.success'), t('form.savedSuccess'));
                // Invalidate list queries
                queryClient.invalidateQueries({ queryKey: ['list', doctype] });
                // Navigate to the saved document
                navigate(`/form/${doctype}/${savedName}`, { replace: true });
            }
        },
        onError: (err) => {
            // Parse server validation errors
            const { message, fieldErrors } = parseServerErrors(err);
            setSaveError(message || t('common.saveFailed'));

            // Set field-level errors from server
            if (Object.keys(fieldErrors).length > 0) {
                setFormErrors(fieldErrors);
            }

            toast.error(t('common.error'), message || t('common.saveFailed'));
        },
    });

    // Update document mutation
    const updateMutation = useMutation({
        mutationFn: (data) => DocumentService.update(doctype, formData.name, data),
        onSuccess: (result) => {
            markSaved(result.data || result);
            clearDraft();
            toast.success(t('common.success'), t('form.savedSuccess'));
            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: ['document', doctype, formData.name] });
            queryClient.invalidateQueries({ queryKey: ['list', doctype] });
        },
        onError: (err) => {
            // Parse server validation errors
            const { message, fieldErrors } = parseServerErrors(err);
            setSaveError(message || t('common.saveFailed'));

            // Set field-level errors from server
            if (Object.keys(fieldErrors).length > 0) {
                setFormErrors(fieldErrors);
            }

            toast.error(t('common.error'), message || t('common.saveFailed'));
        },
    });

    // Submit document mutation
    const submitMutation = useMutation({
        mutationFn: () => WorkflowService.submit(doctype, formData.name),
        onSuccess: (result) => {
            markSaved(result);
            toast.success(t('common.success'), t('status.submitted'));
            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: ['document', doctype, formData.name] });
            queryClient.invalidateQueries({ queryKey: ['list', doctype] });
            queryClient.invalidateQueries({ queryKey: ['workflow', 'transitions', doctype, formData.name] });
        },
        onError: (err) => {
            const errMsg = err.message || 'Submit failed';
            setSaveError(errMsg);
            toast.error(t('common.error'), errMsg);
        },
    });

    // Cancel document mutation
    const cancelMutation = useMutation({
        mutationFn: () => WorkflowService.cancel(doctype, formData.name),
        onSuccess: (result) => {
            markSaved(result);
            toast.success(t('common.success'), t('status.cancelled'));
            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: ['document', doctype, formData.name] });
            queryClient.invalidateQueries({ queryKey: ['list', doctype] });
        },
        onError: (err) => {
            const errMsg = err.message || 'Cancel failed';
            setSaveError(errMsg);
            toast.error(t('common.error'), errMsg);
        },
    });

    // Workflow transition mutation
    const transitionMutation = useMutation({
        mutationFn: (action) => WorkflowService.applyTransition(doctype, formData.name, action),
        onSuccess: (result, action) => {
            markSaved(result);
            toast.success(t('common.success'), `${t('common.success')} ${action}`);
            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: ['document', doctype, formData.name] });
            queryClient.invalidateQueries({ queryKey: ['list', doctype] });
            queryClient.invalidateQueries({ queryKey: ['workflow', 'transitions', doctype, formData.name] });
        },
        onError: (err) => {
            const errMsg = err.message || 'Transition failed';
            setSaveError(errMsg);
            toast.error(t('common.error'), errMsg);
        },
    });

    // Check if any mutation is in progress
    const isSaving = createMutation.isPending ||
        updateMutation.isPending ||
        submitMutation.isPending ||
        cancelMutation.isPending ||
        transitionMutation.isPending;

    // Determine form max-width based on content and persona
    const hasChildTables = fields.some(f => f.fieldtype === 'Table');
    const formMaxWidth = persona === 'worker'
        ? 'max-w-3xl'
        : hasChildTables
            ? 'max-w-7xl'
            : 'max-w-5xl';

    // Handle field change with fetch_from, formula, and async validation support
    const handleChange = useCallback((fieldname, value) => {
        setField(fieldname, value);
        setSaveError(null);
        // Note: Field errors are automatically cleared in setField

        // Auto-set related fields based on doctype behaviors (e.g., cap → is_group, auto-naming)
        const currentData = { ...formData, [fieldname]: value };
        const autoSets = getFieldChangeAutoSets(doctype, fieldname, value, currentData);
        if (autoSets) {
            Object.entries(autoSets).forEach(([f, v]) => setField(f, v));
        }

        // Check if this is a link field with fetch_from dependencies
        if (linkFieldsWithFetch.includes(fieldname)) {
            const field = fields.find(f => f.fieldname === fieldname);
            if (field?.fieldtype === 'Link' && field?.options) {
                handleLinkChange(fieldname, value, field.options);
            }
        }

        // Trigger formula recalculation if needed
        handleFieldChangeForFormulas(fieldname);

        // Trigger async validation (unique checks, etc.) with debounce
        handleFieldChangeForValidation(fieldname, value);
    }, [setField, doctype, formData, linkFieldsWithFetch, fields, handleLinkChange, handleFieldChangeForFormulas, handleFieldChangeForValidation]);

    // Handle save
    const handleSave = useCallback(() => {
        // Clear previous server errors
        clearErrors();
        setSaveError(null);

        // Validate client-side first
        if (!validate()) {
            toast.error(t('common.error'), t('form.required'));
            return;
        }

        const cleanData = getCleanData();

        if (isNew) {
            createMutation.mutate(cleanData);
        } else {
            updateMutation.mutate(cleanData);
        }
    }, [isNew, validate, getCleanData, clearErrors, createMutation, updateMutation, toast, t]);

    // Handle submit (for submittable doctypes)
    const handleSubmit = useCallback(() => {
        if (!formData?.name) return;
        setSaveError(null);
        submitMutation.mutate();
    }, [formData?.name, submitMutation]);

    // Handle cancel (for submitted documents)
    const handleCancel = useCallback(() => {
        if (!formData?.name) return;
        setSaveError(null);
        cancelMutation.mutate();
    }, [formData?.name, cancelMutation]);

    // Handle workflow transition
    const handleTransition = useCallback((action) => {
        if (!formData?.name) return;
        setSaveError(null);
        transitionMutation.mutate(action);
    }, [formData?.name, transitionMutation]);

    // Handle reset
    const handleReset = useCallback(() => {
        reset();
        setSaveError(null);
        toast.info(t('common.reset'), 'Form has been reset');
    }, [reset, toast, t]);

    // Keyboard shortcuts: Ctrl+S to save, Ctrl+Shift+S to submit, Escape to go back
    const shortcutHandlers = useMemo(() => ({
        save: () => { if (canWrite && isDirty) handleSave(); },
        submit: () => { if (meta?.is_submittable === 1 && !isNew && formData?.docstatus === 0) handleSubmit(); },
        cancel: () => navigate(-1),
    }), [canWrite, isDirty, handleSave, handleSubmit, isNew, meta, formData?.docstatus, navigate]);

    useKeyboardShortcuts(undefined, shortcutHandlers);

    // Loading state
    if (metaLoading || docLoading) {
        return (
            <div className="p-3 md:p-6">
                <FormSkeleton fieldCount={fields.length || 6} />
            </div>
        );
    }

    // Error state
    if (metaError || docError) {
        const errorMessage = getErrorMessage(metaError || docError);
        return (
            <div className="p-3 md:p-6 max-w-2xl mx-auto">
                <InlineError
                    error={{ message: errorMessage }}
                    onRetry={() => window.location.reload()}
                />
            </div>
        );
    }

    // No fields to render
    if (!fields || fields.length === 0) {
        return (
            <div className="p-3 md:p-6">
                <FormHeader
                    doctype={doctype}
                    meta={meta}
                    formData={formData}
                    isNew={isNew}
                    onPrev={handleNavigatePrev}
                    onNext={handleNavigateNext}
                    hasPrev={hasPrev}
                    hasNext={hasNext}
                />
                <Card variant="solid">
                    <div className="p-4 md:p-6 text-center text-muted-foreground">
                        {t('form.noFields')}
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <>
            {/* Main content with bottom padding for sticky bar */}
            <div className={`${formMaxWidth} mx-auto w-full pb-28 md:pb-16`}>
                {/* Header - without action buttons (moved to sticky bottom bar) */}
                <FormHeader
                    doctype={doctype}
                    meta={meta}
                    formData={formData}
                    isNew={isNew}
                    backPath={location.state?.from}
                    onPrev={handleNavigatePrev}
                    onNext={handleNavigateNext}
                    hasPrev={hasPrev}
                    hasNext={hasNext}
                    actions={!isNew && (
                        <button
                            type="button"
                            onClick={() => setSidebarOpen((v) => !v)}
                            className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                            title={t('sidebar.toggle', 'Toggle sidebar')}
                        >
                            <PanelRightOpen className="w-4 h-4" />
                            <span className="hidden xl:inline">{t('sidebar.title', 'Sidebar')}</span>
                        </button>
                    )}
                />

                {/* Form Card + Sidebar layout */}
                <div className="flex gap-4 items-start">
                    {/* Form Card */}
                    <Card variant="solid" className="flex-1 min-w-0">
                        <div className="p-4 md:p-6">
                            {/* Error Banner */}
                            {saveError && (
                                <InlineError
                                    error={{ message: saveError }}
                                    onRetry={() => setSaveError(null)}
                                    className="mb-3 md:mb-4"
                                />
                            )}

                            {/* Form Fields */}
                            <FormRenderer
                                doctype={doctype}
                                fields={fields}
                                formData={formData}
                                onChange={handleChange}
                                errors={combinedErrors}
                                disabled={!canWrite}
                                childMetas={childMetas}
                                isNew={isNew}
                                readOnlyFields={allReadOnlyFields}
                                formulaFields={formulaFields}
                                hiddenFields={permissionHiddenFields}
                                isValidating={isValidating}
                            />
                        </div>
                    </Card>

                    {/* Sidebar - only for existing documents */}
                    {!isNew && sidebarOpen && (
                        <FormSidebar
                            doctype={doctype}
                            name={name}
                            formData={formData}
                            isOpen={sidebarOpen}
                            onClose={() => setSidebarOpen(false)}
                        />
                    )}
                </div>
            </div>

            {/* Sticky Bottom Action Buttons — bottom-24 clears BottomNav (56px + safe area) on mobile */}
            <div className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50">
                <FormActions
                    isNew={isNew}
                    isDirty={isDirty}
                    isSaving={isSaving}
                    canWrite={canWrite}
                    meta={meta}
                    formData={formData}
                    transitions={transitions}
                    onSave={handleSave}
                    onSubmit={handleSubmit}
                    onCancel={handleCancel}
                    onTransition={handleTransition}
                    onReset={handleReset}
                    doctype={doctype}
                    name={name}
                    className="flex items-center gap-2 bg-card rounded-lg shadow-lg border border-border px-3 py-2"
                />
            </div>
        </>
    );
};

export default DynamicForm;
