import { z } from "zod";
import { insertConversationSchema, insertMessageSchema, users, conversations, messages } from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  users: {
    search: {
      method: "GET" as const,
      path: "/api/users/search" as const,
      input: z.object({
        query: z.string().min(1),
      }),
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    me: {
      method: "GET" as const,
      path: "/api/users/me" as const, // Already handled by Auth routes, but good for completeness if needed
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  contacts: {
    list: {
      method: "GET" as const,
      path: "/api/contacts" as const,
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()), // Return the user objects directly
        401: errorSchemas.unauthorized,
      },
    },
    add: {
      method: "POST" as const,
      path: "/api/contacts" as const,
      input: z.object({
        username: z.string(), // Add by username
      }),
      responses: {
        201: z.custom<typeof users.$inferSelect>(), // Return the added contact
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
  },
  conversations: {
    list: {
      method: "GET" as const,
      path: "/api/conversations" as const,
      responses: {
        200: z.array(z.custom<typeof conversations.$inferSelect & { 
          lastMessage?: typeof messages.$inferSelect,
          unreadCount?: number,
          otherMember?: typeof users.$inferSelect // For direct chats
        }>()),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/conversations" as const,
      input: z.object({
        participantId: z.string(), // For direct chat
      }),
      responses: {
        201: z.custom<typeof conversations.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/conversations/:id" as const,
      responses: {
        200: z.custom<typeof conversations.$inferSelect & { members: (typeof users.$inferSelect)[] }>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
  },
  messages: {
    list: {
      method: "GET" as const,
      path: "/api/conversations/:id/messages" as const,
      input: z.object({
        limit: z.coerce.number().optional().default(50),
        offset: z.coerce.number().optional().default(0),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof messages.$inferSelect & { sender: typeof users.$inferSelect }>()),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    send: {
      method: "POST" as const,
      path: "/api/conversations/:id/messages" as const,
      input: z.object({
        content: z.string().min(1),
      }),
      responses: {
        201: z.custom<typeof messages.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export const WS_EVENTS = {
  MESSAGE_NEW: "message:new",
  TYPING_START: "typing:start",
  TYPING_STOP: "typing:stop",
} as const;
