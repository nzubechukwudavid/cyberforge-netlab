/**
 * ============================================================================
 * CyberForge NetLab - Pocket Wireshark Protocol Inspector
 * Generates Wireshark-grade 3-pane packet decodes:
 * 1. Packet List Table
 * 2. Collapsible OSI Protocol Tree (Ethernet II, IPv4, ICMP, DNS, TCP)
 * 3. Authentic Hex & ASCII Byte Dump
 * ============================================================================
 */

export class PacketInspector {
  constructor({ listContainer, detailsContainer, hexContainer, filterInput }) {
    this.listContainer = listContainer;
    this.detailsContainer = detailsContainer;
    this.hexContainer = hexContainer;
    this.filterInput = filterInput;

    this.capturedPackets = [];
    this.selectedPacketIndex = 0;
    this.activeFilter = '';

    if (this.filterInput) {
      this.filterInput.addEventListener('input', (e) => {
        this.activeFilter = e.target.value.toLowerCase().trim();
        this.renderList();
      });
    }
  }

  addPacket(packet) {
    this.capturedPackets.unshift(packet);
    if (this.capturedPackets.length > 60) {
      this.capturedPackets.pop();
    }
    this.renderList();
    if (this.capturedPackets.length === 1) {
      this.selectPacket(0);
    }
  }

  clear() {
    this.capturedPackets = [];
    this.selectedPacketIndex = -1;
    this.renderList();
    this.detailsContainer.innerHTML = '<div style="color:var(--text-muted);padding:8px;">No packet selected</div>';
    this.hexContainer.innerHTML = '<div style="color:var(--text-muted);padding:8px;">No packet data</div>';
  }

  selectPacket(index) {
    this.selectedPacketIndex = index;
    const packet = this.capturedPackets[index];
    if (!packet) return;

    this.renderList();
    this.renderDetails(packet);
    this.renderHexDump(packet);
  }

