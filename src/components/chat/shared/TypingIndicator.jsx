import { memo } from 'react';

const TypingIndicator = memo(({ typingUsers = [], userProfiles = {} }) => {
    if (typingUsers.length === 0) return null;

    const names = typingUsers.map(email => {
        const profile = userProfiles[email];
        return profile?.fullName?.split(' ').pop() || email.split('@')[0];
    });

    const text = names.length === 1
        ? `${names[0]} đang nhập...`
        : names.length === 2
            ? `${names[0]} và ${names[1]} đang nhập...`
            : `${names[0]} và ${names.length - 1} người khác đang nhập...`;

    return (
        <div className="px-4 py-1.5 text-xs text-muted-foreground flex items-center gap-2 animate-in fade-in duration-200">
            <div className="flex gap-0.5">
                <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="italic">{text}</span>
        </div>
    );
});
TypingIndicator.displayName = 'TypingIndicator';

export default TypingIndicator;
