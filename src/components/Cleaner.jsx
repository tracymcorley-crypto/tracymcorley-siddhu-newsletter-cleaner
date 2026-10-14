import { useState, useCallback, useRef, useEffect } from "react";

export function Cleaner({
  title,
  optionLabels,
  defaultOptions,
  onClean,
  sampleHtml,
  showSampleButton,
  statsConfig,
  onCopy,
  onDownload,
  onShowMessage,
  onHistorySave,
  cleanerId,
}) {
  const [inputHtml, setInputHtml] = useState("");
  const [outputHtml, setOutputHtml] = useState("");
  const [options, setOptions] = useState(defaultOptions);
  const [stats, setStats] = useState(
    Object.fromEntries(Object.keys(defaultOptions).map((k) => [k, 0]))
  );
  const [hasCleaned, setHasCleaned] = useState(false);
  const [viewMode, setViewMode] = useState("preview");
  const [outputVisible, setOutputVisible] = useState(true);
  const iframeRef = useRef(null);

  const runClean = useCallback(
    (html, opts, saveHist = false) => {
      if (!html.trim()) {
        setOutputHtml("");
        setStats(Object.fromEntries(Object.keys(opts).map((k) => [k, 0])));
        setHasCleaned(false);
        return;
      }
      const result = onClean(html, opts);
      setOutputHtml(result.html);
      setStats(result.stats);
      setHasCleaned(true);

      if (saveHist) {
        onHistorySave(html, result.html, result.stats, opts);
      }
    },
    [onClean, onHistorySave]
  );

  const handleClean = useCallback(() => {
    if (!inputHtml.trim()) {
      onShowMessage("Please paste some newsletter HTML to clean.", "error");
      return;
    }
    runClean(inputHtml, options, true);
    onShowMessage("HTML cleaned successfully!", "success");
  }, [inputHtml, options, runClean, onShowMessage]);

  const handleToggleOption = useCallback(
    (key) => {
      setOptions((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        if (inputHtml.trim() && hasCleaned) {
          runClean(inputHtml, next, false);
        }
        return next;
      });
    },
    [inputHtml, hasCleaned, runClean]
  );

  useEffect(() => {
    if (inputHtml.trim() && hasCleaned) {
      const timer = setTimeout(() => {
        runClean(inputHtml, options, false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [inputHtml, options, runClean, hasCleaned]);

  useEffect(() => {
    if (iframeRef.current && viewMode === "preview" && outputVisible) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        if (outputHtml) {
          doc.write(outputHtml);
        } else {
          doc.write(
            "<div style='color:#999;font-family:sans-serif;padding:40px;text-align:center'>Your cleaned newsletter preview will appear here...</div>"
          );
        }
        doc.close();
      }
    }
  }, [outputHtml, viewMode, outputVisible]);

  const handleCopy = useCallback(() => {
    onCopy(outputHtml);
  }, [outputHtml, onCopy]);

  const handleDownload = useCallback(() => {
    onDownload(outputHtml);
  }, [outputHtml, onDownload]);

  const handleClear = useCallback(() => {
    setInputHtml("");
    setOutputHtml("");
    setStats(Object.fromEntries(Object.keys(options).map((k) => [k, 0])));
    setHasCleaned(false);
    onShowMessage("Input and output cleared.", "success");
  }, [options, onShowMessage]);

  const handleLoadSample = useCallback(() => {
    setInputHtml(sampleHtml);
    setOutputHtml("");
    setStats(Object.fromEntries(Object.keys(options).map((k) => [k, 0])));
    setHasCleaned(false);
    onShowMessage("Sample newsletter loaded. Click Clean HTML to process.", "success");
  }, [sampleHtml, options, onShowMessage]);

  const handleOutputEdit = useCallback((e) => {
    setOutputHtml(e.target.value);
  }, []);

  const activeOptionCount = Object.values(options).filter(Boolean).length;

  return (
    <div className="cleaner-section">
      <h2 className="cleaner-title">{title}</h2>

      <div className="options-bar">
        <div className="options-header">
          <span className="options-title">Cleaning Options</span>
          <span className="options-hint">
            Toggle any option to instantly re-clean ({activeOptionCount} active)
          </span>
        </div>
        <div className={`options-grid options-grid-${optionLabels.length}`}>
          {optionLabels.map((opt) => (
            <label
              key={opt.key}
              data-key={opt.key}
              className={`option-chip compact-chip ${options[opt.key] ? "active" : ""}`}
            >
              <input
                type="checkbox"
                checked={options[opt.key]}
                onChange={() => handleToggleOption(opt.key)}
              />
              <span className="option-icon compact-icon">{opt.icon}</span>
              <span className="option-text">
                <span className="option-label">{opt.label}</span>
                <span className="option-desc">{opt.desc}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="stats-row">
        {statsConfig.map((stat, idx) => (
          <div className="stat-card" key={stat.key}>
            <span className="stat-icon" data-stat-idx={idx}>{stat.icon}</span>
            <div>
              <span className="stat-value">{stats[stat.key] || 0}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="editor-grid">
        <div className="editor-panel">
          <div className="panel-header">
            <label htmlFor={`${cleanerId}-input`}>Paste Newsletter HTML</label>
            {showSampleButton && (
              <button className="btn btn-link" onClick={handleLoadSample}>
                Load Sample
              </button>
            )}
          </div>
          <textarea
            id={`${cleanerId}-input`}
            className="html-textarea"
            placeholder="Paste your newsletter HTML here..."
            value={inputHtml}
            onChange={(e) => setInputHtml(e.target.value)}
            spellCheck={false}
          />
          <div className="panel-actions">
            <button className="btn btn-primary" onClick={handleClean}>
              Clean HTML
            </button>
            <button className="btn btn-secondary" onClick={handleClear}>
              Clear
            </button>
          </div>
        </div>

        <div className="editor-panel output-panel">
          <div className="panel-header">
            <label>Cleaned Output</label>
            <div className="panel-header-right">
              <div className="view-toggle">
                <button
                  className={`toggle-btn ${viewMode === "preview" ? "active" : ""}`}
                  onClick={() => setViewMode("preview")}
                >
                  Preview
                </button>
                <button
                  className={`toggle-btn ${viewMode === "code" ? "active" : ""}`}
                  onClick={() => setViewMode("code")}
                >
                  Code
                </button>
              </div>
              <button
                className="btn btn-secondary btn-sm toggle-output-btn"
                onClick={() => setOutputVisible((v) => !v)}
              >
                {outputVisible ? "Hide Output" : "Show Output"}
              </button>
            </div>
          </div>

          {outputVisible && (
            <>
              {viewMode === "preview" ? (
                <div className="preview-container">
                  <iframe
                    ref={iframeRef}
                    title={`${cleanerId} Preview`}
                    className="preview-iframe"
                    sandbox="allow-same-origin"
                  />
                </div>
              ) : (
                <textarea
                  className="html-textarea code-output"
                  placeholder="Your cleaned HTML code will appear here..."
                  value={outputHtml}
                  onChange={handleOutputEdit}
                  spellCheck={false}
                />
              )}

              <div className="panel-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleCopy}
                  disabled={!hasCleaned}
                >
                  Copy Cleaned HTML
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleDownload}
                  disabled={!hasCleaned}
                >
                  Download HTML
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {!hasCleaned && !inputHtml && (
        <div className="empty-state">
          <span className="empty-icon">&#9993;</span>
          <h3>Get Started</h3>
          <p>
            Paste your newsletter HTML on the left
            {showSampleButton ? ', or click "Load Sample" to try it out.' : "."}
          </p>
        </div>
      )}
    </div>
  );
}
