import { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { PenLine, Eraser, Undo2, Maximize2, Minimize2, X } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { SIGNATURE_CONFIG as CFG } from '../../../config/doctype.behaviors';
import { TRANSITION } from '../../../config/styles';

/**
 * SignatureField — Canvas-based electronic signature
 *
 * Uses signature_pad (vanilla, dynamically loaded) for drawing. Stores as base64 PNG
 * compatible with Frappe's Signature fieldtype (longtext column).
 */

function useSignaturePad(canvasRef, { onEnd, penColor, disabled }) {
    const padRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        let cancelled = false;
        let pad = null;
        let observer = null;

        (async () => {
            const SignaturePad = (await import('signature_pad')).default;
            if (cancelled) return;

            pad = new SignaturePad(canvas, {
                penColor: penColor || CFG.penColor.light,
                backgroundColor: CFG.backgroundColor,
                minWidth: CFG.minWidth,
                maxWidth: CFG.maxWidth,
            });

            if (disabled) pad.off();
            padRef.current = pad;

            if (onEnd) pad.addEventListener('endStroke', onEnd);

            const resize = () => {
                const ratio = Math.max(window.devicePixelRatio || 1, 1);
                const data = pad.toData();
                canvas.width = canvas.offsetWidth * ratio;
                canvas.height = canvas.offsetHeight * ratio;
                canvas.getContext('2d').scale(ratio, ratio);
                pad.clear();
                if (data.length) pad.fromData(data);
            };

            resize();
            observer = new ResizeObserver(resize);
            observer.observe(canvas.parentElement);
        })();

        return () => {
            cancelled = true;
            if (pad) {
                if (onEnd) pad.removeEventListener('endStroke', onEnd);
                pad.off();
            }
            if (observer) observer.disconnect();
        };
    }, [canvasRef, disabled, penColor, onEnd]);

    return padRef;
}

// ─── Inline Signature Pad ────────────────────────────────────────────────────

