/**
 * Dual Narration & Timeline Synchronization Engine (100% English)
 * 1. Primary: Pre-generated neural English MP3 per scene (en-US-AndrewNeural).
 * 2. Fallback: Browser window.speechSynthesis (en-US / en) preprocessed through
 *    window.RoarPronunciation so "ASU" -> "A S U" and robotics acronyms stay natural.
 */
(function () {
  class AudioEngine {
    constructor(callbacks = {}) {
      this.onProgress = callbacks.onProgress || (() => {});
      this.onSceneEnded = callbacks.onSceneEnded || (() => {});
      this.onModeChange = callbacks.onModeChange || (() => {});
      this.onAutoplayBlocked = callbacks.onAutoplayBlocked || (() => {});

      this.audio = new Audio();
      this.audio.preload = "auto";
      this.playbackRate = 1.0;
      this.muted = false;
      this.mode = "mp3"; // "mp3" | "tts" | "clock"
      this.isPlaying = false;

      this.currentScene = null;
      this.sceneElapsed = 0;
      this.sceneDuration = 12;
      this._lastRafTs = 0;
      this._rafId = null;
      this._utterance = null;
      this._cachedVoice = null;

      this.audio.addEventListener("error", () => {
        if (this.currentScene && this.mode === "mp3") {
          this._switchToFallback();
        }
      });

      if ("speechSynthesis" in window) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
          this._cachedVoice = this._pickEnglishVoice();
        };
      }
    }

    _pickEnglishVoice() {
      if (!("speechSynthesis" in window)) return null;
      const voices = window.speechSynthesis.getVoices() || [];
      return (
        voices.find((v) => /en[-_]?US/i.test(v.lang) && /Neural|Natural|Google|Microsoft/i.test(v.name)) ||
        voices.find((v) => /en[-_]?US/i.test(v.lang)) ||
        voices.find((v) => /^en/i.test(v.lang)) ||
        null
      );
    }

    _getSpokenEnglishScript(scene) {
      if (!scene) return "";
      const raw = scene.narration || scene.narration_spoken || "";
      if (window.RoarPronunciation && typeof window.RoarPronunciation.preprocess === "function") {
        return window.RoarPronunciation.preprocess(raw);
      }
      return raw.replace(/\bASU\b/g, "A S U");
    }

    loadScene(scene, autoPlay = false, startOffsetSec = 0) {
      this._stopAllInternal();
      this.currentScene = scene;
      this.sceneDuration = scene.duration_sec || 12;
      this.sceneElapsed = Math.max(0, Math.min(startOffsetSec, this.sceneDuration));

      if (scene.audio_file) {
        this.mode = "mp3";
        this.onModeChange("MP3 · EN");
        this.audio.src = scene.audio_file;
        this.audio.muted = this.muted;
        this.audio.playbackRate = this.playbackRate;
        this.audio.currentTime = Math.min(
          this.sceneElapsed,
          Math.max(0, (scene.audio_duration_sec || this.sceneDuration) - 0.05)
        );
      } else {
        this._prepareSpeechFallback();
      }

      this.onProgress(this.sceneElapsed, this.sceneDuration);

      if (autoPlay) {
        this.play();
      }
    }

    _prepareSpeechFallback() {
      if ("speechSynthesis" in window) {
        this.mode = "tts";
        this.onModeChange("Web Speech · EN");
      } else {
        this.mode = "clock";
        this.onModeChange("Visual Timer");
      }
    }

    _switchToFallback() {
      const wasPlaying = this.isPlaying;
      try {
        this.audio.pause();
      } catch (_) {}
      this._prepareSpeechFallback();
      if (wasPlaying) {
        this._startSpeechSynthesis();
      }
    }

    _startSpeechSynthesis() {
      if (!("speechSynthesis" in window) || !this.currentScene || this.muted) return;
      try {
        window.speechSynthesis.cancel();
        const spokenScript = this._getSpokenEnglishScript(this.currentScene);
        const u = new SpeechSynthesisUtterance(spokenScript);
        const voice = this._cachedVoice || this._pickEnglishVoice();
        if (voice) u.voice = voice;
        u.lang = "en-US";
        u.rate = Math.min(2.0, Math.max(0.65, this.playbackRate));
        this._utterance = u;
        window.speechSynthesis.speak(u);
      } catch (_) {
        this.mode = "clock";
        this.onModeChange("Visual Timer");
      }
    }

    play() {
      if (!this.currentScene) return;
      if (this.sceneElapsed >= this.sceneDuration - 0.05) {
        this.sceneElapsed = 0;
        if (this.mode === "mp3") {
          try {
            this.audio.currentTime = 0;
          } catch (_) {}
        }
      }
      this.isPlaying = true;

      if (this.mode === "mp3") {
        this.audio.muted = this.muted;
        this.audio.playbackRate = this.playbackRate;
        const audioLimit = this.currentScene.audio_duration_sec || this.sceneDuration;
        if (this.sceneElapsed < audioLimit - 0.1) {
          try {
            this.audio.currentTime = this.sceneElapsed;
          } catch (_) {}
          const p = this.audio.play();
          if (p && typeof p.catch === "function") {
            p.catch((err) => {
              if (this.audio.error) {
                this._switchToFallback();
              } else if (err && err.name === "NotAllowedError") {
                this.pause();
                this.onAutoplayBlocked();
              }
            });
          }
        }
      } else if (this.mode === "tts") {
        this._startSpeechSynthesis();
      }

      this._lastRafTs = performance.now();
      this._scheduleTick();
    }

    pause() {
      this.isPlaying = false;
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      if (this.mode === "mp3") {
        try {
          this.audio.pause();
        } catch (_) {}
      } else if ("speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (_) {}
      }
    }

    seekWithinScene(sec) {
      if (!this.currentScene) return;
      const clamped = Math.max(0, Math.min(sec, this.sceneDuration));
      this.sceneElapsed = clamped;
      if (this.mode === "mp3") {
        const audioLimit = this.currentScene.audio_duration_sec || this.sceneDuration;
        if (clamped < audioLimit) {
          try {
            this.audio.currentTime = clamped;
            if (this.isPlaying && this.audio.paused) {
              this.audio.play().catch(() => {});
            }
          } catch (_) {}
        } else {
          try {
            this.audio.pause();
          } catch (_) {}
        }
      } else if (this.mode === "tts" && this.isPlaying) {
        this._startSpeechSynthesis();
      }
      this.onProgress(this.sceneElapsed, this.sceneDuration);
    }

    setPlaybackRate(rate) {
      this.playbackRate = rate;
      this.audio.playbackRate = rate;
      if (this.mode === "tts" && this.isPlaying) {
        this._startSpeechSynthesis();
      }
    }

    setMuted(muted) {
      this.muted = muted;
      this.audio.muted = muted;
      if (this.mode === "tts" && "speechSynthesis" in window) {
        if (muted) {
          window.speechSynthesis.cancel();
        } else if (this.isPlaying) {
          this._startSpeechSynthesis();
        }
      }
    }

    _scheduleTick() {
      if (this._rafId) cancelAnimationFrame(this._rafId);
      const step = (now) => {
        if (!this.isPlaying) return;
        const dt = Math.min(0.1, Math.max(0, (now - this._lastRafTs) / 1000)) * this.playbackRate;
        this._lastRafTs = now;

        if (
          this.mode === "mp3" &&
          !this.audio.paused &&
          !this.audio.ended &&
          Number.isFinite(this.audio.currentTime)
        ) {
          this.sceneElapsed = this.audio.currentTime;
        } else {
          this.sceneElapsed += dt;
        }

        if (this.sceneElapsed >= this.sceneDuration) {
          this.sceneElapsed = this.sceneDuration;
          this.onProgress(this.sceneElapsed, this.sceneDuration);
          this.isPlaying = false;
          this._rafId = null;
          this.onSceneEnded();
          return;
        }

        this.onProgress(this.sceneElapsed, this.sceneDuration);
        this._rafId = requestAnimationFrame(step);
      };
      this._rafId = requestAnimationFrame(step);
    }

    _stopAllInternal() {
      this.isPlaying = false;
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      try {
        this.audio.pause();
      } catch (_) {}
      if ("speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (_) {}
      }
    }
  }

  window.RoarAudioEngine = AudioEngine;
})();
