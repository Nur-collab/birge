import React, { useState } from 'react';
import { Send } from 'lucide-react';

export default function ChatMockup({ participants }) {
    const [messages, setMessages] = useState([
        { id: 1, sender: 'Айнура', text: 'Всем привет! Буду у Народного ровно в 8:15.', isMine: false },
        { id: 2, sender: 'Вы', text: 'Супер, я тоже подхожу!', isMine: true }
    ]);
    const [input, setInput] = useState('');

    const send = (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        setMessages([...messages, { id: Date.now(), sender: 'Вы', text: input, isMine: true }]);
        setInput('');
        setTimeout(() => {
            setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'Азамат (Водитель)', text: 'Отлично, я почти на месте. Жду всех!', isMine: false }]);
        }, 1500);
    };

    return (
        <div className="chat-container">
            <div className="chat-messages">
                {messages.map(m => (
                    <div key={m.id} className={`message ${m.isMine ? 'mine' : 'theirs'}`}>
                        {!m.isMine && <span className="sender">{m.sender}</span>}
                        <div className="bubble">{m.text}</div>
                    </div>
                ))}
            </div>
            <form className="chat-input-area" onSubmit={send}>
                <input
                    type="text"
                    placeholder="Написать в чат..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                />
                <button type="submit" className="send-btn"><Send size={18} /></button>
            </form>

            <style>{`
        .chat-container {
          display: flex;
          flex-direction: column;
          height: 300px;
          background: #f9fafb;
          border-radius: var(--radius);
          border: 1px solid #e5e7eb;
          overflow: hidden;
        }
        .chat-messages {
          flex: 1;
          padding: 1rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .message {
          max-width: 80%;
          display: flex;
          flex-direction: column;
        }
        .message.mine {
          align-self: flex-end;
          align-items: flex-end;
        }
        .message.theirs {
          align-self: flex-start;
          align-items: flex-start;
        }
        .sender {
          font-size: 0.7rem;
          color: #6b7280;
          margin-bottom: 2px;
          margin-left: 5px;
        }
        .bubble {
          padding: 8px 12px;
          border-radius: 12px;
          font-size: 0.9rem;
        }
        .mine .bubble {
          background: var(--primary);
          color: white;
          border-bottom-right-radius: 2px;
        }
        .theirs .bubble {
          background: #e5e7eb;
          color: #1f2937;
          border-bottom-left-radius: 2px;
        }
        .chat-input-area {
          display: flex;
          padding: 10px;
          background: white;
          border-top: 1px solid #e5e7eb;
        }
        .chat-input-area input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 20px;
          outline: none;
        }
        .send-btn {
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          margin-left: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
      `}</style>
        </div>
    );
}
