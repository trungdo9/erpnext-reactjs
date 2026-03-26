/* eslint-disable react-hooks/static-components -- getIcon returns stable component refs from registry */
/**
 * WorkspacePage - ERPNext v16 Content-Driven Workspace
 *
 * Renders workspace blocks from the `content` JSON field in exact order,
 * matching ERPNext v16's EditorJS-based layout system.
 *
 * Content block types supported:
 * - chart: Dashboard Chart (via ChartWidget)
 * - number_card: Number Card (via NumberCardWidget)
 * - shortcut: Workspace Shortcut (ShortcutCard)
 * - card: Link group by Card Break label (via LinkCardWidget)
 * - header: Section header (HTML text)
 * - spacer: Visual separator
 * - paragraph: Text content (HTML)
 * - quick_list: Quick List (via QuickListWidget)
 * - custom_block: Custom HTML (via CustomHTMLWidget)
 *
 * Column widths from `data.col` map to a 12-column CSS grid.
 */

import { lazy, Suspense, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ChevronRight, ShieldAlert, Home, FileText, RefreshCw } from 'lucide-react';
import DOMPurify from 'dompurify';

// Workspace-specific dashboard widgets (lazy-loaded)
const ProductionReport = lazy(() => import('./steel/ProductionReport'));
const HRDashboard = lazy(() => import('./steel/HRDashboard'));
const FinanceDashboard = lazy(() => import('./steel/FinanceDashboard'));
const BuyingDashboard = lazy(() => import('./steel/BuyingDashboard'));
const StockDashboard = lazy(() => import('./steel/StockDashboard'));
const KinhDoanhDashboard = lazy(() => import('./steel/KinhDoanhDashboard'));
const WORKSPACE_DASHBOARDS = {
    'Sản Xuất Thép': ProductionReport,
    'Nhân sự': HRDashboard,
    'Tài Chính Kế Toán': FinanceDashboard,
    'Mua Hàng': BuyingDashboard,
    'Kho & Vật tư': StockDashboard,
    'Kinh Doanh': KinhDoanhDashboard,
};
import { apiClient } from '../api/gateway';
import { getIcon } from '../config/icons';
import { cn } from '../lib/utils';
import { useTranslation } from '../hooks/useTranslation';
import Button from '../components/ui/Button';

import {
    NumberCardWidget,
    ChartWidget,
    QuickListWidget,
    CustomHTMLWidget,
    LinkCardWidget,
} from '../components/workspace';
import { WORKSPACE_SHORTCUT_OVERRIDES, CUSTOM_WORKSPACE_REDIRECTS, getDoctypeImage } from '../config/doctype.behaviors';

// ---------------------------------------------------------------------------
// Column width mapping (ERPNext 12-col grid → Tailwind)
// All classes must be spelled out for Tailwind's JIT compiler.
// ---------------------------------------------------------------------------
const COL_CLASSES = {
    1: 'col-span-12 md:col-span-1',
    2: 'col-span-12 md:col-span-2',
    3: 'col-span-12 md:col-span-3',
    4: 'col-span-12 md:col-span-4',
    5: 'col-span-12 md:col-span-5',
    6: 'col-span-12 md:col-span-6',
    7: 'col-span-12 md:col-span-7',
    8: 'col-span-12 md:col-span-8',
    9: 'col-span-12 md:col-span-9',
    10: 'col-span-12 md:col-span-10',
    11: 'col-span-12 md:col-span-11',
    12: 'col-span-12',
};

const getColClass = (col) => COL_CLASSES[col] || 'col-span-12';

// ---------------------------------------------------------------------------
// Shortcut color schemes
// ---------------------------------------------------------------------------
const SHORTCUT_COLORS = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
    pink: 'bg-pink-500',
    purple: 'bg-purple-500',
    cyan: 'bg-cyan-500',
    grey: 'bg-slate-500',
    amber: 'bg-amber-500',
    indigo: 'bg-indigo-500',
    teal: 'bg-teal-500',
    emerald: 'bg-emerald-500',
    slate: 'bg-slate-500',
};
// Cycle through colors when shortcut has no color assigned
const COLOR_CYCLE = ['bg-blue-500', 'bg-orange-500', 'bg-emerald-500', 'bg-purple-500', 'bg-cyan-500', 'bg-red-500', 'bg-indigo-500', 'bg-amber-500'];
const DEFAULT_SC_COLOR = 'bg-primary';

