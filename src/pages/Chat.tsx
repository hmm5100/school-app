// src/pages/Chat.tsx
// ✅ Firebase Firestore - مع صلاحيات حسب الدور

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  sendMessage,
  listenToConversation,
  listenToUserConversations,
  listenToAllMessages,
  markMessagesAsRead,
  getAvailableUsers,
  getAllowedRoles,
  type ChatMessage,
  type ChatUser,
  type ChatConversation,
  type UserRole,
} from '../services/chatService';
import { Search, Send, Paperclip, Eye, MessageSquare, Users, Shield } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────
const formatTime = (date: Date) => {
  if (!date) return '';
  const diff = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diff < 1) return 'الآن';
  if (diff < 60) return `${diff}د`;
  if (diff < 1440) return `${Math.floor(diff / 60)}س`;
  return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
};

const fullTime = (date: Date) =>
  date?.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) || '';

const roleLabel = (role: UserRole) =>
  role === 'admin' ? 'مسؤول' : role === 'teacher' ? 'مدرس' : 'طالب';

const roleColor = (role: UserRole) =>
  role === 'admin' ? '#a78bfa' : role === 'teacher' ? '#60a5fa' : '#34d399';

const roleBg = (role: UserRole) =>
  role === 'admin' ? 'rgba(167,139,250,0.15)' : role === 'teacher' ? 'rgba(96,165,250,0.15)' : 'rgba(52,211,153,0.15)';

const avatarColors = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];
const avatarColor = (id: string) => avatarColors[id.charCodeAt(id.length - 1) % avatarColors.length];

