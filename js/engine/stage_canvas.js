/**
 * 60 FPS Canvas 2D Visual Storytelling Engine (1280 x 720 logical space)
 * Renders bespoke animated explanations in the upper arena (y: 48..445)
 * so learners understand every concept visually by watching.
 */
(function () {
  class StageCanvas {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.visualMode = "rover_loop";
      this.sceneProgress = 0; // 0..1
      this.animClock = 0;

      // Deterministic pseudo-random stars/dust/points for crisp visuals
      this.particles = Array.from({ length: 95 }, (_, i) => ({
        x: ((i * 137.5) % 1280),
        y: ((i * 89.3) % 430) + 30,
        z: ((i * 53) % 100) / 100,
        r: 1.2 + (i % 4) * 0.65,
        kind: i % 7 === 0 ? "outlier" : i % 3 === 0 ? "rock" : "ground"
      }));

      this._resize();
      window.addEventListener("resize", () => this._resize());
    }

    _resize() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(640, Math.round((rect.width || 1280) * dpr));
      const h = Math.max(360, Math.round((rect.height || 720) * dpr));
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
    }

    setMode(mode) {
      this.visualMode = mode || "rover_loop";
    }

    render(dt, isPlaying, sceneProgress) {
      this._resize();
      // Subtle ambient motion even when paused so hover/inspection feels alive, full speed when playing
      this.animClock += dt * (isPlaying ? 1.0 : 0.12);
      this.sceneProgress = Math.max(0, Math.min(1, sceneProgress || 0));

      const ctx = this.ctx;
      const sx = this.canvas.width / 1280;
      const sy = this.canvas.height / 720;

      ctx.save();
      ctx.scale(sx, sy);

      this._drawBackdrop(ctx);

      switch (this.visualMode) {
        case "readiness_gates":
          this._drawReadinessGates(ctx);
          break;
        case "dual_highway":
          this._drawDualHighway(ctx);
          break;
        case "mission_tour":
        case "waypoint_sequence":
        case "return_home":
          this._drawMissionTour(ctx, this.visualMode === "return_home");
          break;
        case "world_synthesis":
          this._drawWorldSynthesis(ctx);
          break;
        case "rover_variants":
          this._drawRoverVariants(ctx);
          break;
        case "gz_bridge":
          this._drawGzBridge(ctx);
          break;
        case "solar_degradation":
          this._drawSolarDegradation(ctx);
          break;
        case "encoder_pulses":
          this._drawEncoderPulses(ctx);
          break;
        case "pointcloud_clean":
          this._drawPointCloudClean(ctx);
          break;
        case "ransac_slope":
          this._drawRansacSlope(ctx);
          break;
        case "dbscan_boxes":
          this._drawDbscanBoxes(ctx);
          break;
        case "ema_memory":
          this._drawEmaMemory(ctx);
          break;
        case "aruco_pnp":
          this._drawArucoPnp(ctx);
          break;
        case "ieskf_predict":
          this._drawIeskfPredict(ctx);
          break;
        case "fuzzy_balance":
          this._drawFuzzyBalance(ctx);
          break;
        case "zupt_lock":
          this._drawZuptLock(ctx);
          break;
        case "kalman_heightmap":
          this._drawKalmanHeightmap(ctx);
          break;
        case "costmap_fusion":
          this._drawCostmapFusion(ctx);
          break;
        case "bt_orchestration":
          this._drawBtOrchestration(ctx);
          break;
        case "dstar_wave":
        case "dstar_incremental":
          this._drawDstarGrid(ctx, this.visualMode === "dstar_incremental");
          break;
        case "mppi_rollouts":
          this._drawMppiRollouts(ctx);
          break;
        case "six_wheel_drive":
          this._drawSixWheelDrive(ctx);
          break;
        case "coord_injection":
          this._drawCoordInjection(ctx);
          break;
        case "judge_vs_batch":
          this._drawJudgeVsBatch(ctx);
          break;
        case "pebble_vs_boulder":
          this._drawPebbleVsBoulder(ctx);
          break;
        case "kill_vs_timeout":
          this._drawKillVsTimeout(ctx);
          break;
        case "edge_caliper":
          this._drawEdgeCaliper(ctx);
          break;
        case "erc_score_bar":
          this._drawErcScoreBar(ctx);
          break;
        case "html_dashboards":
          this._drawHtmlDashboards(ctx);
          break;
        case "rover_loop":
        default:
          this._drawRoverLoop(ctx);
          break;
      }

      ctx.restore();
    }

    _drawBackdrop(ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, 720);
      grad.addColorStop(0, "#070a11");
      grad.addColorStop(0.62, "#0b101b");
      grad.addColorStop(1, "#07090f");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 720);

      // Subtle perspective grid in upper visual arena
      ctx.strokeStyle = "rgba(148, 163, 184, 0.05)";
      ctx.lineWidth = 1;
      for (let x = 80; x < 1280; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 48);
        ctx.lineTo(x, 445);
        ctx.stroke();
      }
      for (let y = 80; y < 445; y += 60) {
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(1240, y);
        ctx.stroke();
      }

      // Soft horizon divider above interactive node strip
      const divGrad = ctx.createLinearGradient(120, 446, 1160, 446);
      divGrad.addColorStop(0, "rgba(255,255,255,0)");
      divGrad.addColorStop(0.5, "rgba(255,255,255,0.08)");
      divGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = divGrad;
      ctx.beginPath();
      ctx.moveTo(120, 446);
      ctx.lineTo(1160, 446);
      ctx.stroke();
    }

    _drawRoverTopDown(ctx, x, y, angle, scale = 1.0) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.scale(scale, scale);

      // 6 Rocker-bogie wheels
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = "#ff5c35";
      ctx.lineWidth = 1.8;
      const wheelOffsets = [
        [-22, -20], [0, -22], [22, -20],
        [-22, 14], [0, 16], [22, 14]
      ];
      for (const [wx, wy] of wheelOffsets) {
        ctx.beginPath();
        ctx.roundRect(wx - 7, wy, 14, 6, 2);
        ctx.fill();
        ctx.stroke();
      }

      // Chassis body
      ctx.fillStyle = "#f1f5f9";
      ctx.beginPath();
      ctx.roundRect(-24, -13, 48, 26, 6);
      ctx.fill();

      // ZED2i front camera bar
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.roundRect(16, -9, 7, 18, 2);
      ctx.fill();

      // BNO055 center core
      ctx.fillStyle = "#34d399";
      ctx.beginPath();
      ctx.arc(-4, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    _pillLabel(ctx, x, y, text, color = "#38bdf8") {
      ctx.save();
      ctx.font = "600 12px 'JetBrains Mono', monospace";
      const w = ctx.measureText(text).width + 20;
      ctx.fillStyle = "rgba(10, 14, 23, 0.86)";
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y - 13, w, 24, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#f8fafc";
      ctx.textAlign = "center";
      ctx.fillText(text, x, y + 3);
      ctx.restore();
    }

    // 1. Closed-loop Rover on Marsyard
    _drawRoverLoop(ctx) {
      const t = (this.animClock * 0.22) % 1;
      // Mars boulders
      const rocks = [
        { x: 520, y: 245, r: 28 },
        { x: 770, y: 195, r: 22 },
        { x: 660, y: 335, r: 19 }
      ];

      // Planned curve avoiding rocks
      ctx.strokeStyle = "rgba(52, 211, 153, 0.45)";
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(220, 310);
      ctx.bezierCurveTo(430, 340, 560, 120, 1020, 225);
      ctx.stroke();
      ctx.setLineDash([]);

      for (const rk of rocks) {
        ctx.fillStyle = "rgba(244, 63, 94, 0.14)";
        ctx.beginPath();
        ctx.arc(rk.x, rk.y, rk.r + 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#be123c";
        ctx.strokeStyle = "#fb7185";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(rk.x, rk.y, rk.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Target beacon
      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(1020, 225, 16 + Math.sin(this.animClock * 4) * 3, 0, Math.PI * 2);
      ctx.stroke();
      this._pillLabel(ctx, 1020, 185, "GOAL WAYPOINT", "#34d399");

      // Interpolate rover on Bezier
      const u = 1 - t;
      const rx = u*u*u*220 + 3*u*u*t*430 + 3*u*t*t*560 + t*t*t*1020;
      const ry = u*u*u*310 + 3*u*u*t*340 + 3*u*t*t*120 + t*t*t*225;
      const dt2 = Math.min(1, t + 0.02);
      const u2 = 1 - dt2;
      const rx2 = u2*u2*u2*220 + 3*u2*u2*dt2*430 + 3*u2*dt2*dt2*560 + dt2*dt2*dt2*1020;
      const ry2 = u2*u2*u2*310 + 3*u2*u2*dt2*340 + 3*u2*dt2*dt2*120 + dt2*dt2*dt2*225;
      const ang = Math.atan2(ry2 - ry, rx2 - rx);

      // Sensor frustum cone
      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(ang);
      const coneGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 190);
      coneGrad.addColorStop(0, "rgba(56, 189, 248, 0.32)");
      coneGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.arc(18, 0, 185, -0.46, 0.46);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      this._drawRoverTopDown(ctx, rx, ry, ang, 1.15);
    }

    // 2. Readiness Gates
    _drawReadinessGates(ctx) {
      const p = this.sceneProgress;
      const stages = [
        { x: 210, title: "1. Gazebo Sim", gate: "Spawn Rover", readyAt: 0.08 },
        { x: 495, title: "Gate 1 Check", gate: "/diff_drive_controller/odom", readyAt: 0.34 },
        { x: 785, title: "Gate 2 Check", gate: "/navigate_to_pose", readyAt: 0.64 },
        { x: 1070, title: "4. Referee & WP", gate: "Mission Live", readyAt: 0.86 }
      ];

      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(210, 245);
      ctx.lineTo(1070, 245);
      ctx.stroke();

      const activeEnd = 210 + (1070 - 210) * Math.min(1, p * 1.08);
      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(210, 245);
      ctx.lineTo(activeEnd, 245);
      ctx.stroke();

      stages.forEach((st) => {
        const unlocked = p >= st.readyAt;
        const col = unlocked ? "#34d399" : "#f43f5e";
        ctx.fillStyle = "rgba(13, 18, 29, 0.94)";
        ctx.strokeStyle = col;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(st.x - 108, 178, 216, 134, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = col;
        ctx.font = "700 22px 'Inter', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(unlocked ? "✓ READY" : "⏳ WAIT", st.x, 224);

        ctx.fillStyle = "#f8fafc";
        ctx.font = "700 15px 'Inter', sans-serif";
        ctx.fillText(st.title, st.x, 258);

        ctx.fillStyle = "#94a3b8";
        ctx.font = "600 11px 'JetBrains Mono', monospace";
        ctx.fillText(st.gate, st.x, 286);
      });
    }

    // 3. Dual Highway
    _drawDualHighway(ctx) {
      const t = this.animClock;
      const lanes = [
        { y: 170, color: "#38bdf8", label: "3D PointCloud → 2.5D Terrain → /unified_costmap" },
        { y: 310, color: "#a78bfa", label: "100 Hz IMU + Encoders → 12D IESKF → /odom + TF" }
      ];

      lanes.forEach((ln, idx) => {
        ctx.strokeStyle = ln.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(170, ln.y);
        ctx.bezierCurveTo(560, ln.y, 700, 240, 940, 240);
        ctx.stroke();
        this._pillLabel(ctx, 430, ln.y - 28, ln.label, ln.color);

        for (let i = 0; i < 5; i++) {
          const u = ((t * 0.45 + i * 0.2 + idx * 0.1) % 1);
          const inv = 1 - u;
          const px = inv*inv*inv*170 + 3*inv*inv*u*560 + 3*inv*u*u*700 + u*u*u*940;
          const py = inv*inv*inv*ln.y + 3*inv*inv*u*ln.y + 3*inv*u*u*240 + u*u*u*240;
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(px, py, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      this._pillLabel(ctx, 940, 195, "D* Lite + MPPI", "#fbbf24");
      this._drawRoverTopDown(ctx, 1085, 240, Math.sin(t * 2) * 0.18, 1.3);
    }

    // 4. Mission Tour (WP1..WP4 -> Start)
    _drawMissionTour(ctx, emphasizeReturn) {
      const pts = [
        { x: 250, y: 335, label: "START (0,0)" },
        { x: 430, y: 150, label: "WP 1" },
        { x: 690, y: 135, label: "WP 2" },
        { x: 960, y: 185, label: "WP 3" },
        { x: 870, y: 345, label: "WP 4" },
        { x: 250, y: 335, label: "FINISH" }
      ];

      ctx.strokeStyle = "rgba(52, 211, 153, 0.32)";
      ctx.lineWidth = 3;
      ctx.setLineDash([7, 6]);
      ctx.beginPath();
      pts.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
      ctx.stroke();
      ctx.setLineDash([]);

      const totalSegs = pts.length - 1;
      const rawProg = emphasizeReturn
        ? 0.78 + 0.22 * ((this.animClock * 0.35) % 1)
        : (this.animClock * 0.16) % 1;
      const segFloat = rawProg * totalSegs;
      const segIdx = Math.min(totalSegs - 1, Math.floor(segFloat));
      const localT = segFloat - segIdx;

      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i <= segIdx; i++) ctx.lineTo(pts[i].x, pts[i].y);
      const rx = pts[segIdx].x + (pts[segIdx + 1].x - pts[segIdx].x) * localT;
      const ry = pts[segIdx].y + (pts[segIdx + 1].y - pts[segIdx].y) * localT;
      ctx.lineTo(rx, ry);
      ctx.stroke();

      pts.slice(0, 5).forEach((pt, idx) => {
        const reached = idx <= segIdx;
        ctx.fillStyle = idx === 0 ? "#0ea5e9" : reached ? "#34d399" : "#1e293b";
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, idx === 0 ? 13 : 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        this._pillLabel(ctx, pt.x, pt.y - 26, pt.label, idx === 0 ? "#38bdf8" : "#34d399");
      });

      const ang = Math.atan2(pts[segIdx + 1].y - pts[segIdx].y, pts[segIdx + 1].x - pts[segIdx].x);
      this._drawRoverTopDown(ctx, rx, ry, ang, 1.05);
    }

    // 5. Offline World Synthesis (3 Worlds: 8 / 50 / 90 rocks)
    _drawWorldSynthesis(ctx) {
      const cards = [
        { x: 260, title: "World 1 · Low", rocks: 8, col: "#34d399" },
        { x: 640, title: "World 2 · Medium", rocks: 24, col: "#fbbf24" },
        { x: 1020, title: "World 3 · High", rocks: 44, col: "#ff5c35" }
      ];

      cards.forEach((c, cIdx) => {
        ctx.fillStyle = "rgba(15, 22, 34, 0.9)";
        ctx.strokeStyle = c.col;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(c.x - 155, 110, 310, 265, 16);
        ctx.fill();
        ctx.stroke();

        this._pillLabel(ctx, c.x, 110, c.title, c.col);

        for (let i = 0; i < c.rocks; i++) {
          const rx = c.x - 125 + ((i * 67 + cIdx * 29) % 250);
          const ry = 152 + ((i * 43 + cIdx * 17) % 190);
          ctx.fillStyle = i % 5 === 0 ? "#38bdf8" : c.col;
          ctx.beginPath();
          ctx.arc(rx, ry, i % 5 === 0 ? 5 : 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // 6. Rover Variants (Clean / Noise / Full + Arm)
    _drawRoverVariants(ctx) {
      const variants = [
        { x: 270, name: "Clean Variant", sub: "Ideal RGB-D Pass-Through", arm: false, noise: false, col: "#34d399" },
        { x: 640, name: "Noisy Variant", sub: "Dust + Glare + Encoder Pulses", arm: false, noise: true, col: "#fbbf24" },
        { x: 1010, name: "Full + 6-DOF Arm", sub: "Manipulator + Full Degradation", arm: true, noise: true, col: "#ff5c35" }
      ];

      variants.forEach((v, idx) => {
        const pulse = Math.floor((this.animClock * 0.7) % 3) === idx;
        ctx.fillStyle = pulse ? "rgba(25, 34, 52, 0.95)" : "rgba(13, 18, 28, 0.85)";
        ctx.strokeStyle = pulse ? v.col : "rgba(255,255,255,0.14)";
        ctx.lineWidth = pulse ? 2.8 : 1.5;
        ctx.beginPath();
        ctx.roundRect(v.x - 155, 115, 310, 260, 16);
        ctx.fill();
        ctx.stroke();

        this._pillLabel(ctx, v.x, 115, v.name, v.col);

        // Side-view rover silhouette
        const by = 268;
        ctx.fillStyle = "#e2e8f0";
        ctx.beginPath();
        ctx.roundRect(v.x - 56, by - 26, 112, 24, 6);
        ctx.fill();

        [-42, 0, 42].forEach((wx) => {
          ctx.fillStyle = "#1e293b";
          ctx.strokeStyle = v.col;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(v.x + wx, by + 12, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });

        if (v.arm) {
          const a1 = -0.7 + Math.sin(this.animClock * 2.2) * 0.25;
          const j1x = v.x + 25 + Math.cos(a1) * 44;
          const j1y = by - 26 + Math.sin(a1) * 44;
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 5;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(v.x + 25, by - 26);
          ctx.lineTo(j1x, j1y);
          ctx.lineTo(j1x + 34, j1y + 12);
          ctx.stroke();
        }

        ctx.fillStyle = "#94a3b8";
        ctx.font = "600 12px 'Inter', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(v.sub, v.x, 342);
      });
    }

    // 7. Gazebo <-> ROS 2 Bridge
    _drawGzBridge(ctx) {
      this._pillLabel(ctx, 260, 115, "Gazebo Physics World", "#ff5c35");
      this._pillLabel(ctx, 640, 115, "ros_gz_bridge", "#fbbf24");
      this._pillLabel(ctx, 1020, 115, "ROS 2 Jazzy Bus", "#38bdf8");

      this._drawRoverTopDown(ctx, 260, 250, Math.sin(this.animClock * 1.5) * 0.2, 1.35);

      ctx.fillStyle = "rgba(251, 191, 36, 0.12)";
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(565, 150, 150, 210, 18);
      ctx.fill();
      ctx.stroke();

      const streams = [
        { y: 175, name: "/clock (100 Hz)", col: "#e2e8f0" },
        { y: 220, name: "/bno055/data (100 Hz)", col: "#a78bfa" },
        { y: 265, name: "/zed2i/image & depth (5 Hz)", col: "#38bdf8" },
        { y: 310, name: "/rover_contact (7 links)", col: "#f43f5e" }
      ];

      streams.forEach((s, idx) => {
        ctx.strokeStyle = s.col;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(350, s.y);
        ctx.lineTo(910, s.y);
        ctx.stroke();

        const px = 350 + (((this.animClock * 0.55 + idx * 0.22) % 1) * 560);
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(px, s.y, 4.5, 0, Math.PI * 2);
        ctx.fill();

        this._pillLabel(ctx, 1035, s.y, s.name, s.col);
      });
    }

    // 8. Solar Glare + Dust + Z^2 Depth Noise
    _drawSolarDegradation(ctx) {
      // Sun marker at top-left projecting into camera frame
      const sunX = 210, sunY = 135;
      const sunGrad = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 95);
      sunGrad.addColorStop(0, "#fef08a");
      sunGrad.addColorStop(0.4, "rgba(251, 191, 36, 0.55)");
      sunGrad.addColorStop(1, "rgba(251, 191, 36, 0)");
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 95, 0, Math.PI * 2);
      ctx.fill();
      this._pillLabel(ctx, sunX, 82, "sun_marker (20, 20, 15)", "#fbbf24");

      // Degraded RGB Viewport
      ctx.fillStyle = "#1c1317";
      ctx.strokeStyle = "#ff5c35";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(405, 118, 340, 240, 14);
      ctx.fill();
      ctx.stroke();
      this._pillLabel(ctx, 575, 115, "Degraded RGB (Dust + Glare)", "#ff5c35");

      const glareX = 535 + Math.sin(this.animClock * 1.1) * 45;
      const glareY = 205;
      const bloom = ctx.createRadialGradient(glareX, glareY, 6, glareX, glareY, 85);
      bloom.addColorStop(0, "rgba(255,255,255,0.92)");
      bloom.addColorStop(0.5, "rgba(255,190,90,0.42)");
      bloom.addColorStop(1, "rgba(255,190,90,0)");
      ctx.fillStyle = bloom;
      ctx.beginPath();
      ctx.arc(glareX, glareY, 85, 0, Math.PI * 2);
      ctx.fill();

      // Dust speckles
      ctx.fillStyle = "rgba(180, 120, 80, 0.85)";
      for (let i = 0; i < 36; i++) {
        const dx = 420 + ((i * 73 + Math.floor(this.animClock * 18)) % 310);
        const dy = 140 + ((i * 41) % 200);
        ctx.fillRect(dx, dy, 3, 3);
      }

      // Quadratic Depth Noise Curve (sigma = 0.003 * Z^2)
      ctx.fillStyle = "#0c1524";
      ctx.strokeStyle = "#38bdf8";
      ctx.beginPath();
      ctx.roundRect(815, 118, 340, 240, 14);
      ctx.fill();
      ctx.stroke();
      this._pillLabel(ctx, 985, 115, "Depth σ = 0.003·Z² + NaN Hole", "#38bdf8");

      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const u = i / 40;
        const x = 845 + u * 280;
        const y = 325 - u * u * 165;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = "#94a3b8";
      ctx.font = "600 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("Distance Z (0.2m → 15m)", 985, 346);
    }

    // 9. Encoder Pulses
    _drawEncoderPulses(ctx) {
      const wheelX = 310, wheelY = 245;
      ctx.save();
      ctx.translate(wheelX, wheelY);
      ctx.rotate(this.animClock * 2.2);
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = "#ff5c35";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 78, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      for (let a = 0; a < 12; a++) {
        ctx.rotate(Math.PI / 6);
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.lineTo(74, 0);
        ctx.stroke();
      }
      ctx.restore();
      this._pillLabel(ctx, wheelX, 135, "wheel_lhs/rhs_mid_joint", "#ff5c35");

      // Digital pulse train
      ctx.fillStyle = "rgba(12, 18, 30, 0.9)";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(490, 140, 620, 210, 14);
      ctx.fill();
      ctx.stroke();
      this._pillLabel(ctx, 800, 140, "Quantized Pulses (201,554 pulses / rev)", "#38bdf8");

      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      const shift = (this.animClock * 90) % 44;
      for (let x = 520; x < 1080; x += 22) {
        const high = Math.floor((x + shift) / 22) % 2 === 0;
        const y = high ? 205 : 285;
        ctx.lineTo(x, y);
        ctx.lineTo(x + 22, y);
      }
      ctx.stroke();
    }

    // 10. Point Cloud ROI + Voxel + SOR/ROR
    _drawPointCloudClean(ctx) {
      const cx = 640, cy = 248, roiR = 152;
      ctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.arc(cx, cy, roiR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      this._pillLabel(ctx, cx, cy - roiR - 18, "Stage 0–3: GPU ROI (<6.0m) + 6cm Voxel + SOR/ROR", "#38bdf8");

      const sweep = (this.animClock * 0.45) % 1;
      for (const p of this.particles) {
        const px = 290 + (p.x / 1280) * 700;
        const py = 105 + ((p.y - 30) / 430) * 290;
        const dist = Math.hypot(px - cx, py - cy);
        const inside = dist <= roiR;
        if (!inside) {
          ctx.fillStyle = "rgba(148, 163, 184, 0.16)";
          ctx.fillRect(px, py, 3, 3);
        } else if (p.kind === "outlier") {
          const alpha = Math.max(0, 1 - sweep * 1.6);
          ctx.fillStyle = `rgba(244, 63, 94, ${alpha.toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Voxel snapped
          const vx = Math.round(px / 14) * 14;
          const vy = Math.round(py / 14) * 14;
          ctx.fillStyle = "#38bdf8";
          ctx.fillRect(vx - 3, vy - 3, 6, 6);
        }
      }
    }

    // 11. Slope-Aware RANSAC (<=45 deg ramp stripped, 80 deg boulder kept)
    _drawRansacSlope(ctx) {
      // Ground + 30 deg traversable ramp
      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(180, 345);
      ctx.lineTo(540, 345);
      ctx.lineTo(790, 225);
      ctx.stroke();
      ctx.setLineDash([]);

      this._pillLabel(ctx, 360, 378, "Flat Ground (Stripped ✓)", "#34d399");
      this._pillLabel(ctx, 665, 312, "30° Ramp ≤ 45° (Stripped ✓)", "#34d399");

      // Steep 80 deg boulder face (KEPT!)
      ctx.fillStyle = "rgba(255, 92, 53, 0.22)";
      ctx.strokeStyle = "#ff5c35";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(855, 345);
      ctx.lineTo(875, 148);
      ctx.lineTo(955, 136);
      ctx.lineTo(1015, 210);
      ctx.lineTo(1035, 345);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Chaotic surface normals on sharp rock
      const rockPts = [[875, 160, -24, -8], [915, 142, -6, -26], [965, 152, 22, -16], [1005, 205, 26, -4]];
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2.2;
      for (const [rx, ry, nx, ny] of rockPts) {
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + nx, ry + ny);
        ctx.stroke();
      }
      this._pillLabel(ctx, 945, 104, "80° Steep Boulder + High Roughness (KEPT!)", "#ff5c35");
    }

    // 12. DBSCAN + Shape Gate
    _drawDbscanBoxes(ctx) {
      const clusters = [
        { x: 330, y: 245, w: 92, h: 86, col: "#38bdf8", ok: true, label: "Rock #1 · Valid BBox" },
        { x: 640, y: 235, w: 110, h: 98, col: "#34d399", ok: true, label: "Rock #2 · Valid BBox" },
        { x: 965, y: 295, w: 190, h: 24, col: "#f43f5e", ok: false, label: "Flat Slab sz/sy > 6 (Rejected ✕)" }
      ];

      clusters.forEach((c) => {
        ctx.fillStyle = c.ok ? "rgba(56, 189, 248, 0.1)" : "rgba(244, 63, 94, 0.1)";
        ctx.strokeStyle = c.col;
        ctx.lineWidth = 2.4;
        if (!c.ok) ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.roundRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h, 6);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);

        for (let i = 0; i < 16; i++) {
          const px = c.x - c.w * 0.36 + ((i * 37) % Math.max(20, c.w * 0.72));
          const py = c.y - c.h * 0.32 + ((i * 23) % Math.max(10, c.h * 0.64));
          ctx.fillStyle = c.col;
          ctx.beginPath();
          ctx.arc(px, py, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
        this._pillLabel(ctx, c.x, c.y - c.h / 2 - 22, c.label, c.col);
      });
    }

    // 13. EMA World Memory
    _drawEmaMemory(ctx) {
      this._drawRoverTopDown(ctx, 320, 265, -0.18, 1.2);
      const tx = 760, ty = 225;
      // Jittery raw detections
      const jx = tx + Math.sin(this.animClock * 9) * 18;
      const jy = ty + Math.cos(this.animClock * 7) * 15;
      ctx.strokeStyle = "rgba(244, 63, 94, 0.55)";
      ctx.lineWidth = 1.6;
      ctx.strokeRect(jx - 26, jy - 26, 52, 52);

      // EMA smoothed world box
      ctx.fillStyle = "rgba(52, 211, 153, 0.18)";
      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 3;
      ctx.strokeRect(tx - 28, ty - 28, 56, 56);
      ctx.fillRect(tx - 28, ty - 28, 56, 56);

      this._pillLabel(ctx, tx, ty - 50, "EMA Smoothed (α=0.35) · 4.0s Persistence", "#34d399");
    }

    // 14. ArUco 6-DOF SolvePnP
    _drawArucoPnp(ctx) {
      this._drawRoverTopDown(ctx, 310, 265, 0, 1.25);

      const mx = 845, my = 235, sz = 116;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(mx - sz / 2, my - sz / 2, sz, sz);
      ctx.fillStyle = "#090d16";
      ctx.fillRect(mx - sz / 2 + 12, my - sz / 2 + 12, sz - 24, sz - 24);
      // 4x4 internal fiducial bits
      const bits = [[0,0],[2,0],[1,1],[3,1],[0,2],[2,2],[1,3]];
      ctx.fillStyle = "#ffffff";
      bits.forEach(([bx, by]) => {
        ctx.fillRect(mx - 34 + bx * 17, my - 34 + by * 17, 15, 15);
      });

      // 6-DOF RGB Coordinate Axes
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#ef4444"; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + 78, my); ctx.stroke();
      ctx.strokeStyle = "#22c55e"; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx, my - 78); ctx.stroke();
      ctx.strokeStyle = "#3b82f6"; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx - 48, my + 42); ctx.stroke();

      ctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(345, 265);
      ctx.lineTo(mx - sz / 2, my);
      ctx.stroke();
      ctx.setLineDash([]);

      this._pillLabel(ctx, mx, 118, "ArUco ID · SOLVEPNP_IPPE_SQUARE (6-DOF)", "#a78bfa");
    }

    // 15. 100 Hz IESKF Predict
    _drawIeskfPredict(ctx) {
      const t = (this.animClock * 0.28) % 1;
      const rx = 250 + t * 760;
      const ry = 255 + Math.sin(t * Math.PI * 2) * 48;

      ctx.strokeStyle = "rgba(167, 139, 250, 0.45)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= 50; i++) {
        const u = (i / 50) * t;
        const px = 250 + u * 760;
        const py = 255 + Math.sin(u * Math.PI * 2) * 48;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Growing covariance ellipse between updates
      const grow = 22 + ((t * 4) % 1) * 34;
      ctx.fillStyle = "rgba(56, 189, 248, 0.14)";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(rx, ry, grow * 1.4, grow * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      this._drawRoverTopDown(ctx, rx, ry, Math.cos(t * Math.PI * 2) * 0.35, 1.1);
      this._pillLabel(ctx, 640, 115, "12D Nominal State: [ p(3), v(3), b_a(3), b_w(3) ] @ 100 Hz", "#a78bfa");
    }

    // 16. Sugeno Fuzzy Logic (WO-FIS k_Q & VO-FIS k_V)
    _drawFuzzyBalance(ctx) {
      const phase = Math.sin(this.animClock * 1.4);
      const kQ = phase > 0 ? 1 + phase * 9 : 1.2;
      const kV = phase < 0 ? 1 + (-phase) * 85 : 2.0;

      const drawGauge = (x, title, val, maxVal, color, desc) => {
        ctx.fillStyle = "rgba(14, 20, 33, 0.92)";
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.roundRect(x - 210, 125, 420, 240, 16);
        ctx.fill();
        ctx.stroke();

        this._pillLabel(ctx, x, 125, title, color);

        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.beginPath();
        ctx.roundRect(x - 165, 225, 330, 24, 12);
        ctx.fill();

        const fillW = Math.max(18, (val / maxVal) * 330);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x - 165, 225, fillW, 24, 12);
        ctx.fill();

        ctx.fillStyle = "#f8fafc";
        ctx.font = "700 28px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(val.toFixed(1) + "×", x, 198);

        ctx.fillStyle = "#94a3b8";
        ctx.font = "600 13px 'Inter', sans-serif";
        ctx.fillText(desc, x, 295);
      };

      drawGauge(390, "WO-FIS · Wheel Slip Gain k_Q", kQ, 10, "#ff5c35",
        kQ > 3.5 ? "Sand Slip Detected → Trust Vision More" : "Clean Traction → Nominal Q_v");
      drawGauge(890, "VO-FIS · Visual Jump Gain k_V", kV, 100, "#38bdf8",
        kV > 15 ? "Visual Glitch / Glare → Trust Wheels More" : "High ZED Confidence → Tight Update");
    }

    // 17. ZUPT 4-Gate Stationary Drift Reset
    _drawZuptLock(ctx) {
      const locked = ((this.animClock * 0.45) % 1) > 0.35;
      const gates = ["|v_L| < 0.02 m/s", "|v_R| < 0.02 m/s", "|ω_z| < 0.05 rad/s", "Var(a) < 0.05 (0.5s)"];

      gates.forEach((g, i) => {
        const gx = 240 + i * 265;
        ctx.fillStyle = locked ? "rgba(52, 211, 153, 0.16)" : "rgba(255,255,255,0.05)";
        ctx.strokeStyle = locked ? "#34d399" : "#64748b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(gx - 115, 112, 230, 52, 12);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#f8fafc";
        ctx.font = "700 12px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText((locked ? "✓ " : "• ") + g, gx, 143);
      });

      const rad = locked ? 26 : 82;
      ctx.fillStyle = locked ? "rgba(52, 211, 153, 0.2)" : "rgba(251, 191, 36, 0.14)";
      ctx.strokeStyle = locked ? "#34d399" : "#fbbf24";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(640, 285, rad * 1.4, rad, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      this._drawRoverTopDown(ctx, 640, 285, 0, 1.2);
      if (locked) {
        this._pillLabel(ctx, 640, 385, "ZUPT FIRED: v = [0,0,0] → Drift & Accel Bias Collapsed!", "#34d399");
      }
    }

    // 18. 2.5D Kalman Terrain Mapping
    _drawKalmanHeightmap(ctx) {
      // Base 2.5D isometric grid
      const ox = 640, oy = 150;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const ix = ox + (c - r) * 44;
          const iy = oy + (c + r) * 20;
          const isBoulder = r === 4 && c === 4;
          const h = isBoulder ? 46 * Math.min(1, this.sceneProgress * 1.6) : 0;
          ctx.fillStyle = isBoulder ? "rgba(244, 63, 94, 0.72)" : "rgba(30, 41, 59, 0.75)";
          ctx.strokeStyle = isBoulder ? "#fb7185" : "rgba(56, 189, 248, 0.25)";
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(ix, iy - h);
          ctx.lineTo(ix + 40, iy + 18 - h);
          ctx.lineTo(ix, iy + 36 - h);
          ctx.lineTo(ix - 40, iy + 18 - h);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
      this._pillLabel(ctx, 310, 150, "Floating Ghost Box → Rejected ✕", "#f43f5e");
      this._pillLabel(ctx, 960, 150, "Kalman Variance < 0.025 m² → Stamped ✓", "#34d399");
    }

    // 19. Unified Costmap Fusion
    _drawCostmapFusion(ctx) {
      const cols = 18, rows = 8, cell = 36;
      const sx = 640 - (cols * cell) / 2, sy = 115;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const d1 = Math.hypot(c - 6, r - 4);
          const d2 = Math.hypot(c - 13, r - 3);
          const d = Math.min(d1, d2);
          let fill = "rgba(15, 23, 42, 0.85)";
          if (d < 1.3) fill = "rgba(244, 63, 94, 0.92)"; // 100 Lethal
          else if (d < 2.6) fill = "rgba(255, 92, 53, 0.62)"; // Inscribed/High Inflation
          else if (d < 4.0) fill = "rgba(251, 191, 36, 0.34)"; // Slope / Soft Inflation
          else if ((c + r) % 5 === 0) fill = "rgba(56, 189, 248, 0.16)"; // Mild roughness

          ctx.fillStyle = fill;
          ctx.strokeStyle = "rgba(255,255,255,0.06)";
          ctx.fillRect(sx + c * cell, sy + r * cell, cell - 1, cell - 1);
        }
      }
      this._pillLabel(ctx, 640, 92, "/unified_costmap: 0 Free · 1–99 Slope/Roughness/Inflation · 100 Lethal", "#fbbf24");
    }

    // 20. BT Orchestration
    _drawBtOrchestration(ctx) {
      const pulseLeft = Math.floor(this.animClock * 1.5) % 2 === 0;
      this._pillLabel(ctx, 640, 125, "Behavior Tree Root (100 Hz Tick)", "#34d399");

      const branches = [
        { x: 370, y: 275, label: "ComputePathToPose (D* Lite)", active: pulseLeft, col: "#38bdf8" },
        { x: 640, y: 275, label: "FollowPath (MPPI @ 20 Hz)", active: !pulseLeft, col: "#fbbf24" },
        { x: 910, y: 275, label: "Recovery: Spin / BackUp / Wait", active: false, col: "#f43f5e" }
      ];

      branches.forEach((b) => {
        ctx.strokeStyle = b.active ? b.col : "rgba(255,255,255,0.16)";
        ctx.lineWidth = b.active ? 3.5 : 1.8;
        ctx.beginPath();
        ctx.moveTo(640, 142);
        ctx.lineTo(b.x, b.y - 35);
        ctx.stroke();

        ctx.fillStyle = b.active ? "rgba(24, 34, 54, 0.96)" : "rgba(13, 18, 28, 0.85)";
        ctx.beginPath();
        ctx.roundRect(b.x - 122, b.y - 35, 244, 70, 14);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#f8fafc";
        ctx.font = "700 13px 'Inter', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(b.label, b.x, b.y + 5);
      });
    }

    // 21. D* Lite Wave & Incremental Repair
    _drawDstarGrid(ctx, isIncremental) {
      const cols = 18, rows = 7, cell = 38;
      const sx = 640 - (cols * cell) / 2, sy = 128;
      const dropped = isIncremental && this.sceneProgress > 0.25;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const staticObs = (c === 7 && r >= 1 && r <= 4);
          const dynObs = dropped && (c === 11 && r >= 2 && r <= 4);
          const localRepair = dropped && Math.hypot(c - 11, r - 3) < 2.6 && !dynObs;

          ctx.fillStyle = staticObs || dynObs
            ? "rgba(244, 63, 94, 0.88)"
            : localRepair
            ? "rgba(251, 191, 36, 0.28)"
            : "rgba(15, 23, 42, 0.72)";
          ctx.strokeStyle = "rgba(255,255,255,0.07)";
          ctx.fillRect(sx + c * cell, sy + r * cell, cell - 2, cell - 2);
        }
      }

      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sx + 1.5 * cell, sy + 3.5 * cell);
      if (!dropped) {
        ctx.bezierCurveTo(sx + 5 * cell, sy + 6.2 * cell, sx + 9 * cell, sy + 5.2 * cell, sx + 16.5 * cell, sy + 3.5 * cell);
      } else {
        ctx.bezierCurveTo(sx + 5 * cell, sy + 6.2 * cell, sx + 11 * cell, sy + 0.5 * cell, sx + 16.5 * cell, sy + 3.5 * cell);
      }
      ctx.stroke();

      this._pillLabel(
        ctx,
        640,
        102,
        isIncremental ? "D* Lite Incremental Update: Only Affected Cells Recomputed" : "D* Lite Backward Search + 3-Pass Path Smoothing",
        "#34d399"
      );
    }

    // 22. MPPI 2,000 Rollouts
    _drawMppiRollouts(ctx) {
      const rx = 310, ry = 265;
      const obsX = 685, obsY = 235, obsR = 38;

      // Obstacle + inflation
      ctx.fillStyle = "rgba(244, 63, 94, 0.16)";
      ctx.beginPath();
      ctx.arc(obsX, obsY, obsR + 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e11d48";
      ctx.beginPath();
      ctx.arc(obsX, obsY, obsR, 0, Math.PI * 2);
      ctx.fill();

      // Fan of candidate trajectories
      for (let i = -14; i <= 14; i++) {
        const spread = i * 11;
        const midY = ry + spread * 1.35 + Math.sin(this.animClock * 3 + i) * 4;
        const endY = 215 + spread * 1.9;
        const hitsObs = Math.abs(midY - obsY) < 52;

        ctx.strokeStyle = hitsObs ? "rgba(244, 63, 94, 0.34)" : "rgba(56, 189, 248, 0.24)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(rx + 20, ry);
        ctx.quadraticCurveTo(640, midY, 960, endY);
        ctx.stroke();
      }

      // Optimal weighted rollout
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(rx + 20, ry);
      ctx.quadraticCurveTo(640, 122, 985, 195);
      ctx.stroke();

      this._drawRoverTopDown(ctx, rx, ry, -0.16, 1.3);
      this._pillLabel(ctx, 640, 98, "MPPI @ 20 Hz: 2,000 Rollouts (2.8s Horizon) Scored by 8 Critics", "#fbbf24");
    }

    // 23. 6-Wheel Rocker-Bogie Differential Kinematics
    _drawSixWheelDrive(ctx) {
      this._drawRoverTopDown(ctx, 640, 248, -0.22, 2.35);
      this._pillLabel(ctx, 355, 185, "Left 3 Wheels: ω_L = (v - ω·L/2) / r", "#38bdf8");
      this._pillLabel(ctx, 925, 315, "Right 3 Wheels: ω_R = (v + ω·L/2) / r", "#ff5c35");
      this._pillLabel(ctx, 640, 102, "L = 0.61m Separation · r = 0.125m Wheel Radius", "#34d399");
    }

    // 24. Grid-to-Metric Coordinate Injection
    _drawCoordInjection(ctx) {
      this._pillLabel(ctx, 340, 118, "wpXX.npy Grid (col, row)", "#38bdf8");
      this._pillLabel(ctx, 930, 118, "Metric World (x, y) Meters", "#34d399");

      ctx.fillStyle = "rgba(14, 20, 32, 0.9)";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(195, 150, 290, 210, 14);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "#34d399";
      ctx.beginPath();
      ctx.roundRect(785, 150, 290, 210, 14);
      ctx.fill();
      ctx.stroke();

      const rows = [
        ["WP1: [82, 101]", "x = 2.07m, y = 17.56m"],
        ["WP2: [64, 111]", "x = -2.43m, y = 20.06m"],
        ["WP3: [62, 138]", "x = -2.93m, y = 26.81m"],
        ["Home: [74, 31]", "Start/End = (0.00, 0.00)"]
      ];
      ctx.font = "600 13px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      rows.forEach(([l, r], idx) => {
        const y = 198 + idx * 42;
        ctx.fillStyle = "#cbd5e1";
        ctx.fillText(l, 340, y);
        ctx.fillStyle = "#86efac";
        ctx.fillText(r, 930, y);
      });

      this._pillLabel(ctx, 635, 255, "origin + idx × res", "#fbbf24");
    }

    // 25. Judge Mode vs Batch Mode
    _drawJudgeVsBatch(ctx) {
      const panels = [
        { x: 375, title: "Competition Judge Mode", line1: "Stops at each Waypoint", line2: "Waits for Judge [Enter] / Retry / Skip", col: "#fbbf24" },
        { x: 905, title: "Automated Batch Pipeline", line1: "Queues Worlds 1..3 × WP 0..299", line2: "Auto-advances + 20-Min Watchdog", col: "#38bdf8" }
      ];
      panels.forEach((p) => {
        ctx.fillStyle = "rgba(14, 20, 32, 0.92)";
        ctx.strokeStyle = p.col;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.roundRect(p.x - 215, 135, 430, 215, 16);
        ctx.fill();
        ctx.stroke();
        this._pillLabel(ctx, p.x, 135, p.title, p.col);
        ctx.fillStyle = "#f8fafc";
        ctx.font = "700 16px 'Inter', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(p.line1, p.x, 225);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "600 13px 'JetBrains Mono', monospace";
        ctx.fillText(p.line2, p.x, 268);
      });
    }

    // 26. Safe Pebbles {5..9} vs Collidable Boulder
    _drawPebbleVsBoulder(ctx) {
      // Left: safe pebble pass
      this._pillLabel(ctx, 370, 118, "Mesh ID ∈ {5, 6, 7, 8, 9} → Safe Pebble (Ignored ✓)", "#34d399");
      ctx.fillStyle = "#a855f7";
      ctx.beginPath();
      ctx.arc(370, 290, 11, 0, Math.PI * 2);
      ctx.fill();
      this._drawRoverTopDown(ctx, 345 + Math.sin(this.animClock * 2) * 30, 275, 0, 1.15);

      // Right: solid boulder collision flag
      this._pillLabel(ctx, 910, 118, "Collidable Boulder → /rover/collision_flag = True!", "#f43f5e");
      ctx.fillStyle = "#e11d48";
      ctx.strokeStyle = "#fda4af";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(955, 275, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      this._drawRoverTopDown(ctx, 885, 275, 0, 1.15);
    }

    // 27. Instant KILL vs 1200s TIMEOUT
    _drawKillVsTimeout(ctx) {
      const boxes = [
        { x: 380, title: "Collision or Out-of-Bounds", badge: "TERMINAL: KILL", score: "0 / 300 PTS", col: "#f43f5e" },
        { x: 900, title: "Sim Clock > 1200s (20 Min)", badge: "TERMINAL: TIMEOUT", score: "KEEPS EARNED PTS", col: "#fbbf24" }
      ];
      boxes.forEach((b) => {
        ctx.fillStyle = "rgba(14, 19, 30, 0.92)";
        ctx.strokeStyle = b.col;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(b.x - 210, 130, 420, 225, 16);
        ctx.fill();
        ctx.stroke();
        this._pillLabel(ctx, b.x, 130, b.title, b.col);
        ctx.fillStyle = b.col;
        ctx.font = "800 24px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(b.badge, b.x, 222);
        ctx.fillStyle = "#f8fafc";
        ctx.font = "700 18px 'Inter', sans-serif";
        ctx.fillText(b.score, b.x, 275);
      });
    }

    // 28. Edge-Distance Caliper (d_edge = max(0, d_center - 0.5))
    _drawEdgeCaliper(ctx) {
      const wx = 640, wy = 248;
      // 1.0m acceptance circle
      ctx.fillStyle = "rgba(52, 211, 153, 0.08)";
      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(wx, wy, 135, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);

      // Waypoint center pin
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(wx, wy, 8, 0, Math.PI * 2);
      ctx.fill();

      // Parked rover inside 1.0m ring (r = 0.5m = 67.5px)
      const rx = wx - 84, ry = wy + 18;
      ctx.fillStyle = "rgba(56, 189, 248, 0.16)";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(rx, ry, 67, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      this._drawRoverTopDown(ctx, rx, ry, -0.2, 1.05);

      // Caliper line
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(wx, wy);
      ctx.stroke();

      this._pillLabel(ctx, 640, 96, "speed < 0.05 m/s · d_edge = max(0, d_center − 0.5m) → round(30 − 6·d_edge)", "#34d399");
    }

    // 29. 300-Point ERC Score Bar
    _drawErcScoreBar(ctx) {
      const segments = [
        { label: "O/NAV-010 Waypoints", pts: 120, col: "#34d399" },
        { label: "O/NAV-020 Autonomy", pts: 100, col: "#38bdf8" },
        { label: "O/NAV-030 Return", pts: 25, col: "#a78bfa" },
        { label: "O/NAV-040 Return Auto", pts: 25, col: "#fbbf24" },
        { label: "O/NAV-050 Plan Legs", pts: 30, col: "#ff5c35" }
      ];

      const barX = 190, barY = 215, totalW = 900, barH = 54;
      const reveal = Math.min(1, 0.25 + this.sceneProgress * 0.95);
      let cursor = barX;

      segments.forEach((s) => {
        const segW = (s.pts / 300) * totalW * reveal;
        ctx.fillStyle = s.col;
        ctx.beginPath();
        ctx.roundRect(cursor + 2, barY, Math.max(4, segW - 4), barH, 8);
        ctx.fill();

        if (segW > 65) {
          ctx.fillStyle = "#080b12";
          ctx.font = "800 15px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          ctx.fillText(`+${s.pts}`, cursor + segW / 2, barY + 33);
        }
        cursor += (s.pts / 300) * totalW * reveal;
      });

      this._pillLabel(ctx, 640, 138, `ERC Official Traverse Score: ${Math.round(300 * reveal)} / 300 Points`, "#34d399");

      segments.forEach((s, i) => {
        const lx = 215 + i * 212;
        this._pillLabel(ctx, lx, 325, `${s.label} (${s.pts})`, s.col);
      });
    }

    // 30. HTML Report Dashboards
    _drawHtmlDashboards(ctx) {
      const cards = [
        { x: 255, title: "ERC_Report_Live.html", metric: "294 / 300", sub: "Official Traverse", col: "#ff5c35" },
        { x: 512, title: "slam_score_report.html", metric: "0.04m", sub: "APE Drift Curve", col: "#a78bfa" },
        { x: 768, title: "perception/dashboard.html", metric: "3D IoU & F1", sub: "Rock & ArUco Eval", col: "#38bdf8" },
        { x: 1025, title: "master_report_batch.html", metric: "Worlds 1–3", sub: "Pass Rate Matrix", col: "#34d399" }
      ];
      cards.forEach((c) => {
        ctx.fillStyle = "rgba(14, 19, 30, 0.94)";
        ctx.strokeStyle = c.col;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(c.x - 112, 138, 224, 210, 14);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = c.col;
        ctx.font = "800 22px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(c.metric, c.x, 228);

        ctx.fillStyle = "#f8fafc";
        ctx.font = "700 12px 'JetBrains Mono', monospace";
        ctx.fillText(c.title, c.x, 272);

        ctx.fillStyle = "#94a3b8";
        ctx.font = "600 12px 'Inter', sans-serif";
        ctx.fillText(c.sub, c.x, 304);
      });
    }
  }

  window.RoarStageCanvas = StageCanvas;
})();
