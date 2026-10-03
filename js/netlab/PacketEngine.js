/**
 * ============================================================================
 * CyberForge NetLab - Discrete Packet Simulation Engine
 * Handles OSI L1-L7 packet generation, hop routing, TTL decrement,
 * ACL rule evaluation, and discrete event dispatching.
 * ============================================================================
 */

export class Packet {
  constructor({ id, type, srcNodeId, dstNodeId, srcIp, dstIp, srcMac, dstMac, ttl = 64, payload = {}, protocol = 'ICMP', port = null }) {
    this.id = id || `pkt-${Math.random().toString(36).substr(2, 7)}`;
    this.type = type; // 'ICMP_REQ' | 'ICMP_REPLY' | 'ARP_REQ' | 'ARP_REPLY' | 'DNS_REQ' | 'DNS_RES' | 'TCP_SYN' | 'TCP_ACK' | 'HTTP_REQ'
    this.srcNodeId = srcNodeId;
    this.dstNodeId = dstNodeId;
    this.srcIp = srcIp;
    this.dstIp = dstIp;
    this.srcMac = srcMac;
    this.dstMac = dstMac;
    this.ttl = ttl;
    this.protocol = protocol;
    this.port = port;
    this.payload = payload;
    this.timestamp = Date.now();
    this.status = 'IN_FLIGHT'; // 'IN_FLIGHT' | 'DELIVERED' | 'DROPPED' | 'EXPIRED'
    this.dropReason = null;
  }
}

export class PacketEngine {
  constructor(networkGraph) {
    this.graph = networkGraph;
    this.listeners = new Set();
    this.packetHistory = [];
    this.maxHistory = 100;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event, data) {
    this.listeners.forEach(fn => fn(event, data));
  }

  /**
   * High-Level Ping Command Pipeline
   */
  async sendPing(srcNodeId, targetIpOrDomain) {
    const srcNode = this.graph.getNode(srcNodeId);
    if (!srcNode) return { success: false, error: 'Source node not found' };

    let targetIp = targetIpOrDomain;

    // DNS Resolution Check if target is a hostname
    if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(targetIpOrDomain)) {
      const dnsResult = await this.resolveDns(srcNode, targetIpOrDomain);
      if (!dnsResult.success) {
        return { success: false, error: `Ping request could not find host ${targetIpOrDomain}. Please check the name and try again.` };
      }
      targetIp = dnsResult.resolvedIp;
    }

    const srcIface = srcNode.interfaces.find(i => i.ip && i.status === 'UP');
    if (!srcIface) {
      return { success: false, error: 'Source interface is DOWN or has no IP address assigned' };
    }

    // Step 1: Trace Path through Network Topology
    const pathResult = this.resolvePath(srcNode, targetIp);

    // Step 2: Create ICMP Echo Request Packet
    const icmpReq = new Packet({
      type: 'ICMP_REQ',
      srcNodeId: srcNode.id,
      dstNodeId: pathResult.targetNode ? pathResult.targetNode.id : null,
      srcIp: srcIface.ip,
      dstIp: targetIp,
      srcMac: srcIface.mac,
      dstMac: pathResult.nextHopMac || 'FF:FF:FF:FF:FF:FF',
      ttl: 64,
      protocol: 'ICMP',
      payload: { seq: 1, bytes: 32 }
    });

    if (!pathResult.success) {
      icmpReq.status = 'DROPPED';
      icmpReq.dropReason = pathResult.reason;
      this.recordPacket(icmpReq);
      return { success: false, error: pathResult.reason, dropNode: pathResult.dropNode };
    }

    this.recordPacket(icmpReq);
    this.emit('PACKET_TRANSMIT', { packet: icmpReq, hops: pathResult.hops, reverse: false });

    // Step 3: Check if links along path are broken or ACL blocked
    const dropCheck = this.evaluateHops(pathResult.hops, icmpReq);
    if (dropCheck.dropped) {
      icmpReq.status = 'DROPPED';
      icmpReq.dropReason = dropCheck.reason;
      this.emit('PACKET_DROPPED', { packet: icmpReq, hop: dropCheck.hop, reason: dropCheck.reason });
      return { success: false, error: dropCheck.reason, rtt: null };
    }

    // Step 4: Generate Echo Reply
    const rtt = Math.max(8, pathResult.hops.length * 6 + Math.floor(Math.random() * 4));
    
    const icmpReply = new Packet({
      type: 'ICMP_REPLY',
      srcNodeId: pathResult.targetNode.id,
      dstNodeId: srcNode.id,
      srcIp: targetIp,
      dstIp: srcIface.ip,
      srcMac: pathResult.targetNode.interfaces[0]?.mac,
      dstMac: srcIface.mac,
      ttl: Math.max(1, 64 - pathResult.hops.length),
      protocol: 'ICMP',
      payload: { seq: 1, bytes: 32, rtt }
    });

    this.recordPacket(icmpReply);
    this.emit('PACKET_TRANSMIT', { packet: icmpReply, hops: [...pathResult.hops].reverse(), reverse: true });

