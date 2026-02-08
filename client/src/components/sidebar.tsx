import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useConversations, useSearchUsers, useCreateConversation } from "@/hooks/use-chat";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogOut, Search, Plus, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SidebarProps {
  selectedId: number | null;
  onSelect: (id: number) => void;
  className?: string;
}

export function Sidebar({ selectedId, onSelect, className }: SidebarProps) {
  const { user, logout } = useAuth();
  const { data: conversations, isLoading } = useConversations();
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  // Filter conversations
  const filteredConversations = conversations?.filter((c) => {
    const name = c.name || c.otherMember?.firstName || c.otherMember?.username || "Unknown";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className={cn("flex flex-col h-full bg-card border-r border-border", className)}>
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <UserAvatar user={user || undefined} />
          <div className="flex flex-col overflow-hidden">
            <span className="font-semibold text-sm truncate">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              @{user?.username || user?.email?.split('@')[0]}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
           <NewChatDialog 
            open={isNewChatOpen} 
            onOpenChange={setIsNewChatOpen} 
            onChatCreated={(id) => {
              onSelect(id);
              setIsNewChatOpen(false);
            }} 
          />
          <Button variant="ghost" size="icon" onClick={() => logout()} title="Logout">
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 py-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search chats..." 
            className="pl-9 bg-secondary/50 border-transparent focus:bg-background transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="px-2 pb-4 space-y-1">
          {isLoading ? (
             <div className="p-4 text-center text-sm text-muted-foreground">Loading chats...</div>
          ) : filteredConversations?.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No conversations yet.</p>
              <Button variant="link" onClick={() => setIsNewChatOpen(true)} className="mt-2">
                Start a chat
              </Button>
            </div>
          ) : (
            filteredConversations?.map((conv) => {
              const displayName = conv.name || 
                `${conv.otherMember?.firstName || ''} ${conv.otherMember?.lastName || ''}`.trim() || 
                conv.otherMember?.username || "Unknown";
              
              const isActive = selectedId === conv.id;

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelect(conv.id)}
                  className={cn(
                    "w-full p-3 flex items-start gap-3 rounded-xl transition-all duration-200 text-left group",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                      : "hover:bg-secondary/80"
                  )}
                >
                  <UserAvatar 
                    user={conv.otherMember || undefined} 
                    className={cn(isActive && "border-white/20 ring-2 ring-white/20")}
                  />
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className={cn("font-medium text-sm truncate", isActive ? "text-white" : "text-foreground")}>
                        {displayName}
                      </span>
                      {conv.lastMessage && (
                        <span className={cn("text-[10px] ml-2 shrink-0 opacity-70", isActive ? "text-blue-100" : "text-muted-foreground")}>
                          {format(new Date(conv.lastMessage.createdAt), "HH:mm")}
                        </span>
                      )}
                    </div>
                    <p className={cn(
                      "text-xs truncate", 
                      isActive ? "text-blue-100" : "text-muted-foreground group-hover:text-foreground/80"
                    )}>
                      {conv.lastMessage?.senderId === user?.id && "You: "}
                      {conv.lastMessage?.content || <span className="italic">No messages yet</span>}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function NewChatDialog({ open, onOpenChange, onChatCreated }: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onChatCreated: (id: number) => void;
}) {
  const [query, setQuery] = useState("");
  const { data: users, isLoading } = useSearchUsers(query);
  const createConversation = useCreateConversation();

  const handleStartChat = (userId: string) => {
    createConversation.mutate(userId, {
      onSuccess: (data) => {
        onChatCreated(data.id);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="New Chat">
          <Plus className="h-5 w-5 text-primary" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search people..."
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          
          <ScrollArea className="h-[300px]">
            {isLoading && query ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
            ) : users?.length === 0 && query ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No users found.</div>
            ) : !query ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Type to search users</div>
            ) : (
              <div className="space-y-1">
                {users?.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleStartChat(user.id)}
                    className="w-full p-2 flex items-center gap-3 hover:bg-secondary rounded-lg transition-colors text-left"
                    disabled={createConversation.isPending}
                  >
                    <UserAvatar user={user} />
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">@{user.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
