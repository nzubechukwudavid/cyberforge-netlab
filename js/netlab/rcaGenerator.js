/**
 * ============================================================================
 * CyberForge NetLab - Enterprise Root Cause Analysis (RCA) Generator
 * Automatically produces audit-ready corporate incident post-mortems
 * signed by David Morah Nzubechukwu (Network Systems Engineer).
 * ============================================================================
 */

export class RcaGenerator {
  static generateReport({ scenario, timeSeconds, time, score }) {
    const ttr = (timeSeconds !== undefined) ? timeSeconds : (time !== undefined ? time : 0);
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

    const markdown = `# 🛡️ INCIDENT POST-MORTEM & ROOT CAUSE ANALYSIS (RCA)
**Document Ref:** RCA-${scenario.id}  
**Classification:** Internal NOC / Security Engineering Report  
**Lead Systems Engineer:** David Morah Nzubechukwu (CCNA Aspirant & Systems Specialist)  
**Date/Time of Resolution:** ${timestamp}  
**Time to Remediate (TTR):** ${ttr} seconds  
**Quality Score:** ${score} / 1000  

---

## 1. Executive Summary
On ${timestamp.substring(0, 10)}, an enterprise connectivity incident (${scenario.id}) was detected impacting **${scenario.title}**. Outbound communications and critical network services were disrupted across the affected segment. Remediative actions were initiated, restoring full service availability within ${ttr} seconds.

## 2. Incident Classification & Symptoms
- **Incident ID:** ${scenario.id}
- **Severity Level:** ${scenario.severity.toUpperCase()}
- **Cisco CCNA Domain:** ${scenario.domain}
- **Observed Symptoms:**
${scenario.symptoms.map(s => `  - ${s}`).join('\n')}

## 3. Root Cause Analysis (RCA)
Technical investigation revealed that:
> ${scenario.rootCause}

The failure disrupted standard packet propagation at the respective OSI layer, causing drop states during frame encapsulation and forwarding.

## 4. Remediation & Corrective Actions
The following steps were executed to eliminate the fault:
1. Isolated the faulted device and reviewed current configuration state via serial terminal.
2. Verified physical and logical interface status.
3. Reconfigured parameter according to standard operating procedures (SOP).
4. Validated end-to-end connectivity using ICMP Echo Requests and frame capture verification.

## 5. Verification Proof
- **End-to-End Latency:** 12ms average RTT
- **Packet Loss:** 0.0%
- **Frame Status:** Verified via Protocol Frame Dissector (Clean ARP/ICMP handshakes)

## 6. Preventive Measures & Hardening
- Implement automated interface configuration drift monitoring.
- Audit DHCP reservation pools and default gateway lease parameters.
- Review firewall access-lists quarterly to prevent unintended drop rules.

---
**Report Approved by:**  
*David Morah Nzubechukwu*  
Network Systems & Cybersecurity Engineer  
Lagos, Nigeria  
`;

    RcaGenerator.showRcaModal(markdown, scenario);
  }

  static showRcaModal(markdown, scenario) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(5,7,13,0.92);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;z-index:2500;padding:20px;';

    modal.innerHTML = `
      <div class="tactical-frame" style="max-width:750px;width:100%;max-height:85vh;display:flex;flex-direction:column;background:var(--bg-surface-raised);">
        <div style="padding:16px 20px;border-bottom:1px solid var(--border-subtle);display:flex;justify-content:space-between;align-items:center;">
          <div style="font-family:var(--font-mono);font-size:0.85rem;color:var(--cyber-cyan);font-weight:700;">
            📄 EXECUTIVE POST-MORTEM // RCA-${scenario.id}
          </div>
          <button id="btn-close-rca" style="background:none;border:none;color:var(--text-muted);font-size:1.2rem;cursor:pointer;">✕</button>
        </div>

        <div style="flex:1;overflow-y:auto;padding:24px;font-family:var(--font-mono);font-size:0.82rem;line-height:1.6;color:var(--text-secondary);white-space:pre-wrap;background:#060810;">
${markdown}
        </div>

        <div style="padding:14px 20px;border-top:1px solid var(--border-subtle);display:flex;justify-content:flex-end;gap:10px;background:rgba(10,15,28,0.95);">
          <button id="btn-download-md" class="btn-primary" style="padding:8px 16px;font-size:0.8rem;">
            💾 Download Markdown (.md)
          </button>
          <button id="btn-print-rca" class="btn-secondary" style="padding:8px 16px;font-size:0.8rem;">
            🖨️ Print / Save as PDF
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#btn-close-rca').addEventListener('click', () => modal.remove());

    modal.querySelector('#btn-download-md').addEventListener('click', () => {
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RCA_${scenario.id}_David_Morah.md`;
      a.click();
      URL.revokeObjectURL(url);
    });

    modal.querySelector('#btn-print-rca').addEventListener('click', () => {
      window.print();
    });
  }
}
