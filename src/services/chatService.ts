// src/services/chatService.ts
// ✅ Firebase Firestore - حقيقي مش localStorage

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  getDocs,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// ─── Types ────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'teacher' | 'student';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  receiverId: string;
  receiverName: string;
  receiverRole: UserRole;
  message: string;
  timestamp: Date;
  read: boolean;
  attachment?: { name: string; url: string; type: string };
}

export interface ChatUser {
  id: string;
  name: string;
  role: UserRole;
  online?: boolean;
}

export interface ChatConversation {
  userId: string;
  userName: string;
  userRole: UserRole;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
}

// ─── قواعد الصلاحيات ──────────────────────────────────────────────────
// الطالب: مدرسين + مسئول بس (مش طلاب تانيين)
// المدرس: الكل
// المسئول: الكل
export const getAllowedRoles = (currentRole: UserRole): UserRole[] => {
  if (currentRole === 'student') return ['admin', 'teacher'];
  return ['admin', 'teacher', 'student'];
};

// ─── إرسال رسالة ──────────────────────────────────────────────────────
export const sendMessage = async (
  senderId: string,
  senderName: string,
  senderRole: UserRole,
  receiverId: string,
  receiverName: string,
  receiverRole: UserRole,
  message: string,
  attachment?: { name: string; url: string; type: string }
): Promise<void> => {
  // تأكد إن الطالب مش بيبعت لطالب تاني
  if (senderRole === 'student' && receiverRole === 'student') {
    throw new Error('الطلاب لا يمكنهم التواصل مع بعضهم');
  }

  await addDoc(collection(db, 'chat_messages'), {
    senderId,
    senderName,
    senderRole,
    receiverId,
    receiverName,
    receiverRole,
    message: message || '',
    timestamp: serverTimestamp(),
    read: false,
    ...(attachment ? { attachment } : {}),
  });
};

// ─── الاستماع للمحادثة بين شخصين (real-time) ──────────────────────────
export const listenToConversation = (
  user1Id: string,
  user2Id: string,
  callback: (messages: ChatMessage[]) => void
): (() => void) => {
  // Firebase مش بيدعم OR queries بشكل مباشر في القديم
  // بنعمل query واحدة ونفلتر على الكلاينت
  const q = query(
    collection(db, 'chat_messages'),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(q, (snap) => {
    const msgs: ChatMessage[] = snap.docs
      .map(d => ({
        id: d.id,
        ...d.data(),
        timestamp: (d.data().timestamp as Timestamp)?.toDate?.() || new Date(),
      }) as ChatMessage)
      .filter(m =>
        (m.senderId === user1Id && m.receiverId === user2Id) ||
        (m.senderId === user2Id && m.receiverId === user1Id)
      );
    callback(msgs);
  });
};

// ─── الاستماع لمحادثات المستخدم (real-time) ───────────────────────────
export const listenToUserConversations = (
  userId: string,
  callback: (convs: ChatConversation[]) => void
): (() => void) => {
  const q = query(
    collection(db, 'chat_messages'),
    orderBy('timestamp', 'desc')
  );

  return onSnapshot(q, (snap) => {
    const msgs = snap.docs
      .map(d => ({
        id: d.id,
        ...d.data(),
        timestamp: (d.data().timestamp as Timestamp)?.toDate?.() || new Date(),
      }) as ChatMessage)
      .filter(m => m.senderId === userId || m.receiverId === userId);

    const map = new Map<string, ChatConversation>();

    msgs.forEach(msg => {
      const isMe = msg.senderId === userId;
      const otherId = isMe ? msg.receiverId : msg.senderId;
      const otherName = isMe ? msg.receiverName : msg.senderName;
      const otherRole = isMe ? msg.receiverRole : msg.senderRole;

      if (!map.has(otherId)) {
        map.set(otherId, {
          userId: otherId,
          userName: otherName,
          userRole: otherRole,
          lastMessage: msg.message || (msg.attachment ? '📎 مرفق' : ''),
          lastMessageTime: msg.timestamp,
          unreadCount: (!isMe && !msg.read) ? 1 : 0,
        });
      } else {
        const ex = map.get(otherId)!;
        if (!isMe && !msg.read) {
          map.set(otherId, { ...ex, unreadCount: ex.unreadCount + 1 });
        }
      }
    });

    callback(Array.from(map.values()));
  });
};

// ─── تحديد الرسائل كمقروءة ────────────────────────────────────────────
export const markMessagesAsRead = async (
  senderId: string,
  receiverId: string
): Promise<void> => {
  const q = query(
    collection(db, 'chat_messages'),
    where('senderId', '==', senderId),
    where('receiverId', '==', receiverId),
    where('read', '==', false)
  );
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map(d => updateDoc(doc(db, 'chat_messages', d.id), { read: true })));
};

// ─── عدد الرسائل غير المقروءة (للـ Navbar) ───────────────────────────
export const getUnreadCount = (_userId: string, _role?: string): number => 0;

// ─── جلب المستخدمين المتاحين من Firebase ──────────────────────────────
export const getAvailableUsers = async (
  currentUserId: string,
  currentRole: UserRole
): Promise<ChatUser[]> => {
  const allowedRoles = getAllowedRoles(currentRole);
  const users: ChatUser[] = [];

  // جلب المدرسين والمسئولين من collection users
  const usersSnap = await getDocs(collection(db, 'users'));
  usersSnap.forEach(d => {
    const data = d.data();
    if (d.id !== currentUserId && allowedRoles.includes(data.role)) {
      users.push({
        id: d.id,
        name: data.displayName || data.name || 'مستخدم',
        role: data.role,
      });
    }
  });

  // لو مش طالب، يضيف الطلاب من collection students
  if (currentRole !== 'student') {
    const studentsSnap = await getDocs(collection(db, 'students'));
    studentsSnap.forEach(d => {
      const data = d.data();
      if (d.id !== currentUserId) {
        users.push({
          id: d.id,
          name: data.name || 'طالب',
          role: 'student',
        });
      }
    });
  }

  return users;
};

// ─── مراقبة المسئول لكل المحادثات ─────────────────────────────────────
export const listenToAllMessages = (
  callback: (messages: ChatMessage[]) => void
): (() => void) => {
  const q = query(
    collection(db, 'chat_messages'),
    orderBy('timestamp', 'desc')
  );

  return onSnapshot(q, (snap) => {
    const msgs: ChatMessage[] = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      timestamp: (d.data().timestamp as Timestamp)?.toDate?.() || new Date(),
    })) as ChatMessage[];
    callback(msgs);
  });
};
