/**
 * Custom HTML Widget
 *
 * Renders custom HTML blocks with DOMPurify sanitization
 * Supports markdown-style formatting
 */

import { useMemo, memo } from 'react';
import DOMPurify from 'dompurify';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../hooks/useTranslation';
import { AlertTriangle } from 'lucide-react';

const CustomHTMLWidget = memo(function CustomHTMLWidget({ block, width = 'Full' }) {
    const { t } = useTranslation();
    // Sanitize HTML
    const sanitizedHTML = useMemo(() => {
        if (!block.html) return '';

        try {
            // Configure DOMPurify
            const config = {
                ALLOWED_TAGS: [
                    'div', 'span', 'p', 'br', 'hr',
                    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                    'strong', 'b', 'em', 'i', 'u', 's',
                    'ul', 'ol', 'li',
                    'a', 'img',
                    'table', 'thead', 'tbody', 'tr', 'th', 'td',
                    'blockquote', 'pre', 'code',
                ],
                ALLOWED_ATTR: [
                    'class', 'id',
                    'href', 'target', 'rel',
                    'src', 'alt', 'width', 'height',
                    'colspan', 'rowspan'
                ],
                ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\x2d]+(?:[^a-z+.\x2d:]|$))/i,
                FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'button']
            };

            return DOMPurify.sanitize(block.html, config);
        } catch (err) {
            console.error('[CustomHTMLWidget] Sanitization error:', err);
            return '';
        }
    }, [block.html]);

    // Width classes
    const widthClasses = {
        'Full': 'col-span-full',
        'Half': 'col-span-full lg:col-span-6',
        'Third': 'col-span-full lg:col-span-4'
    };

    // Empty state
    if (!sanitizedHTML) {
        return (
            <div className={cn(
                widthClasses[width],
                "rounded-xl border border-border/50 dark:border-white/[0.06] bg-card dark:bg-white/[0.03] p-6"
            )}>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    <p className="text-sm">{t('widget.no_content')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            widthClasses[width],
            "rounded-xl overflow-hidden",
            "bg-card dark:bg-white/[0.03]",
            "border border-border/50 dark:border-white/[0.06]"
        )}>
            <div
                className="p-6 prose prose-sm dark:prose-invert max-w-none custom-html-content"
                dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
            />

            <style jsx>{`
                .custom-html-content {
                    color: var(--foreground);
                }

                .custom-html-content h1,
                .custom-html-content h2,
                .custom-html-content h3,
                .custom-html-content h4,
                .custom-html-content h5,
                .custom-html-content h6 {
                    color: var(--foreground);
                    margin-top: 1.5em;
                    margin-bottom: 0.75em;
                    font-weight: 600;
                }

                .custom-html-content h1 {
                    font-size: 1.5em;
                }

                .custom-html-content h2 {
                    font-size: 1.25em;
                }

                .custom-html-content h3 {
                    font-size: 1.125em;
                }

                .custom-html-content p {
                    margin-bottom: 1em;
                }

                .custom-html-content a {
                    color: var(--primary);
                    text-decoration: underline;
                }

                .custom-html-content a:hover {
                    opacity: 0.8;
                }

                .custom-html-content ul,
                .custom-html-content ol {
                    margin-left: 1.5em;
                    margin-bottom: 1em;
                }

                .custom-html-content li {
                    margin-bottom: 0.5em;
                }

                .custom-html-content code {
                    background-color: var(--muted);
                    padding: 0.2em 0.4em;
                    border-radius: 0.25rem;
                    font-size: 0.875em;
                }

                .custom-html-content pre {
                    background-color: var(--muted);
                    padding: 1em;
                    border-radius: 0.5rem;
                    overflow-x: auto;
                    margin-bottom: 1em;
                }

                .custom-html-content blockquote {
                    border-left: 4px solid var(--border);
                    padding-left: 1em;
                    margin-left: 0;
                    color: var(--muted-foreground);
                }

                .custom-html-content table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 1em;
                }

                .custom-html-content th,
                .custom-html-content td {
                    border: 1px solid var(--border);
                    padding: 0.5em;
                    text-align: left;
                }

                .custom-html-content th {
                    background-color: var(--muted);
                    font-weight: 600;
                }

                .custom-html-content img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 0.5rem;
                }

                .custom-html-content hr {
                    border: none;
                    border-top: 1px solid var(--border);
                    margin: 1.5em 0;
                }
            `}</style>
        </div>
    );
});

export default CustomHTMLWidget;
