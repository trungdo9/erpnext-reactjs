/**
 * SidebarSkeleton - Loading placeholder for sidebar
 */

const SidebarSkeleton = () => {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Group 1 */}
            <div className="space-y-2">
                <div className="h-3 w-20 bg-muted-foreground/15 rounded mb-3"></div>
                <div className="h-8 bg-muted-foreground/8 rounded-lg"></div>
                <div className="h-8 bg-muted-foreground/8 rounded-lg"></div>
            </div>

            {/* Group 2 */}
            <div className="space-y-2">
                <div className="h-3 w-28 bg-muted-foreground/15 rounded mb-3"></div>
                <div className="h-8 bg-muted-foreground/8 rounded-lg"></div>
                <div className="h-8 bg-muted-foreground/8 rounded-lg"></div>
                <div className="h-8 bg-muted-foreground/8 rounded-lg"></div>
                <div className="h-8 bg-muted-foreground/8 rounded-lg"></div>
            </div>

            {/* Group 3 */}
            <div className="space-y-2">
                <div className="h-3 w-24 bg-muted-foreground/15 rounded mb-3"></div>
                <div className="h-8 bg-muted-foreground/8 rounded-lg"></div>
                <div className="h-8 bg-muted-foreground/8 rounded-lg"></div>
                <div className="h-8 bg-muted-foreground/8 rounded-lg"></div>
            </div>

            {/* Group 4 */}
            <div className="space-y-2">
                <div className="h-3 w-32 bg-muted-foreground/15 rounded mb-3"></div>
                <div className="h-8 bg-muted-foreground/8 rounded-lg"></div>
                <div className="h-8 bg-muted-foreground/8 rounded-lg"></div>
            </div>
        </div>
    );
};

export default SidebarSkeleton;
