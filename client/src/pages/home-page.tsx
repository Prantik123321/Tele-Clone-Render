import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { ChatWindow } from "@/components/chat-window";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);

  // Mobile view state: if selectedConversationId is set, show chat, else show sidebar
  const showChat = !!selectedConversationId;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar - hidden on mobile if chat is open */}
      <div 
        className={cn(
          "w-full md:w-[320px] lg:w-[380px] h-full flex-shrink-0 transition-transform duration-300 ease-in-out absolute md:relative z-20",
          showChat ? "-translate-x-full md:translate-x-0" : "translate-x-0"
        )}
      >
        <Sidebar 
          selectedId={selectedConversationId} 
          onSelect={setSelectedConversationId}
          className="h-full w-full"
        />
      </div>

      {/* Chat Window - hidden on mobile if no chat selected */}
      <main 
        className={cn(
          "flex-1 h-full bg-background transition-transform duration-300 ease-in-out absolute md:relative w-full z-10",
          showChat ? "translate-x-0" : "translate-x-full md:translate-x-0"
        )}
      >
        {selectedConversationId ? (
          <ChatWindow 
            conversationId={selectedConversationId} 
            onBack={() => setSelectedConversationId(null)}
          />
        ) : (
          /* Empty State */
          <div className="hidden md:flex h-full flex-col items-center justify-center p-8 text-center bg-secondary/20">
            <div className="h-24 w-24 bg-secondary rounded-full flex items-center justify-center mb-6">
              <MessageSquare className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Select a chat to start messaging</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">
              Choose a conversation from the sidebar or start a new chat to connect with your contacts.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