// ---------------------------------------------------------------------------
// Data fetching – content-driven
// ---------------------------------------------------------------------------

/**
 * Build a map of link groups from the `links` child table.
 * Links are grouped by their preceding Card Break label.
 * Permission-filters DocType links.
 */
const buildLinkGroupMap = (links) => {
    // No permission checking - show all links, like ERPNext does.
    // Access errors are handled when the user actually navigates.
    const map = {};
    let currentGroup = null;

    for (const link of links || []) {
        if (link.type === 'Card Break') {
            currentGroup = link.label;
            map[currentGroup] = [];
            continue;
        }
        if (!currentGroup) continue;

        map[currentGroup].push({
            label: link.label || link.link_to,
            type: link.link_type || 'DocType',
            link_to: link.link_to,
            icon: link.icon,
            description: link.description,
            onboard: link.onboard,
            is_query_report: link.is_query_report,
        });
    }

    return map;
};

/**
 * Fetch workspace data and prepare lookup maps for content-driven rendering.
 */
const fetchWorkspaceData = async (workspaceName) => {
    const wsDoc = await apiClient.getDoc('Workspace', workspaceName);
    if (!wsDoc) throw new Error('Workspace not found');

    // 1. Parse content JSON – the authoritative layout source
    let contentBlocks = [];
    try {
        contentBlocks = JSON.parse(wsDoc.content || '[]');
    } catch {
        contentBlocks = [];
    }

    // 2. Build lookup maps from child tables

    // Charts: keyed by chart_name
    const chartMap = {};
    for (const c of wsDoc.charts || []) {
        chartMap[c.chart_name] = c;
    }

    // Number cards: keyed by number_card_name
    const numberCardMap = {};
    for (const nc of wsDoc.number_cards || []) {
        numberCardMap[nc.number_card_name] = nc;
    }

    // Shortcuts: keyed by BOTH name and label (content JSON uses name)
    const shortcutMap = {};
    for (const sc of wsDoc.shortcuts || []) {
        shortcutMap[sc.name] = sc;
        if (sc.label) shortcutMap[sc.label] = sc;
    }

    // Link groups: Card Break label → [links]
    const linkGroupMap = buildLinkGroupMap(wsDoc.links);

    // Individual links: keyed by name AND link_to (for type="link" content blocks)
    const linkMap = {};
    for (const link of wsDoc.links || []) {
        linkMap[link.name] = link;
        if (link.link_to) linkMap[link.link_to] = link;
        if (link.label) linkMap[link.label] = link;
    }

    // Quick lists: keyed by BOTH name and label
    const quickListMap = {};
    for (const ql of wsDoc.quick_lists || []) {
        quickListMap[ql.name] = ql;
        if (ql.label) quickListMap[ql.label] = ql;
        if (ql.document_type) quickListMap[ql.document_type] = ql;
    }

    // Custom blocks: keyed by BOTH name and label
    const customBlockMap = {};
    for (const cb of wsDoc.custom_blocks || []) {
        customBlockMap[cb.name] = cb;
        if (cb.label) customBlockMap[cb.label] = cb;
    }

    // If content JSON is empty but child tables have data, generate fallback blocks
    if (contentBlocks.length === 0) {
        contentBlocks = generateFallbackBlocks({
            numberCardMap,
            chartMap,
            shortcutMap,
            linkGroupMap,
            quickListMap,
            customBlockMap,
        });
    } else {
        // Content JSON exists but may not reference all child table items.
        // ERPNext renders unreferenced items too — inject them into the layout.
        const referencedNC = new Set();
        const referencedQL = new Set();
        const referencedChart = new Set();
        const referencedSC = new Set();
        const referencedLink = new Set();
        const referencedCB = new Set();
        const referencedCard = new Set();
        for (const block of contentBlocks) {
            if (block.type === 'number_card' && block.data?.number_card_name) referencedNC.add(block.data.number_card_name);
            if (block.type === 'quick_list' && block.data?.quick_list_name) referencedQL.add(block.data.quick_list_name);
            if (block.type === 'chart' && block.data?.chart_name) referencedChart.add(block.data.chart_name);
            if (block.type === 'shortcut' && block.data?.shortcut_name) referencedSC.add(block.data.shortcut_name);
            if (block.type === 'link' && block.data?.link_name) referencedLink.add(block.data.link_name);
            if (block.type === 'custom_block' && block.data?.custom_block_name) referencedCB.add(block.data.custom_block_name);
            if (block.type === 'card' && block.data?.card_name) referencedCard.add(block.data.card_name);
        }

        // Prepend unreferenced number cards (top of page, like ERPNext)
        const missingNC = (wsDoc.number_cards || []).filter(nc => !referencedNC.has(nc.number_card_name));
        if (missingNC.length > 0) {
            const ncCol = missingNC.length <= 2 ? 6 : missingNC.length === 3 ? 4 : 3;
            const ncBlocks = missingNC.map(nc => ({ type: 'number_card', data: { number_card_name: nc.number_card_name, col: ncCol } }));
            contentBlocks = [...ncBlocks, ...contentBlocks];
        }

        // Prepend unreferenced charts (after number cards)
        const missingCharts = (wsDoc.charts || []).filter(c => !referencedChart.has(c.chart_name));
        if (missingCharts.length > 0) {
            const chartBlocks = missingCharts.map(c => ({ type: 'chart', data: { chart_name: c.chart_name, col: 12 } }));
            const ncCount = missingNC.length;
            contentBlocks = [...contentBlocks.slice(0, ncCount), ...chartBlocks, ...contentBlocks.slice(ncCount)];
        }

        // Inject unreferenced shortcuts (after charts)
        const missingSC = (wsDoc.shortcuts || []).filter(sc => !referencedSC.has(sc.name) && !referencedSC.has(sc.label));
        if (missingSC.length > 0) {
            const scBlocks = missingSC.map(sc => ({ type: 'shortcut', data: { shortcut_name: sc.name, col: 3 } }));
            contentBlocks = [...contentBlocks, ...scBlocks];
        }

        // Inject unreferenced link card groups
        const missingCards = Object.keys(linkGroupMap).filter(n => !referencedCard.has(n));
        if (missingCards.length > 0) {
            const cardBlocks = missingCards.map(name => ({ type: 'card', data: { card_name: name, col: 6 } }));
            contentBlocks = [...contentBlocks, ...cardBlocks];
        }

        // Append unreferenced quick lists (bottom of page)
        const missingQL = (wsDoc.quick_lists || []).filter(ql => !referencedQL.has(ql.name) && !referencedQL.has(ql.label));
        if (missingQL.length > 0) {
            const qlBlocks = missingQL.map(ql => ({ type: 'quick_list', data: { quick_list_name: ql.name, col: 12 } }));
            contentBlocks = [...contentBlocks, ...qlBlocks];
        }

        // Append unreferenced custom blocks
        const missingCB = (wsDoc.custom_blocks || []).filter(cb => !referencedCB.has(cb.name) && !referencedCB.has(cb.label));
        if (missingCB.length > 0) {
            const cbBlocks = missingCB.map(cb => ({ type: 'custom_block', data: { custom_block_name: cb.name, col: 12 } }));
            contentBlocks = [...contentBlocks, ...cbBlocks];
        }
    }

    return {
        name: wsDoc.name,
        label: wsDoc.label || wsDoc.name,
        icon: wsDoc.icon,
        contentBlocks,
        chartMap,
        numberCardMap,
        shortcutMap,
        linkGroupMap,
        linkMap,
        quickListMap,
        customBlockMap,
    };
};

