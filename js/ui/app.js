/**
 * Main Interactive Visual Course Controller (ASU ROAR 2026)
 * Orchestrates:
 *  - 16:9 Canvas 2D visual animations + SVG interactive component/packet layer
 *  - Dual Egyptian Arabic narration (MP3 primary + Browser SpeechSynthesis fallback)
 *  - Multi-scene timeline scrubbing, speed, mute, captions, theater mode
 *  - Featured Introduction, 7 Visual Lessons, and 7 Educational Scenario Replays
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

  /**
   * Highlights ROS 2 topics, robotics identifiers, and mathematical terms
   * inside concise 1-2 line English captions.
   */
  function formatCaptionLine(raw) {
    const escaped = escapeHtml(raw);
    const techPattern =
      /(\(\s*0\s*,\s*0\s*\)|\{5\.\.9\}|0\.003·Z²|(?:\/[A-Za-z0-9_\/]+)|\b(?:ASU ROAR|ROS 2|Nav2|D\* Lite|MPPI|IESKF|ZUPT|WO-FIS|VO-FIS|WIO|TF2|TF|QoS|RANSAC|DBSCAN|PCA|EMA|SOR\/ROR|SOR|ROR|SolvePnP|ZED2i|BNO055|ERC|KILL|TIMEOUT|STATUS_SUCCEEDED|TwistStamped|PoseStamped|PointCloud2|d_edge|k_Q|k_V|[A-Za-z0-9_]+\.(?:yaml|npy|npz|sh|html))\b|(?:\d+(?:\.\d+)?\s*(?:Hz|m\/s)))/g;
    return escaped.replace(techPattern, '<span class="ltr-term">$1</span>');
  }

  const ICONS = {
    play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg>`,
    pause: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z"/></svg>`,
    volOn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
    volMute: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`
  };

  class RoarCourseApp {
    constructor(data) {
      this.data = data;

      // Build unified ordered playlist: [featured_intro, ...lessons, ...scenarios]
      this.allExperiences = [
        Object.assign({ kind: "intro" }, data.featured_intro),
        ...(data.lessons || []).map((l) => Object.assign({ kind: "lesson" }, l)),
        ...(data.scenarios || []).map((s) => Object.assign({ kind: "scenario" }, s))
      ];
      this.experienceById = {};
      this.allExperiences.forEach((exp) => {
        this.experienceById[exp.id] = exp;
      });

      this.currentExp = null;
      this.sceneIndex = 0;
      this.sceneOffsets = [];
      this.totalDuration = 1;
      this.captionsEnabled = true;
      this.hasStartedCurrent = false;
      this.wasPlayingBeforePause = false;
      this.isScrubbing = false;

      this._cacheDom();
      this._initEngines();
      this._renderCatalog();
      this._bindControls();

      // Load Featured Introduction initially in ready poster state
      this.loadExperience(this.data.featured_intro.id, false);

      this._lastFrameTs = performance.now();
      requestAnimationFrame((ts) => this._renderLoop(ts));
    }

    _cacheDom() {
      this.playerFrame = document.getElementById("playerFrame");
      this.canvasEl = document.getElementById("stageCanvas");
      this.svgEl = document.getElementById("stageSvg");
      this.sceneVeil = document.getElementById("sceneVeil");

      this.nowPlayingBadge = document.getElementById("nowPlayingBadge");
      this.nowPlayingTitle = document.getElementById("nowPlayingTitle");
      this.nowPlayingStep = document.getElementById("nowPlayingStep");

      this.hudSceneIndex = document.getElementById("hudSceneIndex");
      this.hudSceneTitle = document.getElementById("hudSceneTitle");
      this.insightTriggerBtn = document.getElementById("insightTriggerBtn");
      this.voiceModeLabel = document.getElementById("voiceModeLabel");

      this.bigPlayOverlay = document.getElementById("bigPlayOverlay");
      this.bigPlayLabel = document.getElementById("bigPlayLabel");

      this.captionContainer = document.getElementById("captionContainer");
      this.captionBox = document.getElementById("captionBox");

      this.endOverlay = document.getElementById("endOverlay");
      this.endOverlayKicker = document.getElementById("endOverlayKicker");
      this.endOverlayTitle = document.getElementById("endOverlayTitle");
      this.endReplayBtn = document.getElementById("endReplayBtn");
      this.endNextBtn = document.getElementById("endNextBtn");

      this.timelineWrap = document.getElementById("timelineWrap");
      this.timelineFill = document.getElementById("timelineFill");
      this.timelineMarkers = document.getElementById("timelineMarkers");
      this.timelineThumb = document.getElementById("timelineThumb");
      this.timelineTooltip = document.getElementById("timelineTooltip");

      this.playToggleBtn = document.getElementById("playToggleBtn");
      this.restartBtn = document.getElementById("restartBtn");
      this.prevSceneBtn = document.getElementById("prevSceneBtn");
      this.nextSceneBtn = document.getElementById("nextSceneBtn");
      this.timeReadout = document.getElementById("timeReadout");
      this.speedSelect = document.getElementById("speedSelect");
      this.muteBtn = document.getElementById("muteBtn");
      this.captionsBtn = document.getElementById("captionsBtn");
      this.theaterBtn = document.getElementById("theaterBtn");

      this.featuredBannerHost = document.getElementById("featuredBannerHost");
      this.lessonsGrid = document.getElementById("lessonsGrid");
      this.lessonsMeta = document.getElementById("lessonsMeta");
      this.scenariosGrid = document.getElementById("scenariosGrid");
    }

    _initEngines() {
      this.stageCanvas = new window.RoarStageCanvas(this.canvasEl);

      this.popover = new window.RoarPopoverController(this.data, {
        onRequestPause: () => {
          this.wasPlayingBeforePause = this.audio.isPlaying;
          this.pause();
        },
        onRequestResume: () => {
          this.play();
        },
        onClearSelection: () => {
          if (this.stageGraph) this.stageGraph.clearSelection();
        }
      });

      this.stageGraph = new window.RoarStageGraph(this.svgEl, this.data, {
        onSelectComponent: (compId, nx, ny) => {
          this.hasStartedCurrent = true;
          this._syncPlayUi();
          this.popover.showComponentPopover(compId, nx, ny);
        },
        onSelectFlow: (flow, nx, ny) => {
          this.hasStartedCurrent = true;
          this._syncPlayUi();
          this.popover.showChannelPopover(flow, nx, ny);
        }
      });

      this.audio = new window.RoarAudioEngine({
        onProgress: (sceneElapsed, sceneDur) => {
          this._onSceneProgress(sceneElapsed, sceneDur);
        },
        onSceneEnded: () => {
          this._handleSceneFinished();
        },
        onModeChange: (label) => {
          this.voiceModeLabel.textContent = label;
        }
      });
    }

    _renderCatalog() {
      // 1. Featured Introduction Banner
      const intro = this.data.featured_intro;
      this.featuredBannerHost.innerHTML = `
        <div class="featured-banner" id="featuredCard_${escapeHtml(intro.id)}" role="button" tabindex="0">
          <div class="featured-thumb">
            ${window.RoarThumbnails.getSvg(intro.thumbnail_kind || "intro")}
            <span class="thumb-badge-dur">${formatTime(intro.duration_sec)}</span>
          </div>
          <div class="featured-info">
            <span class="featured-eyebrow">Featured Introduction · ${intro.scenes.length} Visual Scenes</span>
            <h2 class="featured-heading">${escapeHtml(intro.title)}</h2>
            <p class="featured-sub">${escapeHtml(intro.subtitle)}</p>
          </div>
          <div class="featured-cta">
            <span>▶ Watch Intro</span>
          </div>
        </div>
      `;
      const introEl = this.featuredBannerHost.firstElementChild;
      introEl.addEventListener("click", () => this._selectAndPlay(intro.id));
      introEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this._selectAndPlay(intro.id);
        }
      });

      // 2. Seven Visual Lessons Grid
      const totalLessonsSec = (this.data.lessons || []).reduce((acc, l) => acc + (l.duration_sec || 0), 0);
      if (this.lessonsMeta) {
        this.lessonsMeta.textContent = `7 Lessons · ${Math.round(totalLessonsSec / 60)} min total · Technical English Voice`;
      }

      this.lessonsGrid.innerHTML = (this.data.lessons || [])
        .map(
          (lesson) => `
          <button class="lesson-card" data-exp-id="${escapeHtml(lesson.id)}" type="button">
            <div class="lesson-thumb">
              ${window.RoarThumbnails.getSvg(lesson.thumbnail_kind)}
              <span class="thumb-badge-num">${escapeHtml(lesson.number)}</span>
              <span class="thumb-badge-dur">${formatTime(lesson.duration_sec)}</span>
              <div class="thumb-play-hover">
                <div class="thumb-play-circle">${ICONS.play}</div>
              </div>
            </div>
            <div class="lesson-body">
              <div class="lesson-card-title">${escapeHtml(lesson.title)}</div>
              <div class="lesson-card-sub">${escapeHtml(lesson.subtitle)}</div>
            </div>
          </button>
        `
        )
        .join("");

      this.lessonsGrid.querySelectorAll(".lesson-card").forEach((card) => {
        card.addEventListener("click", () => {
          this._selectAndPlay(card.getAttribute("data-exp-id"));
        });
      });

      // 3. Seven Educational Scenario Replays
      this.scenariosGrid.innerHTML = (this.data.scenarios || [])
        .map(
          (sc) => `
          <button class="scenario-card" data-exp-id="${escapeHtml(sc.id)}" type="button">
            <div class="scenario-icon-box">${escapeHtml(sc.number)}</div>
            <div class="scenario-info">
              <div class="scenario-title">${escapeHtml(sc.title)}</div>
              <div class="scenario-dur">${sc.scenes.length} scenes · ${formatTime(sc.duration_sec)}</div>
            </div>
          </button>
        `
        )
        .join("");

      this.scenariosGrid.querySelectorAll(".scenario-card").forEach((card) => {
        card.addEventListener("click", () => {
          this._selectAndPlay(card.getAttribute("data-exp-id"));
        });
      });
    }

    _selectAndPlay(expId) {
      this.loadExperience(expId, true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    loadExperience(expId, autoPlay = false) {
      const exp = this.experienceById[expId];
      if (!exp) return;

      this.popover.hidePopover();
      this.popover.closeModal();
      this.endOverlay.hidden = true;

      this.currentExp = exp;
      this.sceneIndex = 0;
      this.hasStartedCurrent = Boolean(autoPlay);

      // Compute cumulative scene start offsets for unified timeline scrubbing
      this.sceneOffsets = [];
      let acc = 0;
      for (const sc of exp.scenes) {
        this.sceneOffsets.push(acc);
        acc += sc.duration_sec || 12;
      }
      this.totalDuration = Math.max(1, acc);

      this._renderTimelineDividers();
      this._highlightActiveCards();
      this._updateHeaderMeta();
      this._applyScene(0, autoPlay, 0, false);
    }

    _renderTimelineDividers() {
      this.timelineMarkers.innerHTML = "";
      for (let i = 1; i < this.sceneOffsets.length; i++) {
        const pct = (this.sceneOffsets[i] / this.totalDuration) * 100;
        const div = document.createElement("div");
        div.className = "timeline-divider";
        div.style.left = `${pct.toFixed(2)}%`;
        this.timelineMarkers.appendChild(div);
      }
    }

    _highlightActiveCards() {
      const id = this.currentExp ? this.currentExp.id : "";
      const introBanner = this.featuredBannerHost.querySelector(".featured-banner");
      if (introBanner) {
        introBanner.classList.toggle("is-current", id === this.data.featured_intro.id);
      }
      this.lessonsGrid.querySelectorAll(".lesson-card").forEach((el) => {
        el.classList.toggle("is-current", el.getAttribute("data-exp-id") === id);
      });
      this.scenariosGrid.querySelectorAll(".scenario-card").forEach((el) => {
        el.classList.toggle("is-current", el.getAttribute("data-exp-id") === id);
      });
    }

    _updateHeaderMeta() {
      if (!this.currentExp) return;
      const exp = this.currentExp;
      if (exp.kind === "intro") {
        this.nowPlayingBadge.textContent = "FEATURED INTRO";
      } else if (exp.kind === "scenario") {
        this.nowPlayingBadge.textContent = `REPLAY ${exp.number}`;
      } else {
        this.nowPlayingBadge.textContent = `LESSON ${exp.number}`;
      }
      this.nowPlayingTitle.textContent = exp.title;
      this.bigPlayLabel.textContent = `Watch ${exp.title} · ${formatTime(exp.duration_sec)}`;
    }

    _applyScene(idx, autoPlay = false, startOffsetSec = 0, animateTransition = true) {
      if (!this.currentExp) return;
      const scenes = this.currentExp.scenes;
      const clampedIdx = Math.max(0, Math.min(idx, scenes.length - 1));
      this.sceneIndex = clampedIdx;
      const scene = scenes[clampedIdx];

      this.popover.hidePopover();
      this.endOverlay.hidden = true;

      if (animateTransition) {
        this.sceneVeil.classList.add("active");
        setTimeout(() => this.sceneVeil.classList.remove("active"), 240);
      }

      const stepStr = `${String(clampedIdx + 1).padStart(2, "0")} / ${String(scenes.length).padStart(2, "0")}`;
      this.hudSceneIndex.textContent = stepStr;
      this.hudSceneTitle.textContent = scene.title;
      this.nowPlayingStep.textContent = `Scene ${clampedIdx + 1} of ${scenes.length}`;

      // Optional Code Insight button (e.g. ArUco runtime verification outside main narration)
      if (scene.optional_insight_id && this.data.code_insights[scene.optional_insight_id]) {
        this.insightTriggerBtn.hidden = false;
        this.insightTriggerBtn.onclick = (e) => {
          e.stopPropagation();
          this.popover.openCodeInsight(scene.optional_insight_id);
        };
      } else {
        this.insightTriggerBtn.hidden = true;
        this.insightTriggerBtn.onclick = null;
      }

      this.prevSceneBtn.style.opacity = clampedIdx > 0 ? "1" : "0.4";
      this.nextSceneBtn.style.opacity = clampedIdx < scenes.length - 1 ? "1" : "0.4";

      this.stageCanvas.setMode(scene.visual_mode);
      this.stageGraph.setScene(scene);
      this.audio.loadScene(scene, autoPlay, startOffsetSec);
      this._syncPlayUi();
    }

    _onSceneProgress(sceneElapsed, sceneDur) {
      if (!this.currentExp) return;
      const scene = this.currentExp.scenes[this.sceneIndex];
      if (!scene) return;

      // Update synchronized 1-2 line captions
      this._renderCaptions(scene, sceneElapsed);

      // Update unified multi-scene scrubber & time readout
      const globalElapsed = Math.min(
        this.totalDuration,
        (this.sceneOffsets[this.sceneIndex] || 0) + sceneElapsed
      );
      const pct = Math.max(0, Math.min(100, (globalElapsed / this.totalDuration) * 100));
      this.timelineFill.style.width = `${pct.toFixed(2)}%`;
      this.timelineThumb.style.left = `${pct.toFixed(2)}%`;
      this.timeReadout.textContent = `${formatTime(globalElapsed)} / ${formatTime(this.totalDuration)}`;
    }

    _renderCaptions(scene, elapsed) {
      const lines = scene.captions || [];
      if (!lines.length) {
        this.captionBox.innerHTML = "";
        return;
      }
      const split = scene.caption_split_sec || (scene.duration_sec || 10) * 0.5;
      if (lines.length === 1 || elapsed < split) {
        this.captionBox.innerHTML = `<div class="caption-line">${formatCaptionLine(lines[0])}</div>`;
      } else {
        this.captionBox.innerHTML = `
          <div class="caption-line secondary">${formatCaptionLine(lines[0])}</div>
          <div class="caption-line">${formatCaptionLine(lines[1])}</div>
        `;
      }
    }

    _handleSceneFinished() {
      if (!this.currentExp) return;
      if (this.sceneIndex < this.currentExp.scenes.length - 1) {
        this._applyScene(this.sceneIndex + 1, true, 0, true);
      } else {
        this._syncPlayUi();
        this._showEndOverlay();
      }
    }

    _showEndOverlay() {
      const curIdx = this.allExperiences.findIndex((e) => e.id === this.currentExp.id);
      const nextExp = this.allExperiences[(curIdx + 1) % this.allExperiences.length];

      this.endOverlayKicker.textContent =
        this.currentExp.kind === "scenario" ? "Scenario Replay Complete" : "Visual Lesson Complete";
      this.endOverlayTitle.textContent = this.currentExp.title;
      this.endNextBtn.textContent = `Next: ${nextExp.title} →`;
      this.endNextBtn.onclick = () => {
        this.loadExperience(nextExp.id, true);
      };
      this.endOverlay.hidden = false;
    }

    play() {
      if (window.roarArchApp && window.roarArchApp.audio && window.roarArchApp.audio.isPlaying) {
        window.roarArchApp.pause();
      }
      this.hasStartedCurrent = true;
      this.endOverlay.hidden = true;
      this.popover.hidePopover();
      this.audio.play();
      this._syncPlayUi();
    }

    pause() {
      this.audio.pause();
      this._syncPlayUi();
    }

    togglePlay() {
      if (!this.endOverlay.hidden) {
        this.restart();
        return;
      }
      if (this.audio.isPlaying) {
        this.pause();
      } else {
        this.play();
      }
    }

    restart() {
      this.hasStartedCurrent = true;
      this.endOverlay.hidden = true;
      this._applyScene(0, true, 0, true);
    }

    prevScene() {
      if (!this.currentExp) return;
      if (this.audio.sceneElapsed > 2.5 && this.sceneIndex === 0) {
        this.audio.seekWithinScene(0);
        return;
      }
      const target = Math.max(0, this.sceneIndex - 1);
      this._applyScene(target, this.audio.isPlaying || this.hasStartedCurrent, 0, true);
    }

    nextScene() {
      if (!this.currentExp) return;
      if (this.sceneIndex < this.currentExp.scenes.length - 1) {
        this._applyScene(this.sceneIndex + 1, this.audio.isPlaying || this.hasStartedCurrent, 0, true);
      }
    }

    seekGlobalSeconds(targetGlobalSec) {
      if (!this.currentExp) return;
      const clamped = Math.max(0, Math.min(targetGlobalSec, this.totalDuration - 0.02));
      let targetIdx = 0;
      for (let i = 0; i < this.sceneOffsets.length; i++) {
        if (clamped >= this.sceneOffsets[i]) {
          targetIdx = i;
        } else {
          break;
        }
      }
      const localOffset = clamped - this.sceneOffsets[targetIdx];
      this.hasStartedCurrent = true;
      this.endOverlay.hidden = true;

      if (targetIdx !== this.sceneIndex) {
        this._applyScene(targetIdx, this.audio.isPlaying, localOffset, false);
      } else {
        this.audio.seekWithinScene(localOffset);
      }
      this._syncPlayUi();
    }

    _syncPlayUi() {
      const playing = this.audio.isPlaying;
      this.playerFrame.classList.toggle("is-playing", playing);
      this.playToggleBtn.innerHTML = playing ? ICONS.pause : ICONS.play;
      this.playToggleBtn.setAttribute("aria-label", playing ? "Pause" : "Play");

      // Show Big Play overlay only before first play of current lesson
      this.bigPlayOverlay.hidden = playing || this.hasStartedCurrent;
    }

    _bindControls() {
      this.bigPlayOverlay.addEventListener("click", (e) => {
        e.stopPropagation();
        this.play();
      });

      // Clicking empty stage toggles play/pause (or closes open popover)
      this.svgEl.addEventListener("click", () => {
        if (!document.getElementById("stagePopover").hidden) {
          this.popover.hidePopover();
          return;
        }
        this.togglePlay();
      });

      this.playToggleBtn.addEventListener("click", () => this.togglePlay());
      this.restartBtn.addEventListener("click", () => this.restart());
      this.prevSceneBtn.addEventListener("click", () => this.prevScene());
      this.nextSceneBtn.addEventListener("click", () => this.nextScene());
      this.endReplayBtn.addEventListener("click", () => this.restart());

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

      const toggleTheater = () => {
        const active = document.body.classList.toggle("theater-mode");
        this.theaterBtn.classList.toggle("is-active", active);
        const navTheater = document.getElementById("navTheaterBtn");
        if (navTheater) navTheater.classList.toggle("active", active);
      };
      this.theaterBtn.addEventListener("click", toggleTheater);

      const navTheater = document.getElementById("navTheaterBtn");
      if (navTheater) navTheater.addEventListener("click", toggleTheater);

      const brandHome = document.getElementById("brandHome");
      if (brandHome) {
        brandHome.addEventListener("click", () => {
          this.loadExperience(this.data.featured_intro.id, false);
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }

      const navLessonsBtn = document.getElementById("navLessonsBtn");
      if (navLessonsBtn) {
        navLessonsBtn.addEventListener("click", () => {
          document.getElementById("lessonsSection").scrollIntoView({ behavior: "smooth" });
        });
      }

      const navScenariosBtn = document.getElementById("navScenariosBtn");
      if (navScenariosBtn) {
        navScenariosBtn.addEventListener("click", () => {
          document.getElementById("scenariosSection").scrollIntoView({ behavior: "smooth" });
        });
      }

      // Timeline hover tooltip & pointer-drag scrubbing
      const updateTooltipFromEvent = (clientX) => {
        const rect = this.timelineWrap.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
        const hoverSec = ratio * this.totalDuration;
        let sIdx = 0;
        for (let i = 0; i < this.sceneOffsets.length; i++) {
          if (hoverSec >= this.sceneOffsets[i]) sIdx = i;
        }
        const sc = this.currentExp ? this.currentExp.scenes[sIdx] : null;
        this.timelineTooltip.style.left = `${(ratio * 100).toFixed(1)}%`;
        this.timelineTooltip.textContent = sc
          ? `${formatTime(hoverSec)} · ${sc.title}`
          : formatTime(hoverSec);
        return hoverSec;
      };

      this.timelineWrap.addEventListener("pointermove", (e) => {
        const sec = updateTooltipFromEvent(e.clientX);
        if (this.isScrubbing) {
          this.seekGlobalSeconds(sec);
        }
      });

      this.timelineWrap.addEventListener("pointerdown", (e) => {
        this.isScrubbing = true;
        this.timelineWrap.setPointerCapture(e.pointerId);
        const sec = updateTooltipFromEvent(e.clientX);
        this.seekGlobalSeconds(sec);
      });

      const endScrub = (e) => {
        if (!this.isScrubbing) return;
        this.isScrubbing = false;
        try {
          this.timelineWrap.releasePointerCapture(e.pointerId);
        } catch (_) {}
      };
      this.timelineWrap.addEventListener("pointerup", endScrub);
      this.timelineWrap.addEventListener("pointercancel", endScrub);

      // Keyboard shortcuts (Space, Arrows, M, C, T) — route Space/Arrows to whichever player is in view
      document.addEventListener("keydown", (e) => {
        if (e.target && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
        if (!document.getElementById("codeModalBackdrop").hidden) return;

        const useArchPlayer =
          window.roarArchApp &&
          typeof window.roarArchApp.isDominantInViewport === "function" &&
          window.roarArchApp.isDominantInViewport();

        if (e.code === "Space") {
          e.preventDefault();
          if (useArchPlayer) window.roarArchApp.togglePlay();
          else this.togglePlay();
        } else if (e.code === "ArrowRight") {
          e.preventDefault();
          if (useArchPlayer) window.roarArchApp.nextEvent();
          else this.nextScene();
        } else if (e.code === "ArrowLeft") {
          e.preventDefault();
          if (useArchPlayer) window.roarArchApp.prevEvent();
          else this.prevScene();
        } else if (e.key === "m" || e.key === "M") {
          if (useArchPlayer) window.roarArchApp.muteBtn.click();
          else this.muteBtn.click();
        } else if (e.key === "c" || e.key === "C") {
          if (useArchPlayer) window.roarArchApp.captionsBtn.click();
          else this.captionsBtn.click();
        } else if (e.key === "t" || e.key === "T") {
          toggleTheater();
        }
      });
    }

    _renderLoop(now) {
      const dt = Math.min(0.05, Math.max(0.001, (now - this._lastFrameTs) / 1000));
      this._lastFrameTs = now;

      const sceneProgress =
        this.audio.sceneDuration > 0 ? this.audio.sceneElapsed / this.audio.sceneDuration : 0;

      this.stageCanvas.render(dt, this.audio.isPlaying, sceneProgress);
      this.stageGraph.renderPackets(this.stageCanvas.animClock);

      requestAnimationFrame((ts) => this._renderLoop(ts));
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.ROAR_COURSE_DATA) {
      console.error("ROAR_COURSE_DATA missing — check js/data/course_bundle.js");
      return;
    }
    window.roarApp = new RoarCourseApp(window.ROAR_COURSE_DATA);
  });
})();
