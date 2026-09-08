import {
  MessageCircle,
  Languages,
  ShieldCheck,
  ChevronRight
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

const history = [
  {
    date: "Today",
    question:
      "Mujhe PACS se kheti ke liye loan kaise milega?",
    answer:
      "PACS agricultural loan eligibility and application guidance.",
    language: "Hindi"
  },
  {
    date: "Yesterday",
    question:
      "पीक विम्याची माहिती पाहिजे",
    answer:
      "Crop insurance coverage and claim process.",
    language: "Marathi"
  },
  {
    date: "02 Sep 2026",
    question:
      "How to file a cooperative grievance?",
    answer:
      "Steps for filing a grievance through the relevant cooperative authority.",
    language: "English"
  }
];

function History() {
  const { t } = useLanguage();

  return (
    <>
      <div className="page-header">

        <div>

          <div className="eyebrow">
            YOUR ACTIVITY
          </div>

          <h2>
            {t.history}
          </h2>

          <p>
            {t.trustText}
          </p>

        </div>

      </div>


      <div className="history-list">

        {history.map(
          (item, index) => (

            <div
              className="history-row"
              key={index}
            >

              <div className="history-date">

                {item.date}

              </div>

              <div className="history-icon">

                <MessageCircle size={17} />

              </div>

              <div className="history-main">

                <strong>
                  {item.question}
                </strong>

                <p>
                  {item.answer}
                </p>

                <span>

                  <Languages size={12} />

                  {item.language}

                  {" • "}

                  <ShieldCheck size={12} />

                  Source-backed

                </span>

              </div>

              <button className="icon-btn">

                <ChevronRight size={18} />

              </button>

            </div>

          )
        )}

      </div>

    </>
  );
}

export default History;