import PropTypes from 'prop-types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Badge from '../ui/Badge';
import { useTranslation } from '../../hooks/useTranslation';
import { formatDateTime } from '../../utils/dateUtils';

/**
 * Get status badge variant based on docstatus or workflow_state
 */
const getStatusVariant = (formData) => {
    // Check workflow state first
    if (formData.workflow_state) {
        const state = formData.workflow_state.toLowerCase();
        if (state.includes('approved') || state.includes('completed')) return 'success';
        if (state.includes('pending') || state.includes('draft')) return 'warning';
        if (state.includes('reject') || state.includes('cancel')) return 'error';
        return 'secondary';
    }

    // Fallback to docstatus
    const docstatus = formData.docstatus ?? 0;
    switch (docstatus) {
        case 0: return 'warning';   // Draft
        case 1: return 'success';   // Submitted
        case 2: return 'error';    // Cancelled
        default: return 'secondary';
    }
};

/**
 * Get status label
 */
const getStatusLabel = (formData, t) => {
    if (formData.workflow_state) {
        return formData.workflow_state;
    }

    const docstatus = formData.docstatus ?? 0;
    switch (docstatus) {
        case 0: return t('status.draft');
        case 1: return t('status.submitted');
        case 2: return t('status.cancelled');
        default: return t('status.unknown');
    }
};

/**
 * Form header with breadcrumb, title, and status
 *
 * For tree doctypes (is_tree=1), fetches the ancestor chain using nested set
 * and displays it as a clickable breadcrumb path.
 */
export function FormHeader({
    doctype,
    meta,
    formData,
    isNew,
    // eslint-disable-next-line no-unused-vars
    backPath,
    actions,
    onPrev,
    onNext,
    hasPrev = false,
    hasNext = false,
}) {
    const { t, getDoctypeLabel } = useTranslation();

    // Get display label for doctype
    const doctypeLabel = meta?.name
        ? (meta.title || getDoctypeLabel(doctype))
        : getDoctypeLabel(doctype);

    // Get document title
    const docTitle = isNew
        ? `${t('common.new')} ${doctypeLabel}`
        : (formData[meta?.title_field] || formData.name || doctypeLabel);


    return (
        <div className="mb-3 md:mb-4 animate-slide-up">
            {/* Prev/Next Navigation */}
            {!isNew && (hasPrev || hasNext) && (
                <div className="flex items-center gap-0.5 mb-1.5">
                    <button
                        onClick={onPrev}
                        disabled={!hasPrev}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title={t('common.previous') || 'Previous'}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onNext}
                        disabled={!hasNext}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title={t('common.next') || 'Next'}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Title Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-3">
                <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                    <h1 className="text-xl font-extrabold text-foreground truncate">
                        {docTitle}
                    </h1>

                    {/* Status Badge */}
                    {!isNew && (
                        <Badge
                            variant={getStatusVariant(formData)}
                            className="animate-scale-in shrink-0"
                        >
                            {getStatusLabel(formData, t)}
                        </Badge>
                    )}
                </div>

                {/* Actions */}
                {actions && (
                    <div className="flex-shrink-0 self-end sm:self-auto">
                        {actions}
                    </div>
                )}
            </div>

            {/* Meta info for existing docs */}
            {!isNew && formData.modified && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                    {t('common.lastModified')}: {formatDateTime(formData.modified)}
                    {formData.modified_by && <span className="text-muted-foreground hidden sm:inline"> &bull; {formData.modified_by}</span>}
                </p>
            )}
        </div>
    );
}

FormHeader.propTypes = {
    doctype: PropTypes.string.isRequired,
    meta: PropTypes.object,
    formData: PropTypes.object.isRequired,
    isNew: PropTypes.bool,
    backPath: PropTypes.string,
    actions: PropTypes.node,
    onPrev: PropTypes.func,
    onNext: PropTypes.func,
    hasPrev: PropTypes.bool,
    hasNext: PropTypes.bool,
};

export default FormHeader;
