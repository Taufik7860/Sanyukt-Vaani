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

import React, { useEffect, useRef, useState } from "react";
import {
  approveOfficerKnowledge,
  getOfficerKnowledge,
  getOfficerKnowledgeDocument,
  uploadOfficerKnowledge,
} from "../services/api";

function OfficerDashboard() {

  const [activeTab, setActiveTab] =
    useState("dashboard");
  const [dashboardUpdates, setDashboardUpdates] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  useEffect(() => {
    getOfficerKnowledge()
      .then((result) => setDashboardUpdates(result.items || []))
      .catch((error) => setDashboardError(error.message))
      .finally(() => setDashboardLoading(false));
  }, []);

  const pendingDocuments = dashboardUpdates.filter((item) => item.status === "pending");
  const approvedDocuments = dashboardUpdates.filter((item) => item.status === "approved");
  const archivedDocuments = dashboardUpdates.filter((item) => item.status === "archived");
  const latestUpdate = dashboardUpdates.find((item) => item.status === "approved");
  const coverage = dashboardUpdates.length
    ? Math.round((approvedDocuments.length / dashboardUpdates.length) * 100)
    : 0;

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

          Upload Yearly Update

        </button>

      </div>


      <section className="hero-banner">

        <div className="hero-content">

          <div className="verified-badge">

            <ShieldCheck size={15} />

            KNOWLEDGE BASE VERIFIED

          </div>

          <h3>
            Keep official documents current
            every year.
          </h3>

          <p>

            Upload this year's official PDF,
            review and approve it. The previous
            approved edition is archived and AI
            uses the newly approved information.

          </p>

          <div className="hero-actions">

            <button
              className="light-btn"
              onClick={() =>
                setActiveTab("knowledge")
              }
            >

              Manage Yearly Updates

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
          value={dashboardLoading ? "…" : approvedDocuments.length}
          note="Active in the AI knowledge base"
        />

        <Stat
          icon={Clock3}
          title="Pending Review"
          value={dashboardLoading ? "…" : pendingDocuments.length}
          note={pendingDocuments.length ? "Needs your attention" : "No reviews waiting"}
          warning
        />

        <Stat
          icon={RefreshCw}
          title="Knowledge Updated"
          value={latestUpdate ? formatDate(latestUpdate.approved_at) : "—"}
          note="Latest approved document"
        />

        <Stat
          icon={MessageCircle}
          title="Archived Versions"
          value={dashboardLoading ? "…" : archivedDocuments.length}
          note="Superseded yearly documents"
        />

      </div>

      {dashboardError && <div className="error-alert" role="alert">{dashboardError}</div>}

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

            {!dashboardLoading && pendingDocuments.length === 0 && (
              <div className="knowledge-empty-state">
                <ShieldCheck size={20} />
                <strong>No documents awaiting review</strong>
                <span>New uploads will appear here for approval.</span>
              </div>
            )}

            {pendingDocuments.slice(0, 4).map(
              (doc) => (

                <div
                  className="review-row"
                  key={doc.id}
                >

                  <div className="review-file">

                    <FileText size={17} />

                  </div>

                  <div className="review-main">

                    <strong>
                      {doc.title}
                    </strong>

                    <small>
                      {categoryLabel(doc.category)} • {doc.year} • {doc.file_name}
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
                {coverage}%
              </strong>

              <span>
                Coverage health
              </span>

            </div>

          </div>


          <div className="health-row">

            <CheckCircle2 size={16} />

            {approvedDocuments.length} approved documents active in AI retrieval

            <span>
              Good
            </span>

          </div>


          <div className="health-row">

            <CheckCircle2 size={16} />

            {archivedDocuments.length} older versions archived

            <span>
              Good
            </span>

          </div>


          <div className="health-row">

            <CircleAlert size={16} />

            {pendingDocuments.length} documents awaiting review

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

              {dashboardUpdates.slice(0, 6).map(
                (doc) => (

                  <tr key={doc.id}>

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
                            {doc.page_count || "—"} pages
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
                      {formatDate(doc.updated_at)}
                    </td>

                    <td>

                      <span className={`status ${doc.status}`}>

                        {doc.status === "approved" ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}

                        {doc.status}

                      </span>

                    </td>

                    <td>

                      <button
                        type="button"
                        className="icon-btn"
                        title={`Preview ${doc.title}`}
                        onClick={() => setActiveTab("knowledge")}
                      >

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
  const [activeFilter, setActiveFilter] = useState("pending");
  const [selectedFile, setSelectedFile] = useState(null);
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
  const [isError, setIsError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewError, setPreviewError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    getOfficerKnowledge()
      .then((result) => setUpdates(result.items || []))
      .catch((error) => {
        setFormMessage(error.message);
        setIsError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const submitUpdate = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setFormMessage("Choose an official PDF document to upload.");
      setIsError(true);
      return;
    }

    setSaving(true);
    setFormMessage("");
    setIsError(false);
    try {
      const payload = new FormData();
      Object.entries({ ...form, year: Number(form.year) }).forEach(([key, value]) => {
        payload.append(key, String(value));
      });
      payload.append("file", selectedFile);
      const created = await uploadOfficerKnowledge(payload);
      setUpdates((items) => [created, ...items]);
      setForm({
        title: "",
        category: "policy",
        year: new Date().getFullYear(),
        authority: "",
        version: "1.0",
        summary: "",
        source_url: "",
      });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setActiveFilter("pending");
      setFormMessage("PDF uploaded and queued for officer verification.");
    } catch (error) {
      setFormMessage(error.message);
      setIsError(true);
    } finally {
      setSaving(false);
    }
  };

  const approveUpdate = async (id) => {
    setApprovingId(id);
    setFormMessage("");
    setIsError(false);
    try {
      const approved = await approveOfficerKnowledge(id);
      setUpdates((items) =>
        items.map((item) => {
          if (item.id === id) return approved;
          if (
            item.status === "approved" &&
            item.category === approved.category &&
            item.title.trim().toLowerCase() === approved.title.trim().toLowerCase() &&
            Number(item.year) <= Number(approved.year)
          ) {
            return { ...item, status: "archived", superseded_by: approved.id };
          }
          return item;
        })
      );
      setFormMessage("Document approved and indexed for AI answers.");
    } catch (error) {
      setFormMessage(error.message);
      setIsError(true);
    } finally {
      setApprovingId("");
    }
  };

  const openPreview = async (document) => {
    setPreviewError("");
    setPreviewTitle(document.title);
    try {
      const blob = await getOfficerKnowledgeDocument(document.id);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (error) {
      setPreviewError(error.message);
    }
  };

  const closePreview = () => {
    setPreviewUrl("");
    setPreviewTitle("");
    setPreviewError("");
  };

  const filteredUpdates = updates.filter((item) => item.status === activeFilter);
  const countFor = (status) => updates.filter((item) => item.status === status).length;

  return (
    <>
      <div className="page-header">

        <div>

          <div className="eyebrow">
            YEARLY KNOWLEDGE UPDATES
          </div>

          <h2>
            Annual Document Updates
          </h2>

          <p>
            Upload this year's official PDF, review it,
            then publish it to the AI knowledge base.
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
            Upload this year's official document
          </h3>

          <p>Upload a verified PDF. After approval, the new yearly version replaces the old one in AI search.</p>

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
          <label className="knowledge-file-field">
            <span>Official PDF document <b>Required · Max 15 MB</b></span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              required
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
              aria-label="Choose an official PDF document"
            />
          </label>
        </div>

        <button className="primary-btn upload-submit-btn" type="submit" disabled={saving}>

          <UploadCloud size={16} />

          {saving ? "Uploading PDF..." : "Upload for review"}

        </button>

      </form>

      {formMessage && (
        <div className={isError ? "error-alert" : "success-alert"} role={isError ? "alert" : "status"}>
          {isError ? <CircleAlert size={19} /> : <CircleCheck size={19} />}
          <span>{formMessage}</span>
        </div>
      )}


      <section className="panel">

        <div className="tabs">

          <button type="button" className={`tab ${activeFilter === "pending" ? "active" : ""}`} onClick={() => setActiveFilter("pending")}>
            Pending Review <b>{countFor("pending")}</b>
          </button>

          <button type="button" className={`tab ${activeFilter === "approved" ? "active" : ""}`} onClick={() => setActiveFilter("approved")}>
            Approved <b>{countFor("approved")}</b>
          </button>

          <button type="button" className={`tab ${activeFilter === "archived" ? "active" : ""}`} onClick={() => setActiveFilter("archived")}>
            Archived <b>{countFor("archived")}</b>
          </button>

        </div>


        <div className="review-list spacious">

          {loading && <div className="knowledge-empty-state"><RefreshCw size={20} /><strong>Loading documents</strong><span>Connecting to the officer knowledge service…</span></div>}

          {!loading && filteredUpdates.length === 0 && (
            <div className="knowledge-empty-state">
              <ShieldCheck size={20} />
              <strong>{updates.length ? `No ${activeFilter} documents` : "No yearly updates yet"}</strong>
              <span>{updates.length ? "Documents will appear in this list when their status changes." : "Upload an official PDF above to start the annual update workflow."}</span>
            </div>
          )}

          {filteredUpdates.map(
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
                    {categoryLabel(doc.category)} • {doc.year} • {doc.authority} • v{doc.version}
                  </small>
                  {doc.file_name && <small className="knowledge-file-name"><FileText size={12} /> {doc.file_name} · {doc.page_count} pages</small>}

                  <div className="review-actions">

                    {doc.file_name && <button type="button" className="outline-btn" onClick={() => openPreview(doc)}>

                      <Eye size={15} />

                      Preview

                    </button>}

                    {doc.status === "pending" && <button type="button" className="primary-btn small" disabled={approvingId === doc.id} onClick={() => approveUpdate(doc.id)}>

                      <CheckCircle2
                        size={15}
                      />

                      {approvingId === doc.id ? "Indexing..." : "Approve & publish"}

                    </button>}

                  </div>

                </div>

              </div>

            )
          )}

        </div>

      </section>

      {(previewUrl || previewError) && (
        <div className="document-preview-backdrop" onClick={closePreview}>
          <section
            className="document-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`PDF preview: ${previewTitle}`}
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <strong>{previewTitle}</strong>
                <span>Official document preview</span>
              </div>
              <button type="button" className="icon-btn" aria-label="Close preview" onClick={closePreview}>
                <X size={18} />
              </button>
            </header>
            {previewError ? <div className="error-alert" role="alert">{previewError}</div> : <iframe title={`PDF preview for ${previewTitle}`} src={previewUrl} />}
          </section>
        </div>
      )}

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

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
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