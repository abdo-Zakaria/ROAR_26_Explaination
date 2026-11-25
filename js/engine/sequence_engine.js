/**
 * Progressive Animated UML Sequence Diagram & Virtual Camera Engine
 *
 * Renders:
 *  - Sticky top runtime participant headers (Participant Name + ROS 2 Package + Runtime Kind)
 *  - Progressive lifeline reveal & smooth column expansion
 *  - Chronological top-to-bottom numbered execution events
 *  - 6 distinct visual treatments: ROS 2 Topic, Action, Service, TF2, Process Launch, Internal Call
 *  - UML Loop frames & execution activation bars
 *  - Traveling data packets synchronized with narration
 *  - Smooth 60 FPS spring-damped camera tracking + manual drag-pan & wheel-zoom
 *  - Interactive participant & arrow selection (incoming/outgoing flow highlighting)
 */
(function () {
  const SVG_NS = "http://www.w3.org/2000/svg";

  const COMM_STYLES = {
    topic: {
      color: "#38bdf8",
      badge: "ROS 2 TOPIC",
      short: "TOPIC",
      dash: "none",
      packetShape: "circle"
    },
    action: {
      color: "#fbbf24",
      badge: "ROS 2 ACTION",
      short: "ACTION",
      dash: "none",
      doubleLine: true,
      packetShape: "diamond"
    },
    service: {
      color: "#34d399",
      badge: "ROS 2 SERVICE",
      short: "SERVICE",
      dash: "7 4",
      packetShape: "square"
    },
    tf: {
      color: "#a78bfa",
      badge: "TF2 TRANSFORM",
      short: "TF2",
      dash: "3 4",
      packetShape: "ring"
    },
    process: {
      color: "#ff5c35",
      badge: "PROCESS / LAUNCH",
      short: "LAUNCH",
      dash: "10 4 3 4",
      packetShape: "circle"
    },
    internal: {
      color: "#60a5fa",
      badge: "INTERNAL CALL",
      short: "CALL",
      dash: "none",
      packetShape: "circle"
    }
  };

  const CATEGORY_ACCENTS = {
    simulation: "#ff5c35",
    perception: "#38bdf8",
    localization: "#a78bfa",
    mapping: "#34d399",
    navigation: "#fbbf24",
    mission: "#60a5fa",
    evaluation: "#f43f5e"
  };

  function svgEl(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, String(v));
    }
    return el;
  }

  function truncate(str, maxLen) {
    const s = String(str || "");
    return s.length > maxLen ? s.slice(0, maxLen - 1) + "…" : s;
  }

  class SequenceEngine {
    constructor(viewportEl, svgRoot, data, callbacks = {}) {
      this.viewportEl = viewportEl;
      this.svg = svgRoot;
      this.data = data;
      this.onSelectParticipant = callbacks.onSelectParticipant || (() => {});
      this.onSelectEvent = callbacks.onSelectEvent || (() => {});
      this.onAutoCameraChanged = callbacks.onAutoCameraChanged || (() => {});

      this.doc = null;
      this.activeIdx = 0;
      this.eventProgress = 0; // 0..1 within current event
      this.animClock = 0;

      this.progressiveMode = true; // true = reveal lifelines/events progressively; false = full diagram
      this.autoCamera = true;

      // Layout constants in virtual diagram space
      this.colSpacing = 248;
      this.leftMargin = 155;
      this.headerBandH = 84;
      this.firstRowY = 142;
      this.rowSpacing = 88;
      this.cardW = 196;
      this.cardH = 62;

      // Smoothly interpolated column X per participant ID
      this.participantX = {};
      this.targetParticipantX = {};
      this.revealedSet = new Set();

      // Virtual camera state (pan + zoom)
      this.camX = 0;
      this.camY = 0;
      this.camZoom = 0.92;
      this.targetCamX = 0;
      this.targetCamY = 0;
      this.targetCamZoom = 0.92;

      // Interactive focus state
      this.focusedParticipantId = null;
      this.selectedEventIdx = null;

      // Cached DOM references per loaded documentary
      this.lifelineDom = {};
      this.headerDom = {};
      this.eventDom = [];
      this.loopDom = [];

      this._initSvgStructure();
      this._bindPanAndZoom();
    }

    _initSvgStructure() {
      this.svg.innerHTML = "";
      const defs = svgEl("defs");

      // Glowing packet filter
      const glow = svgEl("filter", { id: "seqPacketGlow", x: "-60%", y: "-60%", width: "220%", height: "220%" });
      glow.appendChild(svgEl("feGaussianBlur", { stdDeviation: "3.2", result: "blur" }));
      const merge = svgEl("feMerge");
      merge.appendChild(svgEl("feMergeNode", { in: "blur" }));
      merge.appendChild(svgEl("feMergeNode", { in: "SourceGraphic" }));
      glow.appendChild(merge);
      defs.appendChild(glow);

      // Clip path so scrolling body stays cleanly below the pinned participant header band
      const bodyClip = svgEl("clipPath", { id: "seqBodyClip" });
      this.bodyClipRect = svgEl("rect", { x: 0, y: this.headerBandH, width: 2400, height: 1400 });
      bodyClip.appendChild(this.bodyClipRect);
      defs.appendChild(bodyClip);

      this.svg.appendChild(defs);

      // Clipped scrolling sequence body
      this.bodyClipGroup = svgEl("g", { "clip-path": "url(#seqBodyClip)" });
      this.bodyWorldG = svgEl("g", { class: "seq-body-world" });
      this.loopsLayer = svgEl("g", { class: "seq-loops-layer" });
      this.lifelinesLayer = svgEl("g", { class: "seq-lifelines-layer" });
      this.activationsLayer = svgEl("g", { class: "seq-activations-layer" });
      this.eventsLayer = svgEl("g", { class: "seq-events-layer" });
      this.packetsLayer = svgEl("g", { class: "seq-packets-layer" });

      this.bodyWorldG.appendChild(this.loopsLayer);
      this.bodyWorldG.appendChild(this.lifelinesLayer);
      this.bodyWorldG.appendChild(this.activationsLayer);
      this.bodyWorldG.appendChild(this.eventsLayer);
      this.bodyWorldG.appendChild(this.packetsLayer);
      this.bodyClipGroup.appendChild(this.bodyWorldG);
      this.svg.appendChild(this.bodyClipGroup);

      // Pinned top header backdrop + horizontally-synced participant cards
      this.headerBackdrop = svgEl("rect", {
        x: 0,
        y: 0,
        width: 2400,
        height: this.headerBandH,
        fill: "rgba(7, 10, 18, 0.92)"
      });
      this.headerDivider = svgEl("line", {
        x1: 0,
        y1: this.headerBandH,
        x2: 2400,
        y2: this.headerBandH,
        stroke: "rgba(255, 255, 255, 0.08)",
        "stroke-width": 1
      });
      this.headerWorldG = svgEl("g", { class: "seq-header-world" });

      this.svg.appendChild(this.headerBackdrop);
      this.svg.appendChild(this.headerDivider);
      this.svg.appendChild(this.headerWorldG);
    }

    loadDocumentary(doc) {
      this.doc = doc;
      this.activeIdx = 0;
      this.eventProgress = 0;
      this.focusedParticipantId = null;
      this.selectedEventIdx = null;
      this.participantX = {};
      this.targetParticipantX = {};

      this.loopsLayer.innerHTML = "";
      this.lifelinesLayer.innerHTML = "";
      this.activationsLayer.innerHTML = "";
      this.eventsLayer.innerHTML = "";
      this.packetsLayer.innerHTML = "";
      this.headerWorldG.innerHTML = "";

      this.lifelineDom = {};
      this.headerDom = {};
      this.eventDom = [];
      this.loopDom = [];

      if (!doc) return;

      const totalHeight = this.firstRowY + doc.events.length * this.rowSpacing + 110;

      // 1. Build Participant Headers & Vertical Lifelines
      doc.participant_order.forEach((pid, orderIdx) => {
        const p = this.data.participants[pid];
        if (!p) return;
        const initX = this.leftMargin + orderIdx * this.colSpacing;
        this.participantX[pid] = initX;
        this.targetParticipantX[pid] = initX;

        const accent = CATEGORY_ACCENTS[p.category] || "#38bdf8";

        // Vertical lifeline group
        const lg = svgEl("g", { class: "seq-lifeline-group" });
        const guideLine = svgEl("line", {
          x1: 0,
          y1: this.headerBandH,
          x2: 0,
          y2: totalHeight,
          stroke: "rgba(148, 163, 184, 0.22)",
          "stroke-width": 1.5,
          "stroke-dasharray": "6 6"
        });
        const activeLine = svgEl("line", {
          x1: 0,
          y1: this.headerBandH,
          x2: 0,
          y2: this.firstRowY,
          stroke: accent,
          "stroke-width": 2.4,
          opacity: "0.75"
        });
        const hitLine = svgEl("line", {
          x1: 0,
          y1: this.headerBandH,
          x2: 0,
          y2: totalHeight,
          class: "seq-lifeline-hit"
        });
        hitLine.addEventListener("click", (e) => {
          e.stopPropagation();
          this.focusParticipant(pid);
          this.onSelectParticipant(pid);
        });

        // Bottom footer mini-pill (mirrors top participant label at bottom of sequence)
        const footRect = svgEl("rect", {
          x: -74,
          y: totalHeight,
          width: 148,
          height: 28,
          rx: 8,
          fill: "rgba(13, 18, 29, 0.9)",
          stroke: accent,
          "stroke-width": 1.1,
          opacity: "0.7"
        });
        const footTxt = svgEl("text", {
          x: 0,
          y: totalHeight + 18,
          "text-anchor": "middle",
          fill: "#cbd5e1",
          "font-family": "Inter, system-ui, sans-serif",
          "font-size": "10.5",
          "font-weight": "600"
        });
        footTxt.textContent = truncate(p.name, 20);

        lg.appendChild(guideLine);
        lg.appendChild(activeLine);
        lg.appendChild(footRect);
        lg.appendChild(footTxt);
        lg.appendChild(hitLine);
        this.lifelinesLayer.appendChild(lg);
        this.lifelineDom[pid] = { group: lg, guideLine, activeLine, accent };

        // Sticky Top Header Card
        const hg = svgEl("g", { class: "seq-header-card" });
        const bg = svgEl("rect", {
          x: -this.cardW / 2,
          y: 11,
          width: this.cardW,
          height: this.cardH,
          rx: 12,
          class: "hdr-bg",
          stroke: accent
        });
        const topBar = svgEl("rect", {
          x: -this.cardW / 2 + 14,
          y: 11,
          width: this.cardW - 28,
          height: 2.6,
          rx: 1.3,
          fill: accent
        });

        const kindTxt = svgEl("text", {
          x: 0,
          y: 28,
          "text-anchor": "middle",
          fill: accent,
          "font-family": "JetBrains Mono, Consolas, monospace",
          "font-size": "9.2",
          "font-weight": "700"
        });
        kindTxt.textContent = (p.runtime_kind === "Actor" ? "👤 ACTOR" : p.runtime_kind).toUpperCase();

        const nameTxt = svgEl("text", {
          x: 0,
          y: 46,
          "text-anchor": "middle",
          fill: "#f8fafc",
          "font-family": "Inter, system-ui, sans-serif",
          "font-size": "12.5",
          "font-weight": "700"
        });
        nameTxt.textContent = truncate(p.name, 23);

        const pkgTxt = svgEl("text", {
          x: 0,
          y: 62,
          "text-anchor": "middle",
          fill: "#94a3b8",
          "font-family": "JetBrains Mono, Consolas, monospace",
          "font-size": "9.5"
        });
        pkgTxt.textContent = truncate(p.package_name, 26);

        hg.appendChild(bg);
        hg.appendChild(topBar);
        hg.appendChild(kindTxt);
        hg.appendChild(nameTxt);
        hg.appendChild(pkgTxt);

        hg.addEventListener("click", (e) => {
          e.stopPropagation();
          this.focusParticipant(pid);
          this.onSelectParticipant(pid);
        });

        this.headerWorldG.appendChild(hg);
        this.headerDom[pid] = { group: hg, bg, accent };
      });

      // 2. Build UML Loop Frames
      (doc.loops || []).forEach((lp) => {
        const g = svgEl("g", { class: "seq-loop-frame" });
        const col = lp.color || "#38bdf8";
        const rect = svgEl("rect", {
          x: 60,
          y: this.firstRowY + (lp.start_step - 1) * this.rowSpacing - 38,
          width: 600,
          height: (lp.end_step - lp.start_step + 1) * this.rowSpacing + 68,
          rx: 12,
          fill: "rgba(15, 23, 42, 0.24)",
          stroke: col,
          "stroke-width": 1.4,
          "stroke-dasharray": "8 5"
        });
        const tab = svgEl("rect", {
          x: 60,
          y: this.firstRowY + (lp.start_step - 1) * this.rowSpacing - 38,
          width: 56,
          height: 21,
          rx: 5,
          fill: col
        });
        const tabTxt = svgEl("text", {
          x: 88,
          y: this.firstRowY + (lp.start_step - 1) * this.rowSpacing - 24,
          "text-anchor": "middle",
          fill: "#060911",
          "font-family": "JetBrains Mono, Consolas, monospace",
          "font-size": "10",
          "font-weight": "800"
        });
        tabTxt.textContent = "LOOP";

        const condTxt = svgEl("text", {
          x: 128,
          y: this.firstRowY + (lp.start_step - 1) * this.rowSpacing - 23,
          fill: "#e2e8f0",
          "font-family": "JetBrains Mono, Consolas, monospace",
          "font-size": "10.8",
          "font-weight": "600"
        });
        condTxt.textContent = `[${lp.label}]`;

        g.appendChild(rect);
        g.appendChild(tab);
        g.appendChild(tabTxt);
        g.appendChild(condTxt);
        this.loopsLayer.appendChild(g);
        this.loopDom.push({ cfg: lp, group: g, rect, tab, tabTxt, condTxt });
      });

      // 3. Build Chronological Sequence Event Rows
      doc.events.forEach((ev, idx) => {
        const rowY = this.firstRowY + idx * this.rowSpacing;
        const style = COMM_STYLES[ev.comm_kind] || COMM_STYLES.topic;

        const g = svgEl("g", { class: "seq-event-row", "data-idx": idx });

        // Sender & Receiver UML Activation Bars
        const senderAct = svgEl("rect", {
          x: -5,
          y: rowY - 18,
          width: 10,
          height: 36,
          rx: 4,
          fill: style.color,
          opacity: "0.25"
        });
        const receiverAct = svgEl("rect", {
          x: -5,
          y: rowY - 18,
          width: 10,
          height: 36,
          rx: 4,
          fill: style.color,
          opacity: "0.25"
        });
        this.activationsLayer.appendChild(senderAct);
        this.activationsLayer.appendChild(receiverAct);

        const hitPath = svgEl("path", { class: "seq-event-hit" });
        const underLine = svgEl("path", {
          fill: "none",
          stroke: style.color,
          "stroke-width": 1.1,
          "stroke-dasharray": "4 4",
          opacity: style.doubleLine ? "0.45" : "0"
        });
        const mainLine = svgEl("path", {
          class: "seq-arrow-line",
          fill: "none",
          stroke: style.color,
          "stroke-width": style.doubleLine ? 2.8 : 2.2,
          "stroke-linecap": "round"
        });
        if (style.dash !== "none") {
          mainLine.setAttribute("stroke-dasharray", style.dash);
        }

        const arrowHead = svgEl("polygon", { fill: style.color });

        // Label Pill above arrow
        const labelGroup = svgEl("g");
        const labelTextStr = truncate(ev.interface_name, 42);
        const badgeW = style.short.length * 6.4 + 12;
        const textW = labelTextStr.length * 6.6 + 22;
        const totalPillW = Math.max(168, badgeW + textW + 10);

        const labelBg = svgEl("rect", {
          x: -totalPillW / 2,
          y: -31,
          width: totalPillW,
          height: 23,
          rx: 7,
          class: "seq-label-bg",
          fill: "rgba(10, 15, 26, 0.94)",
          stroke: style.color,
          "stroke-width": 1.1
        });
        const kindBadgeRect = svgEl("rect", {
          x: -totalPillW / 2 + 4,
          y: -27.5,
          width: badgeW,
          height: 16,
          rx: 4,
          fill: style.color,
          opacity: "0.2"
        });
        const kindBadgeTxt = svgEl("text", {
          x: -totalPillW / 2 + 4 + badgeW / 2,
          y: -16,
          "text-anchor": "middle",
          fill: style.color,
          "font-family": "JetBrains Mono, Consolas, monospace",
          "font-size": "8.8",
          "font-weight": "700"
        });
        kindBadgeTxt.textContent = style.short;

        const ifaceTxt = svgEl("text", {
          x: -totalPillW / 2 + badgeW + 11,
          y: -15.5,
          fill: "#f1f5f9",
          "font-family": "JetBrains Mono, Consolas, monospace",
          "font-size": "10.6",
          "font-weight": "600"
        });
        ifaceTxt.textContent = labelTextStr;

        // Result / subtitle caption right under arrow (shown when active or selected)
        const subResultTxt = svgEl("text", {
          x: 0,
          y: 18,
          "text-anchor": "middle",
          fill: "#94a3b8",
          "font-family": "Inter, system-ui, sans-serif",
          "font-size": "10.8",
          "font-weight": "500",
          opacity: "0"
        });
        subResultTxt.textContent = truncate(ev.result_note || ev.title, 62);

        labelGroup.appendChild(labelBg);
        labelGroup.appendChild(kindBadgeRect);
        labelGroup.appendChild(kindBadgeTxt);
        labelGroup.appendChild(ifaceTxt);
        labelGroup.appendChild(subResultTxt);

        // Numbered Event Badge at Sender Origin (1..N)
        const numGroup = svgEl("g");
        const numCircle = svgEl("circle", {
          r: 12,
          fill: "#0b101d",
          stroke: style.color,
          "stroke-width": 2
        });
        const numTxt = svgEl("text", {
          x: 0,
          y: 4,
          "text-anchor": "middle",
          fill: "#ffffff",
          "font-family": "JetBrains Mono, Consolas, monospace",
          "font-size": "10.5",
          "font-weight": "700"
        });
        numTxt.textContent = String(ev.step_num);
        numGroup.appendChild(numCircle);
        numGroup.appendChild(numTxt);

        g.appendChild(hitPath);
        g.appendChild(underLine);
        g.appendChild(mainLine);
        g.appendChild(arrowHead);
        g.appendChild(labelGroup);
        g.appendChild(numGroup);

        g.addEventListener("click", (e) => {
          e.stopPropagation();
          this.selectEvent(idx);
          this.onSelectEvent(idx, ev);
        });

        this.eventsLayer.appendChild(g);
        this.eventDom.push({
          ev,
          idx,
          rowY,
          style,
          group: g,
          hitPath,
          underLine,
          mainLine,
          arrowHead,
          labelGroup,
          subResultTxt,
          numGroup,
          numCircle,
          numTxt,
          senderAct,
          receiverAct
        });
      });

      // Create reusable glowing packet pool (2 packets for active arrow)
      this.packetPool = [0, 1].map(() => {
        const pkt = svgEl("circle", {
          r: 5.8,
          fill: "#ffffff",
          stroke: "#38bdf8",
          "stroke-width": 2.6,
          filter: "url(#seqPacketGlow)",
          opacity: "0",
          style: "pointer-events: none;"
        });
        this.packetsLayer.appendChild(pkt);
        return pkt;
      });

      this._recomputeLayoutTargets(true);
      this.fitActiveView(true);
    }

    setActiveEvent(idx, progress = 0) {
      if (!this.doc) return;
      const clamped = Math.max(0, Math.min(idx, this.doc.events.length - 1));
      const changed = clamped !== this.activeIdx;
      this.activeIdx = clamped;
      this.eventProgress = Math.max(0, Math.min(1, progress));

      if (changed) {
        this._recomputeLayoutTargets(false);
        if (this.autoCamera) {
          this._computeAutoCameraTarget();
        }
      }
    }

    setProgressiveMode(enabled) {
      this.progressiveMode = Boolean(enabled);
      this._recomputeLayoutTargets(false);
      if (this.autoCamera) {
        this._computeAutoCameraTarget();
      } else {
        this.fitFullDiagram();
      }
    }

    setAutoCamera(enabled) {
      this.autoCamera = Boolean(enabled);
      this.onAutoCameraChanged(this.autoCamera);
      if (this.autoCamera) {
        this._computeAutoCameraTarget();
      }
    }

    focusParticipant(pid) {
      this.focusedParticipantId = pid;
      this.selectedEventIdx = null;
    }

    selectEvent(idx) {
      this.selectedEventIdx = idx;
      this.focusedParticipantId = null;
    }

    clearFocus() {
      this.focusedParticipantId = null;
      this.selectedEventIdx = null;
    }

    _recomputeLayoutTargets(snapImmediately = false) {
      if (!this.doc) return;

      this.revealedSet = new Set();
      if (!this.progressiveMode) {
        this.doc.participant_order.forEach((pid) => this.revealedSet.add(pid));
      } else {
        for (let i = 0; i <= this.activeIdx; i++) {
          const ev = this.doc.events[i];
          this.revealedSet.add(ev.from);
          this.revealedSet.add(ev.to);
          (ev.also_reveal || []).forEach((extra) => this.revealedSet.add(extra));
        }
      }

      // Assign contiguous column indices to revealed participants so the diagram
      // expands smoothly left-to-right without huge empty gaps!
      let visCol = 0;
      this.doc.participant_order.forEach((pid) => {
        if (this.revealedSet.has(pid)) {
          const tx = this.leftMargin + visCol * this.colSpacing;
          this.targetParticipantX[pid] = tx;
          if (snapImmediately || this.participantX[pid] === undefined) {
            this.participantX[pid] = tx;
          }
          visCol++;
        }
      });
    }

    _computeAutoCameraTarget() {
      if (!this.doc || !this.doc.events.length) return;
      const rect = this.viewportEl.getBoundingClientRect();
      const vw = Math.max(640, rect.width || 1180);
      const vh = Math.max(420, rect.height || 560);

      const ev = this.doc.events[this.activeIdx];
      const x1 = this.targetParticipantX[ev.from] || 200;
      const x2 = this.targetParticipantX[ev.to] || x1 + 240;

      const minX = Math.min(x1, x2) - 185;
      const maxX = Math.max(x1, x2) + 185;
      const neededW = Math.max(780, maxX - minX);

      const zoom = Math.max(0.54, Math.min(1.0, (vw * 0.9) / neededW));
      const midX = (x1 + x2) / 2;
      const rowY = this.firstRowY + this.activeIdx * this.rowSpacing;

      const usableH = vh - this.headerBandH;
      const targetScreenY = this.headerBandH + usableH * 0.56;

      this.targetCamZoom = zoom;
      this.targetCamX = vw / 2 - midX * zoom;
      this.targetCamY = Math.min(20, targetScreenY - rowY * zoom);
    }

    fitActiveView(snap = false) {
      this._computeAutoCameraTarget();
      if (snap) {
        this.camX = this.targetCamX;
        this.camY = this.targetCamY;
        this.camZoom = this.targetCamZoom;
      }
    }

    fitFullDiagram() {
      if (!this.doc) return;
      const rect = this.viewportEl.getBoundingClientRect();
      const vw = Math.max(640, rect.width || 1180);
      const vh = Math.max(420, rect.height || 560);

      const count = Math.max(2, this.revealedSet.size);
      const diagW = this.leftMargin * 2 + (count - 1) * this.colSpacing;
      const maxStep = this.progressiveMode ? this.activeIdx + 1 : this.doc.events.length;
      const diagH = this.firstRowY + maxStep * this.rowSpacing + 90;

      const zX = (vw * 0.94) / diagW;
      const zY = ((vh - this.headerBandH) * 0.9) / diagH;
      const zoom = Math.max(0.36, Math.min(0.98, Math.min(zX, zY)));

      this.targetCamZoom = zoom;
      this.targetCamX = (vw - diagW * zoom) / 2;
      this.targetCamY = this.headerBandH * (1 - zoom) + 8;
    }

    panBy(dx, dy) {
      this.setAutoCamera(false);
      this.targetCamX += dx;
      this.targetCamY += dy;
    }

    zoomBy(factor) {
      this.setAutoCamera(false);
      const rect = this.viewportEl.getBoundingClientRect();
      const cx = (rect.width || 1100) / 2;
      const cy = (rect.height || 560) / 2;
      const nextZoom = Math.max(0.35, Math.min(1.45, this.targetCamZoom * factor));
      const scaleChange = nextZoom / this.targetCamZoom;
      this.targetCamX = cx - (cx - this.targetCamX) * scaleChange;
      this.targetCamY = cy - (cy - this.targetCamY) * scaleChange;
      this.targetCamZoom = nextZoom;
    }

    _bindPanAndZoom() {
      let dragging = false;
      let startX = 0;
      let startY = 0;
      let moved = false;

      this.viewportEl.addEventListener("pointerdown", (e) => {
        if (e.target.closest(".seq-header-card") || e.target.closest(".seq-event-row")) {
          return;
        }
        dragging = true;
        moved = false;
        startX = e.clientX;
        startY = e.clientY;
        this.viewportEl.classList.add("is-dragging");
      });

      window.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (Math.hypot(dx, dy) > 4) {
          moved = true;
          if (this.autoCamera) this.setAutoCamera(false);
          this.targetCamX += dx;
          this.targetCamY += dy;
          this.camX = this.targetCamX;
          this.camY = this.targetCamY;
          startX = e.clientX;
          startY = e.clientY;
        }
      });

      window.addEventListener("pointerup", () => {
        if (!dragging) return;
        dragging = false;
        this.viewportEl.classList.remove("is-dragging");
        if (!moved) {
          this.clearFocus();
        }
      });

      this.viewportEl.addEventListener(
        "wheel",
        (e) => {
          e.preventDefault();
          if (e.ctrlKey || e.metaKey) {
            this.zoomBy(e.deltaY < 0 ? 1.12 : 0.89);
          } else {
            this.panBy(-e.deltaX * 0.9, -e.deltaY * 0.9);
          }
        },
        { passive: false }
      );
    }

    render(dt, isPlaying, eventProgress) {
      if (!this.doc) return;

      this.animClock += dt * (isPlaying ? 1.0 : 0.25);
      this.eventProgress = Math.max(0, Math.min(1, eventProgress));

      const rect = this.viewportEl.getBoundingClientRect();
      const vw = Math.max(320, rect.width || 1180);
      const vh = Math.max(300, rect.height || 560);
      this.svg.setAttribute("viewBox", `0 0 ${vw} ${vh}`);
      this.bodyClipRect.setAttribute("width", vw);
      this.bodyClipRect.setAttribute("height", vh);
      this.headerBackdrop.setAttribute("width", vw);
      this.headerDivider.setAttribute("x2", vw);

      // Spring-smooth camera & column interpolation
      const alpha = Math.min(1, dt * 8.5);
      this.camX += (this.targetCamX - this.camX) * alpha;
      this.camY += (this.targetCamY - this.camY) * alpha;
      this.camZoom += (this.targetCamZoom - this.camZoom) * alpha;

      for (const pid of this.doc.participant_order) {
        if (this.targetParticipantX[pid] !== undefined) {
          this.participantX[pid] += (this.targetParticipantX[pid] - this.participantX[pid]) * alpha;
        }
      }

      this.bodyWorldG.setAttribute(
        "transform",
        `translate(${this.camX.toFixed(1)}, ${this.camY.toFixed(1)}) scale(${this.camZoom.toFixed(4)})`
      );
      // Sticky top header tracks horizontal pan & zoom while staying pinned at y = 0!
      const headerScale = Math.max(0.62, Math.min(1.0, this.camZoom));
      this.headerWorldG.setAttribute("transform", `translate(0, 0)`);

      const currentEv = this.doc.events[this.activeIdx];
      const highlightIdx = this.selectedEventIdx !== null ? this.selectedEventIdx : this.activeIdx;
      const highlightEv = this.doc.events[highlightIdx] || currentEv;

      const activeReachY =
        this.firstRowY +
        (this.progressiveMode ? this.activeIdx : this.doc.events.length - 1) * this.rowSpacing +
        36;

      // 1. Update Participant Lifelines & Pinned Headers
      this.doc.participant_order.forEach((pid) => {
        const revealed = this.revealedSet.has(pid);
        const lDom = this.lifelineDom[pid];
        const hDom = this.headerDom[pid];
        if (!lDom || !hDom) return;

        const px = this.participantX[pid] || 0;
        lDom.group.setAttribute("transform", `translate(${px.toFixed(1)}, 0)`);
        lDom.activeLine.setAttribute("y2", activeReachY.toFixed(1));

        // Project world X into screen X for pinned header card
        const screenX = px * this.camZoom + this.camX;
        hDom.group.setAttribute(
          "transform",
          `translate(${screenX.toFixed(1)}, ${((1 - headerScale) * 14).toFixed(1)}) scale(${headerScale.toFixed(3)})`
        );

        let isProminent = pid === highlightEv.from || pid === highlightEv.to;
        if (this.focusedParticipantId) {
          isProminent = pid === this.focusedParticipantId;
        }

        const op = !revealed ? 0 : isProminent ? 1 : 0.42;
        lDom.group.style.opacity = String(op);
        lDom.group.style.pointerEvents = revealed ? "auto" : "none";
        hDom.group.style.opacity = String(op);
        hDom.group.style.pointerEvents = revealed ? "auto" : "none";
        hDom.group.classList.toggle("is-focused", isProminent && revealed);
      });

      // 2. Update UML Loop Frames
      this.loopDom.forEach((ld) => {
        const lp = ld.cfg;
        const loopReached = !this.progressiveMode || this.activeIdx + 1 >= lp.start_step;
        ld.group.style.opacity = loopReached ? "1" : "0";
        if (!loopReached) return;

        // Compute horizontal bounding box across visible events in this loop
        let minX = Infinity;
        let maxX = -Infinity;
        for (let s = lp.start_step - 1; s < lp.end_step && s < this.doc.events.length; s++) {
          if (this.progressiveMode && s > this.activeIdx) break;
          const e = this.doc.events[s];
          const a = this.participantX[e.from] || 0;
          const b = this.participantX[e.to] || 0;
          minX = Math.min(minX, a, b);
          maxX = Math.max(maxX, a, b);
        }
        if (!Number.isFinite(minX)) return;
        const padL = 78;
        const padR = 115;
        const x = minX - padL;
        const w = Math.max(340, maxX - minX + padL + padR);
        const visibleEndStep = this.progressiveMode
          ? Math.min(lp.end_step, this.activeIdx + 1)
          : lp.end_step;
        const h = (visibleEndStep - lp.start_step + 1) * this.rowSpacing + 64;

        const inLoopNow =
          highlightIdx + 1 >= lp.start_step && highlightIdx + 1 <= lp.end_step;
        ld.rect.setAttribute("x", x.toFixed(1));
        ld.rect.setAttribute("width", w.toFixed(1));
        ld.rect.setAttribute("height", h.toFixed(1));
        ld.rect.setAttribute("stroke-opacity", inLoopNow ? "0.85" : "0.35");
        ld.tab.setAttribute("x", x.toFixed(1));
        ld.tabTxt.setAttribute("x", (x + 28).toFixed(1));
        ld.condTxt.setAttribute("x", (x + 66).toFixed(1));
      });

      // 3. Update Chronological Arrows, Activation Bars & Packets
      let activePacketGeom = null;

      this.eventDom.forEach((ed) => {
        const idx = ed.idx;
        const ev = ed.ev;
        const visible = !this.progressiveMode || idx <= this.activeIdx;

        if (!visible) {
          ed.group.style.opacity = "0";
          ed.group.style.pointerEvents = "none";
          ed.senderAct.setAttribute("opacity", "0");
          ed.receiverAct.setAttribute("opacity", "0");
          return;
        }

        ed.group.style.pointerEvents = "auto";
        const x1 = this.participantX[ev.from] || 0;
        const x2 = this.participantX[ev.to] || 0;
        const y = ed.rowY;
        const isSelf = ev.from === ev.to;
        const isCurrent = idx === this.activeIdx;
        const isSelected = idx === this.selectedEventIdx;

        // Progressive arrow draw fraction when current event begins
        const drawFrac = isCurrent
          ? Math.min(1, Math.max(0.15, this.eventProgress * 5.2))
          : 1;

        ed.senderAct.setAttribute("x", (x1 - 5).toFixed(1));
        ed.receiverAct.setAttribute("x", (x2 - 5).toFixed(1));

        let rowOpacity = 0.56;
        let lineColor = ed.style.color;

        if (this.focusedParticipantId) {
          if (ev.to === this.focusedParticipantId) {
            rowOpacity = 1.0;
            lineColor = "#38bdf8"; // Incoming highlighted cyan
          } else if (ev.from === this.focusedParticipantId) {
            rowOpacity = 1.0;
            lineColor = "#fbbf24"; // Outgoing highlighted gold
          } else {
            rowOpacity = 0.16;
          }
        } else if (isSelected || isCurrent) {
          rowOpacity = 1.0;
        }

        ed.group.style.opacity = String(rowOpacity);
        ed.group.classList.toggle("is-selected", isSelected || isCurrent);
        ed.mainLine.setAttribute("stroke", lineColor);
        ed.arrowHead.setAttribute("fill", lineColor);
        ed.numCircle.setAttribute("stroke", lineColor);
        ed.numCircle.setAttribute("fill", isCurrent || isSelected ? lineColor : "#0b101d");
        ed.numTxt.setAttribute("fill", isCurrent || isSelected ? "#060911" : "#ffffff");

        ed.senderAct.setAttribute("opacity", isCurrent || isSelected ? "0.95" : "0.22");
        ed.receiverAct.setAttribute(
          "opacity",
          (isCurrent && drawFrac > 0.75) || isSelected ? "0.95" : "0.18"
        );
        ed.subResultTxt.setAttribute("opacity", isCurrent || isSelected ? "1" : "0");

        if (isSelf) {
          const loopW = 78 * drawFrac;
          const loopH = 26;
          const dSelf = `M ${x1.toFixed(1)} ${(y - 10).toFixed(1)} L ${(x1 + loopW).toFixed(1)} ${(y - 10).toFixed(1)} L ${(x1 + loopW).toFixed(1)} ${(y + loopH - 10).toFixed(1)} L ${(x1 + 8).toFixed(1)} ${(y + loopH - 10).toFixed(1)}`;
          ed.mainLine.setAttribute("d", dSelf);
          ed.hitPath.setAttribute("d", dSelf);
          ed.underLine.setAttribute("opacity", "0");

          const tipX = x1 + 6;
          const tipY = y + loopH - 10;
          ed.arrowHead.setAttribute(
            "points",
            `${tipX},${tipY} ${tipX + 9},${tipY - 5} ${tipX + 9},${tipY + 5}`
          );
          ed.numGroup.setAttribute("transform", `translate(${x1.toFixed(1)}, ${(y - 10).toFixed(1)})`);
          ed.labelGroup.setAttribute(
            "transform",
            `translate(${(x1 + 135).toFixed(1)}, ${(y - 2).toFixed(1)})`
          );

          if (idx === highlightIdx) {
            activePacketGeom = { isSelf: true, x1, y, loopW: 78, loopH, color: lineColor };
          }
        } else {
          const dir = x2 >= x1 ? 1 : -1;
          const startX = x1 + dir * 14;
          const fullEndX = x2 - dir * 10;
          const curEndX = startX + (fullEndX - startX) * drawFrac;

          const dLine = `M ${startX.toFixed(1)} ${y.toFixed(1)} L ${curEndX.toFixed(1)} ${y.toFixed(1)}`;
          ed.mainLine.setAttribute("d", dLine);
          ed.hitPath.setAttribute("d", `M ${x1.toFixed(1)} ${y.toFixed(1)} L ${x2.toFixed(1)} ${y.toFixed(1)}`);

          if (ed.style.doubleLine) {
            ed.underLine.setAttribute(
              "d",
              `M ${startX.toFixed(1)} ${(y + 5).toFixed(1)} L ${curEndX.toFixed(1)} ${(y + 5).toFixed(1)}`
            );
            ed.underLine.setAttribute("opacity", "0.55");
          } else {
            ed.underLine.setAttribute("opacity", "0");
          }

          ed.arrowHead.setAttribute(
            "points",
            `${curEndX.toFixed(1)},${y.toFixed(1)} ${(curEndX - dir * 10).toFixed(1)},${(y - 5.2).toFixed(1)} ${(curEndX - dir * 10).toFixed(1)},${(y + 5.2).toFixed(1)}`
          );

          ed.numGroup.setAttribute("transform", `translate(${x1.toFixed(1)}, ${y.toFixed(1)})`);
          const midX = (x1 + x2) / 2;
          ed.labelGroup.setAttribute("transform", `translate(${midX.toFixed(1)}, ${y.toFixed(1)})`);

          if (idx === highlightIdx) {
            activePacketGeom = { isSelf: false, startX, endX: fullEndX, y, color: lineColor };
          }
        }
      });

      // 4. Animate Traveling Data Packets along the Active / Highlighted Communication Arrow
      if (activePacketGeom) {
        this.packetPool.forEach((pkt, pIdx) => {
          const u = (this.animClock * 0.72 + pIdx * 0.5) % 1;
          pkt.setAttribute("stroke", activePacketGeom.color);
          if (activePacketGeom.isSelf) {
            const { x1, y, loopW, loopH } = activePacketGeom;
            let px = x1;
            let py = y - 10;
            if (u < 0.4) {
              px = x1 + (u / 0.4) * loopW;
              py = y - 10;
            } else if (u < 0.6) {
              px = x1 + loopW;
              py = y - 10 + ((u - 0.4) / 0.2) * loopH;
            } else {
              px = x1 + loopW - ((u - 0.6) / 0.4) * (loopW - 8);
              py = y - 10 + loopH;
            }
            pkt.setAttribute("cx", px.toFixed(1));
            pkt.setAttribute("cy", py.toFixed(1));
          } else {
            const px =
              activePacketGeom.startX + (activePacketGeom.endX - activePacketGeom.startX) * u;
            pkt.setAttribute("cx", px.toFixed(1));
            pkt.setAttribute("cy", activePacketGeom.y.toFixed(1));
          }
          pkt.setAttribute("opacity", (0.3 + 0.7 * Math.sin(u * Math.PI)).toFixed(2));
        });
      } else {
        this.packetPool.forEach((pkt) => pkt.setAttribute("opacity", "0"));
      }
    }
  }

  SequenceEngine.COMM_STYLES = COMM_STYLES;
  window.RoarSequenceEngine = SequenceEngine;
})();
