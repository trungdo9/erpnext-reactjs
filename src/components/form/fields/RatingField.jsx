import { useCallback } from 'react';
import PropTypes from 'prop-types';
import { Star } from 'lucide-react';
import { cn } from '../../../lib/utils';

/**
 * Star rating field for Rating fieldtype
 *
 * ERPNext stores rating as a decimal:
 *   0 = 0 stars, 0.2 = 1 star, 0.4 = 2 stars, 0.6 = 3 stars, 0.8 = 4 stars, 1.0 = 5 stars
 * Each star increment is 1/5 = 0.2
 */
const TOTAL_STARS = 5;
const STEP = 1 / TOTAL_STARS; // 0.2

export function RatingField({ field, value, onChange, disabled, error }) {
    const isDisabled = disabled || field.read_only === 1;
    const numericValue = parseFloat(value) || 0;
    const filledStars = Math.round(numericValue / STEP);

    const handleClick = useCallback((starIndex) => {
        if (isDisabled) return;
        const newValue = (starIndex + 1) * STEP;
        // If clicking the same star, toggle it off
        const currentStars = Math.round(numericValue / STEP);
        if (currentStars === starIndex + 1) {
            onChange(field.fieldname, 0);
        } else {
            onChange(field.fieldname, parseFloat(newValue.toFixed(2)));
        }
    }, [isDisabled, numericValue, field.fieldname, onChange]);

    return (
        <div className="w-full">
            {field.label && (
                <label
                    className="block text-[13px] font-medium text-muted-foreground mb-1.5"
                >
                    {field.label}
                    {field.reqd === 1 && <span className="text-destructive ml-1">*</span>}
                </label>
            )}
            <div
                className={cn(
                    "flex items-center gap-1 py-1",
                    isDisabled && "opacity-50 cursor-not-allowed"
                )}
                role="radiogroup"
                aria-label={field.label || 'Rating'}
            >
                {Array.from({ length: TOTAL_STARS }, (_, i) => {
                    const isFilled = i < filledStars;
                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={() => handleClick(i)}
                            disabled={isDisabled}
                            role="radio"
                            aria-checked={isFilled}
                            aria-label={`${i + 1} star${i > 0 ? 's' : ''}`}
                            className={cn(
                                "p-0.5 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                                !isDisabled && "cursor-pointer hover:scale-110",
                                isDisabled && "cursor-not-allowed"
                            )}
                        >
                            <Star
                                className={cn(
                                    "w-5 h-5 transition-colors",
                                    isFilled
                                        ? "fill-emerald-400 text-emerald-400"
                                        : "fill-none text-muted-foreground/30"
                                )}
                            />
                        </button>
                    );
                })}
                <span className="ml-2 text-xs text-muted-foreground">
                    {filledStars}/{TOTAL_STARS}
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

RatingField.propTypes = {
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

export default RatingField;
