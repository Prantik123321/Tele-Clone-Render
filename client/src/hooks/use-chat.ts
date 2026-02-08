import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "./use-auth";

// ============================================
// CONVERSATIONS
// ============================================

export function useConversations() {
  return useQuery({
    queryKey: [api.conversations.list.path],
    queryFn: async () => {
      const res = await fetch(api.conversations.list.path, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return api.conversations.list.responses[200].parse(await res.json());
    },
    refetchInterval: 3000, // Poll every 3s for new messages/conversations
  });
}

export function useConversation(id: number | null) {
  return useQuery({
    queryKey: [api.conversations.get.path, id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.conversations.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch conversation");
      return api.conversations.get.responses[200].parse(await res.json());
    },
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (participantId: string) => {
      const res = await fetch(api.conversations.create.path, {
        method: api.conversations.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId }),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create conversation");
      }
      return api.conversations.create.responses[201].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.conversations.list.path] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// ============================================
// MESSAGES
// ============================================

export function useMessages(conversationId: number | null) {
  return useQuery({
    queryKey: [api.messages.list.path, conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      if (!conversationId) return [];
      const url = buildUrl(api.messages.list.path, { id: conversationId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return api.messages.list.responses[200].parse(await res.json());
    },
    refetchInterval: 2000, // Poll frequently for new messages
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: number; content: string }) => {
      const url = buildUrl(api.messages.send.path, { id: conversationId });
      const res = await fetch(url, {
        method: api.messages.send.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to send message");
      }
      return api.messages.send.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      // Invalidate messages for this conversation
      queryClient.invalidateQueries({
        queryKey: [api.messages.list.path, variables.conversationId]
      });
      // Also invalidate conversation list to update last message preview
      queryClient.invalidateQueries({
        queryKey: [api.conversations.list.path]
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// ============================================
// USERS & CONTACTS
// ============================================

export function useSearchUsers(query: string) {
  return useQuery({
    queryKey: [api.users.search.path, query],
    enabled: query.length > 0,
    queryFn: async () => {
      const url = `${api.users.search.path}?query=${encodeURIComponent(query)}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to search users");
      return api.users.search.responses[200].parse(await res.json());
    },
  });
}

export function useContacts() {
  return useQuery({
    queryKey: [api.contacts.list.path],
    queryFn: async () => {
      const res = await fetch(api.contacts.list.path, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch contacts");
      return api.contacts.list.responses[200].parse(await res.json());
    },
  });
}

export function useAddContact() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (username: string) => {
      const res = await fetch(api.contacts.add.path, {
        method: api.contacts.add.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add contact");
      }
      return api.contacts.add.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.contacts.list.path] });
      toast({ title: "Success", description: "Contact added successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
