import {
  Sparkles,
  FileCheck2,
  ShieldCheck,
  Volume2
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

function ChatMessage({
  message,
  onSpeak
}) {
  const { languageId, speakText } = useLanguage();
  const isAI = message.role === "assistant";

  const handleSpeak = () => {
    if (onSpeak) {
      onSpeak(message.text);
    } else {
      speakText(message.text, languageId);
    }
  };

  return (
    <div
      className={`message-row ${
        isAI ? "ai" : "user"
      }`}
    >
      <div
        className={`message-avatar ${
          isAI ? "ai" : "user"
        }`}
      >
        {isAI
          ? <Sparkles size={15} />
          : "T"
        }
      </div>

      <div className="message-bubble">
        <p>
          {message.text}
        </p>

        {/* Text + Speaker Action for AI or any message */}
        {isAI && (
          <div className="message-actions" style={{ marginTop: "8px" }}>
            <button
              type="button"
              className="speak-again-btn"
              onClick={handleSpeak}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "transparent",
                border: "1px solid rgba(0,0,0,0.1)",
                padding: "4px 10px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px"
              }}
            >
              <Volume2 size={14} /> Listen / सुनें / ऐका
            </button>
          </div>
        )}

        {isAI && message.source && (
          <div className="answer-meta">
            <div className="source-mini">
              <FileCheck2 size={14} />
              <span>
                <strong>
                  {message.source}
                </strong>
                <small>
                  Page {message.page}
                  {" • "}
                  Official source
                </small>
              </span>
            </div>

            <span className="confidence">
              <ShieldCheck size={13} />
              {message.confidence || "Verified"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatMessage;