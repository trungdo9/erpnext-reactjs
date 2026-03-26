/**
 * Spacer Widget
 *
 * Renders a visual spacer/divider between workspace sections
 * Used when workspace has "Card Break" type items
 */

import { memo } from 'react';

const SpacerWidget = memo(function SpacerWidget({ spacer }) {
    const label = spacer?.label || '';
    const hasLabel = label && label.trim() !== '';

    return (
        <div className="col-span-full py-4">
            {hasLabel ? (
                // Spacer with label (section divider)
                <div className="flex items-center gap-4">
                    <div className="flex-1 h-px bg-border" />
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        {label}
                    </h3>
                    <div className="flex-1 h-px bg-border" />
                </div>
            ) : (
                // Simple spacer (empty space)
                <div className="h-8" />
            )}
        </div>
    );
});

export default SpacerWidget;
