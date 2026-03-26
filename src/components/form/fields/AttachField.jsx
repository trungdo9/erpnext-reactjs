import { useState } from 'react';
import PropTypes from 'prop-types';
import { FileService } from '../../../api/domains';
import { useTranslation } from '../../../hooks/useTranslation';

/**
 * File attachment field for Attach, Attach Image fieldtypes
 */
export function AttachField({ field, value, onChange, disabled, error, formData }) {
    const { t } = useTranslation();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);

    const isImage = field.fieldtype === 'Attach Image';
    const acceptTypes = isImage ? 'image/*' : '*/*';

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check if document is saved (has name)
        if (!formData?.name || formData.name === 'new') {
            setUploadError(t('upload.save_first'));
            e.target.value = '';
            return;
        }

        setIsUploading(true);
        setUploadError(null);

        try {
            const result = await FileService.upload(file, {
                doctype: formData.doctype || field.parent,
                docname: formData.name,
                fieldname: field.fieldname,
            });
            const fileUrl = result?.url || result;

            if (fileUrl) {
                onChange(field.fieldname, fileUrl);
            }
        } catch (err) {
            console.error('Upload failed:', err);
            setUploadError(err.message || t('upload.failed'));
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    const handleClear = () => {
        onChange(field.fieldname, null);
    };

    const displayError = uploadError || error;

    return (
        <div className="space-y-2">
            {field.label && (
                <label
                    htmlFor={field.fieldname}
                    className="block text-[13px] font-medium text-foreground"
                >
                    {field.label}
                    {field.reqd === 1 && <span className="text-destructive ml-1">*</span>}
                </label>
            )}

            <div className="flex flex-col gap-2">
                {/* File Input */}
                <div className={`
                    flex items-center gap-3 p-3
                    border border-dashed border-border rounded-lg
                    bg-muted/50
                    ${disabled || field.read_only === 1
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:border-primary/40 transition-colors duration-150'
                    }
                `}>
                    <input
                        type="file"
                        id={field.fieldname}
                        name={field.fieldname}
                        accept={acceptTypes}
                        onChange={handleFileChange}
                        disabled={disabled || field.read_only === 1 || isUploading}
                        className="
                            text-[13px] text-foreground
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-[13px] file:font-semibold
                            file:bg-primary/10 file:text-primary
                            hover:file:bg-primary/20
                            file:transition-colors file:duration-150
                            disabled:opacity-50 disabled:cursor-not-allowed
                        "
                    />
                    {isUploading && (
                        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            Đang upload...
                        </div>
                    )}
                </div>

                {/* Preview/Current Value */}
                {value && (
                    <div className="flex items-center gap-3 p-2 bg-card border border-border rounded-lg">
                        {isImage && (
                            <img
                                src={value}
                                alt={field.label}
                                className="w-16 h-16 object-cover rounded"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                }}
                            />
                        )}
                        <a
                            href={value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[13px] text-primary hover:underline truncate flex-1 transition-colors duration-150"
                        >
                            {value.split('/').pop() || value}
                        </a>
                        {!disabled && field.read_only !== 1 && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="text-destructive hover:text-destructive/80 text-[13px] transition-colors duration-150"
                            >
                                {t('common.delete')}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {displayError && (
                <p className="text-sm text-destructive">{displayError}</p>
            )}
            {field.description && !displayError && (
                <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
        </div>
    );
}

AttachField.propTypes = {
    field: PropTypes.shape({
        fieldname: PropTypes.string.isRequired,
        label: PropTypes.string,
        fieldtype: PropTypes.string,
        read_only: PropTypes.number,
        reqd: PropTypes.number,
        description: PropTypes.string,
        parent: PropTypes.string,
    }).isRequired,
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    error: PropTypes.string,
    formData: PropTypes.object,
};

export default AttachField;
