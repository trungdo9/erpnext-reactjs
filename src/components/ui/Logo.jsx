import React from 'react';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../hooks/useTranslation';

/**
 * Steel ERP Logo - Industrial Steel Management Platform
 * Modern SVG monogram with gradient shield mark
 * Updated: 2026-03-25 - Steel Blue Industrial Branding
 */

const GRADIENT_ID = 'steel-grad-premium';

const LogoMark = ({ size = 40, className }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <defs>
            <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#1a365d" />
                <stop offset="45%" stopColor="#1e3a5f" />
                <stop offset="100%" stopColor="#2c5282" />
            </linearGradient>
        </defs>
        {/* Shield shape — deep steel blue */}
        <rect x="2" y="2" width="44" height="44" rx="12" fill={`url(#${GRADIENT_ID})`} />
        {/* White edge accent */}
        <rect x="2" y="2" width="44" height="44" rx="12" fill="none"
            stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />

        {/* Steel beam / I-beam icon — white */}
        <path
            d="M16 14h16v4H28v12h4v4H16v-4h4V18h-4v-4z"
            fill="#ffffff"
            fillOpacity="0.95"
        />
        {/* White accent dot */}
        <circle cx="37" cy="11" r="2.5" fill="#ffffff" fillOpacity="0.85" />
    </svg>
);

const Logo = ({ size = 'md', showText = true, className }) => {
    const { t } = useTranslation();
    const sizes = {
        sm: { mark: 32, text: 'text-lg', subtext: 'text-[10px]' },
        md: { mark: 38, text: 'text-xl', subtext: 'text-xs' },
        lg: { mark: 44, text: 'text-2xl', subtext: 'text-xs' },
        xl: { mark: 56, text: 'text-3xl', subtext: 'text-sm' },
    };

    const s = sizes[size] || sizes.md;

    return (
        <div className={cn('flex items-center gap-3', className)}>
            <LogoMark size={s.mark} />
            {showText && (
                <div className="flex flex-col leading-none justify-center">
                    <span className={cn(s.text, 'font-black tracking-tight text-gray-900 dark:text-white')}>
                        STEEL ERP
                    </span>
                    {size !== 'sm' && (
                        <span className={cn(s.subtext, 'font-medium mt-0.5 text-blue-700 dark:text-blue-400/80 tracking-wide')}>
                            {t('app.complex_name')}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

/**
 * Full Logo - Login page
 */
export const LogoFull = ({ className }) => {
    const { t } = useTranslation();

    return (
        <div className={cn('flex items-center gap-4', className)}>
            <LogoMark size={52} />
            <div className="flex flex-col leading-none">
                <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                    STEEL ERP
                </h1>
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400/80 mt-1 tracking-wide">
                    {t('app.production_system')}
                </p>
            </div>
        </div>
    );
};

/**
 * Compact Logo - Sidebar collapsed
 */
export const LogoCompact = ({ className }) => (
    <LogoMark size={36} className={className} />
);

export { LogoMark };
export default Logo;
