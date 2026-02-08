import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Set up Replit Auth
  await setupAuth(app);
  registerAuthRoutes(app);

  // Contacts
  app.get(api.contacts.list.path, isAuthenticated, async (req, res) => {
    const user = req.user as any;
    const contacts = await storage.getContacts(user.claims.sub);
    res.json(contacts);
  });

  app.post(api.contacts.add.path, isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { username } = api.contacts.add.input.parse(req.body);
      const contact = await storage.addContact(user.claims.sub, username);
      res.status(201).json(contact);
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ message: err.message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Users Search
  app.get(api.users.search.path, isAuthenticated, async (req, res) => {
    try {
      const { query } = api.users.search.input.parse(req.query);
      const users = await storage.searchUsers(query);
      res.json(users);
    } catch (err) {
      res.status(400).json({ message: "Invalid query" });
    }
  });

  // Conversations
  app.get(api.conversations.list.path, isAuthenticated, async (req, res) => {
    const user = req.user as any;
    const conversations = await storage.getConversations(user.claims.sub);
    res.json(conversations);
  });

  app.post(api.conversations.create.path, isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { participantId } = api.conversations.create.input.parse(req.body);
      const conversation = await storage.createConversation(user.claims.sub, participantId);
      res.status(201).json(conversation);
    } catch (err) {
      res.status(400).json({ message: "Failed to create conversation" });
    }
  });

  app.get(api.conversations.get.path, isAuthenticated, async (req, res) => {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    const conversation = await storage.getConversation(id);
    
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Check membership
    const isMember = conversation.members.some(m => m.id === user.claims.sub);
    if (!isMember) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    res.json(conversation);
  });

  // Messages
  app.get(api.messages.list.path, isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const conversation = await storage.getConversation(id);
    const user = req.user as any;

    if (!conversation || !conversation.members.some(m => m.id === user.claims.sub)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Parse query params safely
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const messages = await storage.getMessages(id, limit, offset);
    res.json(messages);
  });

  app.post(api.messages.send.path, isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = req.user as any;
      const { content } = api.messages.send.input.parse(req.body);

      const conversation = await storage.getConversation(id);
      if (!conversation || !conversation.members.some(m => m.id === user.claims.sub)) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const message = await storage.createMessage(user.claims.sub, id, content);

      // Broadcast to WebSocket clients
      broadcastMessage(id, message);

      res.status(201).json(message);
    } catch (err) {
      res.status(400).json({ message: "Failed to send message" });
    }
  });


  // WebSocket Setup
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  // Map conversationId -> Set<WebSocket>
  // In a real scalable app, use Redis Pub/Sub
  const clients = new Map<number, Set<WebSocket>>();

  wss.on("connection", (ws, req) => {
    // Basic auth check via session cookie would go here
    // For now, clients send a "join" message with conversationId
    
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === "join") {
          const conversationId = message.conversationId;
          if (!clients.has(conversationId)) {
            clients.set(conversationId, new Set());
          }
          clients.get(conversationId)?.add(ws);
          
          // Store conversationId on ws object for cleanup
          (ws as any).conversationId = conversationId;
        }
      } catch (e) {
        console.error("WS error", e);
      }
    });

    ws.on("close", () => {
      const conversationId = (ws as any).conversationId;
      if (conversationId && clients.has(conversationId)) {
        clients.get(conversationId)?.delete(ws);
      }
    });
  });

  function broadcastMessage(conversationId: number, message: any) {
    if (clients.has(conversationId)) {
      const payload = JSON.stringify({ type: "message:new", data: message });
      clients.get(conversationId)?.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    }
  }

  return httpServer;
}
