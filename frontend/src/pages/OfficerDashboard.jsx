import {
  UploadCloud,
  FileCheck2,
  Clock3,
  RefreshCw,
  MessageCircle,
  ShieldCheck,
  FileText,
  CheckCircle2,
  Eye,
  ChevronRight,
  CircleAlert,
  BarChart3,
  X,
  CircleCheck
} from "lucide-react";

import React, { useState } from "react";
import { createOfficerKnowledge, getOfficerKnowledge, approveOfficerKnowledge } from "../services/api";

const pendingDocuments = [
  {
    title:
      "PACS Loan Interest Circular 2026",
    type: "Loan",
    date: "Today, 4:10 PM"
  },
  {
    title:
      "Kharif Crop Insurance Update",
    type: "Insurance",
    date: "Today, 1:32 PM"
  },
  {
    title:
      "New Cooperative Grievance Rules",
    type: "Policy",
    date: "Yesterday"
  }
];

const approvedDocuments = [
  {
    title:
      "PACS Agricultural Credit Guidelines 2026",
    authority:
      "Cooperative Department",
    version: "2.1",
    date: "08 Sep 2026",
    pages: 18
  },
  {
    title:
      "Crop Insurance Scheme – Kharif 2026",
    authority:
      "Agriculture Department",
    version: "1.4",
    date: "02 Sep 2026",
    pages: 32
  },
  {
    title:
      "Cooperative Society Grievance Procedure",
    authority:
      "Cooperation Department",
    version: "3.0",
    date: "29 Aug 2026",
    pages: 11
  }
];

