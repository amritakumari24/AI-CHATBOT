import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

const MAX_QUESTIONS = 20;
const STORAGE_KEY = "talky-chat-history";
const suggestedPrompts = ["Tell me a fun fact", "Why is the sky blue?", "Tell me about animals", "Help me learn something new"];

const createChat = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  title: "New conversation",
  messages: [],
  questionCount: 0,
  completed: false,
  updatedAt: Date.now(),
});

const readStoredChats = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(stored) && stored.length ? stored : [createChat()];
  } catch {
    return [createChat()];
  }
};

function App() {
  const [chats, setChats] = useState(readStoredChats);
  const [activeChatId, setActiveChatId] = useState(() => readStoredChats()[0].id);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [speechPaused, setSpeechPaused] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 760);
  const [theme, setTheme] = useState(() => localStorage.getItem("talky-theme") || "light");
  const recognitionRef = useRef(null);
  const chatRef = useRef(null);

  const activeChat = chats.find((chat) => chat.id === activeChatId) || chats[0];
  const messages = activeChat?.messages || [];
  const questionCount = activeChat?.questionCount || 0;
  const isCompleted = activeChat?.completed || questionCount >= MAX_QUESTIONS;

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(chats)), [chats]);

  useEffect(() => localStorage.setItem("talky-theme", theme), [theme]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return undefined;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0].transcript).join(" ").trim();
      if (transcript) setText(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    return () => recognition.stop();
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loading]);

  const updateChat = (chatId, updater) => {
    setChats((current) => current.map((chat) => (chat.id === chatId ? updater(chat) : chat)));
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setSpeechPaused(false);
    setSpeakingMessageId(null);
  };

  const startNewChat = () => {
    const nextChat = createChat();
    setChats((current) => [nextChat, ...current]);
    setActiveChatId(nextChat.id);
    setText("");
    setSidebarOpen(false);
    stopSpeaking();
  };

  const selectChat = (chatId) => {
    setActiveChatId(chatId);
    setText("");
    setSidebarOpen(false);
    stopSpeaking();
  };

  const speakText = (value, messageId = null) => {
    if (!value) return Promise.resolve();
    return new Promise((resolve) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(value);
      utterance.lang = "en-US";
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.onstart = () => {
        setSpeaking(true);
        setSpeechPaused(false);
        setSpeakingMessageId(messageId);
      };
      utterance.onend = () => {
        setSpeaking(false);
        setSpeechPaused(false);
        setSpeakingMessageId(null);
        resolve();
      };
      utterance.onerror = () => {
        setSpeaking(false);
        setSpeechPaused(false);
        setSpeakingMessageId(null);
        resolve();
      };
      window.speechSynthesis.speak(utterance);
    });
  };

  const toggleSpeechPause = () => {
    if (!speaking) return;
    if (speechPaused) {
      window.speechSynthesis.resume();
      setSpeechPaused(false);
    } else {
      window.speechSynthesis.pause();
      setSpeechPaused(true);
    }
  };

  const sendQuestion = async (promptText = text) => {
    const trimmed = (promptText || text).trim();
    if (!trimmed || loading || isCompleted) return;

    const chatId = activeChat.id;
    const questionNumber = questionCount + 1;
    const userMessage = { id: `${Date.now()}-user`, sender: "user", text: trimmed };
    updateChat(chatId, (chat) => ({
      ...chat,
      title: chat.messages.length ? chat.title : `${trimmed.slice(0, 42)}${trimmed.length > 42 ? "..." : ""}`,
      messages: [...chat.messages, userMessage],
      questionCount: questionNumber,
      updatedAt: Date.now(),
    }));
    setText("");
    setLoading(true);

    let aiText;
    try {
      const response = await fetch("https://ai-chatbot-backend-3ifb.onrender.com/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Backend error");
      aiText = data.answer || "I’m not sure how to answer that right now.";
    } catch (error) {
      console.error(error);
      aiText = "I couldn’t reach the server. Please try again.";
    }

    const assistantMessageId = `${Date.now()}-assistant`;
    updateChat(chatId, (chat) => ({
      ...chat,
      messages: [...chat.messages, { id: assistantMessageId, sender: "assistant", text: aiText }],
      completed: questionNumber >= MAX_QUESTIONS,
      updatedAt: Date.now(),
    }));
    setLoading(false);
    await speakText(aiText, assistantMessageId);
  };

  const toggleListening = () => {
    if (!recognitionRef.current || isCompleted) return;
    if (isListening) recognitionRef.current.stop();
    else recognitionRef.current.start();
  };

  const hasStarted = Boolean(text.trim() || isListening || messages.length);
  const visibleChats = [...chats].sort((first, second) => second.updatedAt - first.updatedAt);

  return (
    <div className={`app-shell ${theme}-theme`}>
      <aside className={`history-sidebar ${sidebarOpen ? "drawer-open" : ""}`}>
        <div className="sidebar-header"><div className="sidebar-brand"><span className="brand-mark">✦</span><strong>Talky</strong></div><button type="button" className="close-drawer" onClick={() => setSidebarOpen(false)} aria-label="Close history">×</button></div>
        <button type="button" className="new-chat-button" onClick={startNewChat}><span>＋</span> New Chat</button>
        <div className="history-label">Your conversations</div>
        <nav className="history-list" aria-label="Chat history">
          {visibleChats.filter((chat) => chat.messages.length).map((chat) => <button key={chat.id} type="button" className={`history-item ${chat.id === activeChatId ? "selected" : ""}`} onClick={() => selectChat(chat.id)}><span className="history-icon">◌</span><span className="history-item-copy"><strong>{chat.title}</strong><small>{chat.questionCount}/{MAX_QUESTIONS} questions</small></span>{chat.completed && <span className="completed-dot" aria-label="Completed">✓</span>}</button>)}
          {!chats.some((chat) => chat.messages.length) && <p className="empty-history">Your conversations will appear here.</p>}
        </nav>
      </aside>
      {sidebarOpen && <button type="button" className="drawer-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Close history" />}

      <div className="main-column">
        <header className="topbar"><button type="button" className="menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open history">☰</button><div className="brand-copy"><h1>AI Chatbot</h1><span>Talk, ask, learn and have fun!</span></div><button type="button" className="theme-toggle" onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>{theme === "dark" ? "☀" : "☾"}</button><div className="progress-pill"><span>{questionCount}/{MAX_QUESTIONS}</span><small>questions</small></div></header>
        <main className={`chat-panel ${hasStarted ? "chat-started" : "chat-idle"}`}>
          {hasStarted ? <div className="chat-area" ref={chatRef}><div className="timeline">TODAY</div>{messages.map((message) => <div key={message.id} className={`message-row ${message.sender === "user" ? "user-row" : "assistant-row"}`}>{message.sender === "assistant" && <div className="assistant-bubble-wrap"><div className="assistant-avatar">🤖</div><div className="assistant-name">Talky</div></div>}<div className={message.sender === "user" ? "user-bubble" : `assistant-bubble ${speakingMessageId === message.id ? "assistant-speaking" : ""}`}>{message.sender === "user" ? message.text : <ReactMarkdown>{message.text}</ReactMarkdown>}{message.sender === "assistant" && <div className="play-row"><button type="button" className="play-button" onClick={() => speakText(message.text, message.id)}>▶ Play</button>{speakingMessageId === message.id && <><button type="button" className="pause-button" onClick={toggleSpeechPause}>{speechPaused ? "▶ Resume" : "Ⅱ Pause"}</button><button type="button" className="stop-button" onClick={stopSpeaking}>Stop</button></>}</div>}</div></div>)}{loading && <div className="message-row assistant-row"><div className="assistant-bubble-wrap"><div className="assistant-avatar">🤖</div><div className="assistant-name">Talky</div></div><div className="assistant-bubble typing-bubble"><span className="dot" /><span className="dot" /><span className="dot" /></div></div>}{isCompleted && !loading && <div className="limit-panel"><strong>You’ve reached the 20-question limit.</strong><span>Start a new chat to continue.</span><button type="button" onClick={startNewChat}>Start New Chat</button></div>}</div> : <div className="welcome-panel"><div className="welcome-avatar">🤖</div><div className="welcome-kicker">YOUR CURIOUS LEARNING BUDDY</div><h2>Hi! I’m Talky 👋</h2><h3>What would you like to talk about?</h3><p>You can type your question or just tap the microphone and talk to me.</p></div>}
          {!hasStarted && <div className="prompt-grid">{suggestedPrompts.map((prompt) => <button key={prompt} type="button" className="prompt-chip" onClick={() => sendQuestion(prompt)}><span className="chip-icon">✦</span>{prompt}</button>)}</div>}
          <div className="composer-wrap"><div className="composer-box"><input type="text" value={text} disabled={isCompleted} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") sendQuestion(); }} placeholder={isCompleted ? "Start a new chat to continue" : "Ask Talky anything..."} /><div className="composer-actions"><button type="button" className={`mic-button ${isListening ? "active" : ""}`} onClick={toggleListening} disabled={isCompleted} aria-label="Use microphone">🎙️</button><button type="button" className="send-button" onClick={() => sendQuestion()} disabled={loading || isCompleted}>{loading ? "..." : "➤"}</button></div></div><div className="hint-row"><span>Press Enter to send</span>{!voiceSupported && <span>Speech recognition is unavailable in this browser.</span>}</div></div>
        </main>
      </div>
    </div>
  );
}

export default App;