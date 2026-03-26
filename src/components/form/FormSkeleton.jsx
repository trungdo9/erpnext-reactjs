import PropTypes from 'prop-types';

/**
 * Loading skeleton for form with shimmer effect
 */
export function FormSkeleton({ fieldCount = 6 }) {
    return (
        <div className="animate-in fade-in duration-300">
            {/* Header skeleton */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <div className="h-4 w-4 skeleton shimmer rounded"></div>
                    <div className="h-4 w-24 skeleton shimmer rounded"></div>
                    <div className="h-4 w-2 skeleton shimmer rounded"></div>
                    <div className="h-4 w-16 skeleton shimmer rounded"></div>
                </div>
                <div className="h-8 w-64 skeleton shimmer rounded"></div>
            </div>

            {/* Fields skeleton */}
            <div className="space-y-5 p-6 bg-card rounded-xl border border-border shadow-sm">
                {Array.from({ length: fieldCount }).map((_, i) => (
                    <div key={i} className="space-y-2" style={{ animationDelay: `${i * 50}ms` }}>
                        {/* Label */}
                        <div className="h-4 w-28 skeleton shimmer rounded"></div>
                        {/* Input */}
                        <div className="h-10 w-full skeleton shimmer rounded-md"></div>
                    </div>
                ))}

                {/* Actions skeleton */}
                <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-border">
                    <div className="h-9 w-24 skeleton shimmer rounded-md"></div>
                    <div className="h-9 w-20 skeleton shimmer rounded-md"></div>
                </div>
            </div>
        </div>
    );
}

FormSkeleton.propTypes = {
    fieldCount: PropTypes.number,
};

export default FormSkeleton;
