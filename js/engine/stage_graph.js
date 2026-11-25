/**
 * Interactive SVG Stage Overlay (1280 x 720 virtual coordinate space)
 * - Renders ONLY the 2-5 components relevant to the current scene.
 * - Animates real ROS 2 communication packets traveling between components.
 * - Supports click-to-inspect on both components and communication events.
 */
(function () {
  const SVG_NS = "http://www.w3.org/2000/svg";

  const CATEGORY_COLORS = {
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

  class StageGraph {
    constructor(svgRoot, data, callbacks = {}) {
      this.svg = svgRoot;
      this.data = data;
      this.onSelectComponent = callbacks.onSelectComponent || (() => {});
      this.onSelectFlow = callbacks.onSelectFlow || (() => {});

      this.currentScene = null;
      this.packetElements = [];
      this.selectedKey = null;

      this._initDefs();
    }

    _initDefs() {
      this.svg.innerHTML = "";
      const defs = svgEl("defs");

      const glow = svgEl("filter", { id: "packetGlow", x: "-50%", y: "-50%", width: "200%", height: "200%" });
      glow.appendChild(svgEl("feGaussianBlur", { stdDeviation: "3.5", result: "blur" }));
      const merge = svgEl("feMerge");
      merge.appendChild(svgEl("feMergeNode", { in: "blur" }));
      merge.appendChild(svgEl("feMergeNode", { in: "SourceGraphic" }));
      glow.appendChild(merge);
      defs.appendChild(glow);

      this.svg.appendChild(defs);
      this.flowsLayer = svgEl("g", { class: "flows-layer" });
      this.packetsLayer = svgEl("g", { class: "packets-layer" });
      this.nodesLayer = svgEl("g", { class: "nodes-layer" });
      this.svg.appendChild(this.flowsLayer);
      this.svg.appendChild(this.packetsLayer);
      this.svg.appendChild(this.nodesLayer);
    }

    setScene(scene) {
      this.currentScene = scene;
      this.selectedKey = null;
      this.flowsLayer.innerHTML = "";
      this.packetsLayer.innerHTML = "";
      this.nodesLayer.innerHTML = "";
      this.packetElements = [];

      if (!scene) return;

      const compIds = scene.components || [];
      const count = compIds.length;
      const nodePositions = {};

      // Clean horizontal arc in the lower-middle interactive band (y ~ 510..545)
      const marginX = count <= 2 ? 360 : count === 3 ? 250 : count === 4 ? 190 : 145;
      const usableW = 1280 - marginX * 2;
      const nodeW = count >= 5 ? 192 : 216;
      const nodeH = 66;

      compIds.forEach((cid, idx) => {
        const t = count === 1 ? 0.5 : idx / (count - 1);
        const cx = marginX + t * usableW;
        // Subtle arch so multi-hop flows don't overlap collinearly
        const archOffset = count >= 3 ? Math.sin(t * Math.PI) * -28 : 0;
        const cy = 532 + archOffset;
        nodePositions[cid] = { cx, cy, w: nodeW, h: nodeH, idx };
      });

      // Render animated communication conduits + clickable topic pills
      const pairCounts = {};
      (scene.flows || []).forEach((flow, fIdx) => {
        const a = nodePositions[flow.from];
        const b = nodePositions[flow.to];
        const ch = this.data.channels[flow.channel];
        if (!a || !b || !ch) return;

        const pairKey = [flow.from, flow.to].sort().join("::");
        pairCounts[pairKey] = (pairCounts[pairKey] || 0) + 1;
        const pairIdx = pairCounts[pairKey] - 1;

        const dx = b.cx - a.cx;
        const dist = Math.abs(dx);
        const hopSpan = Math.abs(b.idx - a.idx);
        const curveLift = (hopSpan > 1 ? -68 : -30) + (pairIdx % 2 === 1 ? 48 : 0);

        const startX = dx >= 0 ? a.cx + a.w * 0.36 : a.cx - a.w * 0.36;
        const startY = a.cy - a.h * 0.32;
        const endX = dx >= 0 ? b.cx - b.w * 0.36 : b.cx + b.w * 0.36;
        const endY = b.cy - b.h * 0.32;
        const ctrlX = (startX + endX) / 2;
        const ctrlY = Math.min(startY, endY) + curveLift - dist * 0.03;

        const dPath = `M ${startX.toFixed(1)} ${startY.toFixed(1)} Q ${ctrlX.toFixed(1)} ${ctrlY.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
        const fromComp = this.data.components[flow.from];
        const strokeColor = CATEGORY_COLORS[fromComp ? fromComp.category : "perception"] || "#38bdf8";

        const group = svgEl("g", {
          class: "stage-flow-group",
          "data-flow-idx": fIdx
        });

        const hitPath = svgEl("path", { d: dPath, class: "stage-flow-hit" });
        const visPath = svgEl("path", {
          d: dPath,
          class: "stage-flow-path",
          stroke: strokeColor,
          "stroke-dasharray": "6 6"
        });

        // Midpoint on quadratic Bezier (t = 0.5)
        const midX = 0.25 * startX + 0.5 * ctrlX + 0.25 * endX;
        const midY = 0.25 * startY + 0.5 * ctrlY + 0.25 * endY;

        const shortLabel = ch.label.length > 26 ? ch.label.slice(0, 25) + "…" : ch.label;
        const pillW = Math.max(96, shortLabel.length * 6.5 + 22);
        const pillH = 22;

        const pillBg = svgEl("rect", {
          x: (midX - pillW / 2).toFixed(1),
          y: (midY - pillH / 2).toFixed(1),
          width: pillW.toFixed(1),
          height: pillH,
          rx: 11,
          class: "flow-pill-bg",
          stroke: strokeColor
        });

        const pillTxt = svgEl("text", {
          x: midX.toFixed(1),
          y: (midY + 4).toFixed(1),
          "text-anchor": "middle",
          fill: "#e2e8f0",
          "font-family": "JetBrains Mono, Consolas, monospace",
          "font-size": "10.5",
          "font-weight": "600"
        });
        pillTxt.textContent = shortLabel;

        group.appendChild(hitPath);
        group.appendChild(visPath);
        group.appendChild(pillBg);
        group.appendChild(pillTxt);

        group.addEventListener("click", (ev) => {
          ev.stopPropagation();
          this._markSelected(group);
          this.onSelectFlow(flow, midX / 1280, midY / 720);
        });

        this.flowsLayer.appendChild(group);

        // Create 2 staggered glowing packets per flow
        for (let p = 0; p < 2; p++) {
          const pkt = svgEl("circle", {
            r: 5.2,
            fill: "#ffffff",
            stroke: strokeColor,
            "stroke-width": 2.5,
            filter: "url(#packetGlow)",
            style: "cursor: pointer;"
          });
          pkt.addEventListener("click", (ev) => {
            ev.stopPropagation();
            this._markSelected(group);
            this.onSelectFlow(flow, midX / 1280, midY / 720);
          });
          this.packetsLayer.appendChild(pkt);
          this.packetElements.push({
            el: pkt,
            startX,
            startY,
            ctrlX,
            ctrlY,
            endX,
            endY,
            phaseOffset: p * 0.5 + fIdx * 0.21
          });
        }
      });

      // Render the 2-5 interactive component cards
      compIds.forEach((cid, idx) => {
        const comp = this.data.components[cid];
        const pos = nodePositions[cid];
        if (!comp || !pos) return;

        const accent = CATEGORY_COLORS[comp.category] || "#38bdf8";
        const g = svgEl("g", {
          class: "stage-node",
          transform: `translate(${(pos.cx - pos.w / 2).toFixed(1)}, ${(pos.cy - pos.h / 2).toFixed(1)})`
        });

        const box = svgEl("rect", {
          x: 0,
          y: 0,
          width: pos.w,
          height: pos.h,
          rx: 13,
          class: "node-box",
          stroke: accent
        });

        const topStripe = svgEl("rect", {
          x: 14,
          y: 0,
          width: pos.w - 28,
          height: 2.6,
          rx: 1.3,
          fill: accent
        });

        const badgeTxt = svgEl("text", {
          x: 14,
          y: 22,
          fill: accent,
          "font-family": "JetBrains Mono, Consolas, monospace",
          "font-size": "9.8",
          "font-weight": "700"
        });
        badgeTxt.textContent = comp.badge || comp.category.toUpperCase();

        const inspectDot = svgEl("circle", {
          cx: pos.w - 15,
          cy: 18,
          r: 3.5,
          fill: accent,
          opacity: "0.8"
        });

        const titleTxt = svgEl("text", {
          x: 14,
          y: 43,
          fill: "#f8fafc",
          "font-family": "Inter, system-ui, sans-serif",
          "font-size": pos.w < 200 ? "12" : "13",
          "font-weight": "700"
        });
        const maxChars = pos.w < 200 ? 22 : 25;
        titleTxt.textContent = comp.name.length > maxChars ? comp.name.slice(0, maxChars - 1) + "…" : comp.name;

        const pkgTxt = svgEl("text", {
          x: 14,
          y: 57,
          fill: "#94a3b8",
          "font-family": "JetBrains Mono, Consolas, monospace",
          "font-size": "9.5"
        });
        const shortPkg = comp.package_name.split(" ")[0];
        pkgTxt.textContent = shortPkg.length > 26 ? shortPkg.slice(0, 25) + "…" : shortPkg;

        g.appendChild(box);
        g.appendChild(topStripe);
        g.appendChild(badgeTxt);
        g.appendChild(inspectDot);
        g.appendChild(titleTxt);
        g.appendChild(pkgTxt);

        // Staggered entrance animation
        g.style.opacity = "0";
        setTimeout(() => {
          g.style.opacity = "1";
        }, 45 * idx);

        g.addEventListener("click", (ev) => {
          ev.stopPropagation();
          this._markSelected(g);
          this.onSelectComponent(cid, pos.cx / 1280, pos.cy / 720);
        });

        this.nodesLayer.appendChild(g);
      });
    }

    _markSelected(el) {
      this.clearSelection();
      el.classList.add("selected");
      this.selectedKey = el;
    }

    clearSelection() {
      if (this.selectedKey) {
        this.selectedKey.classList.remove("selected");
        this.selectedKey = null;
      }
    }

    renderPackets(animTimeSec) {
      for (const pkt of this.packetElements) {
        const t = (animTimeSec * 0.58 + pkt.phaseOffset) % 1;
        const inv = 1 - t;
        const x = inv * inv * pkt.startX + 2 * inv * t * pkt.ctrlX + t * t * pkt.endX;
        const y = inv * inv * pkt.startY + 2 * inv * t * pkt.ctrlY + t * t * pkt.endY;
        const alpha = Math.sin(t * Math.PI);
        pkt.el.setAttribute("cx", x.toFixed(1));
        pkt.el.setAttribute("cy", y.toFixed(1));
        pkt.el.setAttribute("opacity", (0.25 + 0.75 * alpha).toFixed(2));
      }
    }
  }

  window.RoarStageGraph = StageGraph;
})();
