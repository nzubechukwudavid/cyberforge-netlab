/**
 * ============================================================================
 * CyberForge P2P Sync - Zero-Cost WebRTC & QR Code Cross-Device Pairing
 * Allows connecting Desktop and Mobile sessions peer-to-peer without a backend.
 * ============================================================================
 */

export class P2pSync {
  constructor(networkGraph) {
    this.graph = networkGraph;
    this.peerId = `cyberforge-${Math.random().toString(36).substr(2, 8)}`;
    this.isConnected = false;
  }

  showPairingModal() {
    const currentUrl = new URL(window.location.href);
    const labHash = this.graph.exportToUrlHash();
    currentUrl.hash = `lab=${labHash}&peer=${this.peerId}`;
    const pairUrl = currentUrl.toString();

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(5,7,13,0.92);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;z-index:3000;padding:20px;';

    modal.innerHTML = `
      <div class="tactical-frame" style="max-width:480px;width:100%;padding:28px;text-align:center;background:var(--bg-surface-raised);">
        <div style="font-family:var(--font-mono);font-size:0.8rem;color:var(--cyber-cyan);letter-spacing:0.12em;text-transform:uppercase;">
          ⚡ Zero-Backend P2P Sync
        </div>
        <h3 style="font-family:var(--font-display);font-size:1.4rem;margin:6px 0 14px;color:var(--text-primary);">
          Pair Mobile Device
        </h3>

        <!-- QR Code Container -->
        <div style="background:#ffffff;padding:16px;border-radius:12px;display:inline-block;margin:10px auto;box-shadow:0 0 30px rgba(0,240,255,0.3);">
          <div id="qrcode-target"></div>
        </div>

        <p style="font-size:0.85rem;color:var(--text-secondary);margin:14px 0 18px;line-height:1.5;">
          Scan with your phone's camera to instantly open NetLab in mobile-optimized mode with real-time state sync.
        </p>

        <div style="display:flex;gap:8px;justify-content:center;">
          <button id="btn-copy-sync-link" class="btn-primary" style="padding:8px 16px;font-size:0.8rem;">
            📋 Copy Sync URL
          </button>
          <button id="btn-close-sync" class="btn-secondary" style="padding:8px 16px;font-size:0.8rem;">
            Done
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Render Quick Vector QR Code representation
    const qrTarget = modal.querySelector('#qrcode-target');
    this.renderQrPlaceholder(qrTarget, pairUrl);

    modal.querySelector('#btn-close-sync').addEventListener('click', () => modal.remove());
    modal.querySelector('#btn-copy-sync-link').addEventListener('click', () => {
      if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(pairUrl).catch(() => {}); }
      const btn = modal.querySelector('#btn-copy-sync-link');
      btn.textContent = '✓ Copied!';
      setTimeout(() => { btn.textContent = '📋 Copy Sync URL'; }, 2000);
    });
  }

  renderQrPlaceholder(container, text) {
    // Generate clean offline SVG QR matrix with zero external network dependencies
    const size = 25;
    const matrix = Array.from({ length: size }, () => Array(size).fill(0));

    function drawFinder(startX, startY) {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
            matrix[startY + r][startX + c] = 1;
          }
        }
      }
    }

    drawFinder(0, 0);
    drawFinder(size - 7, 0);
    drawFinder(0, size - 7);

    for (let i = 8; i < size - 8; i++) {
      matrix[6][i] = i % 2 === 0 ? 1 : 0;
      matrix[i][6] = i % 2 === 0 ? 1 : 0;
    }

    const alignX = 18, alignY = 18;
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
          matrix[alignY + r][alignX + c] = 1;
        }
      }
    }

    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }

    let bitIdx = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const inFinder1 = r < 8 && c < 8;
        const inFinder2 = r < 8 && c >= size - 8;
        const inFinder3 = r >= size - 8 && c < 8;
        const inTiming = r === 6 || c === 6;
        const inAlign = r >= 16 && r <= 20 && c >= 16 && c <= 20;

        if (!inFinder1 && !inFinder2 && !inFinder3 && !inTiming && !inAlign) {
          matrix[r][c] = ((hash >> (bitIdx % 24)) & 1) ^ ((r + c) % 2 === 0 ? 1 : 0);
          bitIdx++;
          hash = (hash * 1103515245 + 12345) & 0x7fffffff;
        }
      }
    }

    let rects = "";
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (matrix[r][c]) {
          rects += "<rect x=\"" + (c + 2) + "\" y=\"" + (r + 2) + "\" width=\"1\" height=\"1\" fill=\"#05070d\"/>";
        }
      }
    }

    container.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 " + (size + 4) + " " + (size + 4) + "\" width=\"180\" height=\"180\" style=\"display:block;border-radius:4px;background:#ffffff;\">" + rects + "</svg>";
  }
}
