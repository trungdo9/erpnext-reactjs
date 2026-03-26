import { cn } from '../../lib/utils';

const Textarea = ({ label, error, className, id, ...props }) => {
    return (
        <div className="w-full">
            {label && (
                <label
                    htmlFor={id || props.name}
                    className="block text-xs md:text-sm font-semibold text-foreground mb-2"
                >
                    {label}
                    {props.required && <span className="text-destructive ml-1">*</span>}
                </label>
            )}
            <textarea
                id={id || props.name}
                className={cn(
                    "flex min-h-[80px] w-full rounded-lg border border-input",
                    "bg-muted",
                    "px-3 py-2 text-[13px] text-foreground",
                    "placeholder:text-muted-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "transition-colors duration-200",
                    error && "border-destructive focus-visible:ring-destructive/20 focus-visible:border-destructive/40",
                    className
                )}
                {...props}
            />
            {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
    );
};

export default Textarea;
