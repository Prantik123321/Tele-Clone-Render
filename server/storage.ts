import { db } from "./db";
import {
  users, conversations, conversationMembers, messages, contacts,
  type User, type Conversation, type Message, type Contact,
  type InsertConversation, type InsertMessage
} from "@shared/schema";
import { eq, and, or, desc, like, ne, sql } from "drizzle-orm";
import { authStorage, type IAuthStorage } from "./replit_integrations/auth/storage";

export interface IStorage extends IAuthStorage {
  // Contacts
  getContacts(userId: string): Promise<User[]>;
  addContact(userId: string, contactUsername: string): Promise<User>;

  // Conversations
  getConversations(userId: string): Promise<(Conversation & { lastMessage?: Message, unreadCount?: number, otherMember?: User })[]>;
  getConversation(id: number): Promise<(Conversation & { members: User[] }) | undefined>;
  createConversation(userId: string, participantId: string): Promise<Conversation>;

  // Messages
  getMessages(conversationId: number, limit?: number, offset?: number): Promise<(Message & { sender: User })[]>;
  createMessage(senderId: string, conversationId: number, content: string): Promise<Message>;

  // Search
  searchUsers(query: string): Promise<User[]>;
}

export class DatabaseStorage implements IStorage {
  // Auth methods delegated to authStorage
  async getUser(id: string) { return authStorage.getUser(id); }
  async upsertUser(user: any) { return authStorage.upsertUser(user); }

  async getContacts(userId: string): Promise<User[]> {
    const userContacts = await db
      .select({
        user: users,
      })
      .from(contacts)
      .innerJoin(users, eq(contacts.contactId, users.id))
      .where(eq(contacts.userId, userId));
    
    return userContacts.map(c => c.user);
  }

  async addContact(userId: string, contactUsername: string): Promise<User> {
    const [contactUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, contactUsername)); // Replit Auth uses email often, but let's check username field too if mapped
      // Note: Replit Auth schema has 'email' and names. 'username' might not be populated or might be the handle.
      // The schema we defined in shared/schema.ts imports users from auth.ts which has email, firstName, lastName.
      // We'll search by email for now as it's unique.

    if (!contactUser) {
      throw new Error("User not found");
    }

    if (contactUser.id === userId) {
      throw new Error("Cannot add yourself as a contact");
    }

    const [existing] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.contactId, contactUser.id)));

    if (existing) {
      return contactUser;
    }

    await db.insert(contacts).values({
      userId,
      contactId: contactUser.id,
    });

    return contactUser;
  }

  async getConversations(userId: string): Promise<(Conversation & { lastMessage?: Message, unreadCount?: number, otherMember?: User })[]> {
    // 1. Get all conversation IDs the user is part of
    const memberships = await db
      .select({ conversationId: conversationMembers.conversationId })
      .from(conversationMembers)
      .where(eq(conversationMembers.userId, userId));

    const conversationIds = memberships.map(m => m.conversationId);

    if (conversationIds.length === 0) {
      return [];
    }

    // 2. Fetch conversations details
    const userConversations = await db
      .select()
      .from(conversations)
      .where(or(...conversationIds.map(id => eq(conversations.id, id))))
      .orderBy(desc(conversations.createdAt));

    // 3. Enrich with last message and other member info
    const enriched = await Promise.all(userConversations.map(async (conv) => {
      // Get last message
      const [lastMsg] = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conv.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      let otherMember: User | undefined;
      if (!conv.isGroup) {
        // Find the other member
        const [member] = await db
          .select({ user: users })
          .from(conversationMembers)
          .innerJoin(users, eq(conversationMembers.userId, users.id))
          .where(and(
            eq(conversationMembers.conversationId, conv.id),
            ne(conversationMembers.userId, userId)
          ));
        otherMember = member?.user;
      }

      return {
        ...conv,
        lastMessage: lastMsg,
        unreadCount: 0, // TODO: Implement unread count
        otherMember,
      };
    }));

    // Sort by last message time if available, else creation time
    return enriched.sort((a, b) => {
      const timeA = a.lastMessage?.createdAt.getTime() || a.createdAt.getTime();
      const timeB = b.lastMessage?.createdAt.getTime() || b.createdAt.getTime();
      return timeB - timeA;
    });
  }

  async getConversation(id: number): Promise<(Conversation & { members: User[] }) | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));

    if (!conversation) return undefined;

    const members = await db
      .select({ user: users })
      .from(conversationMembers)
      .innerJoin(users, eq(conversationMembers.userId, users.id))
      .where(eq(conversationMembers.conversationId, id));

    return {
      ...conversation,
      members: members.map(m => m.user),
    };
  }

  async createConversation(userId: string, participantId: string): Promise<Conversation> {
    // Check if direct chat exists
    // This is a bit complex in SQL: Find a conversation where both users are members and isGroup is false
    // For MVP, simplistic approach:
    
    // Start transaction logic roughly:
    const [newConv] = await db.insert(conversations).values({
      isGroup: false,
    }).returning();

    await db.insert(conversationMembers).values([
      { conversationId: newConv.id, userId },
      { conversationId: newConv.id, userId: participantId }
    ]);

    return newConv;
  }

  async getMessages(conversationId: number, limit = 50, offset = 0): Promise<(Message & { sender: User })[]> {
    const msgs = await db
      .select({
        message: messages,
        sender: users,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(sql`${messages.createdAt} ASC`) // Chronological order
      .limit(limit)
      .offset(offset);

    return msgs.map(m => ({
      ...m.message,
      sender: m.sender,
    }));
  }

  async createMessage(senderId: string, conversationId: number, content: string): Promise<Message> {
    const [msg] = await db
      .insert(messages)
      .values({
        senderId,
        conversationId,
        content,
      })
      .returning();
    return msg;
  }

  async searchUsers(query: string): Promise<User[]> {
    return db
      .select()
      .from(users)
      .where(or(
        like(users.email, `%${query}%`),
        like(users.firstName, `%${query}%`),
        like(users.lastName, `%${query}%`)
      ))
      .limit(10);
  }
}

export const storage = new DatabaseStorage();
