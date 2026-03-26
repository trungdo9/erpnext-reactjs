/**
 * SwipeActions - Swipeable row with action buttons
 *
 * Mobile-friendly component for row actions (edit, delete, etc.)
 */

import { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../lib/utils';
import { Trash2, Edit, MoreHorizontal } from 'lucide-react';

const SWIPE_THRESHOLD = 80;

export function SwipeActions({
    children,
    onEdit,
    onDelete,
    onMore,
    disabled = false,
    className,
}) {
    const [translateX, setTranslateX] = useState(0);
    const [isRevealed, setIsRevealed] = useState(false);
    const startX = useRef(0);
    const currentX = useRef(0);
    const isDragging = useRef(false);

    const handleTouchStart = (e) => {
        if (disabled) return;
        startX.current = e.touches[0].clientX;
        currentX.current = startX.current;
        isDragging.current = true;
    };

    const handleTouchMove = (e) => {
        if (!isDragging.current || disabled) return;
        currentX.current = e.touches[0].clientX;
        const diff = startX.current - currentX.current;

        // Only allow left swipe (reveal actions)
        if (diff > 0) {
            setTranslateX(Math.min(diff, 160)); // Max 160px
        } else if (isRevealed) {
            // Allow swiping back
            setTranslateX(Math.max(160 + diff, 0));
        }
    };

    const handleTouchEnd = () => {
        isDragging.current = false;
        const diff = startX.current - currentX.current;

        if (diff > SWIPE_THRESHOLD) {
            // Reveal actions
            setTranslateX(160);
            setIsRevealed(true);
        } else if (diff < -SWIPE_THRESHOLD && isRevealed) {
            // Hide actions
            setTranslateX(0);
            setIsRevealed(false);
        } else {
            // Snap back
            setTranslateX(isRevealed ? 160 : 0);
        }
    };

    const handleClose = () => {
        setTranslateX(0);
        setIsRevealed(false);
    };

    return (
        <div className={cn('relative overflow-hidden', className)}>
            {/* Action buttons (behind) */}
            <div className="absolute right-0 top-0 bottom-0 flex items-stretch">
                {onMore && (
                    <button
                        onClick={() => {
                            handleClose();
                            onMore();
                        }}
                        aria-label="More actions"
                        className="w-20 flex items-center justify-center bg-muted-foreground text-white active:bg-foreground"
                    >
                        <MoreHorizontal className="w-5 h-5" aria-hidden="true" />
                    </button>
                )}
                {onEdit && (
                    <button
                        onClick={() => {
                            handleClose();
                            onEdit();
                        }}
                        aria-label="Edit"
                        className="w-20 flex items-center justify-center bg-emerald-600 text-white active:bg-emerald-700"
                    >
                        <Edit className="w-5 h-5" aria-hidden="true" />
                    </button>
                )}
                {onDelete && (
                    <button
                        onClick={() => {
                            handleClose();
                            onDelete();
                        }}
                        aria-label="Delete"
                        className="w-20 flex items-center justify-center bg-destructive text-primary-foreground active:bg-destructive/90"
                    >
                        <Trash2 className="w-5 h-5" aria-hidden="true" />
                    </button>
                )}
            </div>

            {/* Content (front) */}
            <div
                className="relative bg-card transition-transform duration-200 ease-out"
                style={{
                    transform: `translateX(-${translateX}px)`,
                    // eslint-disable-next-line react-hooks/refs -- isDragging ref read is intentional for instant visual feedback without re-render
                    transitionDuration: isDragging.current ? '0ms' : '200ms',
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {children}
            </div>

            {/* Overlay to close on tap */}
            {isRevealed && (
                <div
                    className="absolute inset-0 z-10"
                    style={{ right: 160 }}
                    onClick={handleClose}
                />
            )}
        </div>
    );
}

SwipeActions.propTypes = {
    children: PropTypes.node.isRequired,
    onEdit: PropTypes.func,
    onDelete: PropTypes.func,
    onMore: PropTypes.func,
    disabled: PropTypes.bool,
    className: PropTypes.string,
};

export default SwipeActions;
