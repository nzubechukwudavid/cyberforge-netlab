/**
 * ============================================================================
 * CyberForge - Autonomous Diagnostic Replay Engine (diagnosticReplay.js)
 * Internal operational diagnostic utility and SOP verification sequence.
 * Personal-first architecture: strictly in-character, zero sales gimmick.
 * ============================================================================
 */

export class DiagnosticReplay {
  constructor({ scenarioEngine, cliParser, packetEngine, soundFx }) {
    this.scenarioEngine = scenarioEngine;
    this.cliParser = cliParser;
    this.packetEngine = packetEngine;
    this.soundFx = soundFx;
    this.isRunning = false;
    this.abortController = null;
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const sleep = (ms) => new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('REPLAY_ABORTED'));
      });
    });

    try {
      console.log('[DIAGNOSTIC TELEMETRY] Initializing autonomous fault remediation sequence for INC-101...');

      // 1. Center NetLab view & load INC-101
      document.getElementById('netlab')?.scrollIntoView({ behavior: 'smooth' });
      this.scenarioEngine.loadScenario('INC-101');
      await sleep(1000);

      // 2. Type ipconfig on PC-1
      await this.typeIntoTerminal('ipconfig', signal);
      await sleep(1500);

      // 3. Ping local router interface
      await this.typeIntoTerminal('ping 192.168.1.1', signal);
      await sleep(2200);

      // 4. Execute the fix
      await this.typeIntoTerminal('ipconfig /gateway 192.168.1.1', signal);
      await sleep(1200);

      // 5. Verification ping to Intranet Server
      await this.typeIntoTerminal('ping 10.0.5.10', signal);
      await sleep(1500);

      console.log('✓ Autonomous diagnostic replay successfully completed.');
    } catch (err) {
      if (err.message === 'REPLAY_ABORTED') {
        console.log('[DIAGNOSTIC TELEMETRY] Operator manual override. Autonomous replay disengaged.');
      } else {
        console.error('Diagnostic replay error:', err);
      }
    } finally {
      this.isRunning = false;
    }
  }

  stop() {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.isRunning = false;
  }

  async runQuick() {
    this.scenarioEngine.loadScenario('INC-101');
    await this.cliParser.execute('ipconfig');
    await this.cliParser.execute('ping 192.168.1.1');
    await this.cliParser.execute('ipconfig /gateway 192.168.1.1');
    await this.cliParser.execute('ping 10.0.5.10');
  }

  async typeIntoTerminal(text, signal) {
    const input = document.getElementById('terminal-input');
    if (!input) {
      await this.cliParser.execute(text);
      return;
    }

    input.value = '';
    for (const char of text) {
      if (signal.aborted) throw new Error('REPLAY_ABORTED');
      input.value += char;
      if (this.soundFx) this.soundFx.playKeyClick();
      await new Promise(r => setTimeout(r, 45 + Math.random() * 35));
    }

    await new Promise(r => setTimeout(r, 200));
    input.value = '';
    await this.cliParser.execute(text);
  }
}
