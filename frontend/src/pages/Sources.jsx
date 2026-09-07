import {
  Search,
  ShieldCheck,
  FileText,
  Eye
} from "lucide-react";

import SourceCard
  from "../components/SourceCard";

const sources = [
  {
    title:
      "PACS Agricultural Credit Guidelines 2026",
    authority:
      "Cooperative Department",
    version: "2.1",
    pages: 18,
    date: "08 Sep 2026"
  },
  {
    title:
      "Crop Insurance Scheme – Kharif 2026",
    authority:
      "Agriculture Department",
    version: "1.4",
    pages: 32,
    date: "02 Sep 2026"
  },
  {
    title:
      "Cooperative Society Grievance Procedure",
    authority:
      "Cooperation Department",
    version: "3.0",
    pages: 11,
    date: "29 Aug 2026"
  },
  {
    title:
      "PACS Membership & Service Guidelines",
    authority:
      "Cooperative Department",
    version: "4.2",
    pages: 24,
    date: "25 Aug 2026"
  },
  {
    title:
      "Farmer Financial Literacy Handbook",
    authority:
      "Agriculture Department",
    version: "1.8",
    pages: 41,
    date: "21 Aug 2026"
  },
  {
    title:
      "Cooperative Rules & Regulations",
    authority:
      "Cooperation Department",
    version: "5.0",
    pages: 52,
    date: "18 Aug 2026"
  }
];

function Sources() {

  return (
    <>
      <div className="page-header">

        <div>

          <div className="eyebrow">
            VERIFIED KNOWLEDGE
          </div>

          <h2>
            Official Sources
          </h2>

          <p>
            Explore approved documents
            powering Sanyukt Vaani.
          </p>

        </div>

        <div className="source-count">

          <ShieldCheck size={16} />

          128 verified

        </div>

      </div>


      <div className="filter-row">

        <div className="filter-search">

          <Search size={16} />

          <input
            placeholder="Search policies, loans, schemes..."
          />

        </div>

        <button className="filter-btn">
          All categories ▾
        </button>

        <button className="filter-btn">
          Latest first ▾
        </button>

      </div>


      <div className="source-grid">

        {sources.map(
          (source, index) => (
            <SourceCard
              source={source}
              key={index}
            />
          )
        )}

      </div>

    </>
  );
}

export default Sources;