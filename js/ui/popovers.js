/**
 * Interactive Popover & Verbatim Source Code Modal Controller
 * Supports:
 *  - Clicking any animated component -> elegant popover + View Source
 *  - Clicking any animated communication event -> event inspector + View Source
 *  - Optional Code Insight drawer (outside main educational narration)
 */
(function () {
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function highlightLine(raw) {
    let s = escapeHtml(raw);
    // Comments
    if (/^\s*(#|\/\/)/.test(s)) {
      return `<span class="tok-cmt">${s}</span>`;
    }
    s = s.replace(/(&quot;.*?&quot;|'[^']*')/g, '<span class="tok-str">$1</span>');
    s = s.replace(
      /\b(def|class|return|if|else|elif|for|while|import|from|try|except|const|double|int|void|bool|auto|struct|namespace|true|false|True|False|None)\b/g,
      '<span class="tok-kw">$1</span>'
    );
    s = s.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>');
    return s;
  }

  class PopoverController {
    constructor(data, callbacks = {}) {
      this.data = data;
      this.onRequestPause = callbacks.onRequestPause || (() => {});
      this.onRequestResume = callbacks.onRequestResume || (() => {});
      this.onClearSelection = callbacks.onClearSelection || (() => {});

      this.popoverEl = document.getElementById("stagePopover");
      this.modalBackdrop = document.getElementById("codeModalBackdrop");
      this.modalTitle = document.getElementById("codeModalTitle");
      this.modalPath = document.getElementById("codeModalPath");
      this.modalBody = document.getElementById("codeModalBody");

      document.getElementById("codeModalClose").addEventListener("click", () => this.closeModal());
      this.modalBackdrop.addEventListener("click", (e) => {
        if (e.target === this.modalBackdrop) this.closeModal();
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          if (!this.modalBackdrop.hidden) this.closeModal();
          else if (!this.popoverEl.hidden) this.hidePopover();
        }
      });
    }

    showComponentPopover(compId, anchorNormX = 0.5, anchorNormY = 0.65) {
      const comp = this.data.components[compId];
      if (!comp) return;
      this.onRequestPause();

      this.popoverEl.innerHTML = `
        <div class="popover-head">
          <div>
            <div class="popover-kicker">ROS 2 Component</div>
            <div class="popover-title">${escapeHtml(comp.name)}</div>
          </div>
          <button class="popover-close" id="popoverCloseBtn" aria-label="Close">✕</button>
        </div>
        <p class="popover-desc">${escapeHtml(comp.one_sentence)}</p>
        <div class="popover-meta">
          <div class="popover-meta-row">
            <span class="popover-meta-key">Package</span>
            <span class="popover-meta-val">${escapeHtml(comp.package_name)}</span>
          </div>
          <div class="popover-meta-row">
            <span class="popover-meta-key">Source</span>
            <span class="popover-meta-val">${escapeHtml(comp.source_file.split("/").slice(-2).join("/"))}:${escapeHtml(comp.lines)}</span>
          </div>
        </div>
        <div class="popover-actions">
          <button class="view-source-btn" id="popoverViewSrcBtn">
            <span>&lt;/&gt; View Source</span>
          </button>
          <button class="resume-play-btn" id="popoverResumeBtn">▶ Resume</button>
        </div>
      `;

      this._positionPopover(anchorNormX, anchorNormY);
      this.popoverEl.hidden = false;

      document.getElementById("popoverCloseBtn").onclick = () => this.hidePopover();
      document.getElementById("popoverResumeBtn").onclick = () => {
        this.hidePopover();
        this.onRequestResume();
      };
      document.getElementById("popoverViewSrcBtn").onclick = () => {
        this.openSourceSnippet(comp.name, comp.snippet_key);
      };
    }

    showChannelPopover(flow, anchorNormX = 0.5, anchorNormY = 0.6) {
      const ch = this.data.channels[flow.channel];
      const fromComp = this.data.components[flow.from];
      const toComp = this.data.components[flow.to];
      if (!ch) return;
      this.onRequestPause();

      this.popoverEl.innerHTML = `
        <div class="popover-head">
          <div>
            <div class="popover-kicker">${escapeHtml(ch.kind)}</div>
            <div class="popover-title">${escapeHtml(ch.label)}</div>
          </div>
          <button class="popover-close" id="popoverCloseBtn" aria-label="Close">✕</button>
        </div>
        <p class="popover-desc">${escapeHtml(ch.one_sentence)}</p>
        <div class="popover-meta">
          <div class="popover-meta-row">
            <span class="popover-meta-key">Flow</span>
            <span class="popover-meta-val">${escapeHtml(fromComp ? fromComp.name : flow.from)} → ${escapeHtml(toComp ? toComp.name : flow.to)}</span>
          </div>
          <div class="popover-meta-row">
            <span class="popover-meta-key">Interface</span>
            <span class="popover-meta-val">${escapeHtml(ch.msg_type)}</span>
          </div>
          <div class="popover-meta-row">
            <span class="popover-meta-key">Rate / QoS</span>
            <span class="popover-meta-val">${escapeHtml(ch.rate_qos)}</span>
          </div>
          <div class="popover-meta-row">
            <span class="popover-meta-key">Source</span>
            <span class="popover-meta-val">${escapeHtml(ch.source_file.split("/").pop())}:${escapeHtml(ch.lines)}</span>
          </div>
        </div>
        <div class="popover-actions">
          <button class="view-source-btn" id="popoverViewSrcBtn">
            <span>&lt;/&gt; View Source</span>
          </button>
          <button class="resume-play-btn" id="popoverResumeBtn">▶ Resume</button>
        </div>
      `;

      this._positionPopover(anchorNormX, anchorNormY);
      this.popoverEl.hidden = false;

      document.getElementById("popoverCloseBtn").onclick = () => this.hidePopover();
      document.getElementById("popoverResumeBtn").onclick = () => {
        this.hidePopover();
        this.onRequestResume();
      };
      document.getElementById("popoverViewSrcBtn").onclick = () => {
        this.openSourceSnippet(ch.label, ch.snippet_key);
      };
    }

    openCodeInsight(insightId) {
      const ins = this.data.code_insights[insightId];
      if (!ins) return;
      this.onRequestPause();
      const primary = this.data.snippets[ins.snippet_key];
      const secondary = this.data.snippets[ins.secondary_snippet_key];

      this.modalTitle.textContent = ins.title;
      this.modalPath.textContent = `${ins.source_file}:${ins.lines}`;

      let bodyHtml = `
        <div class="insight-impact-list">
          <strong>${escapeHtml(ins.summary)}</strong>
          ${ins.runtime_impact.map((item) => `<div>• ${escapeHtml(item)}</div>`).join("")}
        </div>
      `;
      if (primary) {
        bodyHtml += this._renderSnippetBlock(primary);
      }
      if (secondary) {
        bodyHtml += `<div class="code-modal-path">${escapeHtml(secondary.file)}:${escapeHtml(secondary.lines)}</div>`;
        bodyHtml += this._renderSnippetBlock(secondary);
      }

      this.modalBody.innerHTML = bodyHtml;
      this.modalBackdrop.hidden = false;
    }

    openSourceSnippet(title, snippetKey) {
      const snip = this.data.snippets[snippetKey];
      if (!snip) return;
      this.modalTitle.textContent = title;
      this.modalPath.textContent = `${snip.file} (lines ${snip.lines})`;
      this.modalBody.innerHTML = this._renderSnippetBlock(snip);
      this.modalBackdrop.hidden = false;
    }

    _renderSnippetBlock(snip) {
      const lines = snip.code.split("\n");
      const rows = lines
        .map((line, i) => {
          const ln = snip.start_line + i;
          return `<div class="code-line"><span class="code-ln">${ln}</span><span class="code-src">${highlightLine(line)}</span></div>`;
        })
        .join("");
      return `<div class="code-block">${rows}</div>`;
    }

    _positionPopover(nx, ny) {
      const leftPct = Math.min(68, Math.max(4, nx * 100 - 14));
      const topPct = ny > 0.56 ? Math.max(8, ny * 100 - 44) : Math.min(50, ny * 100 + 8);
      this.popoverEl.style.left = `${leftPct}%`;
      this.popoverEl.style.top = `${topPct}%`;
    }

    hidePopover() {
      this.popoverEl.hidden = true;
      this.onClearSelection();
    }

    closeModal() {
      this.modalBackdrop.hidden = true;
    }
  }

  window.RoarPopoverController = PopoverController;
})();
