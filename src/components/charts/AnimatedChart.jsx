/**
 * AnimatedChart - Premium animated charts
 *
 * SVG-based charts with smooth animations and gradient fills.
 */

import { useMemo } from 'react';
import PropTypes from 'prop-types';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

/**
 * Animated Line Chart
 */
export function LineChart({
    data = [],
    width = 400,
    height = 200,
    color = 'amber',
    showArea = true,
    showDots = true,
    animate = true,
    className,
}) {
    // Framer Motion handles mount animation via initial/animate props
    const isVisible = true;

    const colors = {
        amber: { stroke: '#F59E0B', fill: 'url(#amberGradient)' },
        cyan: { stroke: '#06B6D4', fill: 'url(#cyanGradient)' },
        purple: { stroke: '#8B5CF6', fill: 'url(#purpleGradient)' },
        orange: { stroke: '#F97316', fill: 'url(#orangeGradient)' },
    };

    const padding = useMemo(() => ({ top: 20, right: 20, bottom: 30, left: 40 }), []);
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const { path, areaPath, points } = useMemo(() => {
        if (data.length === 0) return { path: '', areaPath: '', points: [], maxValue: 100, minValue: 0 };

        const values = data.map((d) => d.value);
        const max = Math.max(...values);
        const min = Math.min(...values);
        const range = max - min || 1;

        const pts = data.map((d, i) => ({
            x: padding.left + (i / (data.length - 1)) * chartWidth,
            y: padding.top + chartHeight - ((d.value - min) / range) * chartHeight,
            value: d.value,
            label: d.label,
        }));

        const pathStr = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        const areaStr = `${pathStr} L ${pts[pts.length - 1].x} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`;

        return { path: pathStr, areaPath: areaStr, points: pts, maxValue: max, minValue: min };
    }, [data, chartWidth, chartHeight, height, padding]);

    return (
        <svg width={width} height={height} className={className}>
            {/* Gradients */}
            <defs>
                <linearGradient id="amberGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="cyanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#F97316" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                <line
                    key={ratio}
                    x1={padding.left}
                    y1={padding.top + chartHeight * ratio}
                    x2={width - padding.right}
                    y2={padding.top + chartHeight * ratio}
                    stroke="currentColor"
                    strokeOpacity="0.1"
                    strokeDasharray="4 4"
                />
            ))}

            {/* Area */}
            {showArea && (
                <motion.path
                    d={areaPath}
                    fill={colors[color].fill}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isVisible ? 1 : 0 }}
                    transition={{ duration: 0.5 }}
                />
            )}

            {/* Line */}
            <motion.path
                d={path}
                fill="none"
                stroke={colors[color].stroke}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: isVisible && animate ? 1 : 0 }}
                transition={{ duration: 1.5, ease: 'easeInOut' }}
            />

            {/* Dots */}
            {showDots &&
                points.map((point, i) => (
                    <motion.circle
                        key={i}
                        cx={point.x}
                        cy={point.y}
                        r="4"
                        fill={colors[color].stroke}
                        initial={{ scale: 0 }}
                        animate={{ scale: isVisible ? 1 : 0 }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
                        className="cursor-pointer hover:r-6"
                    />
                ))}

            {/* X-axis labels */}
            {points.map((point, i) => (
                <text
                    key={i}
                    x={point.x}
                    y={height - 10}
                    textAnchor="middle"
                    className="text-xs fill-muted-foreground"
                >
                    {point.label}
                </text>
            ))}
        </svg>
    );
}

/**
 * Animated Bar Chart
 */
