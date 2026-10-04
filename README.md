# ⚡ CyberForge: NetLab & The Systems Portfolio (v3.1)
### High-Fidelity Packet Simulation Engine & Cybersecurity Systems Cockpit
**Architected & Developed by:** David Morah Nzubechukwu  
**Track:** Cisco Certified Network Associate (CCNA 200-301) // SOC & IT Infrastructure  
**License:** MIT // 100% Free & Open-Source  

---

## 🌐 Overview

**CyberForge** is an engineering platform built to bridge the gap between theoretical network certifications and hands-on systems operations. It pairs **NetLab** (an in-browser discrete-event packet simulator and protocol frame dissector) with **The Systems Cockpit** (a tactical, dark-mode engineering portfolio showcasing production malware research, agentic workflows, and distributed systems).

### 🚀 Key Highlights
- **Zero Ongoing Cloud Costs ($0/mo)**: Engineered entirely in pure vanilla web standards (ES6 Modules, Canvas, SVG, Web Audio API). Deploys to GitHub Pages or Vercel with zero backend dependencies.
- **100% Offline-First Architecture (PWA)**: Equipped with a service worker (`sw.js` v3.1) that precaches all 25 critical CSS, JS, HTML, and SVG assets. Runs completely offline without internet connectivity.
- **In-Canvas Interface Port Badges**: Mathematically calculated port labels (`[eth0]`, `[Fa0/1]`, `[Gi0/0]`) rendered along cable vectors with dynamic offset calculation ($44\text{px}$) to prevent collision with node glyphs.
- **60 FPS Photon Particle Engine**: Layered SVG topology with an HTML5 Canvas rendering glowing photon pulses representing packet propagation across cables with 10px magnetic grid snapping.
- **Pocket Wireshark Frame Dissector**: Authentic 3-pane packet inspector featuring live packet listing, collapsible OSI layer tree (Ethernet II $\rightarrow$ 802.1Q $\rightarrow$ IPv4 $\rightarrow$ ICMP/DNS/DHCP/OSPF), and raw hexadecimal/ASCII dumps.
- **Protocol Depth Realism**:
  - **DHCP DORA 4-Stage Transaction**: Authentic RFC 2131 handshake simulation with client release/renew (`ipconfig /release`, `ipconfig /renew`) and Cisco binding inspection (`show ip dhcp binding`).
  - **802.1Q VLAN Trunking**: Tagged Ethernet frames modeling native VLAN mismatches and trunk encapsulation.
  - **OSPF Hello Multicast**: RFC 2328 Area 0 Hello packets over multicast `224.0.0.5` with neighbor table tracking (`show ip ospf neighbor`).
- **Dual-Mode CLI Parser with Mobile Cyber-Chips**: Full Cisco IOS state hierarchy (`Router>`, `Router#`, `Router(config)#`, `Router(config-if)#`) and Host CLI (`ipconfig`, `ping`, `nslookup`, `tracert`, `arp -a`) equipped with contextual touch chips for mobile devices.
- **Autonomous SOP Diagnostic Replay Engine**: Built-in NOC diagnostic utility executing automated remediation runbooks for INC-101. Accessible via terminal commands in the Hero bio CLI (`audit`, `replay`, `diagnostics`, `demo`), the universal command palette (`Ctrl+K`), or a discreet `[▶ SOP]` glyph next to the ticket timer.
- **Enterprise RCA Post-Mortem Generator**: Generates audit-ready corporate Root Cause Analysis documents upon ticket resolution, exportable as Markdown or printable to clean A4 PDF via custom `@media print` layouts.
- **P2P WebRTC Multi-Device Sync**: Connect desktop and mobile browsers via a dynamic vector SVG QR code for real-time state synchronization with zero backend servers.

---

## 📋 CCNA 200-301 Incident Scenarios (10 Enterprise Tickets)

NetLab ships with 10 enterprise incident tickets based on actual NOC and SOC escalations:

| Ticket ID | Incident Title | CCNA Domain | Severity | Root Cause Summary |
|:---:|---|---|:---:|---|
| **INC-101** | **The Silent Gateway** | IP Connectivity | Critical | Gateway misconfigured as `192.168.1.254` instead of router interface `192.168.1.1`. |
| **INC-204** | **Broken DNS Resolver** | IP Services | Elevated | Dead DNS server assigned; FQDNs fail while raw IPs ping successfully. |
| **INC-308** | **The Severed Trunk** | Network Access | Critical | Physical cable between Switch and Router is severed; re-splicing required. |
| **INC-412** | **Subnet Mask Overlap** | IP Addressing | Elevated | PC has `/16` mask instead of `/24`, incorrectly attempting local ARP for remote subnet. |
| **INC-520** | **Ghost in the Firewall** | Security Fundamentals | Critical | Edge firewall denies ICMP and inbound data ports; emergency ACL permit required. |
| **INC-630** | **Interface Admin Down** | Interface Management | Critical | Core router interface left in `shutdown` state after scheduled maintenance. |
| **INC-744** | **Static Route Black Hole**| IP Routing | Elevated | Edge router lacks static route to remote cloud subnet `172.16.0.0/16`. |
| **INC-890** | **Zero-Day SOC Triage** | Security Operations | Critical | Anomalous beaconing requires applying emergency firewall permit/deny ACL filters. |
| **INC-901** | **OSPF MTU Mismatch** | Dynamic Routing | Critical | Router-Edge and Router-Core fail adjacency; MTU mismatch stalls state in `EXSTART`. |
| **INC-902** | **802.1Q Native VLAN Mismatch** | Switching & Trunking | Elevated | Switch-1 native VLAN 1 conflicts with Switch-2 native VLAN 99, causing leaky traffic. |

