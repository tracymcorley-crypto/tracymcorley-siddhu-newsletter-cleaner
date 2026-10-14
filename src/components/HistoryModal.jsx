import { useState } from "react";

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    return true;
  }
}

export function HistoryModal({
  history,
  onClose,
  onRestore,
  onDelete,
  onClearAll,
}) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = async (entry) => {
    const ok = await copyToClipboard(entry.cleaned);
    if (ok) {
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Cleaning History</h2>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          {history.length === 0 ? (
            <div className="empty-state modal-empty">
              <span className="empty-icon">&#128218;</span>
              <h3>No History Yet</h3>
              <p>Your cleaning history will appear here once you start cleaning newsletters.</p>
            </div>
          ) : (
            <>
              <div className="history-actions">
                <span className="history-count">
                  {history.length} {history.length === 1 ? "entry" : "entries"} saved
                </span>
                {confirmClear ? (
                  <div className="confirm-bar">
                    <span>Delete all history?</span>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => {
                        onClearAll();
                        setConfirmClear(false);
                      }}
                    >
                      Yes, Clear All
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setConfirmClear(false)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => setConfirmClear(true)}
                  >
                    Clear History
                  </button>
                )}
              </div>

              <div className="history-list">
                {history.map((entry) => (
                  <div key={entry.id} className="history-item">
                    <div className="history-item-header">
                      <span className="history-date">
                        {formatDate(entry.date)}
                      </span>
                      <div className="history-item-stats">
                        <span>{entry.stats.hrefs || 0} hrefs</span>
                        <span>{entry.stats.srcs || 0} srcs</span>
                        <span>{entry.stats.emails || 0} emails</span>
                        <span>{entry.stats.numbers || 0} numbers</span>
                      </div>
                    </div>
                    <p className="history-preview">
                      {entry.preview}
                      {entry.original.length > 150 ? "..." : ""}
                    </p>
                    <div className="history-item-actions">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => onRestore(entry)}
                      >
                        Reopen
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleCopy(entry)}
                      >
                        {copiedId === entry.id ? "Copied!" : "Copy"}
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => onDelete(entry.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
