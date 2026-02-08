import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  user?: {
    profileImageUrl?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
  };
  className?: string;
  fallbackClassName?: string;
}

export function UserAvatar({ user, className, fallbackClassName }: UserAvatarProps) {
  // Generate initials
  const initials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`
    : "?";
  
  // Use username first char if no name
  const displayInitials = initials.length > 0 ? initials : user?.username?.[0]?.toUpperCase() || "?";

  return (
    <Avatar className={cn("h-10 w-10 border border-border/10 shadow-sm", className)}>
      <AvatarImage src={user?.profileImageUrl || undefined} />
      <AvatarFallback className={cn("bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold", fallbackClassName)}>
        {displayInitials}
      </AvatarFallback>
    </Avatar>
  );
}
