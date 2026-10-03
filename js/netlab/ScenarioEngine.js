/**
 * ============================================================================
 * CyberForge NetLab - Incident Scenario & Gamification Engine
 * Evaluates real-time pass/fail conditions, manages stopwatch timer,
 * scoring multipliers, tiered hints, and triggers the RCA post-mortem.
 * ============================================================================
 */

import { SCENARIOS } from './scenarios.js';

export class ScenarioEngine {
  constructor({ ticketContainer, networkGraph, onScenarioLoad, onScenarioResolved, soundFx }) {
    this.container = ticketContainer;
    this.graph = networkGraph;
    this.onScenarioLoad = onScenarioLoad;
    this.onScenarioResolved = onScenarioResolved;
    this.soundFx = soundFx;

    this.activeScenario = null;
    this.startTime = null;
    this.timerInterval = null;
    this.elapsedSeconds = 0;
    this.hintsRevealed = 0;
    this.score = 1000;
    this.isResolved = false;

    // Listen to graph changes to auto-verify
    this.graph.subscribe(() => {
      this.checkResolution();
    });
  }

  loadScenario(scenarioId) {
    const scenario = SCENARIOS.find(s => s.id === scenarioId) || SCENARIOS[0];
    this.activeScenario = scenario;
    this.isResolved = false;
    this.hintsRevealed = 0;
    this.score = 1000;
    this.elapsedSeconds = 0;

    // Stop existing timer and restart
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.startTime = Date.now();
    this.timerInterval = setInterval(() => {
      this.elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
      this.updateTimerDisplay();
    }, 1000);

    // Build topology in graph
    this.graph.clear();
    scenario.topology.nodes.forEach(n => this.graph.addNode(n));
    scenario.topology.links.forEach(l => this.graph.addLink(l));

    this.renderTicketUI();
    if (this.onScenarioLoad) this.onScenarioLoad(scenario);
  }

  updateTimerDisplay() {
    const el = document.getElementById('ticket-timer');
    if (!el) return;
    const mins = Math.floor(this.elapsedSeconds / 60).toString().padStart(2, '0');
    const secs = (this.elapsedSeconds % 60).toString().padStart(2, '0');
    el.textContent = `${mins}:${secs}`;
  }

  checkResolution() {
    if (!this.activeScenario || this.isResolved) return;

    if (this.activeScenario.verify(this.graph)) {
      this.isResolved = true;
      if (this.timerInterval) clearInterval(this.timerInterval);

      // Calculate final score
      const timePenalty = Math.min(300, this.elapsedSeconds * 2);
      const hintPenalty = this.hintsRevealed * 150;
      this.score = Math.max(100, 1000 - timePenalty - hintPenalty);

      if (this.soundFx) this.soundFx.playSuccess();
      this.renderResolvedBanner();

      if (this.onScenarioResolved) {
        this.onScenarioResolved({
          scenario: this.activeScenario,
          timeSeconds: this.elapsedSeconds,
          score: this.score,
          hintsUsed: this.hintsRevealed
        });
      }
    }
  }

  revealHint() {
    if (!this.activeScenario || this.hintsRevealed >= this.activeScenario.hints.length) return;
    this.hintsRevealed++;
    this.renderTicketUI();
  }