    return {
      success: true,
      targetIp,
      bytes: 32,
      rtt,
      ttl: icmpReply.ttl
    };
  }

  /**
   * DNS Resolution Simulation
   */
  async resolveDns(srcNode, domain) {
    if (!srcNode.dns) return { success: false, reason: 'DNS server not configured' };

    const dnsRecords = {
      'portal.internal.corp': '10.0.5.10',
      'web.intranet': '192.168.10.80',
      'api.cyberforge.io': '172.16.50.2',
      'google.com': '8.8.8.8'
    };

    const resolvedIp = dnsRecords[domain.toLowerCase()];
    if (!resolvedIp) {
      return { success: false, reason: `*** UnKnown can't find ${domain}: Non-existent domain` };
    }

    const dnsPath = this.resolvePath(srcNode, srcNode.dns);
    if (!dnsPath.success) {
      return { success: false, reason: `DNS request timed out. DNS Server ${srcNode.dns} unreachable.` };
    }

    return { success: true, resolvedIp, dnsServer: srcNode.dns };
  }

  /**
   * Path Resolution Algorithm across Topology Graph (with Layer 2 Switch support)
   */
  resolvePath(srcNode, destIp) {
    const visitedNodes = new Set([srcNode.id]);
    const hops = [];
    let currentNode = srcNode;
    let targetNode = null;

    for (const iface of srcNode.interfaces) {
      if (iface.ip === destIp) return { success: true, targetNode: srcNode, hops: [] };
    }

    for (const node of this.graph.nodes.values()) {
      if (node.interfaces.some(i => i.ip === destIp)) {
        targetNode = node;
        break;
      }
    }

    if (!targetNode) {
      targetNode = this.graph.getNodeByName('Cloud') || this.graph.getNodeByName('Internet');
    }

    let maxHops = 12;
    while (maxHops-- > 0) {
      let outgoingLink = null;

      if (currentNode.type === 'switch') {
        // Layer 2 Switch: forward through connected link to next unvisited node
        for (const link of this.graph.links.values()) {
          const isConnected = link.sourceNodeId === currentNode.id || link.targetNodeId === currentNode.id;
          const otherNodeId = link.sourceNodeId === currentNode.id ? link.targetNodeId : link.sourceNodeId;
          if (isConnected && !visitedNodes.has(otherNodeId)) {
            outgoingLink = link;
            break;
          }
        }
      } else {
        // Layer 3 Router / Host: routing table lookup
        const matchingRoute = this.graph.lookupRoute(currentNode, destIp);
        if (!matchingRoute) {
          return { success: false, reason: `Destination host unreachable: No route to ${destIp} on ${currentNode.name}`, dropNode: currentNode };
        }

        for (const link of this.graph.links.values()) {
          if (
            (link.sourceNodeId === currentNode.id && link.sourceInterface === matchingRoute.interface) ||
            (link.targetNodeId === currentNode.id && link.targetInterface === matchingRoute.interface)
          ) {
            outgoingLink = link;
            break;
          }
        }

        if (!outgoingLink) {
          for (const link of this.graph.links.values()) {
            if (link.sourceNodeId === currentNode.id || link.targetNodeId === currentNode.id) {
              const otherNodeId = link.sourceNodeId === currentNode.id ? link.targetNodeId : link.sourceNodeId;
              if (!visitedNodes.has(otherNodeId)) {
                outgoingLink = link;
                break;
              }
            }
          }
        }
      }

      if (!outgoingLink) {
        return { success: false, reason: `No active outgoing cable connected from ${currentNode.name}`, dropNode: currentNode };
      }

      hops.push(outgoingLink);

      const nextNodeId = outgoingLink.sourceNodeId === currentNode.id ? outgoingLink.targetNodeId : outgoingLink.sourceNodeId;
      const nextNode = this.graph.getNode(nextNodeId);

      if (!nextNode) {
        return { success: false, reason: `Cable terminates at disconnected port`, dropNode: currentNode };
      }

      if (nextNode.id === targetNode?.id || nextNode.interfaces.some(i => i.ip === destIp)) {
        return { success: true, targetNode: nextNode, hops, nextHopMac: nextNode.interfaces[0]?.mac };
      }

      if (visitedNodes.has(nextNode.id)) {
        return { success: false, reason: `Routing loop detected at ${nextNode.name}`, dropNode: nextNode };
      }

      visitedNodes.add(nextNode.id);
      currentNode = nextNode;
    }

    return { success: false, reason: `TTL expired in transit (hop limit exceeded)` };
  }

  evaluateHops(hops, packet) {
    for (const link of hops) {
      if (link.status === 'SEVERED') {
        return { dropped: true, hop: link, reason: `Packet dropped: Cable link ${link.id} is physically severed` };
      }
      
      const srcNode = this.graph.getNode(link.sourceNodeId);
      const dstNode = this.graph.getNode(link.targetNodeId);

      for (const node of [srcNode, dstNode]) {
        if (node && node.type === 'firewall' && node.aclRules.length > 0) {
          for (const rule of node.aclRules) {
            if (rule.action === 'deny') {
              if (rule.protocol === 'any' || rule.protocol === packet.protocol.toLowerCase()) {
                return { dropped: true, hop: link, reason: `Packet dropped by Firewall ACL Rule (${rule.protocol.toUpperCase()} Denied)` };
              }
            }
          }
        }
      }
    }
    return { dropped: false };
  }

  recordPacket(packet) {
    this.packetHistory.unshift(packet);
    if (this.packetHistory.length > this.maxHistory) {
      this.packetHistory.pop();
    }
    this.emit('PACKET_CAPTURED', packet);
  }
}
