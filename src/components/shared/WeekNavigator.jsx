/**
 * WeekNavigator - Shared week navigation component
 * Used by weekly schedule views, etc.
 */

import { memo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { cn } from '../../lib/utils';

const WeekNavigator = memo(({ weekLabel, isCurrentWeek, onPrev, onNext, onToday }) => (
    <div className="flex items-center justify-center gap-1">
        <button
            onClick={onPrev}
            aria-label="Previous week"
            className="p-2 rounded-lg hover:bg-muted/80 transition-[background-color,transform] hover:scale-105 active:scale-95"
        >
            <ChevronLeft className="w-5 h-5" />
        </button>

        <button
            onClick={onToday}
            className={cn(
                "flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl transition-colors",
                isCurrentWeek
                    ? "bg-gradient-to-r from-primary/15 to-emerald-500/15 text-primary shadow-sm border border-primary/20"
                    : "hover:bg-muted/80 border border-transparent"
            )}
        >
            <CalendarDays className="w-4 h-4" />
            {weekLabel}
        </button>

        <button
            onClick={onNext}
            aria-label="Next week"
            className="p-2 rounded-lg hover:bg-muted/80 transition-[background-color,transform] hover:scale-105 active:scale-95"
        >
            <ChevronRight className="w-5 h-5" />
        </button>

        {!isCurrentWeek && (
            <button onClick={onToday} className="text-xs text-primary hover:underline ml-2 font-medium">
                Tuần này
            </button>
        )}
    </div>
));

WeekNavigator.displayName = 'WeekNavigator';

export default WeekNavigator;
