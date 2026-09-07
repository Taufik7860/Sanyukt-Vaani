import {
  Mic,
  Send,
  Languages,
  ShieldCheck,
  Sparkles,
  ChevronRight
} from "lucide-react";

function Home({
  onNavigate
}) {

  return (
    <>
      <section className="citizen-welcome">

        <div>

          <div className="eyebrow">
            SANYUKT VAANI AI
          </div>

          <h2>
            Namaste! What do you need to know?
          </h2>

          <p>

            Ask about loans, schemes,
            crop insurance, PACS services
            and cooperative procedures
            in your own language.

          </p>

        </div>

        <div className="welcome-orb">

          <Sparkles size={28} />

        </div>

      </section>


      <section className="ask-card">

        <div className="ask-head">

          <span className="online-dot" />

          AI is ready

          <span className="auto-language">

            <Languages size={14} />

            Auto language detection

          </span>

        </div>


        <div className="ask-input">

          <input
            placeholder="Ask in Marathi, Hindi or English..."
          />

          <button
            className="mic-btn"
            onClick={() =>
              onNavigate("chat")
            }
          >
            <Mic size={20} />
          </button>

          <button
            className="send-btn"
            onClick={() =>
              onNavigate("chat")
            }
          >
            <Send size={18} />
          </button>

        </div>


        <div className="suggestions">

          <button
            onClick={() =>
              onNavigate("chat")
            }
          >
            How can I get a PACS loan?
          </button>

          <button
            onClick={() =>
              onNavigate("chat")
            }
          >
            पीक विम्याची माहिती
          </button>

          <button
            onClick={() =>
              onNavigate("chat")
            }
          >
            How to file a grievance?
          </button>

        </div>

      </section>


      <div className="section-title">

        <div>

          <h3>
            Explore verified information
          </h3>

          <p>
            Powered by approved official documents
          </p>

        </div>

        <button
          className="text-btn"
          onClick={() =>
            onNavigate("sources")
          }
        >

          View all

          <ChevronRight size={15} />

        </button>

      </div>


      <div className="info-grid">

        <InfoCard
          icon="🏦"
          title="PACS Loans"
          text="Eligibility, documents and application process"
        />

        <InfoCard
          icon="🌾"
          title="Crop Insurance"
          text="Coverage, deadlines and claim process"
        />

        <InfoCard
          icon="🏛️"
          title="Government Schemes"
          text="Benefits, eligibility and documents"
        />

        <InfoCard
          icon="⚖️"
          title="Rules & Grievances"
          text="Procedures and complaint guidance"
        />

      </div>


      <div className="trust-strip">

        <ShieldCheck size={22} />

        <div>

          <strong>
            Why trust Sanyukt Vaani?
          </strong>

          <span>
            Answers are grounded in approved
            official documents and sources are
            shown with important answers.
          </span>

        </div>

        <div className="trust-stat">

          <strong>128</strong>

          <span>
            verified sources
          </span>

        </div>

        <div className="trust-stat">

          <strong>08</strong>

          <span>
            languages
          </span>

        </div>

      </div>

    </>
  );
}


function InfoCard({
  icon,
  title,
  text
}) {

  return (
    <button className="info-card">

      <div className="info-icon">
        {icon}
      </div>

      <div>

        <strong>
          {title}
        </strong>

        <span>
          {text}
        </span>

      </div>

      <ChevronRight size={17} />

    </button>
  );
}

export default Home;