/**
 * Generate content blocks from child tables when content JSON is empty.
 * This handles workspaces configured via child table tabs but not the EditorJS editor.
 */
const generateFallbackBlocks = ({ numberCardMap, chartMap, shortcutMap, linkGroupMap, quickListMap, customBlockMap }) => {
    const blocks = [];

    // Number cards: 4 per row (col=3 each)
    const ncNames = Object.keys(numberCardMap);
    if (ncNames.length > 0) {
        const ncCol = ncNames.length <= 2 ? 6 : ncNames.length === 3 ? 4 : 3;
        ncNames.forEach(name => {
            blocks.push({ type: 'number_card', data: { number_card_name: name, col: ncCol } });
        });
    }

    // Charts: full width
    Object.keys(chartMap).forEach(name => {
        blocks.push({ type: 'chart', data: { chart_name: name, col: 12 } });
    });

    // Shortcuts + links: group into a section for compact icon grid
    const uniqueShortcuts = [...new Set(Object.values(shortcutMap))];
    const hasLinks = Object.keys(linkGroupMap).length > 0;
    if (uniqueShortcuts.length > 0 || hasLinks) {
        blocks.push({ type: 'header', data: { text: 'Thao tác nhanh', col: 12 } });
        uniqueShortcuts.forEach(sc => {
            blocks.push({ type: 'shortcut', data: { shortcut_name: sc.name, col: 3 } });
        });
        // Flatten link groups into individual link blocks inside the same section
        Object.entries(linkGroupMap).forEach(([, links]) => {
            links.forEach(link => {
                if (link.type !== 'Card Break') {
                    blocks.push({ type: 'link', data: { link_name: link.link_to || link.label, col: 3 } });
                }
            });
        });
    }

    // Quick lists: full width (deduplicate - quickListMap has name/label/document_type keys)
    const uniqueQuickLists = [...new Set(Object.values(quickListMap))];
    uniqueQuickLists.forEach(ql => {
        blocks.push({ type: 'quick_list', data: { quick_list_name: ql.name, col: 12 } });
    });

    // Custom blocks: full width (deduplicate - customBlockMap has name+label keys)
    const uniqueCustomBlocks = [...new Set(Object.values(customBlockMap))];
    uniqueCustomBlocks.forEach(cb => {
        blocks.push({ type: 'custom_block', data: { custom_block_name: cb.name, col: 12 } });
    });

    return blocks;
};

