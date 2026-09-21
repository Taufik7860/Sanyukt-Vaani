import {
  FileText,
  ShieldCheck,
  Eye
} from "lucide-react";

function SourceCard({
  source
}) {
  const sourceFile = source.source || source.metadata?.source_file || source.title || "";
  const sourceUrl = source.url || `https://github.com/Taufik7860/Sanyukt-Vaani/search?q=${encodeURIComponent(sourceFile)}&type=code`;

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

      <a
        className="outline-btn full"
        href={sourceUrl || "#"}
        target="_blank"
        rel="noreferrer"
        onClick={(event) => {
          if (!sourceUrl) event.preventDefault();
        }}
      >

        <Eye size={15} />

        Open Source

      </a>

    </div>
  );
}

export default SourceCard;