  renderTicketUI() {
    if (!this.container || !this.activeScenario) return;
    const sc = this.activeScenario;

    this.container.innerHTML = `
      <div class="ticket-header">
        <div class="ticket-id">
          <span>🎫</span> ${sc.id} // ${sc.domain}
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-family:var(--font-mono);font-size:0.75rem;color:var(--text-muted);" id="ticket-timer">00:00</span>
          <span class="ticket-severity severity-${sc.severity}" id="ticket-status-badge">${sc.severity}</span>
        </div>
      </div>

      <div class="ticket-title">${sc.title}</div>
      <div class="ticket-desc">${sc.description}</div>

      <div class="ticket-checklist">
        <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;font-family:var(--font-mono);margin-bottom:2px;">
          Reported Symptoms:
        </div>
        ${sc.symptoms.map(sym => `
          <div class="check-item">
            <span class="check-box">•</span>
            <span>${sym}</span>
          </div>
        `).join('')}
      </div>

      <!-- Hints System -->
      <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border-subtle);">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-family:var(--font-mono);font-size:0.75rem;color:var(--cyber-cyan);">
            💡 Tactical Hints (${this.hintsRevealed}/${sc.hints.length})
          </span>
          ${this.hintsRevealed < sc.hints.length ? `
            <button id="btn-reveal-hint" style="background:transparent;border:1px solid var(--cyber-cyan-border);color:var(--cyber-cyan);font-family:var(--font-mono);font-size:0.7rem;padding:2px 8px;border-radius:4px;cursor:pointer;">
              Get Hint (-150 XP)
            </button>
          ` : ''}
        </div>
        
        ${this.hintsRevealed > 0 ? `
          <div style="margin-top:6px;display:flex;flex-direction:column;gap:4px;">
            ${sc.hints.slice(0, this.hintsRevealed).map((h, i) => `
              <div style="font-size:0.75rem;font-family:var(--font-mono);color:#fbbf24;background:rgba(245,158,11,0.08);padding:4px 8px;border-radius:4px;border:1px solid rgba(245,158,11,0.2);">
                [Hint ${i + 1}]: ${h}
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;

    const hintBtn = document.getElementById('btn-reveal-hint');
    if (hintBtn) {
      hintBtn.addEventListener('click', () => this.revealHint());
    }
  }

  renderResolvedBanner() {
    const badge = document.getElementById('ticket-status-badge');
    if (badge) {
      badge.className = 'ticket-severity severity-resolved';
      badge.textContent = 'RESOLVED';
    }

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(5,7,13,0.85);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;z-index:2000;';
    
    modal.innerHTML = `
      <div class="tactical-frame" style="max-width:480px;width:90%;padding:28px;text-align:center;background:var(--bg-surface-raised);">
        <div style="font-size:2.8rem;margin-bottom:8px;">🏆</div>
        <div style="font-family:var(--font-mono);font-size:0.8rem;color:var(--terminal-emerald);letter-spacing:0.1em;text-transform:uppercase;">
          Incident Ticket Resolved
        </div>
        <h2 style="font-family:var(--font-display);font-size:1.6rem;margin-top:4px;color:var(--text-primary);">
          ${this.activeScenario.title}
        </h2>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0;background:rgba(0,0,0,0.3);padding:14px;border-radius:8px;border:1px solid var(--border-subtle);">
          <div>
            <div style="font-size:0.75rem;color:var(--text-muted);font-family:var(--font-mono);">TIME TO RESOLVE</div>
            <div style="font-size:1.4rem;font-weight:700;color:var(--cyber-cyan);font-family:var(--font-mono);">${this.elapsedSeconds}s</div>
          </div>
          <div>
            <div style="font-size:0.75rem;color:var(--text-muted);font-family:var(--font-mono);">XP AWARDED</div>
            <div style="font-size:1.4rem;font-weight:700;color:var(--terminal-emerald);font-family:var(--font-mono);">+${this.score}</div>
          </div>
        </div>

        <div style="display:flex;gap:10px;justify-content:center;">
          <button id="btn-export-rca" class="btn-primary" style="padding:10px 18px;font-size:0.82rem;">
            📄 Export RCA Post-Mortem
          </button>
          <button id="btn-dismiss-modal" class="btn-secondary" style="padding:10px 18px;font-size:0.82rem;">
            Continue
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#btn-dismiss-modal').addEventListener('click', () => {
      modal.remove();
    });

    modal.querySelector('#btn-export-rca').addEventListener('click', () => {
      modal.remove();
      const rcaEvent = new CustomEvent('GENERATE_RCA', { detail: { scenario: this.activeScenario, time: this.elapsedSeconds, score: this.score } });
      window.dispatchEvent(rcaEvent);
    });
  }
}
