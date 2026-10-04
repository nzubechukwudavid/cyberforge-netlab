/**
 * ============================================================================
 * CyberForge - CCNA & Cyber Threat Matrix Interactive Radar Chart
 * Renders an animated polygon radar chart on HTML5 Canvas.
 * ============================================================================
 */

export class SkillsRadar {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl ? canvasEl.getContext('2d') : null;

    this.skills = [
      { label: ['L2/L3 Routing', '(CCNA)'], value: 0.92, full: 'OSPF, VLANs, Trunks, STP, Subnetting' },
      { label: ['Threat Hunting', '& SOC'], value: 0.88, full: 'Wireshark, SIEM Triage, Malware Telemetry' },
      { label: ['Linux Admin', '& Scripting'], value: 0.85, full: 'Bash, Python, Systemd, Netfilter/Iptables' },
      { label: ['Firewall', '& ACLs'], value: 0.82, full: 'Stateful Filtering, NAT/PAT, Port Security' },
      { label: ['Hardware', '& Sys Triage'], value: 0.94, full: 'CompTIA A+, Incident RCA, Disaster Recovery' },
      { label: ['Agentic', 'Workflows'], value: 0.90, full: 'LLM Orchestration, Python Automation' }
    ];

    this.animationProgress = 0;
    this.init();
  }

  init() {
    if (!this.canvas) return;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.animate();
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const size = Math.min(rect.width, 420);
    this.canvas.width = size * (window.devicePixelRatio || 1);
    this.canvas.height = size * (window.devicePixelRatio || 1);
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    this.draw();
  }

  animate() {
    const step = () => {
      this.animationProgress += 0.04;
      this.draw();
      if (this.animationProgress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }

  draw() {
    if (!this.ctx || !this.canvas) return;
    const size = parseFloat(this.canvas.style.width) || 360;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.27;
    const total = this.skills.length;

    this.ctx.clearRect(0, 0, size, size);

    // Draw concentric rings
    const rings = [0.25, 0.5, 0.75, 1.0];
    rings.forEach(r => {
      this.ctx.beginPath();
      for (let i = 0; i < total; i++) {
        const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
        const x = centerX + Math.cos(angle) * radius * r;
        const y = centerY + Math.sin(angle) * radius * r;
        if (i === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }
      this.ctx.closePath();
      this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    });

    // Draw axes & labels
    for (let i = 0; i < total; i++) {
      const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.lineTo(x, y);
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      this.ctx.stroke();

      // Label text
      const labelDist = radius + 22;
      let lx = centerX + Math.cos(angle) * labelDist;
      let ly = centerY + Math.sin(angle) * labelDist;

      this.ctx.fillStyle = '#94a3b8';
      this.ctx.font = '10px JetBrains Mono, monospace';
      
      let align = Math.abs(Math.cos(angle)) < 0.2 ? 'center' : Math.cos(angle) > 0 ? 'left' : 'right';
      const lines = Array.isArray(this.skills[i].label) ? this.skills[i].label : [this.skills[i].label];
      
      // Auto-shift to prevent clipping
      let maxWidth = 0;
      lines.forEach(line => {
         const w = this.ctx.measureText(line).width;
         if (w > maxWidth) maxWidth = w;
      });
      
      const padding = 6;
      if (align === 'right' && (lx - maxWidth < padding)) {
         lx = maxWidth + padding;
      } else if (align === 'left' && (lx + maxWidth > size - padding)) {
         lx = size - maxWidth - padding;
      } else if (align === 'center') {
         if (lx - maxWidth/2 < padding) lx = maxWidth/2 + padding;
         if (lx + maxWidth/2 > size - padding) lx = size - maxWidth/2 - padding;
      }

      this.ctx.textAlign = align;
      this.ctx.textBaseline = 'middle';
      const lh = 12;
      const sy = ly - ((lines.length - 1) * lh) / 2;
      lines.forEach((line, idx) => {
        this.ctx.fillText(line, lx, sy + (idx * lh));
      });
    }

    // Draw polygon
    this.ctx.beginPath();
    for (let i = 0; i < total; i++) {
      const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
      const val = this.skills[i].value * Math.min(1, this.animationProgress);
      const x = centerX + Math.cos(angle) * radius * val;
      const y = centerY + Math.sin(angle) * radius * val;
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.closePath();

    // Fill gradient
    const grad = this.ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, radius);
    grad.addColorStop(0, 'rgba(0, 240, 255, 0.45)');
    grad.addColorStop(1, 'rgba(139, 92, 246, 0.15)');
    this.ctx.fillStyle = grad;
    this.ctx.fill();

    this.ctx.strokeStyle = '#00f0ff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Vertex points
    for (let i = 0; i < total; i++) {
      const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
      const val = this.skills[i].value * Math.min(1, this.animationProgress);
      const x = centerX + Math.cos(angle) * radius * val;
      const y = centerY + Math.sin(angle) * radius * val;

      this.ctx.beginPath();
      this.ctx.arc(x, y, 4, 0, Math.PI * 2);
      this.ctx.fillStyle = '#00f0ff';
      this.ctx.fill();
      this.ctx.strokeStyle = '#05070d';
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
    }
  }
}
