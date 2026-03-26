import {
    LandPlot,
    Users,
    Map,
    LayoutGrid
} from 'lucide-react';

export const LANDING_STATS = [
    {
        id: 'hectares',
        value: 10000,
        suffix: '+',
        duration: 2200,
        labelKey: 'auth.hero.stats_ha',
        icon: LandPlot,
        iconColor: '#34d399', // Emerald-400
        gradientColor: '#10b981', // Emerald-500
    },
    {
        id: 'staff',
        value: 10000,
        suffix: '+',
        duration: 1800,
        labelKey: 'auth.hero.stats_staff',
        icon: Users,
        iconColor: '#fbbf24', // Amber-400
        gradientColor: '#f59e0b', // Amber-500
    },
    {
        id: 'countries',
        value: 3,
        suffix: '',
        duration: 1000,
        labelKey: 'auth.hero.stats_countries',
        icon: Map,
        iconColor: '#a78bfa', // Violet-400
        gradientColor: '#8b5cf6', // Violet-500
    },
    {
        id: 'modules',
        value: 17,
        suffix: '+',
        duration: 1400,
        labelKey: 'landing.stat.modules',
        icon: LayoutGrid,
        iconColor: '#22d3ee', // Cyan-400
        gradientColor: '#06b6d4', // Cyan-500
    },
];

