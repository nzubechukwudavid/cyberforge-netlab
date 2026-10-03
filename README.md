# 🌐 CyberForge: NetLab & The Systems Portfolio
### High-Fidelity Packet Simulation Engine & Cybersecurity Systems Cockpit
**Architected & Developed by:** David Morah Nzubechukwu  
**Degree:** B.Sc. Computer Science, University of Lagos (UNILAG), Nigeria  
**Track:** Cisco Certified Network Associate (CCNA 200-301) // SOC & IT Infrastructure  
**License:** MIT // 100% Free & Open-Source  

---

## 🚀 Overview

**CyberForge** is a dual-purpose engineering platform built to bridge the gap between theoretical network certifications and hands-on systems operations. It pairs **NetLab** (an in-browser discrete-event packet simulator and protocol frame dissector) with **The Systems Cockpit** (a tactical, dark-mode engineering portfolio showcasing production malware research, agentic workflows, and distributed systems).

### 🌟 Key Highlights
- **Zero Ongoing Costs ($0/mo)**: Engineered entirely in pure vanilla web standards (ES6 Modules, Canvas, SVG, Web Audio API). Deploys to Vercel, Netlify, or GitHub Pages with zero cloud bills.
- **100% Offline-First (PWA)**: Equipped with a service worker and IndexedDB persistence. Runs flawlessly without an internet connection or during power interruptions.
- **60 FPS Photon Particle Engine**: Layered SVG topology with an HTML5 Canvas rendering glowing photon pulses representing packet propagation across cables.
- **Pocket Wireshark Frame Dissector**: Authentic 3-pane packet inspector featuring live packet listing, collapsible OSI layer tree (Ethernet II $\rightarrow$ IPv4 $\rightarrow$ ICMP/DNS), and raw hexadecimal/ASCII dumps.
- **Dual-Mode CLI Parser with Mobile Cyber-Chips**: Full Cisco IOS state hierarchy (`Router>`, `Router#`, `Router(config)#`, `Router(config-if)#`) and Host CLI (`ipconfig`, `ping`, `nslookup`, `tracert`, `arp -a`) equipped with contextual touch chips for mobile use.
- **Enterprise RCA Post-Mortem Generator**: Generates audit-ready corporate Root Cause Analysis documents upon ticket resolution, exportable as Markdown or printable to PDF.
- **P2P WebRTC Multi-Device Sync**: Connect desktop and mobile browsers via a dynamic QR code for real-time state synchronization with zero backend servers.

---

## 🗺️ CCNA 200-301 Incident Scenarios

NetLab ships with 8 enterprise incident tickets based on actual NOC and SOC escalations:

| Ticket ID | Incident Title | CCNA Domain | Severity | Root Cause Summary |
|-----------|----------------|-------------|----------|--------------------|
| **INC-101** | **The Silent Gateway** | IP Connectivity | Critical | Gateway misconfigured as `192.168.1.254` instead of `192.168.1.1`. |
| **INC-204** | **Broken DNS Resolver** | IP Services | Elevated | Dead DNS server assigned; FQDNs fail while raw IPs ping. |
| **INC-308** | **The Severed Trunk** | Network Access | Critical | Physical cable between Switch and Router is severed. |
| **INC-412** | **Subnet Mask Overlap** | IP Addressing | Elevated | PC has `/16` mask instead of `/24`, attempting local ARP for remote subnet. |
| **INC-520** | **Ghost in the Firewall** | Security Fundamentals | Critical | Edge firewall denies ICMP and inbound data ports. |
| **INC-630** | **Interface Admin Down** | Interface Management | Critical | Core router interface left in `shutdown` state after maintenance. |
| **INC-744** | **Static Route Black Hole**| IP Routing | Elevated | Edge router lacks static route to cloud network `172.16.0.0/16`. |
| **INC-890** | **Zero-Day SOC Triage** | Security Operations | Critical | Anomalous beaconing requires applying emergency firewall permit/deny ACL. |

---

## 🛠️ Technology Stack & Architecture

```
cyberforge-netlab/
├── index.html                  # Semantic, accessible HTML5 master entry point
├── manifest.json               # Progressive Web App manifest
├── sw.js                       # Service Worker for 100% offline caching
├── vercel.json                 # 1-click Vercel static deployment configuration
├── css/
│   ├── tokens.css              # CyberForge design tokens (OLED obsidian, cyan, violet)
│   ├── cockpit.css             # Tactical HUD header, hero terminal, project cards
│   ├── netlab.css              # Workbench split-pane layout & ticket drawer
│   ├── terminal.css            # Terminal emulator, prompt hierarchy, mobile cyber-chips
│   └── wireshark.css           # 3-pane protocol dissector & raw hex dump
└── js/
    ├── app.js                  # Master application orchestrator
    ├── sound.js                # Procedural Web Audio API sound synthesizer
    ├── p2pSync.js              # WebRTC DataChannel & QR code session manager
    ├── commandPalette.js       # Global Ctrl+K spotlight command modal
    ├── netlab/
    │   ├── NetworkGraph.js     # Topologic graph state, CIDR math, URL-hash serialization
    │   ├── PacketEngine.js     # Discrete-event packet simulator (L1-L7, ARP, ICMP, DNS)
    │   ├── PacketInspector.js  # Pocket Wireshark frame disassembler & hex dump engine
    │   ├── CliParser.js        # Cisco IOS & Host CLI state machine + touch chips
    │   ├── TopologyCanvas.js   # 60fps canvas photon particle renderer & SVG interaction
    │   ├── ScenarioEngine.js   # Incident ticket verification, timer, scoring, hints
    │   ├── rcaGenerator.js     # Enterprise Root Cause Analysis generator
    │   └── scenarios.js        # 8 CCNA enterprise diagnostic incident definitions
    └── showcases/
        ├── skillsRadar.js      # Canvas radar chart mapping CCNA & Threat Hunting skills
        ├── malwareShowcase.js  # Interactive ROC-AUC curve & confusion matrix explorer
        └── dispatchForm.js     # Validated contact terminal & ATS Resume downloader
```

---

## ⚡ Quickstart & Local Execution

No build step, no Node.js compilation, and no third-party package dependencies required.

### Option 1: Direct File Launch
Simply double-click `index.html` or open it in any modern browser (Chrome, Edge, Brave, Firefox, Safari).

### Option 2: Python Local Server
```bash
cd cyberforge-netlab
python -m http.server 8000
```
Open **`http://localhost:8000`** in your browser.

---

## 🚢 Zero-Cost Production Deployment

### Deploy to Vercel (CLI)
```bash
npm i -g vercel
cd cyberforge-netlab
vercel --prod
```

### Deploy to GitHub Pages
1. Push this folder to a GitHub repository.
2. In repository settings, navigate to **Pages** $\rightarrow$ Source: **Deploy from a branch** $\rightarrow$ select `/root` of your branch.
3. Your site is live worldwide with free SSL and CDN distribution!

---

## 👤 Author & Contact

**David Morah Nzubechukwu**  
- **Role:** Network Systems & Cybersecurity Engineer  
- **Location:** Lagos, Nigeria  
- **Email:** [nzubechukwudavid@gmail.com](mailto:nzubechukwudavid@gmail.com)  
- **Certifications in Progress:** Cisco CCNA (200-301)  
- **Core Skills:** Cisco IOS, IPv4/IPv6 Subnetting, OSPF, Wireshark, Linux Sysadmin, PE Malware Static Analysis, CompTIA A+ Diagnostics.