function OfficerDashboard() {

  const [activeTab, setActiveTab] =
    useState("dashboard");

  const [uploadMessage, setUploadMessage] =
    useState(false);

  if (activeTab === "knowledge") {

    return (
      <KnowledgeCenter
        onBack={() =>
          setActiveTab("dashboard")
        }
      />
    );
  }

  if (activeTab === "analytics") {

    return (
      <Analytics
        onBack={() =>
          setActiveTab("dashboard")
        }
      />
    );
  }

  return (
    <>
      <div className="page-header">

        <div>

          <div className="eyebrow">
            KNOWLEDGE AUTHORITY
          </div>

          <h2>
            Officer Dashboard
          </h2>

          <p>
            Keep Sanyukt Vaani AI updated with
            verified government information.
          </p>

        </div>

        <button
          className="primary-btn"
          onClick={() =>
            setActiveTab("knowledge")
          }
        >

          <UploadCloud size={17} />

          Upload New Update

        </button>

      </div>


      <section className="hero-banner">

        <div className="hero-content">

          <div className="verified-badge">

            <ShieldCheck size={15} />

            KNOWLEDGE BASE VERIFIED

          </div>

          <h3>
            One verified update can help
            thousands of citizens.
          </h3>

          <p>

            Upload new loans, schemes,
            policies, rules and circulars.
            Review them and approve them.
            Sanyukt Vaani AI will then use the
            approved information.

          </p>

          <div className="hero-actions">

            <button
              className="light-btn"
              onClick={() =>
                setActiveTab("knowledge")
              }
            >

              Manage Knowledge

              <ChevronRight size={16} />

            </button>

            <span>

              <CheckCircle2 size={15} />

              AI only uses approved sources

            </span>

          </div>

        </div>

        <div className="hero-visual">

          <div className="orbit orbit-a" />

          <div className="orbit orbit-b" />

          <div className="hero-ai">

            <ShieldCheck size={30} />

            <span>
              RAG
            </span>

            <small>
              LIVE
            </small>

          </div>

        </div>

      </section>


      <div className="stats-grid">

        <Stat
          icon={FileCheck2}
          title="Approved Sources"
          value="128"
          note="+12 this month"
        />

        <Stat
          icon={Clock3}
          title="Pending Review"
          value="06"
          note="Needs your attention"
          warning
        />

        <Stat
          icon={RefreshCw}
          title="Knowledge Updated"
          value="2h ago"
          note="Last sync completed"
        />

        <Stat
          icon={MessageCircle}
          title="AI Questions Today"
          value="1,842"
          note="+18.4% vs yesterday"
        />

      </div>


      <div className="two-col">

        <section className="panel">

          <div className="panel-head">

            <div>

              <h3>
                Pending Verification
              </h3>

              <p>
                Review before information
                becomes available to AI.
              </p>

            </div>

            <button
              className="text-btn"
              onClick={() =>
                setActiveTab("knowledge")
              }
            >

              View all

              <ChevronRight size={15} />

            </button>

          </div>


          <div className="review-list">

            {pendingDocuments.map(
              (doc, index) => (

                <div
                  className="review-row"
                  key={index}
                >

                  <div className="review-file">

                    <FileText size={17} />

                  </div>

                  <div className="review-main">

                    <strong>
                      {doc.title}
                    </strong>

                    <small>
                      {doc.type}
                      {" • "}
                      {doc.date}
                    </small>

                  </div>

                  <button
                    className="review-btn"
                    onClick={() =>
                      setActiveTab("knowledge")
                    }
                  >

                    Review

                    <ChevronRight
                      size={14}
                    />

                  </button>

                </div>

              )
            )}

          </div>

        </section>


        <section className="panel">

          <div className="panel-head">

            <div>

              <h3>
                Knowledge Health
              </h3>

              <p>
                Current status of verified sources.
              </p>

            </div>

            <ShieldCheck
              size={20}
              className="success-icon"
            />

          </div>


          <div className="health-meter">

            <div className="meter-track">

              <div className="meter-fill" />

            </div>

            <div>

              <strong>
                94%
              </strong>

              <span>
                Coverage health
              </span>

            </div>

          </div>


          <div className="health-row">

            <CheckCircle2 size={16} />

            128 verified documents

            <span>
              Good
            </span>

          </div>


          <div className="health-row">

            <CheckCircle2 size={16} />

            0 expired critical policies

            <span>
              Good
            </span>

          </div>


          <div className="health-row">

            <CircleAlert size={16} />

            6 documents awaiting review

            <span className="warn-text">
              Review
            </span>

          </div>

        </section>

      </div>


      <section className="panel">

        <div className="panel-head">

          <div>

            <h3>
              Recent Knowledge Updates
            </h3>

            <p>
              Latest changes published
              to Sanyukt Vaani AI.
            </p>

          </div>

          <button
            className="text-btn"
            onClick={() =>
              setActiveTab("knowledge")
            }
          >
            Manage
          </button>

        </div>


        <div className="table-wrap">

          <table>

            <thead>

              <tr>

                <th>
                  DOCUMENT
                </th>

                <th>
                  AUTHORITY
                </th>

                <th>
                  VERSION
                </th>

                <th>
                  UPDATED
                </th>

                <th>
                  STATUS
                </th>

                <th />

              </tr>

            </thead>

            <tbody>

              {approvedDocuments.map(
                (doc, index) => (

                  <tr key={index}>

                    <td>

                      <div className="doc-cell">

                        <div className="doc-icon">

                          <FileText size={17} />

                        </div>

                        <div>

                          <strong>
                            {doc.title}
                          </strong>

                          <small>
                            {doc.pages} pages
                          </small>

                        </div>

                      </div>

                    </td>

                    <td>
                      {doc.authority}
                    </td>

                    <td>
                      v{doc.version}
                    </td>

                    <td>
                      {doc.date}
                    </td>

                    <td>

                      <span className="status approved">

                        <CheckCircle2
                          size={14}
                        />

                        Approved

                      </span>

                    </td>

                    <td>

                      <button className="icon-btn">

                        <Eye size={17} />

                      </button>

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      </section>

    </>
  );
}


function Stat({
  icon: Icon,
  title,
  value,
  note,
  warning
}) {

  return (
    <div className="stat-card">

      <div
        className={`stat-icon ${
          warning
            ? "warning"
            : ""
        }`}
      >

        <Icon size={20} />

      </div>

      <div className="stat-info">

        <span>
          {title}
        </span>

        <strong>
          {value}
        </strong>

        <small
          className={
            warning
              ? "warning-text"
              : "positive"
          }
        >

          {note}

        </small>

      </div>

    </div>
  );
}


function KnowledgeCenter({
  onBack
}) {

  const [updates, setUpdates] = useState([]);
  const [form, setForm] = useState({
    title: "",
    category: "policy",
    year: new Date().getFullYear(),
    authority: "",
    version: "1.0",
    summary: "",
    source_url: "",
  });
  const [formMessage, setFormMessage] = useState("");
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    getOfficerKnowledge()
      .then((result) => setUpdates(result.items || []))
      .catch((error) => setFormMessage(error.message));
  }, []);

  const submitUpdate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormMessage("");
    try {
      const created = await createOfficerKnowledge({ ...form, year: Number(form.year) });
      setUpdates((items) => [created, ...items]);
      setForm({ ...form, title: "", authority: "", summary: "", source_url: "" });
      setFormMessage("Update saved and sent for verification.");
    } catch (error) {
      setFormMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const approveUpdate = async (id) => {
    try {
      const approved = await approveOfficerKnowledge(id);
      setUpdates((items) => items.map((item) => item.id === id ? approved : item));
    } catch (error) {
      setFormMessage(error.message);
    }
  };

  return (
    <>
      <div className="page-header">

        <div>

          <div className="eyebrow">
            KNOWLEDGE CENTER
          </div>

          <h2>
            Documents & Policies
          </h2>

          <p>
            Upload, review, approve and
            manage official information.
          </p>

        </div>

        <button
          className="outline-btn"
          onClick={onBack}
        >
          ← Dashboard
        </button>

      </div>


      <div className="process-strip">

        <Process
          number="01"
          title="Upload"
          text="Official document"
          active
        />

        <span>
          →
        </span>

        <Process
          number="02"
          title="Review"
          text="Verify source"
        />

        <span>
          →
        </span>

        <Process
          number="03"
          title="Approve"
          text="Publish"
        />

        <span>
          →
        </span>

        <Process
          number="04"
          title="AI Ready"
          text="RAG retrieval"
        />

      </div>


      <form className="upload-card knowledge-update-form" onSubmit={submitUpdate}>

        <div className="upload-symbol">

          <UploadCloud size={27} />

        </div>

        <div>

          <h3>
            Add a new government update
          </h3>

          <p>Add a yearly policy, insurance, scheme, law, farmer loan or circular update.</p>

        </div>

        <div className="knowledge-form-fields">
          <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Update title" />
          <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
            <option value="policy">Policy</option>
            <option value="insurance">Crop insurance</option>
            <option value="scheme">Government scheme</option>
            <option value="law">Law / bylaw</option>
            <option value="farmer_loan">Farmer loan</option>
            <option value="circular">Circular</option>
          </select>
          <input required type="number" min="2000" max="2100" value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} aria-label="Year" />
          <input required value={form.authority} onChange={(event) => setForm({ ...form, authority: event.target.value })} placeholder="Issuing authority" />
          <input value={form.version} onChange={(event) => setForm({ ...form, version: event.target.value })} placeholder="Version" />
          <input type="url" value={form.source_url} onChange={(event) => setForm({ ...form, source_url: event.target.value })} placeholder="Official source URL" />
          <textarea value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} placeholder="Short summary for reviewers" rows="2" />
        </div>

        <button className="primary-btn" type="submit" disabled={saving}>

          <UploadCloud size={16} />

          {saving ? "Saving..." : "Save for review"}

        </button>

      </form>

      {formMessage && <div className="success-alert"><CircleCheck size={19} /><span>{formMessage}</span></div>}


      <section className="panel">

        <div className="tabs">

          <button className="tab active">
            Pending Review <b>{updates.filter((item) => item.status === "pending").length}</b>
          </button>

          <button className="tab">
            Approved <b>{updates.filter((item) => item.status === "approved").length}</b>
          </button>

          <button className="tab">
            Archived <b>9</b>
          </button>

        </div>


        <div className="review-list spacious">

          {updates.length === 0 && <div className="knowledge-empty-state"><ShieldCheck size={20} /><strong>No yearly updates yet</strong><span>Add a policy, bima, scheme, law, farmer loan, or circular update above.</span></div>}

          {updates.map(
            (doc) => (

              <div
                className="full-review"
                key={doc.id}
              >

                <div className="review-file">

                  <FileText size={19} />

                </div>

                <div className="review-main">

                  <strong>
                    {doc.title}
                  </strong>

                  <small>
                    {categoryLabel(doc.category)} • {doc.year} • {doc.authority}
                  </small>

                  <div className="review-actions">

                    <button
                      className="outline-btn"
                    >

                      <Eye size={15} />

                      Preview

                    </button>

                    {doc.status === "pending" && <button type="button" className="primary-btn small" onClick={() => approveUpdate(doc.id)}>

                      <CheckCircle2
                        size={15}
                      />

                      Approve

                    </button>}

                  </div>

                </div>

              </div>

            )
          )}

        </div>

      </section>

    </>
  );
}