// ---------------------------------------------------------------------------
// Small presentational components
// ---------------------------------------------------------------------------

/**
 * Unified shortcut card — solid color, white icon, white text.
 * Used everywhere: standalone grid, inside sections, fallback blocks.
 */
const ShortcutCard = ({ shortcut, onClick, index = 0 }) => {
    const { t, getWidgetLabel } = useTranslation();

    const linkTo = shortcut.linkTo || (shortcut.url && shortcut.url.replace('/app/', '')) || shortcut.label;
    const override = WORKSPACE_SHORTCUT_OVERRIDES[linkTo] || {};
    const IconComponent = getIcon(override.icon || shortcut.icon);
    const colorKey = (override.color || shortcut.color || '').toLowerCase();
    const bgColor = SHORTCUT_COLORS[colorKey] || COLOR_CYCLE[index % COLOR_CYCLE.length] || DEFAULT_SC_COLOR;
    const description = override.description || null;

    return (
        <button
            onClick={onClick}
            className={cn(
                "group relative flex flex-col items-start justify-between w-full",
                "p-4 rounded-2xl cursor-pointer min-h-[128px]",
                bgColor,
                "hover:opacity-90 hover:shadow-lg",
                "transition-all duration-200",
                "active:scale-[0.97]",
            )}
        >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 mb-auto">
                {IconComponent && <IconComponent className="h-5 w-5 text-white" />}
            </div>
            <div className="flex flex-col items-start min-w-0 w-full gap-0.5 mt-3">
                <span className="text-[13px] font-bold text-white leading-tight text-left line-clamp-2">
                    {getWidgetLabel(shortcut.label)}
                </span>
                {description && (
                    <span className="text-[11px] text-white/70 leading-tight text-left line-clamp-2">
                        {t(description)}
                    </span>
                )}
            </div>
        </button>
    );
};

