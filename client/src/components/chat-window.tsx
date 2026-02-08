import { useState, useRef, useEffect } from "react";
import { useMessages, useSendMessage, useConversation } from "@/hooks/use-chat";
import { useAuth } from "@/hooks/use-auth";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Paperclip, MoreVertical, Smile } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ChatWindowProps {
  conversationId: number;
  onBack: () => void; // For mobile
}

export function ChatWindow({ conversationId, onBack }: ChatWindowProps) {
  const { user } = useAuth();
  const { data: conversation, isLoading: isLoadingConv } = useConversation(conversationId);
  const { data: messages, isLoading: isLoadingMsgs } = useMessages(conversationId);
  const sendMessage = useSendMessage();
  
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages?.length, conversationId]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || sendMessage.isPending) return;

    sendMessage.mutate(
      { conversationId, content: inputValue },
      {
        onSuccess: () => {
          setInputValue("");
        }
      }
    );
  };

  if (isLoadingConv) {
    return <div className="flex-1 flex items-center justify-center bg-background/50">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-12 w-12 bg-muted rounded-full mb-4"></div>
        <div className="h-4 w-32 bg-muted rounded"></div>
      </div>
    </div>;
  }

  if (!conversation) return null;

  // Identify the other participant (for direct chats)
  const otherMember = conversation.members?.find(m => m.id !== user?.id);
  const displayName = conversation.name || 
    `${otherMember?.firstName || ''} ${otherMember?.lastName || ''}`.trim() || 
    otherMember?.username || "Unknown";

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>

      {/* Header */}
      <header className="h-[64px] border-b border-border bg-card/80 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="md:hidden -ml-2" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <UserAvatar user={otherMember || undefined} />
          <div className="flex flex-col">
            <h2 className="font-semibold text-sm leading-tight">{displayName}</h2>
            <span className="text-xs text-muted-foreground">Online</span>
          </div>
        </div>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-5 w-5 text-muted-foreground" />
        </Button>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="flex flex-col gap-4 max-w-3xl mx-auto pb-4">
          <AnimatePresence initial={false}>
            {messages?.map((msg, index) => {
              const isMe = msg.senderId === user?.id;
              const showAvatar = !isMe && (index === 0 || messages[index - 1].senderId !== msg.senderId);

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "flex gap-2 max-w-[85%] md:max-w-[70%]",
                    isMe ? "ml-auto" : "mr-auto"
                  )}
                >
                  {!isMe && (
                    <div className="w-8 shrink-0 flex flex-col justify-end">
                      {showAvatar && <UserAvatar user={msg.sender || undefined} className="h-8 w-8" />}
                    </div>
                  )}
                  
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2 shadow-sm text-sm break-words relative group",
                      isMe 
                        ? "bg-primary text-primary-foreground rounded-tr-sm" 
                        : "bg-white dark:bg-zinc-800 text-foreground rounded-tl-sm border border-border/50"
                    )}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <div className={cn(
                      "text-[10px] text-right mt-1 select-none",
                      isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {format(new Date(msg.createdAt), "HH:mm")}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={bottomRef} className="h-px" />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 bg-background border-t border-border z-10 shrink-0">
        <form 
          onSubmit={handleSend}
          className="max-w-3xl mx-auto flex items-end gap-2 bg-secondary/30 p-2 rounded-2xl border border-border focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all"
        >
          <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-xl text-muted-foreground hover:text-primary">
            <Paperclip className="h-5 w-5" />
          </Button>
          
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Write a message..."
            className="border-0 bg-transparent focus-visible:ring-0 px-2 min-h-[44px] py-3 shadow-none resize-none"
            autoComplete="off"
          />

          <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-xl text-muted-foreground hover:text-primary">
            <Smile className="h-5 w-5" />
          </Button>

          <Button 
            type="submit" 
            size="icon" 
            disabled={!inputValue.trim() || sendMessage.isPending}
            className={cn(
              "shrink-0 rounded-xl transition-all duration-200",
              inputValue.trim() 
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:scale-105 active:scale-95" 
                : "bg-muted text-muted-foreground opacity-50"
            )}
          >
            <Send className="h-5 w-5 ml-0.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