function SignatureCanvas({ value, onChange, disabled, fieldname, t }) {
    const canvasRef = useRef(null);
    const [isDark] = useState(() => document.documentElement.classList.contains('dark'));
    const [fullscreen, setFullscreen] = useState(false);

    const penColor = isDark ? CFG.penColor.dark : CFG.penColor.light;

    const handleEnd = useCallback(() => {
        if (!onChange) return;
        const pad = canvasRef.current?.__pad;
        if (pad && !pad.isEmpty()) {
            onChange(fieldname, pad.toDataURL('image/png'));
        }
    }, [onChange, fieldname]);

    const padRef = useSignaturePad(canvasRef, {
        onEnd: handleEnd,
        penColor,
        disabled,
    });

    // Expose pad on canvas for handleEnd access
    useEffect(() => {
        if (canvasRef.current && padRef.current) {
            canvasRef.current.__pad = padRef.current;
        }
    }, [padRef]);

    // Load existing value
    useEffect(() => {
        if (value && padRef.current) {
            padRef.current.fromDataURL(value, { ratio: 1 });
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleClear = () => {
        padRef.current?.clear();
        if (onChange) onChange(fieldname, '');
    };

    const handleUndo = () => {
        const pad = padRef.current;
        if (!pad) return;
        const data = pad.toData();
        if (data.length) {
            data.pop();
            pad.fromData(data);
            if (data.length === 0) {
                if (onChange) onChange(fieldname, '');
            } else {
                if (onChange) onChange(fieldname, pad.toDataURL('image/png'));
            }
        }
    };

    const height = fullscreen ? '60vh' : (window.innerWidth < 768 ? CFG.canvasHeightMobile : CFG.canvasHeight);

    const content = (
        <div className="relative">
            {/* Toolbar */}
            {!disabled && (
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/50 bg-muted/30">
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={handleUndo}
                            className={`p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted ${TRANSITION.colors}`}
                            title={t('signature.undo')}
                            aria-label={t('signature.undo')}
                        >
                            <Undo2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={handleClear}
                            className={`p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 ${TRANSITION.colors}`}
                            title={t('signature.clear')}
                            aria-label={t('signature.clear')}
                        >
                            <Eraser className="w-4 h-4" aria-hidden="true" />
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={() => setFullscreen(v => !v)}
                        className={`p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted ${TRANSITION.colors}`}
                        title={t('signature.fullscreen')}
                        aria-label={fullscreen ? 'Exit fullscreen' : t('signature.fullscreen')}
                    >
                        {fullscreen ? <Minimize2 className="w-4 h-4" aria-hidden="true" /> : <Maximize2 className="w-4 h-4" aria-hidden="true" />}
                    </button>
                </div>
            )}

            {/* Canvas */}
            <div className="relative" style={{ height: typeof height === 'number' ? `${height}px` : height }}>
                <canvas
                    ref={canvasRef}
                    className={`w-full h-full ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-crosshair'}`}
                    style={{ touchAction: 'none' }}
                />
                {/* Placeholder text when empty and not disabled */}
                {!disabled && !value && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-sm text-muted-foreground/40 select-none flex items-center gap-2">
                            <PenLine className="w-4 h-4" />
                            {t('signature.signHere')}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );

    if (fullscreen) {
        return (
            <div className="fixed inset-0 z-[500] bg-background flex flex-col" role="dialog" aria-label="Signature fullscreen">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <span className="text-sm font-semibold text-foreground">{t('signature.signHere')}</span>
                    <button
                        type="button"
                        onClick={() => setFullscreen(false)}
                        className="p-2 rounded-full hover:bg-muted transition-colors"
                        aria-label="Exit fullscreen"
                    >
                        <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>
                <div className="flex-1">{content}</div>
            </div>
        );
    }

    return content;
}

// ─── Main Field Component ────────────────────────────────────────────────────

export function SignatureField({ field, value, onChange, disabled, error }) {
    const { t } = useTranslation();
    const isDisabled = disabled || field.read_only === 1;

    return (
        <div className="w-full">
            {field.label && (
                <label className="block text-[13px] font-medium text-muted-foreground mb-1.5">
                    {field.label}
                    {field.reqd === 1 && <span className="text-destructive ml-1">*</span>}
                </label>
            )}

            <div className="rounded-lg border border-border overflow-hidden bg-white dark:bg-gray-950">
                {isDisabled && value ? (
                    /* Read-only: show saved signature */
                    <div className="flex items-center justify-center p-4 min-h-[120px]">
                        <img
                            src={value}
                            alt="Signature"
                            className="max-h-32 object-contain"
                        />
                    </div>
                ) : isDisabled && !value ? (
                    /* Read-only: no signature */
                    <div className="flex flex-col items-center justify-center gap-2 p-6 min-h-[120px]">
                        <PenLine className="w-6 h-6 text-muted-foreground/30" />
                        <p className="text-xs text-muted-foreground">{t('signature.noSignature')}</p>
                    </div>
                ) : (
                    /* Editable: signature pad */
                    <SignatureCanvas
                        value={value}
                        onChange={onChange}
                        disabled={false}
                        fieldname={field.fieldname}
                        t={t}
                    />
                )}
            </div>

            {error && (
                <p className="mt-1.5 text-xs text-destructive font-medium">{error}</p>
            )}
            {field.description && !error && (
                <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
            )}
        </div>
    );
}

SignatureField.propTypes = {
    field: PropTypes.shape({
        fieldname: PropTypes.string.isRequired,
        label: PropTypes.string,
        fieldtype: PropTypes.string,
        read_only: PropTypes.number,
        reqd: PropTypes.number,
        description: PropTypes.string,
    }).isRequired,
    value: PropTypes.string,
    onChange: PropTypes.func,
    disabled: PropTypes.bool,
    error: PropTypes.string,
};

export default SignatureField;
