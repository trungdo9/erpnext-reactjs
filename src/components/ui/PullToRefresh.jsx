/**
 * PullToRefresh - Mobile pull-to-refresh component
 *
 * Wrap your content to enable pull-to-refresh on mobile.
 */

import { useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { RefreshCw } from 'lucide-react';

const PULL_THRESHOLD = 80;

export function PullToRefresh({
    children,
    onRefresh,
    disabled = false,
    className,
}) {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const containerRef = useRef(null);
    const startY = useRef(0);
    const isPulling = useRef(false);

    const handleTouchStart = useCallback(
        (e) => {
            if (disabled || isRefreshing) return;

            // Only start if at top of scroll
            const container = containerRef.current;
            if (container && container.scrollTop === 0) {
                startY.current = e.touches[0].clientY;
                isPulling.current = true;
            }
        },
        [disabled, isRefreshing]
    );

    const handleTouchMove = useCallback(
        (e) => {
            if (!isPulling.current || disabled || isRefreshing) return;

            const currentY = e.touches[0].clientY;
            const diff = currentY - startY.current;

            if (diff > 0) {
                // Apply resistance
                const resistance = 0.4;
                const distance = Math.min(diff * resistance, 120);
                setPullDistance(distance);

                // Prevent default scroll when pulling
                if (distance > 10) {
                    e.preventDefault();
                }
            }
        },
        [disabled, isRefreshing]
    );

    const handleTouchEnd = useCallback(async () => {
        if (!isPulling.current) return;
        isPulling.current = false;

        if (pullDistance >= PULL_THRESHOLD && onRefresh && !isRefreshing) {
            setIsRefreshing(true);
            setPullDistance(60); // Keep indicator visible

            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
                setPullDistance(0);
            }
        } else {
            setPullDistance(0);
        }
    }, [pullDistance, onRefresh, isRefreshing]);

    const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
    const rotation = progress * 180;

    return (
        <div
            ref={containerRef}
            className={cn('relative overflow-auto', className)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Pull indicator */}
            <motion.div
                className="absolute left-1/2 -translate-x-1/2 z-10 flex items-center justify-center"
                style={{
                    top: pullDistance - 40,
                    opacity: Math.min(progress * 2, 1),
                }}
            >
                <div
                    className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center',
                        'bg-card shadow-lg',
                        'border-2',
                        pullDistance >= PULL_THRESHOLD
                            ? 'border-emerald-500'
                            : 'border-border'
                    )}
                >
                    <motion.div
                        animate={
                            isRefreshing
                                ? { rotate: 360 }
                                : { rotate: rotation }
                        }
                        transition={
                            isRefreshing
                                ? { duration: 1, repeat: Infinity, ease: 'linear' }
                                : { duration: 0 }
                        }
                    >
                        <RefreshCw
                            className={cn(
                                'w-5 h-5',
                                pullDistance >= PULL_THRESHOLD || isRefreshing
                                    ? 'text-emerald-500'
                                    : 'text-muted-foreground'
                            )}
                        />
                    </motion.div>
                </div>
            </motion.div>

            {/* Content */}
            <motion.div
                style={{
                    transform: `translateY(${pullDistance}px)`,
                    transition: isPulling.current ? 'none' : 'transform 0.3s ease-out',
                }}
            >
                {children}
            </motion.div>
        </div>
    );
}

PullToRefresh.propTypes = {
    children: PropTypes.node.isRequired,
    onRefresh: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    className: PropTypes.string,
};

export default PullToRefresh;
