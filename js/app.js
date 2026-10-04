/**
 * ============================================================================
 * CyberForge - Master Application Orchestrator (app.js)
 * Connects HUD, Hero Terminal, NetLab Simulator, Pocket Wireshark,
 * Skills Radar, Command Palette, P2P Sync, and PWA Offline Cache.
 * ============================================================================
 */

import { SoundEngine } from './sound.js';
import { NetworkGraph } from './netlab/NetworkGraph.js';
import { PacketEngine } from './netlab/PacketEngine.js';
import { PacketInspector } from './netlab/PacketInspector.js';
import { CliParser } from './netlab/CliParser.js';
import { TopologyCanvas } from './netlab/TopologyCanvas.js';
import { ScenarioEngine } from './netlab/ScenarioEngine.js';
import { RcaGenerator } from './netlab/rcaGenerator.js';
import { SCENARIOS } from './netlab/scenarios.js';
import { P2pSync } from './p2pSync.js';
import { CommandPalette } from './commandPalette.js';
import { SkillsRadar } from './showcases/skillsRadar.js';
import { MalwareShowcase } from './showcases/malwareShowcase.js';
import { DispatchForm } from './showcases/dispatchForm.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Sound Synthesizer
  const soundFx = new SoundEngine();

  // Audio Toggle Button in HUD
  const audioBtn = document.getElementById('btn-audio-toggle');
  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      const isMuted = soundFx.toggleMute();
      audioBtn.classList.toggle('active', !isMuted);
      audioBtn.innerHTML = isMuted ? '🔇 Audio: OFF' : '🔊 Audio: ON';
    });
  }

  // 2. Initialize Core Network Simulation Engines
  const networkGraph = new NetworkGraph();
  const packetEngine = new PacketEngine(networkGraph);

  // Play subtle keypress sounds on keyboard interaction
  window.addEventListener('keydown', () => soundFx.playKeyClick());

  // 3. Initialize Pocket Wireshark Protocol Inspector
  const packetInspector = new PacketInspector({
    listContainer: document.getElementById('ws-packet-list'),
    detailsContainer: document.getElementById('ws-details'),
    hexContainer: document.getElementById('ws-hex'),
    filterInput: document.getElementById('ws-filter-input')
  });

  // Tap packet engine into Wireshark capture buffer
  packetEngine.subscribe((event, data) => {
    if (event === 'PACKET_CAPTURED') {
      packetInspector.addPacket(data);
    }
  });

  const btnClearWs = document.getElementById('btn-clear-ws');
  if (btnClearWs) {
    btnClearWs.addEventListener('click', () => packetInspector.clear());
  }

  // 4. Initialize CLI Terminal & Mobile Cyber-Chips
  const cliParser = new CliParser({
    terminalBody: document.getElementById('terminal-body'),
    inputEl: document.getElementById('terminal-input'),
    promptEl: document.getElementById('terminal-prompt'),
    chipsContainer: document.getElementById('cyber-chips-bar'),
    networkGraph,
    packetEngine
  });

  // 5. Initialize Topology Visualizer & Canvas
  const topologyCanvas = new TopologyCanvas({
    svgEl: document.getElementById('topology-svg'),
    canvasEl: document.getElementById('topology-canvas'),
    networkGraph,
    packetEngine,
    soundFx,
    onNodeSelect: (nodeId) => {
      cliParser.setActiveNode(nodeId);
      updateTerminalTabs(nodeId);
    },
    onLinkTap: (linkId) => {
      soundFx.playAlert();
    }
  });

  // 6. Setup Terminal Device Tabs
  function updateTerminalTabs(activeNodeId) {
    const tabsContainer = document.getElementById('terminal-device-tabs');
    if (!tabsContainer) return;
    tabsContainer.innerHTML = '';

    for (const node of networkGraph.nodes.values()) {
      const isActive = node.id === activeNodeId;
      const tab = document.createElement('button');
      tab.className = `term-tab ${isActive ? 'active' : ''}`;
      tab.innerHTML = `<span class="term-tab-dot"></span>${node.name}`;
      tab.addEventListener('click', () => {
        topologyCanvas.selectedNodeId = node.id;
        topologyCanvas.render();
        cliParser.setActiveNode(node.id);
        updateTerminalTabs(node.id);
      });
      tabsContainer.appendChild(tab);
    }
  }

  // 7. Initialize Incident Ticket Scenario Engine
  const scenarioEngine = new ScenarioEngine({
    ticketContainer: document.getElementById('incident-ticket-container'),
    networkGraph,
    soundFx,
    onScenarioLoad: (scenario) => {
      // Pick first node as default active console
      const firstNode = scenario.topology.nodes[0];
      if (firstNode) {
        topologyCanvas.selectedNodeId = firstNode.id;
        topologyCanvas.render();
        cliParser.clear();
        cliParser.setActiveNode(firstNode.id);
        updateTerminalTabs(firstNode.id);
      }
      packetInspector.clear();
    },
    onScenarioResolved: ({ scenario, timeSeconds, score }) => {
      console.log(`Scenario ${scenario.id} resolved in ${timeSeconds}s with score ${score}`);
    }
  });

  // Scenario Selector Dropdown
  const scenarioSelect = document.getElementById('scenario-select');
  if (scenarioSelect) {
    SCENARIOS.forEach(sc => {
      const opt = document.createElement('option');
      opt.value = sc.id;
      opt.textContent = `${sc.id}: ${sc.title} (${sc.difficulty})`;
      scenarioSelect.appendChild(opt);
    });

    scenarioSelect.addEventListener('change', (e) => {
      scenarioEngine.loadScenario(e.target.value);
    });
  }

  // Load Initial Scenario
  scenarioEngine.loadScenario('INC-101');

  // Listen to RCA Export event
  window.addEventListener('GENERATE_RCA', (e) => {
    RcaGenerator.generateReport(e.detail);
  });

  // 8. Toolbar Buttons in Topology View
  const toolSelect = document.getElementById('tool-select');
  const toolWire = document.getElementById('tool-wire');
  const toolCable = document.getElementById('tool-cable');
  const toolSniffer = document.getElementById('tool-sniffer');
  const toolReset = document.getElementById('tool-reset');
  const toolAddNode = document.getElementById('tool-add-node');
  const toolDeleteNode = document.getElementById('tool-delete-node');
  const toolShareLab = document.getElementById('tool-share-lab');

  [toolSelect, toolWire, toolCable, toolSniffer].forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', () => {
      [toolSelect, toolWire, toolCable, toolSniffer].forEach(b => b?.classList.remove('active'));
      btn.classList.add('active');
      topologyCanvas.setTool(btn.getAttribute('data-tool'));
    });
  });

  if (toolDeleteNode) {
    toolDeleteNode.addEventListener('click', () => {
      topologyCanvas.deleteSelected();
    });
  }

  if (toolReset) {
    toolReset.addEventListener('click', () => {
      if (scenarioEngine.activeScenario) {
        scenarioEngine.loadScenario(scenarioEngine.activeScenario.id);
      }
    });
  }

  // Add Node Modal (Sandbox Lab Builder)
  if (toolAddNode) {
    toolAddNode.addEventListener('click', () => {
      const modal = document.createElement('div');
      modal.className = 'modal-backdrop';
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(5,7,13,0.85);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;z-index:3000;padding:20px;';
      modal.innerHTML = `
        <div class="tactical-frame" style="max-width:440px;width:100%;padding:24px;background:var(--bg-surface-raised);">
          <div style="font-family:var(--font-mono);font-size:0.8rem;color:var(--cyber-cyan);margin-bottom:4px;">SANDBOX TOPOLOGY BUILDER</div>
          <h3 style="font-family:var(--font-display);font-size:1.3rem;margin-bottom:14px;color:var(--text-primary);">Add Network Device</h3>
          
          <div style="display:flex;flex-direction:column;gap:12px;">
            <div>
              <label style="font-family:var(--font-mono);font-size:0.75rem;color:var(--text-muted);display:block;margin-bottom:4px;">DEVICE TYPE</label>
              <select id="new-node-type" style="width:100%;background:rgba(0,0,0,0.4);border:1px solid var(--border-subtle);color:var(--text-primary);padding:8px 12px;border-radius:6px;font-family:var(--font-mono);outline:none;">
                <option value="host">Workstation / PC</option>
                <option value="router">Cisco Router</option>
                <option value="switch">Layer 2 Switch</option>
                <option value="firewall">Perimeter Firewall</option>
                <option value="server">Application Server</option>
              </select>
            </div>
            <div>
              <label style="font-family:var(--font-mono);font-size:0.75rem;color:var(--text-muted);display:block;margin-bottom:4px;">HOSTNAME</label>
              <input type="text" id="new-node-name" placeholder="e.g. PC-2, Router-Core-2" value="Node-${Math.floor(Math.random()*900 + 100)}" style="width:100%;background:rgba(0,0,0,0.4);border:1px solid var(--border-subtle);color:var(--text-primary);padding:8px 12px;border-radius:6px;font-family:var(--font-mono);outline:none;" />
            </div>
            <div>
              <label style="font-family:var(--font-mono);font-size:0.75rem;color:var(--text-muted);display:block;margin-bottom:4px;">IP ADDRESS (Optional)</label>
              <input type="text" id="new-node-ip" placeholder="192.168.1.50" style="width:100%;background:rgba(0,0,0,0.4);border:1px solid var(--border-subtle);color:var(--text-primary);padding:8px 12px;border-radius:6px;font-family:var(--font-mono);outline:none;" />
            </div>
            <div>
              <label style="font-family:var(--font-mono);font-size:0.75rem;color:var(--text-muted);display:block;margin-bottom:4px;">CONNECT TO DEVICE (Optional)</label>
              <select id="new-node-link-target" style="width:100%;background:rgba(0,0,0,0.4);border:1px solid var(--border-subtle);color:var(--text-primary);padding:8px 12px;border-radius:6px;font-family:var(--font-mono);outline:none;">
                <option value="">-- Do Not Connect (Isolated) --</option>
                ${Array.from(networkGraph.nodes.values()).map(n => `<option value="${n.id}">${n.name} (${n.type})</option>`).join('')}
              </select>
            </div>
          </div>

          <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px;">
            <button id="btn-cancel-add" class="btn-secondary" style="padding:8px 16px;font-size:0.8rem;">Cancel</button>
            <button id="btn-confirm-add" class="btn-primary" style="padding:8px 16px;font-size:0.8rem;">+ Place Device</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#btn-cancel-add').addEventListener('click', () => modal.remove());
      modal.querySelector('#btn-confirm-add').addEventListener('click', () => {
        const type = modal.querySelector('#new-node-type').value;
        const name = modal.querySelector('#new-node-name').value.trim() || 'Node';
        const ip = modal.querySelector('#new-node-ip').value.trim();

        const connectTargetId = modal.querySelector('#new-node-link-target')?.value;

        const newNode = networkGraph.addNode({
          name,
          type,
          x: 140 + Math.floor(Math.random() * 200),
          y: 80 + Math.floor(Math.random() * 160),
          interfaces: [{ name: type === 'router' || type === 'switch' ? 'Gi0/1' : 'eth0', ip, subnetMask: '255.255.255.0' }]
        });

        if (connectTargetId) {
          networkGraph.addLink({
            sourceNodeId: newNode.id,
            targetNodeId: connectTargetId,
            status: 'OPERATIONAL'
          });
        }

        topologyCanvas.selectedNodeId = newNode.id;
        topologyCanvas.render();
        cliParser.setActiveNode(newNode.id);
        updateTerminalTabs(newNode.id);
        modal.remove();
        soundFx.playSuccess();
      });
    });
  }

  // Share Lab Link (URL Hash Serialization)
  if (toolShareLab) {
    toolShareLab.addEventListener('click', () => {
      const hash = networkGraph.exportToUrlHash();
      const shareUrl = `${window.location.origin}${window.location.pathname}#lab=${hash}`;
      window.location.hash = `lab=${hash}`;
      if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(shareUrl).catch(() => {}); }

      toolShareLab.innerHTML = '<span>✓</span> Copied Link!';
      soundFx.playSuccess();
      setTimeout(() => {
        toolShareLab.innerHTML = '<span>🔗</span> Share Lab';
      }, 2500);
    });
  }

  // Check for Shared Lab URL Hash on Startup
  if (window.location.hash && window.location.hash.includes('lab=')) {
    const match = window.location.hash.match(/lab=([^&]+)/);
    if (match && match[1]) {
      const success = networkGraph.importFromUrlHash(match[1]);
      if (success) {
        console.log('✓ Successfully imported custom shared lab from URL hash!');
        const first = Array.from(networkGraph.nodes.values())[0];
        if (first) {
          topologyCanvas.selectedNodeId = first.id;
          topologyCanvas.render();
          cliParser.setActiveNode(first.id);
          updateTerminalTabs(first.id);
        }
      }
    }
  }

  // Real-Time Multi-Tab / Device Sync via BroadcastChannel
  if ('BroadcastChannel' in window) {
    const syncChannel = new BroadcastChannel('cyberforge-lab-sync');
    let isRemoteUpdate = false;

    networkGraph.subscribe((event) => {
      if (isRemoteUpdate) return;
      if (event === 'NODE_ADDED' || event === 'NODE_REMOVED' || event === 'LINK_UPDATED' || event === 'LINK_ADDED') {
        syncChannel.postMessage({ type: 'SYNC_GRAPH', json: networkGraph.exportToJson() });
      }
    });

    syncChannel.onmessage = (e) => {
      if (e.data && e.data.type === 'SYNC_GRAPH' && e.data.json) {
        isRemoteUpdate = true;
        networkGraph.importFromJson(e.data.json);
        topologyCanvas.render();
        updateTerminalTabs(topologyCanvas.selectedNodeId);
        setTimeout(() => { isRemoteUpdate = false; }, 100);
      }
    };
  }

  // 9. Dock View Switcher (Terminal vs Pocket Wireshark)
  const tabTerminal = document.getElementById('tab-dock-terminal');
  const tabWireshark = document.getElementById('tab-dock-wireshark');
  const dockTerminal = document.getElementById('dock-terminal-view');
  const dockWireshark = document.getElementById('dock-wireshark-view');

  if (tabTerminal && tabWireshark) {
    tabTerminal.addEventListener('click', () => {
      tabTerminal.classList.add('active');
      tabWireshark.classList.remove('active');
      dockTerminal.style.display = 'flex';
      dockWireshark.style.display = 'none';
    });

    tabWireshark.addEventListener('click', () => {
      tabWireshark.classList.add('active');
      tabTerminal.classList.remove('active');
      dockTerminal.style.display = 'none';
      dockWireshark.style.display = 'flex';
      packetInspector.renderList();
    });
  }

  // 10. Interactive Hero Mini-Terminal
  const heroInput = document.getElementById('hero-cli-input');
  const heroBody = document.getElementById('hero-cli-body');
  if (heroInput && heroBody) {
    heroInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = heroInput.value.trim().toLowerCase();
        heroInput.value = '';
        const echo = document.createElement('div');
        echo.className = 'term-line cmd-echo';
        echo.textContent = `david@cyberforge:~$ ${val}`;
        heroBody.appendChild(echo);

        const resp = document.createElement('div');
        resp.className = 'term-line';

        if (val === 'whoami') {
          resp.textContent = 'David Morah Nzubechukwu — Network Systems & Cybersecurity Engineer, Unilag CS Graduate. CCNA & Threat Specialist.';
          resp.style.color = 'var(--cyber-cyan)';
        } else if (val === 'certs' || val === 'status') {
          resp.textContent = '● Cisco CCNA 200-301 (In Active Progress)\n● CompTIA A+ & Network+ Alignment (Hardware, Diagnostics, Disaster Recovery)';
          resp.style.color = 'var(--terminal-emerald)';
        } else if (val === 'netlab') {
          resp.textContent = 'Jumping to interactive NetLab simulation workbench...';
          document.getElementById('netlab')?.scrollIntoView({ behavior: 'smooth' });
        } else if (val === 'clear' || val === 'cls') {
          heroBody.innerHTML = '';
          return;
        } else {
          resp.textContent = `Command '${val}' not found. Type: whoami, certs, netlab, clear`;
          resp.style.color = 'var(--text-muted)';
        }

        heroBody.appendChild(resp);
        heroBody.scrollTop = heroBody.scrollHeight;
      }
    });
  }

  // 11. Project Holo-Deck Interactions
  const btnMalware = document.getElementById('btn-open-malware-modal');
  if (btnMalware) {
    btnMalware.addEventListener('click', (e) => {
      e.preventDefault();
      MalwareShowcase.open();
    });
  }

  // 12. Initialize Skills Radar Chart
  const radarCanvas = document.getElementById('skills-radar-canvas');
  if (radarCanvas) {
    new SkillsRadar(radarCanvas);
  }

  // 13. Initialize Contact Dispatch Terminal
  const dispatchFormEl = document.getElementById('dispatch-form');
  if (dispatchFormEl) {
    new DispatchForm(dispatchFormEl);
  }

  // 14. Initialize P2P WebRTC Pairing Manager
  const p2pSync = new P2pSync(networkGraph);
  const btnP2p = document.getElementById('btn-p2p-sync');
  if (btnP2p) {
    btnP2p.addEventListener('click', () => p2pSync.showPairingModal());
  }

  // 15. Initialize Global Command Palette (Ctrl+K)
  new CommandPalette([
    { title: 'Launch NetLab: The Silent Gateway (INC-101)', category: 'Scenarios', icon: '🎫', handler: () => { scenarioEngine.loadScenario('INC-101'); document.getElementById('netlab')?.scrollIntoView({ behavior: 'smooth' }); } },
    { title: 'Launch NetLab: Broken DNS Resolver (INC-204)', category: 'Scenarios', icon: '🎫', handler: () => { scenarioEngine.loadScenario('INC-204'); document.getElementById('netlab')?.scrollIntoView({ behavior: 'smooth' }); } },
    { title: 'Launch NetLab: The Severed Trunk (INC-308)', category: 'Scenarios', icon: '🎫', handler: () => { scenarioEngine.loadScenario('INC-308'); document.getElementById('netlab')?.scrollIntoView({ behavior: 'smooth' }); } },
    { title: 'Launch NetLab: Subnet Mask Overlap (INC-412)', category: 'Scenarios', icon: '🎫', handler: () => { scenarioEngine.loadScenario('INC-412'); document.getElementById('netlab')?.scrollIntoView({ behavior: 'smooth' }); } },
    { title: 'Launch NetLab: Ghost in the Firewall (INC-520)', category: 'Scenarios', icon: '🎫', handler: () => { scenarioEngine.loadScenario('INC-520'); document.getElementById('netlab')?.scrollIntoView({ behavior: 'smooth' }); } },
    { title: 'Launch NetLab: Interface Admin Down (INC-630)', category: 'Scenarios', icon: '🎫', handler: () => { scenarioEngine.loadScenario('INC-630'); document.getElementById('netlab')?.scrollIntoView({ behavior: 'smooth' }); } },
    { title: 'Launch NetLab: Static Route Black Hole (INC-744)', category: 'Scenarios', icon: '🎫', handler: () => { scenarioEngine.loadScenario('INC-744'); document.getElementById('netlab')?.scrollIntoView({ behavior: 'smooth' }); } },
    { title: 'Launch NetLab: Zero-Day Infiltration (INC-890)', category: 'Scenarios', icon: '🎫', handler: () => { scenarioEngine.loadScenario('INC-890'); document.getElementById('netlab')?.scrollIntoView({ behavior: 'smooth' }); } },
    { title: 'Open PE Malware Benchmark Telemetry', category: 'Showcases', icon: '🔬', handler: () => MalwareShowcase.open() },
    { title: 'Pair Mobile Device via P2P QR Code', category: 'P2P Sync', icon: '⚡', handler: () => p2pSync.showPairingModal() },
    { title: 'Download ATS Resume (Markdown)', category: 'Profile', icon: '📄', handler: () => document.getElementById('btn-download-resume')?.click() },
    { title: 'Toggle Audio Synthesizer', category: 'Audio', icon: '🔊', handler: () => audioBtn?.click() },
    { title: 'Jump to CCNA Skills Threat Matrix', category: 'Navigation', icon: '🎯', handler: () => document.getElementById('radar')?.scrollIntoView({ behavior: 'smooth' }) },
    { title: 'Jump to Dispatch / Hire Terminal', category: 'Navigation', icon: '📡', handler: () => document.getElementById('dispatch')?.scrollIntoView({ behavior: 'smooth' }) }
  ]);

  // 16. PWA Offline Service Worker Registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('✓ CyberForge ServiceWorker active: 100% offline ready.'))
      .catch(err => console.warn('ServiceWorker registration error:', err));
  }

  // Expose global netlabApp for telemetry, inspection, and automated testing
  window.netlabApp = {
    graph: networkGraph,
    packetEngine,
    packetInspector,
    cliParser,
    canvas: topologyCanvas,
    scenarioEngine,
    rcaGenerator: RcaGenerator,
    p2pSync,
    soundFx
  };
});