  renderList() {
    if (!this.listContainer) return;

    let filtered = this.capturedPackets;
    if (this.activeFilter) {
      filtered = this.capturedPackets.filter(p => 
        p.protocol.toLowerCase().includes(this.activeFilter) ||
        p.srcIp.includes(this.activeFilter) ||
        p.dstIp.includes(this.activeFilter) ||
        p.type.toLowerCase().includes(this.activeFilter)
      );
    }

    if (filtered.length === 0) {
      this.listContainer.innerHTML = `
        <div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.75rem;">
          No captured packets. Send traffic (e.g. ping) or attach a sniffer tap.
        </div>
      `;
      return;
    }

    let html = `
      <table class="ws-table">
        <thead>
          <tr>
            <th style="width:36px;">No.</th>
            <th style="width:65px;">Time</th>
            <th>Source</th>
            <th>Destination</th>
            <th style="width:60px;">Protocol</th>
            <th style="width:50px;">Len</th>
            <th>Info</th>
          </tr>
        </thead>
        <tbody>
    `;

    filtered.forEach((p, idx) => {
      const isSelected = idx === this.selectedPacketIndex;
      const protoClass = `proto-${p.protocol.toLowerCase()}`;
      const timeStr = ((Date.now() - p.timestamp) / 1000).toFixed(3);
      const infoStr = this.getPacketInfoString(p);

      html += `
        <tr class="ws-row ${protoClass} ${isSelected ? 'selected' : ''}" data-idx="${idx}">
          <td>${filtered.length - idx}</td>
          <td>${timeStr}</td>
          <td>${p.srcIp || p.srcMac || '0.0.0.0'}</td>
          <td>${p.dstIp || p.dstMac || '255.255.255.255'}</td>
          <td><strong>${p.protocol}</strong></td>
          <td>${p.payload?.bytes ? p.payload.bytes + 42 : 74}</td>
          <td>${infoStr}</td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    this.listContainer.innerHTML = html;

    // Attach row click listeners
    this.listContainer.querySelectorAll('.ws-row').forEach(row => {
      row.addEventListener('click', () => {
        const idx = parseInt(row.getAttribute('data-idx'), 10);
        this.selectPacket(idx);
      });
    });
  }

  getPacketInfoString(p) {
    if (p.type === 'ICMP_REQ') return `Echo (ping) request  id=0x0001, seq=${p.payload.seq || 1}, ttl=${p.ttl}`;
    if (p.type === 'ICMP_REPLY') return `Echo (ping) reply    id=0x0001, seq=${p.payload.seq || 1}, ttl=${p.ttl} (rtt=${p.payload.rtt || 12}ms)`;
    if (p.type === 'ARP_REQ') return `Who has ${p.dstIp}? Tell ${p.srcIp}`;
    if (p.type === 'ARP_REPLY') return `${p.srcIp} is at ${p.srcMac}`;
    if (p.type === 'DNS_REQ') return `Standard query 0x1a2b A ${p.payload.domain || 'host.domain'}`;
    if (p.type === 'DNS_RES') return `Standard query response 0x1a2b A ${p.payload.resolvedIp || '8.8.8.8'}`;
    if (p.status === 'DROPPED') return `[PACKET DROPPED] ${p.dropReason || 'ACL / Physical severance'}`;
    return `${p.type} Data Frame`;
  }

  renderDetails(p) {
    if (!this.detailsContainer) return;

    const frameLen = p.payload?.bytes ? p.payload.bytes + 42 : 74;
    const ipChecksum = '0x' + Math.floor(Math.random() * 65535).toString(16).padStart(4, '0');

    this.detailsContainer.innerHTML = `
      <div class="tree-node">
        <div class="tree-header">▼ <strong>Frame (${frameLen} bytes on wire)</strong></div>
        <div class="tree-children">
          <div class="tree-leaf">Arrival Time: ${new Date(p.timestamp).toISOString()}</div>
          <div class="tree-leaf">Frame Length: ${frameLen} bytes (${frameLen * 8} bits)</div>
          <div class="tree-leaf">Protocols in frame: eth:ethertype:ip:${p.protocol.toLowerCase()}</div>
        </div>
      </div>

      <div class="tree-node">
        <div class="tree-header">▼ <strong>Ethernet II, Src: ${p.srcMac || '00:50:56:A1:B2:C3'}, Dst: ${p.dstMac || '00:0C:29:4F:8E:12'}</strong></div>
        <div class="tree-children">
          <div class="tree-leaf">Destination: ${p.dstMac || '00:0C:29:4F:8E:12'}</div>
          <div class="tree-leaf">Source: ${p.srcMac || '00:50:56:A1:B2:C3'}</div>
          <div class="tree-leaf">Type: IPv4 (0x0800)</div>
        </div>
      </div>

      <div class="tree-node">
        <div class="tree-header">▼ <strong>Internet Protocol Version 4, Src: ${p.srcIp}, Dst: ${p.dstIp}</strong></div>
        <div class="tree-children">
          <div class="tree-leaf">Version: 4</div>
          <div class="tree-leaf">Header Length: 20 bytes (5)</div>
          <div class="tree-leaf">Total Length: ${frameLen - 14}</div>
          <div class="tree-leaf">Flags: 0x02, Don't fragment</div>
          <div class="tree-leaf">Time to Live (TTL): ${p.ttl}</div>
          <div class="tree-leaf">Protocol: ${p.protocol} (${p.protocol === 'ICMP' ? 1 : 6})</div>
          <div class="tree-leaf">Header Checksum: ${ipChecksum} [verified]</div>
          <div class="tree-leaf">Source Address: ${p.srcIp}</div>
          <div class="tree-leaf">Destination Address: ${p.dstIp}</div>
        </div>
      </div>

      <div class="tree-node">
        <div class="tree-header">▼ <strong>${p.protocol} Layer Details</strong></div>
        <div class="tree-children">
          <div class="tree-leaf">Type: ${p.type}</div>
          <div class="tree-leaf">Payload Size: ${p.payload?.bytes || 32} bytes</div>
          <div class="tree-leaf">Status: <strong>${p.status}</strong></div>
          ${p.dropReason ? `<div class="tree-leaf" style="color:var(--alert-crimson)">Reason: ${p.dropReason}</div>` : ''}
        </div>
      </div>
    `;
  }

  renderHexDump(p) {
    if (!this.hexContainer) return;

    // Generate realistic bytes from packet data
    const bytes = [];
    // Ethernet header (14 bytes)
    for (let i = 0; i < 6; i++) bytes.push(Math.floor(Math.random() * 256));
    for (let i = 0; i < 6; i++) bytes.push(Math.floor(Math.random() * 256));
    bytes.push(0x08, 0x00); // IPv4 EtherType

    // IPv4 header (20 bytes)
    bytes.push(0x45, 0x00, 0x00, 0x3c);
    bytes.push(0x1c, 0x46, 0x40, 0x00);
    bytes.push(p.ttl || 64, p.protocol === 'ICMP' ? 0x01 : 0x06, 0x61, 0x7c);
    
    // IP octets
    const srcParts = (p.srcIp || '192.168.1.1').split('.').map(n => parseInt(n, 10));
    const dstParts = (p.dstIp || '192.168.1.254').split('.').map(n => parseInt(n, 10));
    bytes.push(...srcParts, ...dstParts);

    // Payload bytes (alphabet standard ping payload)
    const payloadStr = "abcdefghijklmnopqrstuvwabcdefghi";
    for (let i = 0; i < payloadStr.length; i++) {
      bytes.push(payloadStr.charCodeAt(i));
    }

    // Format into 16-byte rows
    let html = '';
    for (let i = 0; i < bytes.length; i += 16) {
      const slice = bytes.slice(i, i + 16);
      const offset = i.toString(16).padStart(4, '0');
      
      const hexPart = slice.map(b => b.toString(16).padStart(2, '0')).join(' ');
      const asciiPart = slice.map(b => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.')).join('');

      html += `
        <div class="hex-line">
          <span class="hex-offset">${offset}</span>
          <span class="hex-bytes">${hexPart.padEnd(48, ' ')}</span>
          <span class="hex-ascii">${asciiPart}</span>
        </div>
      `;
    }

    this.hexContainer.innerHTML = html;
  }
}
