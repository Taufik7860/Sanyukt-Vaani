import {
  Sparkles,
  FileCheck2,
  ShieldCheck
} from "lucide-react";

function ChatMessage({
  message
}) {

  const isAI =
    message.role === "assistant";

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
          : "F"
        }

      </div>

      <div className="message-bubble">

        <p>
          {message.text}
        </p>

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