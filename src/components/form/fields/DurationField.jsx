import { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../lib/utils';

/**
 * Duration field for Duration fieldtype
 *
 * ERPNext stores duration as total seconds (integer).
 * Renders as HH:MM:SS input fields for user-friendly editing.
 */
export function DurationField({ field, value, onChange, disabled, error }) {
    const isDisabled = disabled || field.read_only === 1;
    const totalSeconds = parseInt(value, 10) || 0;

    // Decompose seconds into hours, minutes, seconds
    const { hours, minutes, seconds } = useMemo(() => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return { hours: h, minutes: m, seconds: s };
    }, [totalSeconds]);

    const updateValue = useCallback((h, m, s) => {
        const total = (parseInt(h, 10) || 0) * 3600 + (parseInt(m, 10) || 0) * 60 + (parseInt(s, 10) || 0);
        onChange(field.fieldname, total);
    }, [field.fieldname, onChange]);

    const handleHoursChange = useCallback((e) => {
        updateValue(e.target.value, minutes, seconds);
    }, [updateValue, minutes, seconds]);

    const handleMinutesChange = useCallback((e) => {
        updateValue(hours, e.target.value, seconds);
    }, [updateValue, hours, seconds]);

    const handleSecondsChange = useCallback((e) => {
        updateValue(hours, minutes, e.target.value);
    }, [updateValue, hours, minutes]);

    const inputClass = cn(
        "h-10 w-16 rounded-[6px] border-0 bg-muted px-2 py-1.5 text-sm text-center transition-colors duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50",
        error && "ring-1 ring-destructive"
    );

    return (
        <div className="w-full">
            {field.label && (
                <label
                    htmlFor={field.fieldname}
                    className="block text-[13px] font-medium text-muted-foreground mb-1.5"
                >
                    {field.label}
                    {field.reqd === 1 && <span className="text-destructive ml-1">*</span>}
                </label>
            )}
            <div className="flex items-center gap-1">
                <input
                    type="number"
                    id={`${field.fieldname}-hours`}
                    value={hours}
                    onChange={handleHoursChange}
                    disabled={isDisabled}
                    min="0"
                    placeholder="HH"
                    aria-label="Hours"
                    className={inputClass}
                />
                <span className="text-sm font-medium text-muted-foreground">:</span>
                <input
                    type="number"
                    id={`${field.fieldname}-minutes`}
                    value={minutes}
                    onChange={handleMinutesChange}
                    disabled={isDisabled}
                    min="0"
                    max="59"
                    placeholder="MM"
                    aria-label="Minutes"
                    className={inputClass}
                />
                <span className="text-sm font-medium text-muted-foreground">:</span>
                <input
                    type="number"
                    id={`${field.fieldname}-seconds`}
                    value={seconds}
                    onChange={handleSecondsChange}
                    disabled={isDisabled}
                    min="0"
                    max="59"
                    placeholder="SS"
                    aria-label="Seconds"
                    className={inputClass}
                />
                <span className="ml-2 text-xs text-muted-foreground">
                    ({totalSeconds}s)
                </span>
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

DurationField.propTypes = {
    field: PropTypes.shape({
        fieldname: PropTypes.string.isRequired,
        label: PropTypes.string,
        fieldtype: PropTypes.string,
        read_only: PropTypes.number,
        reqd: PropTypes.number,
        description: PropTypes.string,
    }).isRequired,
    value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    error: PropTypes.string,
};

export default DurationField;
