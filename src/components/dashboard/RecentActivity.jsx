import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { FileText, CheckSquare, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatDate } from '../../utils/dateUtils';
import { CARD, TRANSITION } from '../../config/styles';

/**
 * Modern RecentActivity Component
 * Premium design with smooth animations
 */
const RecentActivity = ({ items = [] }) => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    return (
        <div className={CARD.static}>
            {/* Header */}
            <div className="px-4 md:px-5 pt-4 md:pt-5 pb-3 md:pb-4">
                <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm md:text-base tracking-tight text-foreground">
                        {t('dashboard.recent_activity')}
                    </h3>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1 hidden sm:block">
                    {t('dashboard.recent_activity_desc')}
                </p>
            </div>

            {/* Content */}
            <div className="px-2 md:px-3 pb-2 md:pb-3">
                {items.length === 0 ? (
                    <div className="text-center py-6 md:py-8 text-muted-foreground text-xs md:text-sm">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-2 md:mb-3">
                            <FileText className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground/50" />
                        </div>
                        {t('dashboard.no_activity')}
                    </div>
                ) : (
                    <div className="space-y-1">
                        {items.map((item, idx) => (
                            <div
                                key={item.name + idx}
                                onClick={() => navigate(`/form/${item.doctype}/${item.name}`)}
                                className={cn(
                                    "stagger-item",
                                    "flex items-center justify-between p-3 rounded-xl cursor-pointer",
                                    TRANSITION.colors,
                                    "hover:bg-accent/50",
                                    "group"
                                )}
                            >
                                <div className="flex items-center gap-2.5 md:gap-3 min-w-0 flex-1">
                                    <div className={cn(
                                        "h-9 w-9 md:h-10 md:w-10 rounded-xl flex items-center justify-center shrink-0",
                                        TRANSITION.colors,
                                        item.doctype === 'ToDo'
                                            ? "bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20"
                                            : "bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20"
                                    )}>
                                        {item.doctype === 'ToDo'
                                            ? <CheckSquare className="h-4 w-4 md:h-5 md:w-5" />
                                            : <FileText className="h-4 w-4 md:h-5 md:w-5" />
                                        }
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs md:text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                            {item.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            <span className="text-primary/80 font-medium">
                                                {(item.doctypeLabel || item.doctype).replace(/_/g, ' ')}
                                            </span>
                                            <span className="mx-1 hidden sm:inline">•</span>
                                            <span className="hidden sm:inline">{item.owner}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="text-xs text-muted-foreground font-medium shrink-0 ml-2">
                                    {formatDate(item.modified)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecentActivity;
