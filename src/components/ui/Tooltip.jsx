import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { cn } from '../../lib/utils';

/**
 * Tooltip Component - Modern tooltip with animations
 * 
 * Usage:
 * <Tooltip content="Tooltip text">
 *   <Button>Hover me</Button>
 * </Tooltip>
 */
const Tooltip = ({
    children,
    content,
    side = 'top', // 'top' | 'bottom' | 'left' | 'right'
    delay = 300,
    className,
    disabled = false
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef(null);
    const tooltipRef = useRef(null);
    const timeoutRef = useRef(null);

    const calculatePosition = () => {
        if (!triggerRef.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const gap = 8;

        let top, left;

        switch (side) {
            case 'bottom':
                top = triggerRect.bottom + gap;
                left = triggerRect.left + triggerRect.width / 2;
                break;
            case 'left':
                top = triggerRect.top + triggerRect.height / 2;
                left = triggerRect.left - gap;
                break;
            case 'right':
                top = triggerRect.top + triggerRect.height / 2;
                left = triggerRect.right + gap;
                break;
            case 'top':
            default:
                top = triggerRect.top - gap;
                left = triggerRect.left + triggerRect.width / 2;
                break;
        }

        setPosition({ top, left });
    };

    const handleMouseEnter = () => {
        if (disabled) return;
        timeoutRef.current = setTimeout(() => {
            calculatePosition();
            setIsVisible(true);
        }, delay);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsVisible(false);
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const getSideClasses = () => {
        switch (side) {
            case 'bottom':
                return 'animate-in slide-in-from-top-1 -translate-x-1/2';
            case 'left':
                return 'animate-in slide-in-from-right-1 -translate-x-full -translate-y-1/2';
            case 'right':
                return 'animate-in slide-in-from-left-1 -translate-y-1/2';
            case 'top':
            default:
                return 'animate-in slide-in-from-bottom-1 -translate-x-1/2 -translate-y-full';
        }
    };

    const tooltipContent = isVisible && content && createPortal(
        <div
            ref={tooltipRef}
            role="tooltip"
            style={{ top: position.top, left: position.left }}
            className={cn(
                "fixed z-[200] px-3 py-1.5 text-xs font-medium rounded-md shadow-lg",
                "bg-card text-foreground border border-border",
                "max-w-xs text-center",
                "fade-in duration-150",
                getSideClasses(),
                className
            )}
        >
            {content}
        </div>,
        document.body
    );

    return (
        <>
            <span
                ref={triggerRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onFocus={handleMouseEnter}
                onBlur={handleMouseLeave}
                className="inline-block"
            >
                {children}
            </span>
            {tooltipContent}
        </>
    );
};

Tooltip.propTypes = {
    children: PropTypes.node.isRequired,
    content: PropTypes.node,
    side: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
    delay: PropTypes.number,
    className: PropTypes.string,
    disabled: PropTypes.bool,
};

export default Tooltip;