---

## 🏗️ Technology Stack & Architecture

```
cyberforge-netlab/
├── .github/
│   └── workflows/
│       └── deploy.yml        # Automated GitHub Pages CI/CD workflow
├── index.html                # Accessible, semantic HTML5 master cockpit
├── favicon.svg               # Vector SVG glowing network glyph favicon
├── manifest.json             # Progressive Web App manifest
├── sw.js                     # Service Worker for 100% offline precaching (v3.1)
├── vercel.json               # 1-click Vercel static deployment configuration
├── css/
│   ├── tokens.css            # Design tokens (OLED obsidian, cyan, emerald, crimson)
│   ├── cockpit.css           # Tactical HUD, hero terminal, project cards, @media print
│   ├── netlab.css            # Workbench split-pane layout, port badges & ticket drawer
│   ├── terminal.css          # Terminal emulator, prompt hierarchy, mobile cyber-chips
│   └── wireshark.css         # 3-pane protocol dissector & raw hex dump
└── js/
    ├── app.js                # Master application orchestrator & telemetry hooks
    ├── diagnosticReplay.js   # Autonomous SOP diagnostic replay engine
    ├── sound.js              # Procedural Web Audio API sound synthesizer
    ├── p2pSync.js            # WebRTC DataChannel & vector QR code session manager
    ├── commandPalette.js     # Universal Ctrl+K spotlight command modal
    ├── netlab/
    │   ├── NetworkGraph.js   # Topologic graph state, CIDR math, URL-hash serialization
    │   ├── PacketEngine.js   # Discrete-event packet simulator (L1-L7, DORA, OSPF, ACL)
    │   ├── PacketInspector.js# Pocket Wireshark frame disassembler & hex dump engine
    │   ├── CliParser.js      # Cisco IOS & Host CLI state machine + touch chips
    │   ├── TopologyCanvas.js # 60fps canvas photon renderer, vector port badges & grid snap
    │   ├── ScenarioEngine.js # Incident ticket verification, timer, scoring, SOP trigger
    │   ├── rcaGenerator.js   # Enterprise Root Cause Analysis generator (MD & PDF print)
    │   └── scenarios.js      # 10 CCNA enterprise diagnostic incident definitions
    └── showcases/
        ├── skillsRadar.js    # Canvas radar chart mapping CCNA & Threat Hunting skills
        ├── malwareShowcase.js# Interactive ROC-AUC curve & confusion matrix explorer
        └── dispatchForm.js   # Validated contact terminal & ATS Resume downloader
```

---

## 🛠️ Quickstart & Local Execution

No build step, no Node.js compilation, and no third-party package dependencies required.

### Option 1: Direct File Launch
Double-click `index.html` or open it in any modern browser (Chrome, Edge, Brave, Firefox, Safari).

### Option 2: Python Local Server
```bash
cd cyberforge-netlab
python -m http.server 8000
```
Open **`http://localhost:8000`** in your browser.

---

## 🚀 Production Deployment

### Option 1: GitHub Pages (Automated via GitHub Actions)
1. Push this repository to GitHub:
   ```bash
   git push origin main
   ```
2. In your repository on GitHub, navigate to **Settings** $\rightarrow$ **Pages**.
3. Under **Build and deployment** $\rightarrow$ **Source**, select **GitHub Actions**.
4. The workflow in `.github/workflows/deploy.yml` will automatically build and deploy your site with free SSL and worldwide CDN distribution.

### Option 2: Vercel (1-Click Static Deployment)
```bash
npm i -g vercel
cd cyberforge-netlab
vercel --prod
```

---

## 👨‍💻 Author & Contact

**David Morah Nzubechukwu**  
- **Role:** Network Systems & Cybersecurity Engineer  
- **Location:** Lagos, Nigeria  
- **Email:** [nzubechukwudavid@gmail.com](mailto:nzubechukwudavid@gmail.com)  
- **Certifications in Progress:** Cisco CCNA (200-301)  
- **Core Skills:** Cisco IOS Configuration, IPv4/IPv6 Subnetting, OSPF, VLANs/802.1Q, Wireshark Protocol Analysis, Linux Sysadmin (Debian/Ubuntu), PE Malware Static Analysis, CompTIA A+ Diagnostics.
