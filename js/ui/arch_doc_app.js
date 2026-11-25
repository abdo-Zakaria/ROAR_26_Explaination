/**
 * Architecture Documentary & Interactive Sequence Diagram Controller
 *
 * Powers the "INSIDE ASU ROAR — SYSTEM ARCHITECTURE" homepage section:
 *  - Featured 5-7 min Main Documentary + 4 Deep-Dive Architecture Videos (3-5 min each)
 *  - Progressive animated UML sequence diagram synchronized with en-US-AndrewNeural MP3s
 *  - Independent interactive exploration: participant incoming/outgoing flow tracing,
 *    event inspection (topic/service/action/TF/launch/callback), single-event replay,
 *    and verbatim source-code inspection.
 */
(function () {
  function formatTime(sec) {
    const total = Math.max(0, Math.round(sec || 0));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatTechCaptions(raw) {
    const escaped = escapeHtml(raw);
    const pat =
      /(\(\s*0(?:\.0)?\s*,\s*0(?:\.0)?\s*\)|\{5(?:\.\.|,6,7,8,)9\}|0\.003·Z²|(?:\/[A-Za-z0-9_\/.*]+)|\b(?:ASU ROAR|ROS 2|Nav2|D\* Lite|DStarPlanner|MPPIController|MPPI|IESKFNode|IESKF|ZuptDetector|ZUPT|WO-FIS|VO-FIS|WIO|WVO|TF2|TF|QoS|RANSAC|DBSCAN|PCA|EMA|SOR\/ROR|SOR|ROR|SolvePnP|ZED2i|BNO055|ERC|KILL|TIMEOUT|STATUS_SUCCEEDED|TRANSIENT_LOCAL|BEST_EFFORT|TwistStamped|PoseStamped|PointCloud2|NavigateToPose|ComputePathToPose|FollowPath|SimpleGoalChecker|SimpleProgressChecker|ScoreCalculator|WaypointTracker|CriticalRuleEnforcer|d_edge|k_Q|k_V|SIGINT|[A-Za-z0-9_]+\.(?:py|cpp|hpp|yaml|npy|npz|sh|html|launch\.py))\b|(?:\d+(?:\.\d+)?\s*(?:Hz|m\/s)))/g;
    return escaped.replace(pat, '<span class="ltr-term">$1</span>');
  }

  const ICONS = {
    play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg>`,
    pause: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z"/></svg>`,
    volOn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
    volMute: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`
  };

  class ArchDocApp {
    constructor(archData) {
      this.data = archData;
      this.docsById = {};
      (archData.documentaries || []).forEach((d) => {
        this.docsById[d.id] = d;
      });

      // Merge architecture code snippets into global ROAR_COURSE_DATA so PopoverController View Source works seamlessly
      if (window.ROAR_COURSE_DATA && window.ROAR_COURSE_DATA.snippets && archData.snippets) {
        Object.assign(window.ROAR_COURSE_DATA.snippets, archData.snippets);
      }

      this.currentDoc = null;
      this.eventIndex = 0;
      this.eventOffsets = [];
      this.totalDuration = 1;
      this.hasStartedCurrent = false;
      this.captionsEnabled = true;
      this.singleEventReplayOnly = false;
      this.isScrubbing = false;

      this._cacheDom();
      this._initEngines();
      this._renderSelectorCards();
      this._bindControls();

      // Load Main Documentary initially (or deep-linked ?doc=...&step=...)
      const params = new URLSearchParams(window.location.search);
      const reqDoc = params.get("doc");
      const firstDoc = (reqDoc && this.docsById[reqDoc]) ? this.docsById[reqDoc] : archData.documentaries[0];
      if (firstDoc) {
        this.loadDocumentary(firstDoc.id, false);
      }

      if (params.has("doc") || params.has("step")) {
        const reqStep = parseInt(params.get("step") || "1", 10);
        const stepIdx = Math.max(0, Math.min((this.currentDoc ? this.currentDoc.events.length : 1) - 1, reqStep - 1));
        this.hasStartedCurrent = true;
        if (params.get("full") === "1") {
          this.seqEngine.setProgressiveMode(false);
          this.progressiveBtn.classList.remove("is-active");
          this.progressiveBtn.textContent = "Full Diagram";
        }
        this._applyEvent(stepIdx, false, 1.5);
        this.seqEngine.fitActiveView(true);

        const insp = params.get("inspect") || "";
        if (insp === "event" && this.currentDoc) {
          this.seqEngine.selectEvent(stepIdx);
          this._showEventInspector(stepIdx, this.currentDoc.events[stepIdx]);
        } else if (insp.startsWith("participant:")) {
          const pid = insp.split(":")[1];
          if (this.data.participants[pid]) {
            this.seqEngine.focusParticipant(pid);
            this._showParticipantInspector(pid);
          }
        }
        if (params.get("scroll") === "arch") {
          setTimeout(() => this.sectionEl.scrollIntoView({ behavior: "instant", block: "start" }), 50);
        }
      }

      this._lastTs = performance.now();
      requestAnimationFrame((ts) => this._renderLoop(ts));
    }

    _cacheDom() {
      this.sectionEl = document.getElementById("architectureSection");
      this.selectorHost = document.getElementById("archVideoSelector");
      this.playerFrame = document.getElementById("seqPlayerFrame");
      this.viewportEl = document.getElementById("seqViewport");
      this.svgEl = document.getElementById("seqSvg");

      this.stageNumEl = document.getElementById("seqStageNum");
      this.stageTitleEl = document.getElementById("seqStageTitle");
      this.eventSummaryEl = document.getElementById("seqEventSummary");
      this.progressiveBtn = document.getElementById("seqProgressiveBtn");
      this.autoCamBtn = document.getElementById("seqAutoCamBtn");
      this.voiceLabelEl = document.getElementById("seqVoiceLabel");

      this.playOverlay = document.getElementById("seqPlayOverlay");
      this.playOverlayLabel = document.getElementById("seqPlayOverlayLabel");
      this.playOverlaySub = document.getElementById("seqPlayOverlaySub");

      this.inspectorCard = document.getElementById("seqInspectorCard");
      this.captionContainer = document.getElementById("seqCaptionContainer");
      this.captionBox = document.getElementById("seqCaptionBox");

      this.timelineWrap = document.getElementById("seqTimelineWrap");
      this.timelineFill = document.getElementById("seqTimelineFill");
      this.timelineMarkers = document.getElementById("seqTimelineMarkers");
      this.timelineThumb = document.getElementById("seqTimelineThumb");
      this.timelineTooltip = document.getElementById("seqTimelineTooltip");

      this.playBtn = document.getElementById("seqPlayBtn");
      this.restartBtn = document.getElementById("seqRestartBtn");
      this.prevBtn = document.getElementById("seqPrevBtn");
      this.nextBtn = document.getElementById("seqNextBtn");
      this.timeReadout = document.getElementById("seqTimeReadout");
      this.stageSelect = document.getElementById("seqStageSelect");
      this.speedSelect = document.getElementById("seqSpeedSelect");
      this.muteBtn = document.getElementById("seqMuteBtn");
      this.captionsBtn = document.getElementById("seqCaptionsBtn");
    }

    _initEngines() {
      this.seqEngine = new window.RoarSequenceEngine(this.viewportEl, this.svgEl, this.data, {
        onSelectParticipant: (pid) => {
          this.hasStartedCurrent = true;
          this.pause();
          this._showParticipantInspector(pid);
        },
        onSelectEvent: (idx, ev) => {
          this.hasStartedCurrent = true;
          this.pause();
          this._showEventInspector(idx, ev);
        },
        onAutoCameraChanged: (enabled) => {
          this.autoCamBtn.classList.toggle("is-active", enabled);
          this.autoCamBtn.textContent = enabled ? "Auto-Cam: ON" : "Auto-Cam: OFF";
        }
      });

      this.audio = new window.RoarAudioEngine({
        onProgress: (elapsed, dur) => {
          this._onEventProgress(elapsed, dur);
        },
        onSceneEnded: () => {
          this._handleEventFinished();
        },
        onModeChange: (label) => {
          this.voiceLabelEl.textContent = label;
        }
      });
    }

    _renderSelectorCards() {
      this.selectorHost.innerHTML = (this.data.documentaries || [])
        .map(
          (doc) => `
          <button
            class="arch-doc-card ${doc.is_featured ? "featured" : ""}"
            data-doc-id="${escapeHtml(doc.id)}"
            type="button"
          >
            <div class="arch-card-top">
              <span class="arch-card-code">${escapeHtml(doc.code)}</span>
              <span class="arch-card-dur">${formatTime(doc.duration_sec)}</span>
            </div>
            <div class="arch-card-title">${escapeHtml(doc.title)}</div>
            <div class="arch-card-meta">
              <span>${doc.events.length} sequence events</span>
              <span>${doc.participant_order.length} lifelines</span>
            </div>
          </button>
        `
        )
        .join("");

      this.selectorHost.querySelectorAll(".arch-doc-card").forEach((btn) => {
        btn.addEventListener("click", () => {
          const docId = btn.getAttribute("data-doc-id");
          this.loadDocumentary(docId, true);
          this.playerFrame.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
      });
    }

    loadDocumentary(docId, autoPlay = false) {
      const doc = this.docsById[docId];
      if (!doc) return;

      this.hideInspector();
      this.currentDoc = doc;
      this.eventIndex = 0;
      this.singleEventReplayOnly = false;
      this.hasStartedCurrent = Boolean(autoPlay);

      // Compute cumulative event offsets
      this.eventOffsets = [];
      let acc = 0;
      for (const ev of doc.events) {
        this.eventOffsets.push(acc);
        acc += ev.duration_sec || 15;
      }
      this.totalDuration = Math.max(1, acc);

      // Populate Stage Jump selector
      this.stageSelect.innerHTML = (doc.stages || [])
        .map((st) => `<option value="${escapeHtml(st.id)}">Stage ${escapeHtml(st.number)} · ${escapeHtml(st.title)}</option>`)
        .join("");

      // Render stage boundary markers on timeline
      this._renderStageMarkers(doc);

      // Highlight active card
      this.selectorHost.querySelectorAll(".arch-doc-card").forEach((el) => {
        el.classList.toggle("is-active", el.getAttribute("data-doc-id") === doc.id);
      });

      this.playOverlayLabel.textContent = `▶ Watch ${doc.is_featured ? "Main Architecture Documentary" : doc.code} · ${formatTime(doc.duration_sec)}`;
      this.playOverlaySub.textContent = `${doc.events.length} Chronological Execution Events · ${doc.participant_order.length} Runtime Lifelines`;

      this.seqEngine.setProgressiveMode(true);
      this.progressiveBtn.classList.add("is-active");
      this.progressiveBtn.textContent = "Progressive Reveal";
      this.seqEngine.setAutoCamera(true);

      this.seqEngine.loadDocumentary(doc);
      this._applyEvent(0, autoPlay, 0);
    }

    _renderStageMarkers(doc) {
      this.timelineMarkers.innerHTML = "";
      let prevStage = doc.events[0] ? doc.events[0].stage_id : null;
      doc.events.forEach((ev, i) => {
        if (i > 0 && ev.stage_id !== prevStage) {
          prevStage = ev.stage_id;
          const pct = (this.eventOffsets[i] / this.totalDuration) * 100;
          const tick = document.createElement("div");
          tick.className = "timeline-divider";
          tick.style.left = `${pct.toFixed(2)}%`;
          this.timelineMarkers.appendChild(tick);
        }
      });
    }

    _applyEvent(idx, autoPlay = false, startOffsetSec = 0) {
      if (!this.currentDoc) return;
      const events = this.currentDoc.events;
      const clamped = Math.max(0, Math.min(idx, events.length - 1));
      this.eventIndex = clamped;
      const ev = events[clamped];

      const stageObj =
        (this.currentDoc.stages || []).find((s) => s.id === ev.stage_id) ||
        { number: "01", title: "Execution" };

      this.stageNumEl.textContent = `STAGE ${stageObj.number}`;
      this.stageTitleEl.textContent = stageObj.title;
      this.eventSummaryEl.textContent = `#${ev.step_num} · ${ev.title}`;
      this.stageSelect.value = ev.stage_id;

      this.prevBtn.style.opacity = clamped > 0 ? "1" : "0.4";
      this.nextBtn.style.opacity = clamped < events.length - 1 ? "1" : "0.4";

      this.seqEngine.setActiveEvent(clamped, startOffsetSec / Math.max(1, ev.duration_sec || 15));

      if (autoPlay && window.roarApp && window.roarApp.audio && window.roarApp.audio.isPlaying) {
        window.roarApp.pause();
      }
      this.audio.loadScene(ev, autoPlay, startOffsetSec);
      this._syncPlayUi();
    }

    _onEventProgress(elapsed, dur) {
      if (!this.currentDoc) return;
      const ev = this.currentDoc.events[this.eventIndex];
      if (!ev) return;

      const prog = dur > 0 ? elapsed / dur : 0;
      this.seqEngine.setActiveEvent(this.eventIndex, prog);

      // Update 1-2 line English captions
      const lines = ev.captions || [];
      const split = ev.caption_split_sec || dur * 0.5;
      if (!lines.length) {
        this.captionBox.innerHTML = "";
      } else if (lines.length === 1 || elapsed < split) {
        this.captionBox.innerHTML = `<div class="caption-line">${formatTechCaptions(lines[0])}</div>`;
      } else {
        this.captionBox.innerHTML = `
          <div class="caption-line secondary">${formatTechCaptions(lines[0])}</div>
          <div class="caption-line">${formatTechCaptions(lines[1])}</div>
        `;
      }

      const globalSec = Math.min(this.totalDuration, (this.eventOffsets[this.eventIndex] || 0) + elapsed);
      const pct = Math.max(0, Math.min(100, (globalSec / this.totalDuration) * 100));
      this.timelineFill.style.width = `${pct.toFixed(2)}%`;
      this.timelineThumb.style.left = `${pct.toFixed(2)}%`;
      this.timeReadout.textContent = `${formatTime(globalSec)} / ${formatTime(this.totalDuration)}`;
    }

    _handleEventFinished() {
      if (!this.currentDoc) return;
      if (this.singleEventReplayOnly) {
        this.singleEventReplayOnly = false;
        this._syncPlayUi();
        return;
      }
      if (this.eventIndex < this.currentDoc.events.length - 1) {
        this._applyEvent(this.eventIndex + 1, true, 0);
      } else {
        this._syncPlayUi();
      }
    }

    play() {
      if (window.roarApp && window.roarApp.audio && window.roarApp.audio.isPlaying) {
        window.roarApp.pause();
      }
      this.hasStartedCurrent = true;
      this.hideInspector();
      this.seqEngine.setAutoCamera(true);
      this.audio.play();
      this._syncPlayUi();
    }

    pause() {
      this.audio.pause();
      this._syncPlayUi();
    }

    togglePlay() {
      if (this.audio.isPlaying) this.pause();
      else this.play();
    }

    restart() {
      this.singleEventReplayOnly = false;
      this.hasStartedCurrent = true;
      this.hideInspector();
      this.seqEngine.setAutoCamera(true);
      this._applyEvent(0, true, 0);
    }

    prevEvent() {
      if (!this.currentDoc) return;
      this.singleEventReplayOnly = false;
      this.hideInspector();
      const target = Math.max(0, this.eventIndex - 1);
      this._applyEvent(target, this.audio.isPlaying, 0);
    }

    nextEvent() {
      if (!this.currentDoc) return;
      this.singleEventReplayOnly = false;
      this.hideInspector();
      const target = Math.min(this.currentDoc.events.length - 1, this.eventIndex + 1);
      this._applyEvent(target, this.audio.isPlaying, 0);
    }

    seekGlobalSeconds(sec) {
      if (!this.currentDoc) return;
      this.singleEventReplayOnly = false;
      const clamped = Math.max(0, Math.min(sec, this.totalDuration - 0.02));
      let idx = 0;
      for (let i = 0; i < this.eventOffsets.length; i++) {
        if (clamped >= this.eventOffsets[i]) idx = i;
        else break;
      }
      const localSec = clamped - this.eventOffsets[idx];
      this.hasStartedCurrent = true;
      if (idx !== this.eventIndex) {
        this._applyEvent(idx, this.audio.isPlaying, localSec);
      } else {
        this.audio.seekWithinScene(localSec);
      }
      this._syncPlayUi();
    }

    _syncPlayUi() {
      const playing = this.audio.isPlaying;
      this.playerFrame.classList.toggle("is-playing", playing);
      this.playBtn.innerHTML = playing ? ICONS.pause : ICONS.play;
      this.playOverlay.hidden = playing || this.hasStartedCurrent;
    }

    _openSourceModal(title, snippetKey) {
      if (window.roarApp && window.roarApp.popover) {
        window.roarApp.popover.openSourceSnippet(title, snippetKey);
      }
    }

    _showParticipantInspector(pid) {
      const p = this.data.participants[pid];
      if (!p || !this.currentDoc) return;

      const flows = [];
      this.currentDoc.events.forEach((ev, idx) => {
        if (ev.to === pid && ev.from !== pid) {
          const sender = this.data.participants[ev.from];
          flows.push({
            dir: "in",
            idx,
            text: `#${ev.step_num} ← ${sender ? sender.name : ev.from}: ${ev.interface_name}`
          });
        } else if (ev.from === pid) {
          const recv = this.data.participants[ev.to];
          flows.push({
            dir: "out",
            idx,
            text: `#${ev.step_num} → ${ev.to === pid ? "self" : recv ? recv.name : ev.to}: ${ev.interface_name}`
          });
        }
      });

      this.inspectorCard.innerHTML = `
        <div class="popover-head">
          <div>
            <div class="insp-badges">
              <span class="insp-kind-pill" style="color: #38bdf8;">${escapeHtml(p.runtime_kind)}</span>
              <span class="insp-verified-pill">✓ VERIFIED</span>
            </div>
            <div class="popover-title">${escapeHtml(p.name)}</div>
          </div>
          <button class="popover-close" id="seqInspCloseBtn" type="button" aria-label="Close">✕</button>
        </div>
        <p class="popover-desc">${escapeHtml(p.one_sentence)}</p>
        <div class="popover-meta">
          <div class="popover-meta-row">
            <span class="popover-meta-key">Package</span>
            <span class="popover-meta-val">${escapeHtml(p.package_name)}</span>
          </div>
          <div class="popover-meta-row">
            <span class="popover-meta-key">Executable</span>
            <span class="popover-meta-val">${escapeHtml(p.executable)}</span>
          </div>
          <div class="popover-meta-row">
            <span class="popover-meta-key">Source</span>
            <span class="popover-meta-val">${escapeHtml(p.source_file.split("/").slice(-2).join("/"))}:${escapeHtml(p.lines)}</span>
          </div>
        </div>
        <div class="popover-kicker">Incoming (Cyan) &amp; Outgoing (Gold) Flows</div>
        <div class="insp-flow-list">
          ${flows
            .map(
              (f) => `
              <button class="insp-flow-chip" data-jump-idx="${f.idx}" type="button">
                <span class="insp-flow-dir ${f.dir}">${f.dir === "in" ? "IN" : "OUT"}</span>
                <span class="insp-flow-label">${escapeHtml(f.text)}</span>
              </button>
            `
            )
            .join("")}
        </div>
        <div class="popover-actions">
          <button class="view-source-btn" id="seqInspSrcBtn" type="button">&lt;/&gt; View Source</button>
          <button class="resume-play-btn" id="seqInspResumeBtn" type="button">▶ Resume</button>
        </div>
      `;

      this.inspectorCard.hidden = false;

      document.getElementById("seqInspCloseBtn").onclick = () => this.hideInspector();
      document.getElementById("seqInspSrcBtn").onclick = () =>
        this._openSourceModal(p.name, p.snippet_key);
      document.getElementById("seqInspResumeBtn").onclick = () => this.play();

      this.inspectorCard.querySelectorAll(".insp-flow-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          const jumpIdx = parseInt(chip.getAttribute("data-jump-idx"), 10);
          if (!Number.isNaN(jumpIdx)) {
            this._applyEvent(jumpIdx, false, 0);
            this.seqEngine.selectEvent(jumpIdx);
            this._showEventInspector(jumpIdx, this.currentDoc.events[jumpIdx]);
          }
        });
      });
    }

    _showEventInspector(idx, ev) {
      const commStyle =
        window.RoarSequenceEngine.COMM_STYLES[ev.comm_kind] ||
        window.RoarSequenceEngine.COMM_STYLES.topic;
      const fromP = this.data.participants[ev.from];
      const toP = this.data.participants[ev.to];

      this.inspectorCard.innerHTML = `
        <div class="popover-head">
          <div>
            <div class="insp-badges">
              <span class="insp-kind-pill" style="color: ${commStyle.color};">EVENT #${ev.step_num} · ${escapeHtml(commStyle.badge)}</span>
              <span class="insp-verified-pill">✓ ${escapeHtml(ev.verification || "VERIFIED")}</span>
            </div>
            <div class="popover-title">${escapeHtml(ev.title)}</div>
          </div>
          <button class="popover-close" id="seqInspCloseBtn" type="button" aria-label="Close">✕</button>
        </div>
        <div class="popover-meta">
          <div class="popover-meta-row">
            <span class="popover-meta-key">Sender → Recv</span>
            <span class="popover-meta-val">${escapeHtml(fromP ? fromP.name : ev.from)} → ${escapeHtml(toP ? toP.name : ev.to)}</span>
          </div>
          <div class="popover-meta-row">
            <span class="popover-meta-key">ROS 2 Package</span>
            <span class="popover-meta-val">${escapeHtml(ev.ros_package)}</span>
          </div>
          <div class="popover-meta-row">
            <span class="popover-meta-key">Interface</span>
            <span class="popover-meta-val">${escapeHtml(ev.interface_name)}</span>
          </div>
          <div class="popover-meta-row">
            <span class="popover-meta-key">Message Type</span>
            <span class="popover-meta-val">${escapeHtml(ev.msg_type)}</span>
          </div>
          <div class="popover-meta-row">
            <span class="popover-meta-key">Pub / Sub</span>
            <span class="popover-meta-val">${escapeHtml(ev.pub_sub)}</span>
          </div>
          <div class="popover-meta-row">
            <span class="popover-meta-key">Trigger</span>
            <span class="popover-meta-val">${escapeHtml(ev.trigger)}</span>
          </div>
          <div class="popover-meta-row">
            <span class="popover-meta-key">Callback</span>
            <span class="popover-meta-val">${escapeHtml(ev.callback_fn)}</span>
          </div>
          <div class="popover-meta-row">
            <span class="popover-meta-key">Source File</span>
            <span class="popover-meta-val">${escapeHtml(ev.source_file.split("/").slice(-2).join("/"))}:${escapeHtml(ev.lines)}</span>
          </div>
        </div>
        <div class="popover-actions">
          <button class="view-source-btn" id="seqInspSrcBtn" type="button">&lt;/&gt; View Source</button>
          <button class="resume-play-btn" id="seqInspReplayBtn" type="button" title="Replay this event with voice &amp; packets">↻ Replay</button>
          <button class="resume-play-btn" id="seqInspResumeBtn" type="button">▶ Continue</button>
        </div>
      `;

      this.inspectorCard.hidden = false;

      document.getElementById("seqInspCloseBtn").onclick = () => this.hideInspector();
      document.getElementById("seqInspSrcBtn").onclick = () =>
        this._openSourceModal(`Event #${ev.step_num}: ${ev.title}`, ev.snippet_key);
      document.getElementById("seqInspReplayBtn").onclick = () => {
        if (window.roarApp && window.roarApp.audio && window.roarApp.audio.isPlaying) {
          window.roarApp.pause();
        }
        this.singleEventReplayOnly = true;
        this.seqEngine.setAutoCamera(true);
        this._applyEvent(idx, true, 0);
        this.seqEngine.selectEvent(idx);
      };
      document.getElementById("seqInspResumeBtn").onclick = () => {
        this.singleEventReplayOnly = false;
        this._applyEvent(idx, true, 0);
        this.hideInspector();
      };
    }

    hideInspector() {
      this.inspectorCard.hidden = true;
      if (this.seqEngine) this.seqEngine.clearFocus();
    }

    _bindControls() {
      this.playOverlay.addEventListener("click", () => this.play());
      this.playBtn.addEventListener("click", () => this.togglePlay());
      this.restartBtn.addEventListener("click", () => this.restart());
      this.prevBtn.addEventListener("click", () => this.prevEvent());
      this.nextBtn.addEventListener("click", () => this.nextEvent());

      this.progressiveBtn.addEventListener("click", () => {
        const nextProg = !this.seqEngine.progressiveMode;
        this.seqEngine.setProgressiveMode(nextProg);
        this.progressiveBtn.classList.toggle("is-active", nextProg);
        this.progressiveBtn.textContent = nextProg ? "Progressive Reveal" : "Full Diagram";
      });

      this.autoCamBtn.addEventListener("click", () => {
        this.seqEngine.setAutoCamera(!this.seqEngine.autoCamera);
      });

      // Stage Jump dropdown
      this.stageSelect.addEventListener("change", () => {
        if (!this.currentDoc) return;
        const targetStageId = this.stageSelect.value;
        const idx = this.currentDoc.events.findIndex((e) => e.stage_id === targetStageId);
        if (idx >= 0) {
          this.hasStartedCurrent = true;
          this.hideInspector();
          this.seqEngine.setAutoCamera(true);
          this._applyEvent(idx, this.audio.isPlaying, 0);
        }
      });

      this.speedSelect.addEventListener("change", () => {
        const rate = parseFloat(this.speedSelect.value) || 1.0;
        this.audio.setPlaybackRate(rate);
      });

      this.muteBtn.innerHTML = ICONS.volOn;
      this.muteBtn.addEventListener("click", () => {
        const nextMute = !this.audio.muted;
        this.audio.setMuted(nextMute);
        this.muteBtn.innerHTML = nextMute ? ICONS.volMute : ICONS.volOn;
        this.muteBtn.classList.toggle("is-active", nextMute);
      });

      this.captionsBtn.addEventListener("click", () => {
        this.captionsEnabled = !this.captionsEnabled;
        this.captionContainer.classList.toggle("captions-hidden", !this.captionsEnabled);
        this.captionsBtn.classList.toggle("is-active", this.captionsEnabled);
      });

      // Corner Camera Pad controls
      document.getElementById("seqCamLeft").addEventListener("click", () => this.seqEngine.panBy(180, 0));
      document.getElementById("seqCamRight").addEventListener("click", () => this.seqEngine.panBy(-180, 0));
      document.getElementById("seqCamUp").addEventListener("click", () => this.seqEngine.panBy(0, 140));
      document.getElementById("seqCamDown").addEventListener("click", () => this.seqEngine.panBy(0, -140));
      document.getElementById("seqCamZoomIn").addEventListener("click", () => this.seqEngine.zoomBy(1.18));
      document.getElementById("seqCamZoomOut").addEventListener("click", () => this.seqEngine.zoomBy(0.84));
      document.getElementById("seqCamFit").addEventListener("click", () => {
        if (this.seqEngine.progressiveMode) {
          this.seqEngine.setAutoCamera(true);
          this.seqEngine.fitActiveView(false);
        } else {
          this.seqEngine.fitFullDiagram();
        }
      });

      // Top navigation shortcut button
      const navArchBtn = document.getElementById("navArchBtn");
      if (navArchBtn) {
        navArchBtn.addEventListener("click", () => {
          this.sectionEl.scrollIntoView({ behavior: "smooth" });
        });
      }

      // Scrubber tooltip & drag
      const updateHover = (clientX) => {
        const rect = this.timelineWrap.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
        const sec = ratio * this.totalDuration;
        let eIdx = 0;
        for (let i = 0; i < this.eventOffsets.length; i++) {
          if (sec >= this.eventOffsets[i]) eIdx = i;
        }
        const ev = this.currentDoc ? this.currentDoc.events[eIdx] : null;
        this.timelineTooltip.style.left = `${(ratio * 100).toFixed(1)}%`;
        this.timelineTooltip.textContent = ev
          ? `${formatTime(sec)} · #${ev.step_num} ${ev.title}`
          : formatTime(sec);
        return sec;
      };

      this.timelineWrap.addEventListener("pointermove", (e) => {
        const sec = updateHover(e.clientX);
        if (this.isScrubbing) {
          this.seekGlobalSeconds(sec);
        }
      });

      this.timelineWrap.addEventListener("pointerdown", (e) => {
        this.isScrubbing = true;
        this.timelineWrap.setPointerCapture(e.pointerId);
        this.seekGlobalSeconds(updateHover(e.clientX));
      });

      const stopScrub = (e) => {
        if (!this.isScrubbing) return;
        this.isScrubbing = false;
        try {
          this.timelineWrap.releasePointerCapture(e.pointerId);
        } catch (_) {}
      };
      this.timelineWrap.addEventListener("pointerup", stopScrub);
      this.timelineWrap.addEventListener("pointercancel", stopScrub);
    }

    isDominantInViewport() {
      if (!this.playerFrame) return false;
      if (this.audio && this.audio.isPlaying) return true;
      const seqRect = this.playerFrame.getBoundingClientRect();
      const topFrame = document.getElementById("playerFrame");
      if (!topFrame) return true;
      const topRect = topFrame.getBoundingClientRect();
      const vhMid = window.innerHeight / 2;
      const seqDist = Math.abs((seqRect.top + seqRect.bottom) / 2 - vhMid);
      const topDist = Math.abs((topRect.top + topRect.bottom) / 2 - vhMid);
      return seqDist < topDist;
    }

    _renderLoop(now) {
      const dt = Math.min(0.05, Math.max(0.001, (now - this._lastTs) / 1000));
      this._lastTs = now;

      const prog =
        this.audio.sceneDuration > 0 ? this.audio.sceneElapsed / this.audio.sceneDuration : 0;
      this.seqEngine.render(dt, this.audio.isPlaying, prog);

      requestAnimationFrame((ts) => this._renderLoop(ts));
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.ROAR_ARCH_DOCS_DATA) {
      console.error("ROAR_ARCH_DOCS_DATA missing — check js/data/architecture_docs_bundle.js");
      return;
    }
    window.roarArchApp = new ArchDocApp(window.ROAR_ARCH_DOCS_DATA);
  });
})();