// ---------------------------------------------------------------------------
// Section colors (cycling palette for grouped sections)
// ---------------------------------------------------------------------------
const SECTION_COLORS = [
    { border: 'border-l-emerald-500', icon: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
    { border: 'border-l-blue-500',    icon: 'text-blue-600 dark:text-blue-400',       bg: 'bg-blue-500/10' },
    { border: 'border-l-purple-500',  icon: 'text-purple-600 dark:text-purple-400',   bg: 'bg-purple-500/10' },
    { border: 'border-l-amber-500',   icon: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-500/10' },
    { border: 'border-l-orange-500',  icon: 'text-orange-600 dark:text-orange-400',   bg: 'bg-orange-500/10' },
    { border: 'border-l-cyan-500',    icon: 'text-cyan-600 dark:text-cyan-400',       bg: 'bg-cyan-500/10' },
    { border: 'border-l-red-500',     icon: 'text-red-600 dark:text-red-400',         bg: 'bg-red-500/10' },
    { border: 'border-l-indigo-500',  icon: 'text-indigo-600 dark:text-indigo-400',   bg: 'bg-indigo-500/10' },
];

// ---------------------------------------------------------------------------
// Group content blocks into sections (header + children)
// ---------------------------------------------------------------------------

/**
 * Pre-process contentBlocks: group header + subsequent shortcuts/links
 * into section objects for card-based rendering.
 *
 * Returns a mixed array of:
 *  - { type: 'section', title, children: [...blocks], colorIdx }
 *  - original blocks for non-groupable types (chart, number_card, etc.)
 */
const groupBlocksIntoSections = (blocks, workspace) => {
    const result = [];
    let currentSection = null;
    let sectionIdx = 0;

    const flushSection = () => {
        if (currentSection && currentSection.children.length > 0) {
            result.push(currentSection);
            sectionIdx++;
        }
        currentSection = null;
    };

    for (const block of blocks) {
        const { type, data } = block;

        if (type === 'header') {
            flushSection();
            const rawText = data?.text || '';
            const plainText = rawText.replace(/<[^>]*>/g, '').trim();
            currentSection = {
                type: 'section',
                title: plainText,
                children: [],
                colorIdx: sectionIdx,
                id: `section-${sectionIdx}`,
            };
            continue;
        }

        if (type === 'spacer') {
            // Spacers just separate sections, don't render
            flushSection();
            continue;
        }

        // Group-able types: shortcuts, links, cards
        if (currentSection && (type === 'shortcut' || type === 'link' || type === 'card')) {
            currentSection.children.push(block);
            continue;
        }

        // Non-groupable types (chart, number_card, quick_list, custom_block, paragraph)
        // flush any open section, then add as standalone
        flushSection();
        result.push(block);
    }

    flushSection();
    return result;
};

// ---------------------------------------------------------------------------
// Compact shortcut for inside section cards (icon-centric)
// ---------------------------------------------------------------------------

// ShortcutCard removed — use ShortcutCard everywhere

// ---------------------------------------------------------------------------
// Section Card – grouped header + shortcuts/links
// ---------------------------------------------------------------------------

const SectionCard = ({ section, workspace, onNavigate, translate }) => {
    const sectionColor = SECTION_COLORS[section.colorIdx % SECTION_COLORS.length];

    const renderChild = (block, idx) => {
        const { type, data } = block;

        if (type === 'shortcut') {
            const sc = workspace.shortcutMap[data.shortcut_name];
            if (!sc) return null;
            return (
                <ShortcutCard
                    key={`sc-${idx}`}
                    index={idx}
                    shortcut={{
                        label: sc.label || sc.link_to,
                        type: sc.type,
                        linkTo: sc.link_to || (sc.url && sc.url.replace('/app/', '')) || sc.label,
                        icon: sc.icon,
                        color: sc.color,
                    }}
                    onClick={() => onNavigate(sc.type, sc.link_to, sc.url)}
                />
            );
        }

        if (type === 'link') {
            const link = workspace.linkMap?.[data.link_name];
            if (!link || link.type === 'Card Break') return null;
            return (
                <ShortcutCard
                    key={`lk-${idx}`}
                    index={idx}
                    shortcut={{
                        label: link.label || link.link_to,
                        linkTo: link.link_to,
                        icon: link.icon,
                    }}
                    onClick={() => onNavigate(link.link_type || 'DocType', link.link_to, link.url)}
                />
            );
        }

        if (type === 'card') {
            const links = workspace.linkGroupMap[data.card_name];
            if (!links || links.length === 0) return null;
            return (
                <div key={`crd-${idx}`} className="col-span-full">
                    <LinkCardWidget
                        linkCard={{ label: data.card_name, links }}
                        onNavigate={onNavigate}
                    />
                </div>
            );
        }

        return null;
    };

    const translated = translate ? translate(section.title) : section.title;

    return (
        <div className={cn(
            "bg-card dark:bg-white/[0.03]",
            "border border-border/50 dark:border-white/[0.06]",
            "border-l-4", sectionColor.border,
            "rounded-2xl overflow-hidden h-full",
            "transition-colors duration-150",
        )}>
            {/* Section header */}
            <div className="px-4 pt-4 pb-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {translated}
                </h3>
            </div>

            {/* Section content – grid of compact shortcuts */}
            <div className="px-3 pb-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {section.children.map((block, idx) => renderChild(block, idx))}
                </div>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Content block renderer (standalone blocks, not inside sections)
// ---------------------------------------------------------------------------

const renderStandaloneBlock = (block, index, workspace, onNavigate, translate) => {
    const { type, data, id } = block;
    if (!data) return null;

    const col = data.col || 12;
    const colClass = getColClass(col);
    const key = id || `${type}-${index}`;

    switch (type) {
        // ---- Charts ----
        case 'chart': {
            const chart = workspace.chartMap[data.chart_name];
            if (!chart) return null;
            return (
                <div key={key} className={colClass}>
                    <ChartWidget chart={chart} />
                </div>
            );
        }

        // ---- Number Cards ----
        case 'number_card': {
            const card = workspace.numberCardMap[data.number_card_name];
            if (!card) return null;
            return (
                <div key={key} className={colClass}>
                    <NumberCardWidget card={card} />
                </div>
            );
        }

        // ---- Shortcuts (standalone, not in a section) ----
        case 'shortcut': {
            const sc = workspace.shortcutMap[data.shortcut_name];
            if (!sc) return null;
            return (
                <div key={key} className={colClass}>
                    <ShortcutCard
                        shortcut={{
                            label: sc.label || sc.link_to,
                            type: sc.type,
                            linkTo: sc.link_to || (sc.url && sc.url.replace('/app/', '')) || sc.label,
                            icon: sc.icon,
                            color: sc.color,
                            url: sc.url,
                        }}
                        index={index}
                        onClick={() => onNavigate(sc.type, sc.link_to, sc.url)}
                    />
                </div>
            );
        }

        // ---- Link Cards (grouped links) ----
        case 'card': {
            const links = workspace.linkGroupMap[data.card_name];
            if (!links || links.length === 0) return null;
            return (
                <div key={key} className={colClass}>
                    <LinkCardWidget
                        linkCard={{ label: data.card_name, links }}
                        onNavigate={onNavigate}
                    />
                </div>
            );
        }

        // ---- Individual Link ----
        case 'link': {
            const link = workspace.linkMap?.[data.link_name];
            if (!link || link.type === 'Card Break') return null;
            const linkImage = getDoctypeImage(link.link_to);
            return (
                <div key={key} className={colClass}>
                    <button
                        onClick={() => onNavigate(link.link_type || 'DocType', link.link_to, link.url)}
                        className={cn(
                            "w-full h-full flex items-center gap-3 px-4 py-3 rounded-xl text-left",
                            "bg-card dark:bg-white/[0.03]",
                            "border border-border/50 dark:border-white/[0.06]",
                            "hover:bg-accent/50 dark:hover:bg-white/[0.06]",
                            "hover:border-border dark:hover:border-white/[0.12]",
                            "transition-colors duration-150 group"
                        )}
                    >
                        {linkImage ? (
                            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                                <img src={linkImage} alt="" className="w-full h-full object-cover" loading="lazy" />
                            </div>
                        ) : link.icon ? (() => {
                            const LinkIcon = getIcon(link.icon);
                            return <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />;
                        })() : null}
                        <span className="text-sm font-medium text-foreground truncate">
                            {translate ? translate(link.label || link.link_to) : (link.label || link.link_to)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/30 ml-auto shrink-0 group-hover:text-muted-foreground/60 transition-colors" />
                    </button>
                </div>
            );
        }

        // ---- Paragraphs ----
        case 'paragraph': {
            return (
                <div key={key} className={colClass}>
                    <div
                        className="text-sm text-muted-foreground py-2"
                        dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(data.text || ''),
                        }}
                    />
                </div>
            );
        }

        // ---- Quick Lists ----
        case 'quick_list': {
            const ql = workspace.quickListMap[data.quick_list_name];
            if (!ql) return null;
            return (
                <div key={key} className={colClass}>
                    <QuickListWidget quickList={ql} onNavigate={onNavigate} />
                </div>
            );
        }

        // ---- Custom HTML Blocks ----
        case 'custom_block': {
            const cb = workspace.customBlockMap[data.custom_block_name];
            if (!cb) return null;
            return (
                <div key={key} className={colClass}>
                    <CustomHTMLWidget block={cb} />
                </div>
            );
        }

        default:
            return null;
    }
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const WorkspacePage = () => {
    const { t, getWidgetLabel } = useTranslation();
    const { workspaceName } = useParams();
    const navigate = useNavigate();
    const decodedName = decodeURIComponent(workspaceName || '');

    // Redirect to custom page if workspace has a custom hub
    useEffect(() => {
        const redirect = CUSTOM_WORKSPACE_REDIRECTS[decodedName];
        if (redirect) navigate(redirect, { replace: true });
    }, [decodedName, navigate]);

    const { data: workspace, isLoading, isFetching, error, refetch } = useQuery({
        queryKey: ['workspace', decodedName],
        queryFn: () => fetchWorkspaceData(decodedName),
        enabled: !!decodedName,
        retry: 1,
    });

    // Navigate based on type: DocType, Report, Page, URL
    // Pass workspace context so target page can show breadcrumb trail
    const handleNavigate = (type, linkTo, url) => {
        const wsState = {
            label: linkTo,
            workspace: workspace?.name,
            workspaceLabel: workspace?.label || workspace?.name,
        };
        switch (type) {
            case 'DocType':
                navigate(`/app/doctype/${encodeURIComponent(linkTo)}`, { state: wsState });
                break;
            case 'Report':
                navigate(`/app/query-report/${encodeURIComponent(linkTo)}`, { state: wsState });
                break;
            case 'Page':
                navigate(`/app/${linkTo}`, { state: wsState });
                break;
            case 'URL':
                if (url) {
                    // Internal URLs: use React Router navigate
                    if (url.startsWith('/app/')) {
                        navigate(url, { state: wsState });
                    } else {
                        window.open(url, '_blank', 'noopener,noreferrer');
                    }
                }
                break;
            default:
                if (linkTo) {
                    navigate(`/app/doctype/${encodeURIComponent(linkTo)}`, { state: wsState });
                }
        }
    };

    // ---- Loading state ----
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // ---- Permission error ----
    const isPermissionError = error && (
        error.message?.toLowerCase().includes('does not have doctype access') ||
        error.message?.toLowerCase().includes('does not have permission') ||
        error.message?.toLowerCase().includes('permission denied') ||
        error.code === 'PERMISSION_DENIED' ||
        error.httpStatus === 403
    );

    if (isPermissionError) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-muted flex items-center justify-center">
                        <ShieldAlert className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                        {t('workspace.no_permission')}
                    </h2>
                    <p className="text-muted-foreground mb-6">
                        {t('workspace.no_permission_desc')}
                    </p>
                    <Button
                        variant="primary"
                        onClick={() => navigate('/dashboard')}
                        className="inline-flex items-center gap-2"
                    >
                        <Home className="h-4 w-4" />
                        {t('error.go_home')}
                    </Button>
                </div>
            </div>
        );
    }

    // ---- Generic error ----
    if (error || !workspace) {
        return (
            <div className="p-6">
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <p className="text-destructive">
                        {t('workspace.load_error')}: {error?.message || t('workspace.not_found')}
                    </p>
                </div>
            </div>
        );
    }

    const hasContent = workspace.contentBlocks?.length > 0;

    return (
        <main role="main" aria-label={workspace.label || workspace.name} className="w-full space-y-6">

            {/* Content-driven layout – grouped sections + standalone blocks */}
            {hasContent && (() => {
                const grouped = groupBlocksIntoSections(workspace.contentBlocks, workspace);
                const DashWidget = WORKSPACE_DASHBOARDS[workspace.name] || WORKSPACE_DASHBOARDS[workspace.label];

                return (
                    <div className="space-y-4">
                        {/* Render flat — shortcuts in grid, headers as labels */}
                        {(() => {
                            const elements = [];
                            let cardBatch = []; // accumulate shortcut/link cards
                            let cardIdx = 0;    // global index for color cycling

                            const flushCards = () => {
                                if (cardBatch.length > 0) {
                                    const batch = cardBatch;
                                    elements.push(
                                        <div key={`cards-${elements.length}`} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                            {batch}
                                        </div>
                                    );
                                    cardBatch = [];
                                }
                            };

                            // Shortcuts to skip (embedded as dashboard widget or floating button)
                            const SKIP_SHORTCUTS = new Set(['bao-cao-san-xuat', 'theo-doi-batch']);

                            const getSlug = (sc) => sc.link_to || (sc.url && sc.url.replace('/app/', '')) || '';

                            const makeShortcutCard = (sc, key) => {
                                const slug = getSlug(sc);
                                // Skip shortcuts handled by dashboard widget
                                if (SKIP_SHORTCUTS.has(slug)) return null;
                                const idx = cardIdx++;
                                return (
                                    <ShortcutCard
                                        key={key}
                                        index={idx}
                                        shortcut={{
                                            label: sc.label || sc.link_to,
                                            type: sc.type,
                                            linkTo: slug || sc.label,
                                            icon: sc.icon,
                                            color: sc.color,
                                            url: sc.url,
                                        }}
                                        onClick={() => handleNavigate(sc.type, sc.link_to, sc.url)}
                                    />
                                );
                            };

                            for (let i = 0; i < grouped.length; i++) {
                                const item = grouped[i];

                                if (item.type === 'section') {
                                    // Flatten section: emit header label then its children as cards
                                    if (item.title) {
                                        flushCards();
                                        elements.push(
                                            <p key={`hdr-${i}`} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">
                                                {getWidgetLabel(item.title)}
                                            </p>
                                        );
                                    }
                                    for (let j = 0; j < item.children.length; j++) {
                                        const child = item.children[j];
                                        if (child.type === 'shortcut') {
                                            const sc = workspace.shortcutMap[child.data?.shortcut_name];
                                            if (sc) { const c = makeShortcutCard(sc, `sc-${i}-${j}`); if (c) cardBatch.push(c); }
                                        } else if (child.type === 'link') {
                                            const link = workspace.linkMap?.[child.data?.link_name];
                                            if (link && link.type !== 'Card Break') {
                                                cardBatch.push(makeShortcutCard({
                                                    label: link.label || link.link_to,
                                                    link_to: link.link_to,
                                                    icon: link.icon,
                                                    type: link.link_type || 'DocType',
                                                    url: link.url,
                                                }, `lk-${i}-${j}`));
                                            }
                                        } else if (child.type === 'card') {
                                            const links = workspace.linkGroupMap[child.data?.card_name];
                                            if (links) {
                                                for (const lnk of links) {
                                                    cardBatch.push(makeShortcutCard({
                                                        label: lnk.label || lnk.link_to,
                                                        link_to: lnk.link_to,
                                                        icon: lnk.icon,
                                                        type: lnk.type || 'DocType',
                                                    }, `clk-${i}-${lnk.link_to}`));
                                                }
                                            }
                                        }
                                    }
                                    continue;
                                }

                                // Standalone shortcut
                                if (item.type === 'shortcut') {
                                    const sc = workspace.shortcutMap[item.data?.shortcut_name];
                                    if (sc) {
                                        const card = makeShortcutCard(sc, `ssc-${i}`);
                                        if (card) cardBatch.push(card);
                                    }
                                    continue;
                                }

                                // Non-card blocks (chart, number_card, etc.)
                                flushCards();
                                elements.push(
                                    <div key={`block-${i}`} className="grid grid-cols-12 gap-4">
                                        {renderStandaloneBlock(item, i, workspace, handleNavigate, getWidgetLabel)}
                                    </div>
                                );
                            }

                            flushCards();

                            return elements;
                        })()}

                        {/* Floating QR button — portal to body so it's always visible regardless of scroll/overflow */}
                        {(workspace.name === 'Sản Xuất Thép' || workspace.label === 'Sản Xuất Thép') && createPortal(
                            <div className="fixed bottom-6 right-6 z-[9999]">
                                <button
                                    onClick={() => handleNavigate('URL', null, '/app/theo-doi-batch')}
                                    className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-semibold shadow-xl shadow-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/40 transition-all duration-200 active:scale-95"
                                >
                                    {(() => { const QrIcon = getIcon('Search'); return QrIcon ? <QrIcon className="w-4 h-4" /> : null; })()}
                                    QR truy xuất
                                </button>
                            </div>,
                            document.body
                        )}

                        {/* Workspace-specific dashboard widget (below cards) */}
                        {DashWidget && (
                            <Suspense fallback={
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            }>
                                <DashWidget />
                            </Suspense>
                        )}
                    </div>
                );
            })()}

            {/* Empty State */}
            {!hasContent && (
                <div className={cn(
                    "rounded-lg p-12 text-center",
                    "bg-muted/20 border border-border/50 dark:border-white/10"
                )}>
                    <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-muted/50 flex items-center justify-center">
                        <FileText className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground">
                        {t('workspace.no_content')}
                    </p>
                </div>
            )}
        </main>
    );
};

export default WorkspacePage;
