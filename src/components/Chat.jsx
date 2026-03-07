import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/api';

export default function Chat({ tripId, currentUser, partnerName, onNewMessage }) {
  const { t } = useTranslation();
  const defaultPartnerName = partnerName || t('matches.passenger');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const ws = useRef(null);
  const messagesEndRef = useRef(null);

  // Защита перенесена ПОСЛЕ всех хуков (правило React)
  // Внутренние проверки добавлены внутри useEffect ниже

  useEffect(() => {
    // Не запускаем если нет пользователя или поездки
    if (!currentUser || !tripId) return;
    // [DEBUG] Логируем ID комнаты
    console.log(`[CHAT DEBUG] User ${currentUser.id} (${currentUser.name}) joining room trip_id=${tripId}`);

    const loadHistory = async () => {
      if (tripId) {
        const history = await api.getTripMessages(tripId);
        console.log(`[CHAT DEBUG] Loaded ${history.length} history messages for trip ${tripId}`);
        // Преобразуем формат истории в формат внутреннего state
        const formattedHistory = history.map(h => ({
          id: h.id,
          senderId: h.sender_id,
          senderName: h.sender?.name || (h.sender_id === currentUser.id ? currentUser.name : defaultPartnerName),
          text: h.text,
          time: h.timestamp
        }));
        setMessages(formattedHistory);
      }
    };
    loadHistory();

    // Подключаемся к WebSocket
    let reconnectTimer = null;
    let intentionalClose = false;

    const connect = () => {
      if (intentionalClose) return;
      const WS_URL = (import.meta.env.VITE_API_URL || 'https://birge-backend.onrender.com').replace('https://', 'wss://').replace('http://', 'ws://');
      const wsUrl = `${WS_URL}/ws/chat/${tripId}/${currentUser.id}`;
      console.log(`[CHAT DEBUG] Connecting WS: ${wsUrl}`);
      const socket = new WebSocket(wsUrl);
      ws.current = socket;

      socket.onopen = () => {
        console.log(`[CHAT DEBUG] WS CONNECTED: room=${tripId}, user=${currentUser.id}`);
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log(`[CHAT DEBUG] Received msg:`, data);
        const newMsg = {
          id: data.id,
          senderId: data.sender_id,
          senderName: data.sender_id === currentUser.id ? currentUser.name : defaultPartnerName,
          text: data.text,
          time: data.timestamp
        };
        setMessages((prev) => {
          // Дедупликация: не добавляем если id уже есть
          if (prev.some(m => m.id === newMsg.id)) return prev;
          // Уведомляем App о новом входящем сообщении от собеседника
          if (data.sender_id !== currentUser.id && onNewMessage) {
            onNewMessage();
          }
          return [...prev, newMsg];
        });
      };

      socket.onclose = () => {
        console.log(`[CHAT DEBUG] WS closed for room=${tripId}`);
        if (!intentionalClose) {
          console.log('WebSocket disconnected, reconnecting in 3s...');
          reconnectTimer = setTimeout(connect, 3000);
        }
      };

      socket.onerror = (err) => {
        console.warn('[CHAT DEBUG] WebSocket error:', err);
      };
    };

    connect();

    return () => {
      intentionalClose = true;
      clearTimeout(reconnectTimer);
      if (ws.current) ws.current.close();
    };
  }, [tripId, currentUser?.id]);

  useEffect(() => {
    // Автоскролл к последнему сообщению
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Ранний выход ПОСЛЕ всех хуков — безопасно
  if (!currentUser || !tripId) return null;

  const sendMessage = (e) => {
    e.preventDefault();
    if (input.trim() && ws.current && ws.current.readyState === WebSocket.OPEN) {
      // Отправляем строку с текстом, бэкенд ожидает JSON с полем text
      ws.current.send(JSON.stringify({ text: input.trim() }));
      setInput('');
    }
  };

  return (
    <div className="chat glass-panel">
      {/* [DEBUG] Показывает ID комнаты — убрать после исправления */}
      <div style={{
        background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 6,
        padding: '3px 8px', fontSize: 11, color: '#92400e', margin: '8px 8px 0', textAlign: 'center'
      }}>
        🔗 Room: <b>trip_{tripId}</b> | Я: <b>user_{currentUser.id}</b>
      </div>
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            {t('trip.type_message')}
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            return (
              <div key={msg.id} className={`message ${isMe ? 'message-sent' : 'message-received'}`}>
                {!isMe && <span className="message-sender">{msg.senderName}</span>}
                <div className="message-bubble">
                  {msg.text}
                </div>
                <span className="message-time">{msg.time}</span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-area" onSubmit={sendMessage}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('trip.type_message')}
          className="chat-input"
        />
        <button type="submit" className="chat-send-btn" disabled={!input.trim()}>
          <Send size={18} />
        </button>
      </form>

      <style>{`
        .chat {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 250px;
          max-height: 400px;
          padding: 0;
          overflow: hidden;
        }
        .chat-messages {
          flex: 1;
          padding: 15px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          scrollbar-width: thin;
        }
        .chat-empty {
          text-align: center;
          color: #9ca3af;
          margin-top: auto;
          margin-bottom: auto;
          font-size: 0.9rem;
        }
        .message {
          display: flex;
          flex-direction: column;
          max-width: 85%;
        }
        .message-sent {
          align-self: flex-end;
          align-items: flex-end;
        }
        .message-received {
          align-self: flex-start;
          align-items: flex-start;
        }
        .message-sender {
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 2px;
          margin-left: 4px;
        }
        .message-bubble {
          padding: 10px 14px;
          border-radius: 16px;
          font-size: 0.95rem;
          line-height: 1.4;
          box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }
        .message-sent .message-bubble {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border-bottom-right-radius: 4px;
        }
        .message-received .message-bubble {
          background: #f3f4f6;
          color: #1f2937;
          border-bottom-left-radius: 4px; border: 1px solid #e5e7eb;
        }
        .message-time {
          font-size: 0.7rem;
          color: #9ca3af;
          margin-top: 4px;
        }
        .chat-input-area {
          display: flex;
          padding: 12px;
          background: white;
          border-top: 1px solid #f3f4f6;
          gap: 8px;
        }
        .chat-input {
          flex: 1;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          padding: 10px 16px;
          outline: none;
          background: #f9fafb;
          font-size: 0.95rem;
          transition: all 0.2s;
        }
        .chat-input:focus {
          background: white;
          border-color: #10b981;
        }
        .chat-send-btn {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .chat-send-btn:disabled {
          background: #e5e7eb;
          color: #9ca3af;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
