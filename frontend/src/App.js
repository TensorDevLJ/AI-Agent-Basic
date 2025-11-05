import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API_BASE } from "./config";
import "./App.css";

function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(() => {
    // Load chat from localStorage if available
    const saved = localStorage.getItem("chat_history");
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);

  // Auto scroll down when new messages come in
  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
    localStorage.setItem("chat_history", JSON.stringify(messages));
  }, [messages]);

  // Ask for browser notification permission once
  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  // Poll reminders every 30s
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await axios.get(`${API_BASE}/reminders/due`);
        if (res.data.due && res.data.due.length) {
          res.data.due.forEach((r) => {
            if (Notification.permission === "granted") {
              new Notification("🔔 Reminder", {
                body: `${r.title} at ${new Date(r.remind_at).toLocaleTimeString()}`,
              });
            }
            setMessages((prev) => [
              ...prev,
              { sender: "bot", text: `🔔 Reminder: ${r.title}` },
            ]);
          });
        }
      } catch (err) {
        console.error("Reminder check failed", err);
      }
    };
    const interval = setInterval(poll, 30000); // every 30s
    return () => clearInterval(interval);
  }, []);

  // Send message to backend
  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setInput("");

    try {
      const res = await axios.post(`${API_BASE}/ask`, { message: input });
      const bot = { sender: "bot", text: res.data.reply };
      setMessages((prev) => [...prev, bot]);
    } catch (e) {
      const bot = { sender: "bot", text: "⚠️ Could not reach backend." };
      setMessages((prev) => [...prev, bot]);
    }
    setLoading(false);
  };

  const onKey = (e) => {
    if (e.key === "Enter") send();
  };

  return (
    <div className="app">
      <div className="chat-card">
        <h2>🤖 Smart Agent</h2>
        <div className="messages" ref={boxRef}>
          {messages.map((m, i) => (
            <div key={i} className={"msg " + m.sender}>
              {m.text}
            </div>
          ))}
          {loading && (
            <div className="msg bot typing">
              <span>Agent is thinking...</span>
            </div>
          )}
        </div>
        <div className="input-area">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Type a command, e.g., 'Remind me to study at 6pm'"
          />
          <button onClick={send}>Send</button>
        </div>
      </div>
    </div>
  );
}

export default App;