// ─── Avatar ───────────────────────────────────────────────────────────
const Avatar = ({ name, id, size = 40 }: { name: string; id: string; size?: number }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    background: avatarColor(id),
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'white', fontWeight: 'bold', fontSize: size * 0.35,
    flexShrink: 0,
  }}>
    {name?.charAt(0) || '?'}
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────
export default function Chat() {
  const { userProfile, studentProfile, userRole } = useAuth();

  const currentUserId = userProfile?.id || studentProfile?.id || '';
  const currentUserName = userProfile?.displayName || studentProfile?.name || 'مستخدم';
  const currentRole = (userRole || 'student') as UserRole;
  const isAdmin = currentRole === 'admin';

  const [tab, setTab] = useState<'chat' | 'monitor'>('chat');
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [availableUsers, setAvailableUsers] = useState<ChatUser[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [activeUser, setActiveUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [monitorSearch, setMonitorSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // جلب المستخدمين المتاحين
  useEffect(() => {
    if (!currentUserId) return;
    getAvailableUsers(currentUserId, currentRole).then(setAvailableUsers);
  }, [currentUserId, currentRole]);

  // الاستماع للمحادثات
  useEffect(() => {
    if (!currentUserId) return;
    const unsub = listenToUserConversations(currentUserId, setConversations);
    return unsub;
  }, [currentUserId]);

  // الاستماع لرسائل المحادثة النشطة
  useEffect(() => {
    if (!currentUserId || !activeUserId) return;
    const unsub = listenToConversation(currentUserId, activeUserId, (msgs) => {
      setMessages(msgs);
      markMessagesAsRead(activeUserId, currentUserId);
    });
    return unsub;
  }, [currentUserId, activeUserId]);

  // مراقبة كل الرسائل (المسئول فقط)
  useEffect(() => {
    if (!isAdmin || tab !== 'monitor') return;
    const unsub = listenToAllMessages(setAllMessages);
    return unsub;
  }, [isAdmin, tab]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    }
  }, [inputText]);

  const openConversation = (conv: ChatConversation) => {
    setActiveUserId(conv.userId);
    setActiveUser({ id: conv.userId, name: conv.userName, role: conv.userRole });
    setShowNewChat(false);
  };

  const startNewChat = (user: ChatUser) => {
    setActiveUserId(user.id);
    setActiveUser(user);
    setShowNewChat(false);
    setUserSearch('');
  };

  const handleSend = async () => {
    if (!inputText.trim() || !activeUserId || !activeUser || loading) return;
    setLoading(true);
    try {
      await sendMessage(
        currentUserId, currentUserName, currentRole,
        activeUserId, activeUser.name, activeUser.role,
        inputText.trim()
      );
      setInputText('');
    } catch (err: any) {
      alert(err.message || 'حدث خطأ في الإرسال');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUserId || !activeUser) return;
    await sendMessage(
      currentUserId, currentUserName, currentRole,
      activeUserId, activeUser.name, activeUser.role,
      '',
      { name: file.name, url: '', type: file.type }
    );
    e.target.value = '';
  };

  const filteredConvs = conversations.filter(c =>
    !searchQuery || c.userName.includes(searchQuery)
  );

  const filteredUsers = availableUsers.filter(u =>
    !userSearch || u.name.includes(userSearch)
  );

  // ─── Monitor: تجميع المحادثات لكل المسئول ─────────────────────────
  const monitorConvs = (() => {
    const map = new Map<string, { user1: string; user1Name: string; user1Role: UserRole; user2: string; user2Name: string; user2Role: UserRole; lastMsg: string; lastTime: Date; count: number }>();
    allMessages.forEach(m => {
      const key = [m.senderId, m.receiverId].sort().join('||');
      if (!map.has(key)) {
        map.set(key, {
          user1: m.senderId, user1Name: m.senderName, user1Role: m.senderRole,
          user2: m.receiverId, user2Name: m.receiverName, user2Role: m.receiverRole,
          lastMsg: m.message || '📎 مرفق',
          lastTime: m.timestamp,
          count: 1,
        });
      } else {
        const ex = map.get(key)!;
        map.set(key, { ...ex, count: ex.count + 1 });
      }
    });
    return Array.from(map.values()).filter(c =>
      !monitorSearch || c.user1Name.includes(monitorSearch) || c.user2Name.includes(monitorSearch)
    );
  })();

  return (
    <div style={{
      height: '100vh', display: 'flex', background: '#111827',
      color: '#f9fafb', fontFamily: 'Cairo, sans-serif', direction: 'rtl',
      overflow: 'hidden',
    }}>
      <style>{`
        .chat-textarea { color: #ffffff !important; }
        .chat-textarea::placeholder { color: #6b7280 !important; opacity: 1; }
        .chat-textarea:focus { border-color: rgba(96,165,250,0.4) !important; box-shadow: 0 0 0 2px rgba(96,165,250,0.1); }
        .chat-textarea, .chat-textarea:focus, .chat-textarea:active { -webkit-text-fill-color: #ffffff !important; }
      `}</style>

      {/* ── Sidebar ── */}
      <div style={{
        width: 320, borderLeft: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>

        {/* Header */}
        <div style={{
          padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageSquare size={20} color="#60a5fa" />
            <h2 style={{ fontSize: 16, fontWeight: 'bold', color: 'white', margin: 0 }}>الشات</h2>
          </div>
          <button
            onClick={() => { setShowUsersModal(true); setUserSearch(''); }}
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: '#2555a0', border: 'none', color: 'white',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title="محادثة جديدة"
          >
            <svg width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Tabs - المسئول فقط */}
        {isAdmin && (
          <div style={{
            display: 'flex', padding: '8px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)', gap: 8,
          }}>
            <button
              onClick={() => setTab('chat')}
              style={{
                flex: 1, padding: '8px', borderRadius: 8, border: 'none',
                background: tab === 'chat' ? '#2555a0' : '#1f2937',
                color: 'white', cursor: 'pointer', fontSize: 12, fontFamily: 'Cairo',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}
            >
              <MessageSquare size={13} /> محادثاتي
            </button>
            <button
              onClick={() => setTab('monitor')}
              style={{
                flex: 1, padding: '8px', borderRadius: 8, border: 'none',
                background: tab === 'monitor' ? '#7c3aed' : '#1f2937',
                color: 'white', cursor: 'pointer', fontSize: 12, fontFamily: 'Cairo',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}
            >
              <Shield size={13} /> مراقبة الكل
            </button>
          </div>
        )}

        {/* Search */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#1f2937', borderRadius: 10, padding: '8px 12px',
          }}>
            <Search size={14} color="#9ca3af" />
            <input
              placeholder="بحث..."
              value={tab === 'monitor' ? monitorSearch : searchQuery}
              onChange={e => tab === 'monitor' ? setMonitorSearch(e.target.value) : setSearchQuery(e.target.value)}
              style={{
                background: 'none', border: 'none', outline: 'none',
                color: 'white', fontSize: 13, width: '100%',
                fontFamily: 'Cairo', direction: 'rtl',
              }}
            />
          </div>
        </div>

        {/* Conversations List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {tab === 'chat' && filteredConvs.map(conv => (
            <div
              key={conv.userId}
              onClick={() => openConversation(conv)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px', cursor: 'pointer',
                background: activeUserId === conv.userId ? '#1f2937' : 'transparent',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (activeUserId !== conv.userId) (e.currentTarget as HTMLDivElement).style.background = '#161f2e'; }}
              onMouseLeave={e => { if (activeUserId !== conv.userId) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
            >
              <Avatar name={conv.userName} id={conv.userId} size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: '700', color: 'white' }}>{conv.userName}</span>
                  <span style={{ fontSize: 10, color: '#6b7280' }}>{formatTime(conv.lastMessageTime)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                    {conv.lastMessage}
                  </span>
                  {conv.unreadCount > 0 && (
                    <span style={{
                      background: '#3b82f6', color: 'white', borderRadius: '50%',
                      width: 18, height: 18, fontSize: 10, fontWeight: '700',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>{conv.unreadCount}</span>
                  )}
                </div>
                <span style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: 10,
                  background: roleBg(conv.userRole), color: roleColor(conv.userRole),
                }}>{roleLabel(conv.userRole)}</span>
              </div>
            </div>
          ))}

          {/* Monitor Tab */}
          {tab === 'monitor' && isAdmin && monitorConvs.map((conv, i) => (
            <div
              key={i}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Avatar name={conv.user1Name} id={conv.user1} size={24} />
                <span style={{ fontSize: 12, color: 'white', fontWeight: '600' }}>{conv.user1Name}</span>
                <span style={{ fontSize: 10, color: roleColor(conv.user1Role), background: roleBg(conv.user1Role), padding: '1px 6px', borderRadius: 10 }}>{roleLabel(conv.user1Role)}</span>
                <span style={{ fontSize: 10, color: '#6b7280', margin: '0 4px' }}>←→</span>
                <Avatar name={conv.user2Name} id={conv.user2} size={24} />
                <span style={{ fontSize: 12, color: 'white', fontWeight: '600' }}>{conv.user2Name}</span>
                <span style={{ fontSize: 10, color: roleColor(conv.user2Role), background: roleBg(conv.user2Role), padding: '1px 6px', borderRadius: 10 }}>{roleLabel(conv.user2Role)}</span>
              </div>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, paddingRight: 4 }}>
                {conv.lastMsg} · {conv.count} رسالة · {formatTime(conv.lastTime)}
              </p>
            </div>
          ))}

          {tab === 'chat' && filteredConvs.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>
              <MessageSquare size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
              <p style={{ fontSize: 13 }}>لا توجد محادثات بعد</p>
              <p style={{ fontSize: 11 }}>اضغط + لبدء محادثة جديدة</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Chat Area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {activeUser ? (
          <>
            {/* Chat Header */}
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: '#0f172a',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              {/* زر رجوع */}
              <button
                onClick={() => { setActiveUserId(null); setActiveUser(null); setMessages([]); }}
                style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: 'rgba(37,85,160,0.3)', border: '1px solid rgba(96,165,250,0.3)',
                  color: '#60a5fa', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#2555a0'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(37,85,160,0.3)'; e.currentTarget.style.color = '#60a5fa'; }}
                title="رجوع للمحادثات"
              >
                <svg width={18} height={18} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <Avatar name={activeUser.name} id={activeUser.id} size={42} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <p style={{ fontSize: 15, fontWeight: '700', color: 'white', margin: 0 }}>{activeUser.name}</p>
                  {activeUser.role === 'admin' && (
                    <span style={{ fontSize: 12, color: '#a78bfa', fontWeight: '600' }}>
                      (حمدي الهاشمي)
                    </span>
                  )}
                </div>
                <span style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 10,
                  background: roleBg(activeUser.role), color: roleColor(activeUser.role),
                }}>
                  {roleLabel(activeUser.role)}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: '#6b7280', marginTop: 60 }}>
                  <MessageSquare size={40} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                  <p>ابدأ المحادثة مع {activeUser.name}</p>
                </div>
              )}
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === currentUserId;
                const showAvatar = idx === 0 || messages[idx - 1]?.senderId !== msg.senderId;
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: isMe ? 'row-reverse' : 'row',
                      alignItems: 'flex-end',
                      gap: 8,
                      marginBottom: showAvatar ? 8 : 2,
                    }}
                  >
                    {!isMe && showAvatar && <Avatar name={msg.senderName} id={msg.senderId} size={30} />}
                    {!isMe && !showAvatar && <div style={{ width: 30, flexShrink: 0 }} />}
                    <div style={{ maxWidth: '65%' }}>
                      {showAvatar && !isMe && (
                        <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 3px 8px' }}>{msg.senderName}</p>
                      )}
                      <div style={{
                        background: isMe ? '#2555a0' : '#1f2937',
                        borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        padding: '10px 14px',
                        fontSize: 14,
                        color: 'white',
                        lineHeight: 1.5,
                      }}>
                        {msg.attachment ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Paperclip size={14} />
                            <span>{msg.attachment.name}</span>
                          </div>
                        ) : msg.message}
                      </div>
                      <p style={{
                        fontSize: 10, color: '#6b7280', margin: '2px 4px 0',
                        textAlign: isMe ? 'left' : 'right',
                      }}>
                        {fullTime(msg.timestamp)}
                        {isMe && <span style={{ marginRight: 4 }}>{msg.read ? ' ✓✓' : ' ✓'}</span>}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              background: '#0f172a',
              display: 'flex', alignItems: 'flex-end', gap: 10,
            }}>
              <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileSelect} />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: 38, height: 38, borderRadius: 10, background: '#1f2937',
                  border: 'none', color: '#9ca3af', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <Paperclip size={16} />
              </button>
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="اكتب رسالة... (Enter للإرسال)"
                rows={1}
                className="chat-textarea"
                style={{
                  flex: 1, background: '#2d3748', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 12, padding: '10px 14px', color: '#ffffff',
                  fontSize: 14, fontFamily: 'Cairo', outline: 'none', resize: 'none',
                  direction: 'rtl', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
                  caretColor: '#60a5fa',
                }}
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || loading}
                style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: inputText.trim() ? '#2555a0' : '#1f2937',
                  border: 'none', cursor: inputText.trim() ? 'pointer' : 'default',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'background 0.2s',
                }}
              >
                <Send size={17} />
              </button>
            </div>
          </>
        ) : (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', color: '#6b7280',
          }}>
            <MessageSquare size={56} style={{ opacity: 0.15, marginBottom: 16 }} />
            <p style={{ fontSize: 16, fontWeight: '600' }}>اختر محادثة للبدء</p>
            {currentRole === 'student' && (
              <p style={{ fontSize: 12, color: '#4b5563', marginTop: 8, textAlign: 'center', maxWidth: 260 }}>
                يمكنك التواصل مع المدرسين والمسئول فقط
              </p>
            )}
          </div>
        )}
      </div>
      {/* ── Users Modal ── */}
      {showUsersModal && (
        <div
          onClick={() => setShowUsersModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#1a2236', borderRadius: 16, width: 380, maxHeight: '75vh',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: '700', color: 'white' }}>
                  {currentRole === 'student' ? '👨‍🏫 المدرسون والمسئول' : '💬 بدء محادثة جديدة'}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af' }}>
                  {currentRole === 'student' ? 'يمكنك التواصل مع المدرسين والمسئول فقط' : 'اختر الشخص الذي تريد محادثته'}
                </p>
              </div>
              <button
                onClick={() => setShowUsersModal(false)}
                style={{
                  width: 32, height: 32, borderRadius: 8, background: '#374151',
                  border: 'none', color: '#9ca3af', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, lineHeight: 1,
                }}
              >×</button>
            </div>

            {/* Search */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#0f172a', borderRadius: 10, padding: '9px 14px',
              }}>
                <Search size={14} color="#9ca3af" />
                <input
                  placeholder="ابحث بالاسم..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  autoFocus
                  style={{
                    background: 'none', border: 'none', outline: 'none',
                    color: 'white', fontSize: 13, width: '100%',
                    fontFamily: 'Cairo', direction: 'rtl',
                  }}
                />
              </div>
            </div>

            {/* Users List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              {/* Group by role */}
              {(['admin', 'teacher'] as UserRole[])
                .filter(role => filteredUsers.some(u => u.role === role))
                .map(role => (
                  <div key={role}>
                    <p style={{
                      fontSize: 10, color: roleColor(role), fontWeight: '700',
                      padding: '8px 16px 4px', margin: 0, letterSpacing: 1,
                      textTransform: 'uppercase',
                    }}>
                      {role === 'admin' ? '🛡️ المسئول' : '👨‍🏫 المدرسون'}
                    </p>
                    {filteredUsers.filter(u => u.role === role).map(u => (
                      <div
                        key={u.id}
                        onClick={() => { startNewChat(u); setShowUsersModal(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 16px', cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#1f2937'}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                      >
                        <Avatar name={u.name} id={u.id} size={40} />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 14, color: 'white', margin: 0, fontWeight: '600' }}>{u.name}</p>
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 10,
                            background: roleBg(u.role), color: roleColor(u.role),
                          }}>{roleLabel(u.role)}</span>
                        </div>
                        <svg width={16} height={16} fill="none" stroke="#4b5563" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </div>
                    ))}
                  </div>
                ))
              }
              {filteredUsers.length === 0 && (
                <div style={{ textAlign: 'center', padding: 32, color: '#6b7280' }}>
                  <Users size={32} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 13 }}>لا يوجد مستخدمون</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
