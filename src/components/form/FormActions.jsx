import PropTypes from 'prop-types';
import Button from '../ui/Button';
import { Save, Send, Ban, RotateCcw, CheckCircle, XCircle, Printer } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

/**
 * Form action buttons - Save, Submit, Cancel, Workflow actions
 */
export function FormActions({
    isNew,
    isDirty,
    isSaving,
    canWrite,
    meta,
    formData,
    transitions = [],
    onSave,
    onSubmit,
    onCancel,
    onTransition,
    onReset,
    doctype,
    name,
    className,
}) {
    const { t } = useTranslation();

    const isSubmittable = meta?.is_submittable === 1;
    const docstatus = formData?.docstatus ?? 0;
    const hasWorkflow = transitions.length > 0;

    const showPrint = !isNew && !!doctype && !!name;
    const showReset = isDirty;
    const showSave = canWrite;
    const showSubmit = isSubmittable && canWrite && docstatus === 0 && !isNew && !hasWorkflow;
    const showCancelDoc = isSubmittable && docstatus === 1 && !hasWorkflow;

    const handlePrint = () => {
        const printUrl = `/printview?doctype=${encodeURIComponent(doctype)}&name=${encodeURIComponent(name)}&format=Standard`;
        window.open(printUrl, '_blank');
    };

    return (
        <div className={className || "flex items-center gap-2"}>
            {/* Secondary actions */}
            {showPrint && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrint}
                    className="text-xs md:text-sm"
                >
                    <Printer className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">{t('common.print')}</span>
                </Button>
            )}
            {showReset && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onReset}
                    disabled={isSaving}
                    className="text-xs md:text-sm"
                >
                    <RotateCcw className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-2" />
                    {t('common.reset')}
                </Button>
            )}

            {/* Primary actions */}
            <div className="flex items-center gap-2">
                {/* Workflow transitions */}
                {hasWorkflow && transitions.map((transition) => (
                    <Button
                        key={transition.action}
                        variant={transition.action.toLowerCase().includes('reject') ? 'danger' : 'outline'}
                        size="sm"
                        onClick={() => onTransition(transition.action)}
                        disabled={isSaving}
                        className={`text-xs md:text-sm ${!transition.action.toLowerCase().includes('reject') ? 'hover:border-primary/40 hover:text-primary' : ''}`}
                    >
                        {transition.action.toLowerCase().includes('approve') && (
                            <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-2" />
                        )}
                        {transition.action.toLowerCase().includes('reject') && (
                            <XCircle className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-2" />
                        )}
                        <span className="hidden sm:inline">{transition.action}</span>
                        <span className="sm:hidden">{transition.action.split(' ')[0]}</span>
                    </Button>
                ))}

                {/* Cancel submitted document */}
                {showCancelDoc && (
                    <Button
                        variant="danger"
                        size="sm"
                        onClick={onCancel}
                        disabled={isSaving}
                        className="text-xs md:text-sm"
                    >
                        <Ban className="w-3.5 h-3.5 md:w-4 md:h-4 md:mr-2" />
                        <span className="hidden md:inline">{t('common.cancel')}</span>
                    </Button>
                )}

                {/* Submit button */}
                {showSubmit && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onSubmit}
                        disabled={isSaving}
                        className="text-xs md:text-sm hover:border-primary/40 hover:text-primary"
                    >
                        <Send className="w-3.5 h-3.5 md:w-4 md:h-4 md:mr-2" />
                        <span className="hidden md:inline">{t('common.submit')}</span>
                    </Button>
                )}

                {/* Save button */}
                {showSave && (
                    <Button
                        variant="primary"
                        size="default"
                        onClick={onSave}
                        disabled={isSaving || !isDirty}
                        loading={isSaving}
                        className="text-xs md:text-sm"
                    >
                        <Save className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-2" />
                        {isNew ? t('common.create') : t('common.save')}
                    </Button>
                )}
            </div>
        </div>
    );
}

FormActions.propTypes = {
    isNew: PropTypes.bool,
    isDirty: PropTypes.bool,
    isSaving: PropTypes.bool,
    canWrite: PropTypes.bool,
    meta: PropTypes.object,
    formData: PropTypes.object,
    transitions: PropTypes.array,
    onSave: PropTypes.func.isRequired,
    onSubmit: PropTypes.func,
    onCancel: PropTypes.func,
    onTransition: PropTypes.func,
    onReset: PropTypes.func,
    doctype: PropTypes.string,
    name: PropTypes.string,
};

export default FormActions;
