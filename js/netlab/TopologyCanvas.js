/**
 * ============================================================================
 * CyberForge NetLab - Dynamic Topology Visualizer & 60FPS Particle Renderer
 * Dual Layer: SVG Container (Nodes, Links, Status Badges) + HTML5 Canvas (Photons)
 * Supports Mobile Touch (Pinch-to-zoom, Drag & Pan) and Click Interactivity.
 * ============================================================================
 */

export class TopologyCanvas {
  constructor({ svgEl, canvasEl, networkGraph, packetEngine, soundFx, onNodeSelect, onLinkTap }) {
    this.soundFx = soundFx;
    this.hintBar = document.getElementById('topology-hint-bar');
    this.wireStartNodeId = null;
    this.wireMousePos = null;
    this.hintTimer = null;
    this.svg = svgEl;
    this.canvas = canvasEl;
    this.ctx = canvasEl ? canvasEl.getContext('2d') : null;
    this.graph = networkGraph;
    this.packetEngine = packetEngine;
    this.onNodeSelect = onNodeSelect;
    this.onLinkTap = onLinkTap;

    this.selectedNodeId = null;
    this.activeTool = 'SELECT'; // 'SELECT' | 'CABLE' | 'SNIFFER' | 'PING'
    
    // Zoom and Pan State
    this.scale = 1;
    this.panX = 0;
    this.panY = 0;

    // Particle Animation Pool
    this.particles = [];
    this.animationFrameId = null;

    // Node Dragging State
    this.draggedNode = null;
    this.dragOffset = { x: 0, y: 0 };

    this.initCanvasSize();
    this.initListeners();
    this.startAnimationLoop();

    // Subscribe to graph & packet events
    this.graph.subscribe((event) => {
      this.render();
    });

    if (this.packetEngine) {
      this.packetEngine.subscribe((event, data) => {
        if (event === 'PACKET_TRANSMIT') {
          this.spawnPacketParticles(data.packet, data.hops, data.reverse);
        } else if (event === 'PACKET_DROPPED') {
          this.spawnDropEffect(data.hop, data.reason);
        }
      });
    }

    this.render();
  }

