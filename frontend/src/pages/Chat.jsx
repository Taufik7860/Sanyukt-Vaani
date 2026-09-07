import {
  Languages,
  Mic,
  Send,
  Search,
  FileCheck2,
  Sparkles,
  ShieldCheck,
  MessageCircle
} from "lucide-react";

import React, { useState } from "react";

import ChatMessage
  from "../components/ChatMessage";

function Chat() {

  const [input, setInput] =
    useState("");

  const [messages, setMessages] =
    useState([
      {
        role: "user",
        text:
          "Mujhe PACS se kheti ke liye loan kaise milega?"
      },
      {
        role: "assistant",
        text:
          "Aap PACS ke through agricultural loan ke liye apply kar sakte hain. Eligibility aur required documents official PACS guidelines par depend karte hain.",
        source:
          "PACS Agricultural Credit Guidelines 2026",
        page: 12,
        confidence: "94%"
      }
    ]);

  const [listening, setListening] =
    useState(false);

  const sendMessage = () => {

    if (!input.trim()) return;

    const userMessage = {
      role: "user",
      text: input
    };

    const aiMessage = {
      role: "assistant",
      text:
        "Demo response: I found relevant information in the approved knowledge base. After FastAPI integration, this response will come from Qdrant + RAG + Gemini.",
      source:
        "PACS Agricultural Credit Guidelines 2026",
      page: 12,
      confidence: "92%"
    };

    setMessages((previous) => [
      ...previous,
      userMessage,
      aiMessage
    ]);

    setInput("");
  };

  return (
    <>
      <div className="page-header">

        <div>

          <div className="eyebrow">
            AI ASSISTANT
          </div>

          <h2>
            Ask Sanyukt Vaani
          </h2>

          <p>
            Your multilingual,
            source-backed cooperative
            information assistant.
          </p>

        </div>

        <span className="verified-live">

          <span />

          RAG Online

        </span>

      </div>


      <div className="chat-layout">

        <section className="chat-panel">

          <div className="chat-top">

            <div>

              <strong>
                Sanyukt Vaani AI
              </strong>

              <span>

                <ShieldCheck size={13} />

                Verified knowledge mode

              </span>

            </div>

            <div className="language-badge">

              <Languages size={14} />

              Auto Detect

            </div>

          </div>


          <div className="messages">

            <div className="date-divider">
              Today
            </div>

            {messages.map(
              (message, index) => (
                <ChatMessage
                  key={index}
                  message={message}
                />
              )
            )}

          </div>


          <div className="chat-compose">

            <div className="compose-box">

              <input
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter"
                  ) {
                    sendMessage();
                  }
                }}
                placeholder="Ask in Marathi, Hindi or English..."
              />

              <button
                className={`mic-btn ${
                  listening
                    ? "listening"
                    : ""
                }`}
                onClick={() =>
                  setListening(!listening)
                }
              >
                <Mic size={19} />
              </button>

              <button
                className="send-btn"
                onClick={sendMessage}
              >
                <Send size={17} />
              </button>

            </div>

            <small>

              <ShieldCheck size={12} />

              Don't share sensitive personal
              information.

            </small>

          </div>

        </section>


        <aside className="source-panel">

          <div className="source-head">

            <div>

              <h3>
                Answer Transparency
              </h3>

              <p>
                See how the answer was built.
              </p>

            </div>

            <ShieldCheck
              size={19}
              className="success-icon"
            />

          </div>


          <div className="rag-flow">

            <FlowNode
              icon={MessageCircle}
              title="Your question"
            />

            <FlowArrow />

            <FlowNode
              icon={Search}
              title="Semantic retrieval"
            />

            <FlowArrow />

            <FlowNode
              icon={FileCheck2}
              title="Official sources"
            />

            <FlowArrow />

            <FlowNode
              icon={Sparkles}
              title="Grounded AI answer"
            />

          </div>


          <div className="used-source">

            <div className="used-title">

              <FileCheck2 size={16} />

              <strong>
                Source used
              </strong>

            </div>

            <p>
              PACS Agricultural
              Credit Guidelines 2026
            </p>

            <div className="source-details">

              <span>
                Page 12
              </span>

              <span>
                Eligibility
              </span>

              <span>
                v2.1
              </span>

            </div>

            <button className="outline-btn full">

              View source

            </button>

          </div>

        </aside>

      </div>
    </>
  );
}


function FlowNode({
  icon: Icon,
  title
}) {

  return (
    <div className="flow-node">

      <div className="flow-icon">
        <Icon size={15} />
      </div>

      <span>
        {title}
      </span>

      <ShieldCheck
        size={13}
        className="flow-check"
      />

    </div>
  );
}


function FlowArrow() {

  return (
    <div className="flow-arrow">
      ↓
    </div>
  );
}

export default Chat;