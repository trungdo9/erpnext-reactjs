/**
 * MobileCard - Mobile card display for document list items
 */

import { ChevronRight } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { formatDateTime } from '../../utils/dateUtils';
import { CARD, LIST_ITEM } from '../../config/styles';

const MobileCard = ({ doc, meta, fieldAccessors, selectedRowIds, t, onNavigate }) => {
    const titleField = meta?.title_field || 'name';
    const title = doc[titleField] || doc.name;
    const subtitle = doc.name !== title ? doc.name : null;
    const statusColor = doc.docstatus === 1 ? 'bg-emerald-500' : doc.docstatus === 2 ? 'bg-red-500' : 'bg-emerald-400';

    return (
        <div
            onClick={() => onNavigate(doc.name)}
            className={`${CARD.interactive} p-4`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${statusColor}`} />
                        {selectedRowIds.includes(doc.name) && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                        <h3 className="font-semibold text-foreground truncate">{title}</h3>
                    </div>
                    {subtitle && <p className="text-xs text-muted-foreground truncate mb-2">{subtitle}</p>}
                    <div className="space-y-1.5">
                        {fieldAccessors.slice(0, 4).filter(col => col !== 'name' && col !== titleField).map(col => (
                            <div key={col} className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground capitalize text-xs">{col.replace(/_/g, ' ')}</span>
                                <span className="font-medium text-foreground text-xs">{doc[col]}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <ChevronRight className={LIST_ITEM.chevron} />
                    {(doc.status || doc.workflow_state) && (
                        <Badge variant={
                            ['Submitted', 'Approved'].includes(doc.status || doc.workflow_state) ? 'success' :
                                ['Cancelled', 'Rejected'].includes(doc.status || doc.workflow_state) ? 'destructive' : 'default'
                        } className="text-xs">
                            {t(`status.${doc.status || doc.workflow_state}`, doc.status || doc.workflow_state)}
                        </Badge>
                    )}
                </div>
            </div>
            {doc.modified && (
                <div className="mt-3 pt-2 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">{formatDateTime(doc.modified)}</span>
                </div>
            )}
        </div>
    );
};

export default MobileCard;
