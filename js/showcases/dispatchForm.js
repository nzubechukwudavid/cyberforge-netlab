/**
 * ============================================================================
 * CyberForge - SOC Dispatch & Contact Terminal Form
 * Validated interactive dispatch terminal with instant email transmission
 * and ATS Resume download handler.
 * ============================================================================
 */

export class DispatchForm {
  constructor(formEl) {
    this.form = formEl;
    this.init();
  }

  init() {
    if (!this.form) return;

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    const resumeBtn = document.getElementById('btn-download-resume');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.downloadResume();
      });
    }
  }

  handleSubmit() {
    const name = this.form.querySelector('#contact-name')?.value.trim();
    const email = this.form.querySelector('#contact-email')?.value.trim();
    const role = this.form.querySelector('#contact-role')?.value.trim();
    const msg = this.form.querySelector('#contact-msg')?.value.trim();
    const statusEl = this.form.querySelector('#dispatch-status');

    if (!name || !email || !msg) {
      if (statusEl) {
        statusEl.textContent = '⚠ All required telemetry fields must be populated.';
        statusEl.style.color = 'var(--alert-crimson)';
      }
      return;
    }

    if (statusEl) {
      statusEl.textContent = '📡 Encrypting transmission payload and opening mail dispatcher...';
      statusEl.style.color = 'var(--cyber-cyan)';
    }

    const mailto = `mailto:nzubechukwudavid@gmail.com?subject=${encodeURIComponent(`[CyberForge Dispatch] ${role || 'Inquiry'} from ${name}`)}&body=${encodeURIComponent(`Operator: ${name}\nOrganization: ${email}\nRole Scope: ${role}\n\nMessage Payload:\n${msg}`)}`;

    setTimeout(() => {
      window.location.href = mailto;
      if (statusEl) {
        statusEl.textContent = '✓ Dispatch packet prepared. Opening email client.';
        statusEl.style.color = 'var(--terminal-emerald)';
      }
    }, 600);
  }

  downloadResume() {
    const resumeText = `# DAVID MORAH NZUBECHUKWU
**Network Systems & Cybersecurity Engineer | IT Infrastructure & SOC Specialist**
Lagos, Nigeria | nzubechukwudavid@gmail.com | Portfolio: cyberforge-netlab.vercel.app

---

## PROFESSIONAL SUMMARY
Results-driven Computer Science graduate from the University of Lagos with deep technical proficiency in network architecture (CCNA 200-301 curriculum), IT infrastructure troubleshooting, and threat analysis. Creator of NetLab, a browser-based discrete packet simulator and protocol frame dissector. Proven ability to triage complex Layer 1 through Layer 7 enterprise incidents, configure Cisco IOS routing/switching, and automate security telemetry.

---

## CORE TECHNICAL COMPETENCIES
- **Networking (CCNA):** IPv4/IPv6 Subnetting, OSPF, VLANs, 802.1Q Trunks, STP, Default Gateways, NAT/PAT, DHCP, DNS.
- **Security & Analysis:** Wireshark frame dissection, Packet capture analysis, Firewall ACLs, PE Malware Static Analysis, Threat Triage.
- **Systems & OS:** Linux (Ubuntu, Debian, systemd, bash scripting), Windows Server / Enterprise Workstation support.
- **Hardware & Support:** CompTIA A+ troubleshooting methodology, Component-level diagnosis, Cable termination, Disaster recovery.
- **Development & Automation:** JavaScript (ES6+), Python, Agentic Workflows, Canvas & SVG 60FPS graph rendering.

---

## FEATURED PROJECTS
### NetLab & The Systems Portfolio (Lead Architect & Developer)
- Engineered an in-browser discrete packet simulator modeling OSI Layers 1–7 with hop routing, TTL decrement, and ACL rule checks.
- Built Pocket Wireshark: a 3-pane protocol dissector rendering authentic packet headers and raw hex/ASCII dumps.
- Implemented dual-mode CLI supporting Cisco IOS configuration hierarchies (User EXEC -> Privileged -> Config -> Interface).
- Designed zero-cost P2P WebRTC multi-device synchronization via dynamic QR code pairing.

### PE Malware Detection & Analysis Benchmark (Security Researcher)
- Developed a high-throughput static analysis pipeline for Windows Portable Executable (PE) binaries.
- Extracted section entropy, header metadata, and import hashes (imphash) achieving 98.2% True Positive Rate at 0.8% FPR.

### IT Security Study Cockpit & Tracker (Developer)
- Designed an offline-first CCNA and security study workstation integrating spaced repetition and progress tracking.

---

## EDUCATION & CERTIFICATIONS
- **B.Sc. Computer Science**, University of Lagos (UNILAG), Nigeria
- **Cisco Certified Network Associate (CCNA 200-301)** — *In Active Progress*
`;

    const blob = new Blob([resumeText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'David_Morah_Resume_Network_Systems_Security.md';
    a.click();
    URL.revokeObjectURL(url);
  }
}