export function BarChart({
    data = [],
    width = 400,
    height = 200,
    color = 'amber',
    animate = true,
    className,
}) {
    // Framer Motion handles mount animation via initial/animate props
    const isVisible = true;

    const colors = {
        amber: ['#F59E0B', '#FBBF24'],
        cyan: ['#06B6D4', '#22D3EE'],
        purple: ['#8B5CF6', '#A78BFA'],
        orange: ['#F97316', '#FB923C'],
    };

    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxValue = Math.max(...data.map((d) => d.value), 1);
    const barWidth = chartWidth / data.length - 10;

    return (
        <svg width={width} height={height} className={className}>
            <defs>
                <linearGradient id={`barGradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={colors[color][0]} />
                    <stop offset="100%" stopColor={colors[color][1]} />
                </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                <line
                    key={ratio}
                    x1={padding.left}
                    y1={padding.top + chartHeight * ratio}
                    x2={width - padding.right}
                    y2={padding.top + chartHeight * ratio}
                    stroke="currentColor"
                    strokeOpacity="0.1"
                />
            ))}

            {/* Bars */}
            {data.map((item, i) => {
                const barHeight = (item.value / maxValue) * chartHeight;
                const x = padding.left + (chartWidth / data.length) * i + 5;
                const y = padding.top + chartHeight - barHeight;

                return (
                    <g key={i}>
                        <motion.rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={barHeight}
                            rx="4"
                            fill={`url(#barGradient-${color})`}
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: isVisible && animate ? 1 : 0 }}
                            transition={{ delay: i * 0.1, duration: 0.5, ease: 'easeOut' }}
                            style={{ transformOrigin: 'bottom' }}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                        />
                        <text
                            x={x + barWidth / 2}
                            y={height - 15}
                            textAnchor="middle"
                            className="text-xs fill-muted-foreground"
                        >
                            {item.label}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

/**
 * Animated Donut Chart
 */
export function DonutChart({
    data = [],
    size = 200,
    strokeWidth = 30,
    animate = true,
    className,
}) {
    // Framer Motion handles mount animation via initial/animate props
    const isVisible = true;

    const colors = ['#F59E0B', '#06B6D4', '#8B5CF6', '#F97316', '#EC4899', '#10B981'];
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    // Pre-compute offsets to avoid mutating during render
    const segments = useMemo(() => {
        return data.reduce((acc, item, i) => {
            const percentage = item.value / total;
            const dashLength = circumference * percentage;
            const currentOffset = i === 0 ? 0 : acc[i - 1].offset + acc[i - 1].dashLength;
            acc.push({ dashLength, offset: currentOffset, item, index: i });
            return acc;
        }, []);
    }, [data, total, circumference]);

    return (
        <div className={cn('relative', className)} style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                {segments.map(({ dashLength, offset, index }) => (
                    <motion.circle
                        key={index}
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={colors[index % colors.length]}
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${dashLength} ${circumference}`}
                        strokeDashoffset={-offset}
                        strokeLinecap="round"
                        initial={{ strokeDasharray: `0 ${circumference}` }}
                        animate={{
                            strokeDasharray: isVisible && animate ? `${dashLength} ${circumference}` : `0 ${circumference}`,
                        }}
                        transition={{ delay: index * 0.2, duration: 0.8, ease: 'easeOut' }}
                    />
                ))}
            </svg>

            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-foreground">
                    {total.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">Total</span>
            </div>
        </div>
    );
}

/**
 * Animated Progress Ring
 */
export function ProgressRing({
    value = 0,
    max = 100,
    size = 120,
    strokeWidth = 8,
    color = 'amber',
    showValue = true,
    className,
}) {
    const colors = {
        amber: '#F59E0B',
        cyan: '#06B6D4',
        purple: '#8B5CF6',
        orange: '#F97316',
    };

    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const percentage = Math.min(value / max, 1);
    const dashOffset = circumference * (1 - percentage);

    return (
        <div className={cn('relative', className)} style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Background */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity="0.1"
                    strokeWidth={strokeWidth}
                />
                {/* Progress */}
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={colors[color]}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: dashOffset }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                />
            </svg>

            {showValue && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-foreground">
                        {Math.round(percentage * 100)}%
                    </span>
                </div>
            )}
        </div>
    );
}

// PropTypes
LineChart.propTypes = {
    data: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string, value: PropTypes.number })),
    width: PropTypes.number,
    height: PropTypes.number,
    color: PropTypes.oneOf(['amber', 'cyan', 'purple', 'orange']),
    showArea: PropTypes.bool,
    showDots: PropTypes.bool,
    animate: PropTypes.bool,
    className: PropTypes.string,
};

BarChart.propTypes = {
    data: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string, value: PropTypes.number })),
    width: PropTypes.number,
    height: PropTypes.number,
    color: PropTypes.oneOf(['amber', 'cyan', 'purple', 'orange']),
    animate: PropTypes.bool,
    className: PropTypes.string,
};

DonutChart.propTypes = {
    data: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string, value: PropTypes.number })),
    size: PropTypes.number,
    strokeWidth: PropTypes.number,
    animate: PropTypes.bool,
    className: PropTypes.string,
};

ProgressRing.propTypes = {
    value: PropTypes.number,
    max: PropTypes.number,
    size: PropTypes.number,
    strokeWidth: PropTypes.number,
    color: PropTypes.oneOf(['amber', 'cyan', 'purple', 'orange']),
    showValue: PropTypes.bool,
    className: PropTypes.string,
};

export default { LineChart, BarChart, DonutChart, ProgressRing };
