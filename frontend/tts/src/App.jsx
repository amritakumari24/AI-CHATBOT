import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

const suggestedPrompts = [
  "Tell me a fun fact",
  "Why is the sky blue?",
  "Tell me about animals",
  "Help me learn something new",
];

function App() {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const recognitionRef = useRef(null);
  const chatRef = useRef(null);

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
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ")
        .trim();

      if (transcript) {
        setText(transcript);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, []);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const speakText = (value) => {
    if (!value) return Promise.resolve();

    return new Promise((resolve) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(value);
      utterance.lang = "en-US";
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => {
        setSpeaking(false);
        resolve();
      };
      utterance.onerror = () => {
        setSpeaking(false);
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const sendQuestion = async (promptText = text) => {
    const trimmed = (promptText || text).trim();
    if (!trimmed) return;

    const userMessage = {
      id: Date.now() + "-user",
      sender: "user",
      text: trimmed,
    };

    setMessages((current) => [...current, userMessage]);
    setText("");
    setLoading(true);

    try {
      const response = await fetch("https://ai-chatbot-backend-3ifb.onrender.com/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Backend error");
      }

      const aiText = data.answer || "I’m not sure how to answer that right now.";

      setMessages((current) => [
        ...current,
        { id: Date.now() + "-assistant", sender: "assistant", text: aiText },
      ]);

      await speakText(aiText);
    } catch (error) {
      console.error(error);
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + "-assistant",
          sender: "assistant",
          text: "I couldn’t reach the server. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      return;
    }

    recognitionRef.current.start();
  };

  const hasStarted = Boolean(text.trim() || isListening || messages.length);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark">✦</div>
        <div className="brand-copy">
          <h1>AI Chatbot</h1>
          <span>Talk, ask, learn and have fun!</span>
        </div>
      </header>

      <main className={`chat-panel ${hasStarted ? "chat-started" : "chat-idle"}`}>
        {hasStarted ? (
          <div className="chat-area" ref={chatRef}>
            <div className="timeline">TODAY</div>

            {messages.map((message) => (
              <div key={message.id} className={`message-row ${message.sender === "user" ? "user-row" : "assistant-row"}`}>
                {message.sender === "assistant" && (
                  <div className="assistant-bubble-wrap">
                    <div className="assistant-avatar">🤖</div>
                    <div className="assistant-name">Talky</div>
                  </div>
                )}

                <div className={message.sender === "user" ? "user-bubble" : "assistant-bubble"}>
                  {message.sender === "user" ? message.text : <ReactMarkdown>{message.text}</ReactMarkdown>}
                  {message.sender === "assistant" && (
                    <div className="play-row">
                      <button type="button" className="play-button" onClick={() => speakText(message.text)}>
                        ▶ Play
                      </button>
                      {speaking && <button type="button" className="stop-button" onClick={stopSpeaking}>Stop</button>}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="message-row assistant-row">
                <div className="assistant-bubble-wrap">
                  <div className="assistant-avatar">🤖</div>
                  <div className="assistant-name">Talky</div>
                </div>
                <div className="assistant-bubble typing-bubble">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="welcome-panel">
            <div className="welcome-avatar">🤖</div>
            <div className="welcome-kicker">YOUR CURIOUS LEARNING BUDDY</div>
            <h2>Hi! I’m Talky 👋</h2>
            <h3>What would you like to talk about?</h3>
            <p>You can type your question or just tap the microphone and talk to me.</p>
          </div>
        )}

        {!hasStarted && (
          <div className="prompt-grid">
            {suggestedPrompts.map((prompt) => (
              <button key={prompt} type="button" className="prompt-chip" onClick={() => sendQuestion(prompt)}>
                <span className="chip-icon">{prompt.startsWith("Tell") ? "✦" : prompt.startsWith("Why") ? "◉" : "◉"}</span>
                {prompt}
              </button>
            ))}
          </div>
        )}

        <div className="composer-wrap">
          <div className="composer-box">
            <input
              type="text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  sendQuestion();
                }
              }}
              placeholder="Ask Talky anything..."
            />

            <div className="composer-actions">
              <button
                type="button"
                className={`mic-button ${isListening ? "active" : ""}`}
                onClick={toggleListening}
                aria-label="Use microphone"
              >
                🎙️
              </button>
              <button type="button" className="send-button" onClick={() => sendQuestion()} disabled={loading}>
                {loading ? "..." : "➤"}
              </button>
            </div>
          </div>

          <div className="hint-row">
            <span>Press Enter to send</span>
            {!voiceSupported && <span>Speech recognition is unavailable in this browser.</span>}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;