import {
  FileCheck2,
  Languages,
  Mic,
  Plus,
  Send,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { askSanyuktVaani } from "../services/api";
import ChatMessage from "../components/ChatMessage";

const INITIAL_MESSAGE = {
  role: "assistant",
  text: "Ask me about cooperatives, government schemes, loans, laws, and citizen services. I will answer from the verified knowledge base."
};

function Chat() {
  const {
    languageId,
    languages,
    setLanguage,
    transcript,
    setTranscript,
    isListening,
    detectFromSpeech
    , speakText
  } = useLanguage();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSources, setActiveSources] = useState([]);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (transcript) {
      setInput(transcript);
      setTranscript("");
    }
  }, [transcript, setTranscript]);

  const sendMessage = async () => {
    const cleanQuery = input.trim();
    if (!cleanQuery || isLoading) return;

    setInput("");
    setActiveSources([]);
    setMessages((previous) => [
      ...previous,
      { role: "user", text: cleanQuery }
    ]);
    setIsLoading(true);

    try {
      const result = await askSanyuktVaani(cleanQuery, "auto");
      const sources = result.sources || [];
      const answerLanguage = result.language === "Hindi" ? "hi" : result.language === "Marathi" ? "mr" : "en";
      setActiveSources(sources);
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: result.answer || "No response text received.",
          source: sources[0]?.title || sources[0]?.source,
          page: sources[0]?.page,
          confidence:
            sources[0]?.score == null
              ? "Verified"
              : `${Math.round(sources[0].score * 100)}%`
        }
      ]);
      window.setTimeout(() => speakText(result.answer || "", answerLanguage), 0);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          error: true,
          text: error.message || "Unable to get an answer right now."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-workspace">
      <header className="chat-header">
        <div className="chat-brand">
          <div className="brand-mark"><Sparkles size={19} /></div>
          <div>
            <strong>Sanyukt Vaani <span>AI</span></strong>
            <small><span className="status-dot" /> Verified knowledge mode</small>
          </div>
        </div>
        <div className="chat-header-status">
          <ShieldCheck size={15} /> RAG Online
        </div>
      </header>

      <div className="chat-workspace-body">
        <aside className="chat-utility-bar" aria-label="Chat tools">
          <button className="new-chat-btn" type="button" onClick={() => {
            setMessages([INITIAL_MESSAGE]);
            setActiveSources([]);
            setInput("");
          }}>
            <Plus size={17} /> <span>New chat</span>
          </button>
          <div className="utility-divider" />
          <span className="utility-label">Language</span>
          <div className="language-picker">
            <Languages size={15} />
            <select value={languageId} onChange={(event) => setLanguage(event.target.value)} disabled={isLoading}>
              {languages.map((language) => (
                <option key={language.id} value={language.id}>{language.label}</option>
              ))}
            </select>
          </div>
          <p className="utility-note">Answers are grounded in official cooperative knowledge sources.</p>
        </aside>

        <section className="conversation-panel">
          <div className="conversation-scroll">
            <div className="conversation-intro">
              <span className="intro-kicker">CITIZEN KNOWLEDGE ASSISTANT</span>
              <h1>How can we help you today?</h1>
              <p>Ask in English, Hindi, Marathi, or your preferred supported language.</p>
            </div>

            <div className="message-list">
              {messages.map((message, index) => (
                <React.Fragment key={`${message.role}-${index}`}>
                  <ChatMessage message={message} />
                  {message.role === "assistant" && index === messages.length - 1 && activeSources.length > 0 && (
                    <div className="live-sources">
                      <div className="live-sources-title"><FileCheck2 size={15} /> Sources used</div>
                      <div className="live-source-list">
                        {activeSources.map((source, sourceIndex) => (
                          <a
                            key={`${source.title}-${sourceIndex}`}
                            className="live-source-chip"
                            href={source.source ? `https://github.com/Taufik7860/Sanyukt-Vaani/search?q=${encodeURIComponent(source.source)}` : "#"}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {source.title || source.source || "Official document"}
                            {source.score != null && ` · ${Math.round(source.score * 100)}%`}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))}
              {isLoading && (
                <div className="thinking-row" role="status" aria-live="polite">
                  <div className="thinking-avatar"><Sparkles size={15} /></div>
                  <div className="thinking-card">
                    <span>Thinking</span>
                    <i /><i /><i />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="composer-wrap">
            <div className="chat-composer">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about cooperatives, schemes, loans, laws..."
                rows={1}
                disabled={isLoading}
                aria-label="Ask Sanyukt Vaani"
              />
              <div className="composer-actions">
                <button
                  type="button"
                  className={`composer-mic ${isListening ? "is-listening" : ""}`}
                  onClick={detectFromSpeech}
                  disabled={isLoading}
                  aria-label={isListening ? "Listening" : "Use microphone"}
                >
                  <Mic size={19} />
                </button>
                <button
                  type="button"
                  className="composer-send"
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim()}
                  aria-label="Send message"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
            <small>Enter to send · Shift + Enter for a new line · Don’t share sensitive personal information.</small>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Chat;