function categoryLabel(category) {
  const labels = {
    policy: "Policy",
    insurance: "Crop insurance",
    scheme: "Government scheme",
    law: "Law / bylaw",
    farmer_loan: "Farmer loan",
    circular: "Circular",
  };
  return labels[category] || category;
}


function Process({
  number,
  title,
  text,
  active
}) {

  return (
    <div
      className={`process-step ${
        active ? "active" : ""
      }`}
    >

      <div className="process-num">

        {number}

      </div>

      <div>

        <strong>
          {title}
        </strong>

        <span>
          {text}
        </span>

      </div>

    </div>
  );
}


function Analytics({
  onBack
}) {

  return (
    <>
      <div className="page-header">

        <div>

          <div className="eyebrow">
            SYSTEM ANALYTICS
          </div>

          <h2>
            Sanyukt Vaani AI Insights
          </h2>

          <p>
            Understand how citizens use
            the knowledge system.
          </p>

        </div>

        <button
          className="outline-btn"
          onClick={onBack}
        >
          ← Dashboard
        </button>

      </div>


      <div className="stats-grid">

        <Stat
          icon={MessageCircle}
          title="Questions this month"
          value="42,618"
          note="+22.7%"
        />

        <Stat
          icon={BarChart3}
          title="Languages used"
          value="08"
          note="Marathi #1"
        />

        <Stat
          icon={ShieldCheck}
          title="Source-backed answers"
          value="97.8%"
          note="Grounded responses"
        />

        <Stat
          icon={MessageCircle}
          title="Voice questions"
          value="68%"
          note="of all questions"
        />

      </div>


      <div className="two-col">

        <section className="panel">

          <h3>
            Knowledge Performance
          </h3>

          <p className="panel-desc">

            Current system quality indicators

          </p>

          <div className="health-meter">

            <div className="meter-track">

              <div
                className="meter-fill"
                style={{
                  width: "97%"
                }}
              />

            </div>

            <strong>
              97.8%
            </strong>

          </div>

          <div className="health-row">

            <CheckCircle2 size={16} />

            Source-backed answers

            <span>
              Excellent
            </span>

          </div>

          <div className="health-row">

            <CheckCircle2 size={16} />

            Verified sources

            <span>
              128
            </span>

          </div>

        </section>


        <section className="panel">

          <h3>
            Top Information Areas
          </h3>

          <p className="panel-desc">
            What users ask most
          </p>

          <Rank
            title="PACS Loans"
            value="31%"
          />

          <Rank
            title="Crop Insurance"
            value="24%"
          />

          <Rank
            title="Government Schemes"
            value="19%"
          />

          <Rank
            title="Grievances"
            value="14%"
          />

        </section>

      </div>

    </>
  );
}


function Rank({
  title,
  value
}) {

  return (
    <div className="rank-row">

      <strong>
        {title}
      </strong>

      <div className="rank-track">

        <div
          style={{
            width: value
          }}
        />

      </div>

      <b>
        {value}
      </b>

    </div>
  );
}

export default OfficerDashboard;