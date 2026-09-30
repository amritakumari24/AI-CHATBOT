import { useState } from "react";

function App() {
  const [text, setText] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const askQuestion = async () => {
    if (!text.trim()) {
      return;
    }

    setLoading(true);
    setAnswer("");

    try {
      const response = await fetch("http://127.0.0.1:8000/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Backend error");
      }

      setAnswer(data.answer);

      // AI answer ko voice mein convert karo
      speakAnswer(data.answer);
    } catch (error) {
      console.error(error);
      setAnswer("Backend se connection nahi ho paya.");
    } finally {
      setLoading(false);
    }
  };

  const speakAnswer = (answerText) => {
    // Agar pehle se speech chal rahi hai to stop karo
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(answerText);

    utterance.lang = "en-IN";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setSpeaking(true);
    };

    utterance.onend = () => {
      setSpeaking(false);
    };

    utterance.onerror = () => {
      setSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  return (
    <div>
      <h1>Text to Speech AI Chatbot</h1>

      <h2>Ask your question</h2>

      <input
        type="text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Type your question..."
      />

      <button onClick={askQuestion} disabled={loading}>
        {loading ? "Thinking..." : "Ask AI"}
      </button>

      <h2>AI Answer:</h2>

      <p>{answer}</p>

      {speaking && (
        <button onClick={stopSpeaking}>
          🔇 Stop Speaking
        </button>
      )}
    </div>
  );
}

export default App;