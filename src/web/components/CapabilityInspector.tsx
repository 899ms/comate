import { Copy, ExternalLink, FolderOpen } from "lucide-react";

import type { CapabilityRecord } from "../../shared/types.js";
import { middleEllipsis } from "../utils/format.js";

interface CapabilityInspectorProps {
  capability: CapabilityRecord | null;
  collapsed?: boolean;
  onOpenPath: (path: string, action: "openFile" | "revealFile") => void;
}

export function CapabilityInspector({ capability, collapsed = false, onOpenPath }: CapabilityInspectorProps) {
  if (collapsed) {
    return <aside className="detail-panel capability-inspector collapsed" aria-hidden="true" />;
  }

  if (!capability) {
    return (
      <aside className="detail-panel capability-inspector empty">
        <span>Select capability</span>
      </aside>
    );
  }

  return (
    <aside className="detail-panel capability-inspector">
      <section className="capability-hero">
        <span className={`capability-kind kind-${capability.kind}`}>{capability.kind}</span>
        <h2>{capability.name}</h2>
        <p>{capability.description ?? "No description"}</p>
        <div className="capability-chip-row">
          <span className={`capability-status status-${capability.status}`}>{capability.status}</span>
          <span>{capability.source}</span>
          <span>{capability.origin}</span>
        </div>
      </section>

      {capability.path ? (
        <div className="detail-actions capability-actions">
          <button onClick={() => onOpenPath(capability.path!, "openFile")}>
            <ExternalLink size={16} />
            打开文件
          </button>
          <button onClick={() => onOpenPath(capability.path!, "revealFile")}>
            <FolderOpen size={16} />
            打开目录
          </button>
          <button onClick={() => navigator.clipboard.writeText(capability.path!)}>
            <Copy size={16} />
            复制路径
          </button>
        </div>
      ) : null}

      <section className="detail-section metadata-section">
        <div className="detail-section-heading">
          <span>Details</span>
        </div>
        <dl className="meta-list">
          <Meta label="Kind" value={capability.kind} />
          <Meta label="Source" value={capability.source} />
          <Meta label="Trigger" value={capability.trigger ?? "Implicit"} />
          <Meta label="Path" value={capability.path ? middleEllipsis(capability.path, 42) : "None"} title={capability.path ?? undefined} />
          <Meta label="Updated" value={capability.updatedAt ? new Date(capability.updatedAt).toLocaleString() : "Unknown"} />
        </dl>
      </section>

      <section className="detail-section capability-section">
        <div className="detail-section-heading">
          <span>Dependencies</span>
        </div>
        <div className="capability-detail-list">
          {capability.dependencies.length > 0 ? (
            capability.dependencies.map((dependency) => (
              <div key={`${dependency.kind}:${dependency.path ?? dependency.label}`} className="capability-detail-row">
                <strong>{dependency.label}</strong>
                <span>{dependency.count !== undefined ? `${dependency.count} files` : dependency.status}</span>
              </div>
            ))
          ) : (
            <div className="capability-detail-empty">No declared local dependencies.</div>
          )}
        </div>
      </section>

      <section className="detail-section capability-section">
        <div className="detail-section-heading">
          <span>Issues</span>
        </div>
        <div className="capability-detail-list">
          {capability.issues.length > 0 ? (
            capability.issues.map((issue) => (
              <div key={`${issue.code}:${issue.message}`} className={`capability-issue severity-${issue.severity}`}>
                <strong>{issue.severity}</strong>
                <span>{issue.message}</span>
              </div>
            ))
          ) : (
            <div className="capability-detail-empty">No issues detected.</div>
          )}
        </div>
      </section>
    </aside>
  );
}

function Meta({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="meta-row">
      <dt>{label}</dt>
      <dd title={title}>{value}</dd>
    </div>
  );
}