  initCanvasSize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * (window.devicePixelRatio || 1);
    this.canvas.height = rect.height * (window.devicePixelRatio || 1);
    this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  }

  setTool(tool) {
    this.activeTool = tool;
    this.wireStartNodeId = null;
    this.wireMousePos = null;
    const oldLine = this.svg?.querySelector('#dynamic-wire-line');
    if (oldLine) oldLine.remove();

    if (tool === 'WIRE') {
      this.showHint('⚡ [WIRE TOOL] Click first device, then click second device to link them.');
    } else if (tool === 'CABLE') {
      this.showHint('✂️ [CUT/SPLICE] Click any wire to cut or repair the connection.');
    } else if (tool === 'SNIFFER') {
      this.showHint('🔍 [SNIFFER TAP] Click any wire to attach the Pocket Wireshark sniffer.');
    } else {
      this.hideHint();
    }
    this.render();
  }

  showHint(msg, timeout = 0) {
    if (!this.hintBar) this.hintBar = document.getElementById('topology-hint-bar');
    if (!this.hintBar) return;
    this.hintBar.innerHTML = msg;
    this.hintBar.style.display = 'flex';
    if (this.hintTimer) clearTimeout(this.hintTimer);
    if (timeout > 0) {
      this.hintTimer = setTimeout(() => this.hideHint(), timeout);
    }
  }

  hideHint() {
    if (!this.hintBar) this.hintBar = document.getElementById('topology-hint-bar');
    if (!this.hintBar) return;
    this.hintBar.style.display = 'none';
  }

  deleteSelected() {
    if (!this.selectedNodeId) {
      this.showHint('⚠️ Click a device first to select it for deletion.', 2500);
      return;
    }
    const node = this.graph.getNode(this.selectedNodeId);
    const name = node ? node.name : this.selectedNodeId;
    this.graph.removeNode(this.selectedNodeId);
    this.selectedNodeId = null;
    if (this.soundFx) this.soundFx.playKeypress();
    this.showHint(`🗑️ Deleted device: <strong>${name}</strong>`, 2500);
    this.render();
  }

  initListeners() {
    window.addEventListener('resize', () => {
      this.initCanvasSize();
      this.render();
    });

    // Keyboard shortcut: Delete or Backspace to delete selected device
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedNodeId) {
        const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault();
          this.deleteSelected();
        }
      }
      if (e.key === 'Escape' && this.activeTool === 'WIRE') {
        this.wireStartNodeId = null;
        this.wireMousePos = null;
        const oldLine = this.svg.querySelector('#dynamic-wire-line');
        if (oldLine) oldLine.remove();
        this.hideHint();
        this.render();
      }
    });

    // Node Dragging via SVG
    this.svg.addEventListener('mousedown', (e) => this.handlePointerDown(e));
    window.addEventListener('mousemove', (e) => this.handlePointerMove(e));
    window.addEventListener('mouseup', () => this.handlePointerUp());

    // Touch Support for Mobile
    this.svg.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.handlePointerDown(e.touches[0]);
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this.draggedNode) {
        this.handlePointerMove(e.touches[0]);
      }
    }, { passive: false });

    window.addEventListener('touchend', () => this.handlePointerUp());
  }

  handlePointerDown(e) {
    const target = e.target.closest('.node-group');
    if (target) {
      const nodeId = target.getAttribute('data-node-id');
      const node = this.graph.getNode(nodeId);

      // --- WIRE TOOL INTERACTION ---
      if (this.activeTool === 'WIRE') {
        if (!this.wireStartNodeId) {
          this.wireStartNodeId = nodeId;
          const rect = this.svg.getBoundingClientRect();
          this.wireMousePos = { x: (e.clientX || e.pageX) - rect.left, y: (e.clientY || e.pageY) - rect.top };
          this.showHint(`⚡ Cable started from <strong>${node.name}</strong>. Now click target device.`);
          if (this.soundFx) this.soundFx.playKeypress();
          this.render();
          return;
        } else {
          if (this.wireStartNodeId !== nodeId) {
            const srcNode = this.graph.getNode(this.wireStartNodeId);
            const existingLink = Array.from(this.graph.links.values()).find(
              l => (l.sourceNodeId === this.wireStartNodeId && l.targetNodeId === nodeId) ||
                   (l.sourceNodeId === nodeId && l.targetNodeId === this.wireStartNodeId)
            );

            if (!existingLink) {
              this.graph.addLink({
                sourceNodeId: this.wireStartNodeId,
                targetNodeId: nodeId,
                status: 'OPERATIONAL'
              });
              if (this.soundFx) this.soundFx.playSuccess();
              this.showHint(`✓ Cable connected: <strong>${srcNode.name}</strong> ⟷ <strong>${node.name}</strong>!`, 3000);
            } else {
              this.showHint(`⚠️ Devices are already connected by cable.`, 2500);
            }
          }
          this.wireStartNodeId = null;
          this.wireMousePos = null;
          const oldLine = this.svg.querySelector('#dynamic-wire-line');
          if (oldLine) oldLine.remove();
          this.render();
          return;
        }
      }

      // --- SELECT / POINTER DRAGGING ---
      if (node) {
        this.selectedNodeId = nodeId;
        this.draggedNode = node;
        const rect = this.svg.getBoundingClientRect();
        this.dragOffset.x = (e.clientX - rect.left) - node.x;
        this.dragOffset.y = (e.clientY - rect.top) - node.y;
        if (this.onNodeSelect) this.onNodeSelect(nodeId);
        this.render();
      }
    } else {
      if (this.activeTool === 'WIRE' && this.wireStartNodeId) {
        this.wireStartNodeId = null;
        this.wireMousePos = null;
        const oldLine = this.svg.querySelector('#dynamic-wire-line');
        if (oldLine) oldLine.remove();
        this.showHint('⚡ [WIRE TOOL] Click first device, then click second device to link them.');
        this.render();
      }
    }
  }

  handlePointerMove(e) {
    const rect = this.svg.getBoundingClientRect();
    const mouseX = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const mouseY = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    if (this.activeTool === 'WIRE' && this.wireStartNodeId) {
      this.wireMousePos = { x: mouseX, y: mouseY };
      this.updateDynamicWireLine();
      return;
    }

    if (!this.draggedNode) return;
    const rawX = mouseX - this.dragOffset.x;
    this.draggedNode.x = Math.max(40, Math.min(rect.width - 40, Math.round(rawX / 10) * 10));
    const rawY = mouseY - this.dragOffset.y;
    this.draggedNode.y = Math.max(40, Math.min(rect.height - 40, Math.round(rawY / 10) * 10));
    this.render();
  }

  updateDynamicWireLine() {
    let wireEl = this.svg.querySelector('#dynamic-wire-line');
    const srcNode = this.graph.getNode(this.wireStartNodeId);
    if (!srcNode || !this.wireMousePos) {
      if (wireEl) wireEl.remove();
      return;
    }

    if (!wireEl) {
      wireEl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      wireEl.id = 'dynamic-wire-line';
      wireEl.setAttribute('stroke', '#00f0ff');
      wireEl.setAttribute('stroke-width', '2.5');
      wireEl.setAttribute('stroke-dasharray', '6 3');
      wireEl.setAttribute('stroke-linecap', 'round');
      wireEl.style.filter = 'drop-shadow(0 0 8px #00f0ff)';
      const linksLayer = this.svg.querySelector('.links-layer');
      if (linksLayer) linksLayer.appendChild(wireEl);
      else this.svg.appendChild(wireEl);
    }

    wireEl.setAttribute('x1', srcNode.x);
    wireEl.setAttribute('y1', srcNode.y);
    wireEl.setAttribute('x2', this.wireMousePos.x);
    wireEl.setAttribute('y2', this.wireMousePos.y);
  }

  handlePointerUp() {
    this.draggedNode = null;
  }

  /**
   * SVG Rendering of Nodes & Links
   */
  render() {
    if (!this.svg) return;

    let linksHtml = '';
    let nodesHtml = '';

    // Render Links
    for (const link of this.graph.links.values()) {
      const srcNode = this.graph.getNode(link.sourceNodeId);
      const dstNode = this.graph.getNode(link.targetNodeId);
      if (!srcNode || !dstNode) continue;

      const isOperational = link.status === 'OPERATIONAL';
      const statusClass = link.status.toLowerCase();
      const mediaClass = (link.mediaType || 'COPPER_STRAIGHT').toLowerCase().replace('_', '-');
      
      const midX = (srcNode.x + dstNode.x) / 2;
      const midY = (srcNode.y + dstNode.y) / 2;

      // Calculate Vector for Interface Port Badges
      const dx = dstNode.x - srcNode.x;
      const dy = dstNode.y - srcNode.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let portBadgesHtml = '';

      if (dist > 75) {
        const ux = dx / dist;
        const uy = dy / dist;
        const offset = 44; // distance from node center

        const p1x = Math.round(srcNode.x + ux * offset);
        const p1y = Math.round(srcNode.y + uy * offset);
        const p2x = Math.round(dstNode.x - ux * offset);
        const p2y = Math.round(dstNode.y - uy * offset);

        const srcPort = link.sourceInterface || (srcNode.type === 'switch' ? 'Fa0/1' : srcNode.type === 'router' ? 'Gi0/0' : 'eth0');
        const dstPort = link.targetInterface || (dstNode.type === 'switch' ? 'Fa0/2' : dstNode.type === 'router' ? 'Gi0/1' : 'eth0');

        portBadgesHtml = `
          <!-- Source Interface Badge -->
          <g class="port-badge" transform="translate(${p1x}, ${p1y})">
            <rect x="-14" y="-7" width="28" height="14" rx="3" />
            <text x="0" y="3.5" text-anchor="middle">${srcPort}</text>
            <title>${srcNode.name} [${srcPort}] - 1000BASE-T Full-Duplex</title>
          </g>
          <!-- Target Interface Badge -->
          <g class="port-badge" transform="translate(${p2x}, ${p2y})">
            <rect x="-14" y="-7" width="28" height="14" rx="3" />
            <text x="0" y="3.5" text-anchor="middle">${dstPort}</text>
            <title>${dstNode.name} [${dstPort}] - 1000BASE-T Full-Duplex</title>
          </g>
        `;
      }

      linksHtml += `
        <g class="link-group" data-link-id="${link.id}">
          <line x1="${srcNode.x}" y1="${srcNode.y}" x2="${dstNode.x}" y2="${dstNode.y}" 
                class="link-line ${statusClass} ${mediaClass}" />
          
          <!-- Clickable Wider Invisible Hitbox -->
          <line x1="${srcNode.x}" y1="${srcNode.y}" x2="${dstNode.x}" y2="${dstNode.y}" 
                stroke="transparent" stroke-width="18" style="cursor:pointer;" />
          
          ${portBadgesHtml}

          ${link.hasSnifferTap ? `
            <g class="sniffer-tap-badge" transform="translate(${midX - 12}, ${midY - 12})">
              <circle cx="12" cy="12" r="10" fill="#0f172a" stroke="#8b5cf6" stroke-width="2"/>
              <text x="12" y="15" font-size="10" fill="#c084fc" text-anchor="middle" font-family="monospace">🔍</text>
            </g>
          ` : ''}

          <!-- Status Indicator Dot -->
          <circle cx="${midX}" cy="${midY}" r="4" 
                  fill="${isOperational ? '#10b981' : '#ef4444'}" 
                  stroke="#05070d" stroke-width="1.5" />
        </g>
      `;
    }

    // Render Nodes
    for (const node of this.graph.nodes.values()) {
      const isSelected = node.id === this.selectedNodeId;
      const glyph = this.getNodeSvgGlyph(node.type);
      const ipText = node.interfaces[0]?.ip || '';

      nodesHtml += `
        <g class="node-group ${isSelected ? 'selected' : ''}" 
           data-node-id="${node.id}" 
           transform="translate(${node.x}, ${node.y})">
          
          ${node.id === this.wireStartNodeId ? `
            <circle cx="0" cy="0" r="36" fill="rgba(0,240,255,0.12)" stroke="#00f0ff" stroke-width="2.5" stroke-dasharray="6 3" />
          ` : (isSelected ? `
            <circle cx="0" cy="0" r="32" fill="none" stroke="#00f0ff" stroke-width="1.5" stroke-dasharray="4 2" />
          ` : '')}

          <!-- Node Base Glyph -->
          ${glyph}

          <!-- Node Labels -->
          <text x="0" y="38" class="node-label">${node.name}</text>
          ${ipText ? `<text x="0" y="48" class="node-sublabel">${ipText}</text>` : ''}
        </g>
      `;
    }

    this.svg.innerHTML = `
      <defs>
        <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g class="viewport-content">
        <g class="links-layer">${linksHtml}</g>
        <g class="nodes-layer">${nodesHtml}</g>
      </g>
    `;

    // Attach link click listeners
    this.svg.querySelectorAll('.link-group').forEach(group => {
      group.addEventListener('click', (e) => {
        const linkId = group.getAttribute('data-link-id');
        if (this.activeTool === 'SNIFFER') {
          this.graph.toggleSnifferTap(linkId);
        } else if (this.activeTool === 'CABLE') {
          this.graph.toggleLinkStatus(linkId);
        } else {
          // Default: toggle status
          this.graph.toggleLinkStatus(linkId);
        }
        if (this.onLinkTap) this.onLinkTap(linkId);
      });
    });
  }

  getNodeSvgGlyph(type) {
    switch (type) {
      case 'router':
        return `
          <circle cx="0" cy="0" r="22" fill="#0f172a" stroke="#00f0ff" stroke-width="2" />
          <path d="M-10 -6 L10 6 M-10 6 L10 -6 M-10 0 L10 0 M0 -10 L0 10" stroke="#00f0ff" stroke-width="1.5" />
        `;
      case 'switch':
        return `
          <rect x="-24" y="-14" width="48" height="28" rx="4" fill="#0f172a" stroke="#8b5cf6" stroke-width="2" />
          <path d="M-16 -4 L16 -4 M-16 4 L16 4 M-12 -8 L-16 -4 L-12 0 M12 0 L16 4 L12 8" stroke="#8b5cf6" stroke-width="1.5" />
        `;
      case 'firewall':
        return `
          <polygon points="0,-22 20,-8 16,18 -16,18 -20,-8" fill="#0f172a" stroke="#ef4444" stroke-width="2" />
          <text x="0" y="5" font-size="12" fill="#ef4444" text-anchor="middle" font-family="monospace">🛡️</text>
        `;
      case 'server':
        return `
          <rect x="-18" y="-22" width="36" height="44" rx="4" fill="#0f172a" stroke="#10b981" stroke-width="2" />
          <line x1="-12" y1="-10" x2="12" y2="-10" stroke="#10b981" stroke-width="1" />
          <line x1="-12" y1="2" x2="12" y2="2" stroke="#10b981" stroke-width="1" />
          <line x1="-12" y1="14" x2="12" y2="14" stroke="#10b981" stroke-width="1" />
          <circle cx="10" cy="-16" r="2" fill="#10b981" />
        `;
      default: // Host / PC
        return `
          <rect x="-20" y="-16" width="40" height="26" rx="3" fill="#0f172a" stroke="#cbd5e1" stroke-width="2" />
          <rect x="-16" y="-12" width="32" height="18" rx="1" fill="#060914" />
          <polygon points="-6,10 6,10 10,18 -10,18" fill="#475569" />
        `;
    }
  }

  /**
   * 60 FPS Particle Photon Animation Engine
   */
  spawnPacketParticles(packet, hops, reverse = false) {
    if (!hops || hops.length === 0) return;

    let color = '#00f0ff'; // Cyan default (ICMP)
    if (packet.protocol === 'ARP') color = '#fbbf24'; // Yellow
    if (packet.protocol === 'DNS') color = '#c084fc'; // Purple
    if (packet.protocol === 'HTTP') color = '#34d399'; // Emerald

    hops.forEach((link, hopIndex) => {
      const srcNode = this.graph.getNode(reverse ? link.targetNodeId : link.sourceNodeId);
      const dstNode = this.graph.getNode(reverse ? link.sourceNodeId : link.targetNodeId);
      if (!srcNode || !dstNode) return;

      this.particles.push({
        startX: srcNode.x,
        startY: srcNode.y,
        endX: dstNode.x,
        endY: dstNode.y,
        color,
        progress: 0,
        speed: 0.035,
        delay: hopIndex * 14, // Staggered hop progression
        age: 0
      });
    });
  }

  spawnDropEffect(link, reason) {
    if (!link) return;
    const srcNode = this.graph.getNode(link.sourceNodeId);
    const dstNode = this.graph.getNode(link.targetNodeId);
    if (!srcNode || !dstNode) return;

    const midX = (srcNode.x + dstNode.x) / 2;
    const midY = (srcNode.y + dstNode.y) / 2;

    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      this.particles.push({
        startX: midX,
        startY: midY,
        endX: midX + Math.cos(angle) * 35,
        endY: midY + Math.sin(angle) * 35,
        color: '#ef4444',
        progress: 0,
        speed: 0.06,
        delay: 0,
        age: 0
      });
    }
  }

  startAnimationLoop() {
    const loop = () => {
      this.updateAndDrawParticles();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  updateAndDrawParticles() {
    if (!this.ctx || !this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age++;

      if (p.age < p.delay) continue;

      p.progress += p.speed;

      if (p.progress >= 1) {
        this.particles.splice(i, 1);
        continue;
      }

      // Linear interpolation
      const curX = p.startX + (p.endX - p.startX) * p.progress;
      const curY = p.startY + (p.endY - p.startY) * p.progress;

      // Draw glowing photon bullet
      this.ctx.save();
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = p.color;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(curX, curY, 4, 0, Math.PI * 2);
      this.ctx.fill();

      // Tail
      this.ctx.strokeStyle = p.color;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(curX, curY);
      const tailX = curX - (p.endX - p.startX) * 0.08;
      const tailY = curY - (p.endY - p.startY) * 0.08;
      this.ctx.lineTo(tailX, tailY);
      this.ctx.stroke();

      this.ctx.restore();
    }
  }
}
