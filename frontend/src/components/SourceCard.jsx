import {
  FileText,
  ShieldCheck,
  Eye
} from "lucide-react";

function SourceCard({
  source
}) {

  return (
    <div className="source-card">

      <div className="source-card-top">

        <div className="doc-icon">

          <FileText size={18} />

        </div>

        <span className="status approved">

          <ShieldCheck size={13} />

          Verified

        </span>

      </div>

      <h3>
        {source.title}
      </h3>

      <p>
        {source.authority}
      </p>

      <div className="source-meta">

        <span>
          v{source.version}
        </span>

        <span>
          {source.pages} pages
        </span>

        <span>
          {source.date}
        </span>

      </div>

      <button className="outline-btn full">

        <Eye size={15} />

        Open Source

      </button>

    </div>
  );
}

export default SourceCard;