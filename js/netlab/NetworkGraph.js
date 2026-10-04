/**
 * ============================================================================
 * CyberForge NetLab - Network Graph & Topology State Model
 * Implements: Nodes, Interfaces, Links, Subnets, Routing & ARP Tables,
 * Serialization (URL-Hash / JSON), and Local Persistence
 * ============================================================================
 */

export class NetworkInterface {
  constructor({ id, name, ip = '', subnetMask = '255.255.255.0', mac = '', vlan = 1, status = 'UP' }) {
    this.id = id || `if-${Math.random().toString(36).substr(2, 6)}`;
    this.name = name || 'eth0';
    this.ip = ip;
    this.subnetMask = subnetMask;
    this.mac = mac || NetworkGraph.generateMac();
    this.vlan = vlan;
    this.status = status; // UP, DOWN, ADMIN_DOWN
    this.connectedLinkId = null;
  }
}

export class NetworkNode {
  constructor({ id, name, type, x = 100, y = 100, interfaces = [], gateway = '', dns = '8.8.8.8' }) {
    this.id = id || `node-${Math.random().toString(36).substr(2, 6)}`;
    this.name = name || 'Host';
    this.type = type; // 'host' | 'switch' | 'router' | 'firewall' | 'server'
    this.x = x;
    this.y = y;
    this.gateway = gateway;
    this.dns = dns;
    this.interfaces = interfaces.map(iface => new NetworkInterface(iface));
    
    // Routing Table: [{ destination, netmask, gateway, interface, type: 'C'|'S'|'O', metric }]
    this.routingTable = [];
    
    // ARP Cache: { [ip]: { mac, expiresAt } }
    this.arpTable = new Map();
    
    // Switch MAC CAM Table: { [mac]: { interfaceName, expiresAt } }
    this.macTable = new Map();
    
    // Firewall / ACL Rules: [{ id, action: 'permit'|'deny', protocol: 'any'|'tcp'|'udp'|'icmp', src, dst, port }]
    this.aclRules = [];
    
    // CLI State
    this.cliPromptContext = 'EXEC'; // EXEC, PRIVILEGED, CONFIG, CONFIG_IF
    this.activeInterface = null;

    this.initDefaultRoutes();
  }

  getInterface(nameOrId) {
    if (!nameOrId) return null;
    const clean = nameOrId.toLowerCase().replace(/\s+/g, '');
    return this.interfaces.find(i => {
      const iname = i.name.toLowerCase().replace(/\s+/g, '');
      if (iname === clean || i.id === nameOrId) return true;
      // Match GigabitEthernet0/0 with Gi0/0 or g0/0
      if ((clean.startsWith('gi') || clean.startsWith('g')) && (iname.startsWith('gi') || iname.startsWith('g'))) {
        const cNum = clean.replace(/^[a-z]+/, '');
        const iNum = iname.replace(/^[a-z]+/, '');
        if (cNum === iNum) return true;
      }
      // Match FastEthernet0/1 with Fa0/1 or f0/1
      if ((clean.startsWith('fa') || clean.startsWith('f')) && (iname.startsWith('fa') || iname.startsWith('f'))) {
        const cNum = clean.replace(/^[a-z]+/, '');
        const iNum = iname.replace(/^[a-z]+/, '');
        if (cNum === iNum) return true;
      }
      return false;
    }) || this.interfaces[0];
  }

  initDefaultRoutes() {
    this.interfaces.forEach(iface => {
      if (iface.ip && iface.status === 'UP') {
        const netAddr = NetworkGraph.getNetworkAddress(iface.ip, iface.subnetMask);
        this.addRoute({
          destination: netAddr,
          netmask: iface.subnetMask,
          gateway: '0.0.0.0',
          interface: iface.name,
          type: 'C',
          metric: 0
        });
      }
    });

    if (this.gateway) {
      this.addRoute({
        destination: '0.0.0.0',
        netmask: '0.0.0.0',
        gateway: this.gateway,
        interface: this.interfaces[0]?.name || 'eth0',
        type: 'S',
        metric: 1
      });
    }
  }

  addRoute(route) {
    this.routingTable = this.routingTable.filter(
      r => !(r.destination === route.destination && r.netmask === route.netmask)
    );
    this.routingTable.push(route);
  }

  removeRoute(destination, netmask) {
    this.routingTable = this.routingTable.filter(
      r => !(r.destination === destination && r.netmask === netmask)
    );
  }
}

export class NetworkLink {
  constructor({ id, sourceNodeId, sourceInterface, targetNodeId, targetInterface, status = 'OPERATIONAL', latency = 4, mediaType = 'COPPER_STRAIGHT' }) {
    this.id = id || `link-${Math.random().toString(36).substr(2, 6)}`;
    this.sourceNodeId = sourceNodeId;
    this.sourceInterface = sourceInterface;
    this.targetNodeId = targetNodeId;
    this.targetInterface = targetInterface;
    this.status = status; // 'OPERATIONAL' | 'SEVERED' | 'DEGRADED'
    this.latency = latency; // Simulated latency in ms
    this.mediaType = mediaType; // 'COPPER_STRAIGHT' | 'COPPER_CROSS' | 'FIBER' | 'SERIAL'
    this.hasSnifferTap = false;
  }
}

export class NetworkGraph {
  constructor() {
    this.nodes = new Map();
    this.links = new Map();
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(event, data) {
    this.listeners.forEach(fn => fn(event, data));
  }

  addNode(nodeData) {
    const node = nodeData instanceof NetworkNode ? nodeData : new NetworkNode(nodeData);
    this.nodes.set(node.id, node);
    this.notify('NODE_ADDED', node);
    return node;
  }

  removeNode(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    
    // Remove attached links
    for (const [linkId, link] of this.links.entries()) {
      if (link.sourceNodeId === nodeId || link.targetNodeId === nodeId) {
        this.removeLink(linkId);
      }
    }

    this.nodes.delete(nodeId);
    this.notify('NODE_REMOVED', nodeId);
  }

  getNode(nodeId) {
    return this.nodes.get(nodeId);
  }

  getNodeByName(name) {
    for (const node of this.nodes.values()) {
      if (node.name.toLowerCase() === name.toLowerCase()) return node;
    }
    return null;
  }

  addLink(linkData) {
    const link = linkData instanceof NetworkLink ? linkData : new NetworkLink(linkData);
    
    const srcNode = this.nodes.get(link.sourceNodeId);
    const dstNode = this.nodes.get(link.targetNodeId);

    if (srcNode && link.sourceInterface) {
      const iface = srcNode.getInterface(link.sourceInterface);
      if (iface) iface.connectedLinkId = link.id;
    }
    if (dstNode && link.targetInterface) {
      const iface = dstNode.getInterface(link.targetInterface);
      if (iface) iface.connectedLinkId = link.id;
    }

    this.links.set(link.id, link);
    this.notify('LINK_ADDED', link);
    return link;
  }

  removeLink(linkId) {
    const link = this.links.get(linkId);
    if (!link) return;

    const srcNode = this.nodes.get(link.sourceNodeId);
    const dstNode = this.nodes.get(link.targetNodeId);

    if (srcNode) {
      const iface = srcNode.getInterface(link.sourceInterface);
      if (iface) iface.connectedLinkId = null;
    }
    if (dstNode) {
      const iface = dstNode.getInterface(link.targetInterface);
      if (iface) iface.connectedLinkId = null;
    }

    this.links.delete(linkId);
    this.notify('LINK_REMOVED', linkId);
  }

  toggleLinkStatus(linkId) {
    const link = this.links.get(linkId);
    if (!link) return;
    link.status = link.status === 'OPERATIONAL' ? 'SEVERED' : 'OPERATIONAL';
    this.notify('LINK_UPDATED', link);
    return link.status;
  }

  toggleSnifferTap(linkId) {
    const link = this.links.get(linkId);
    if (!link) return;
    link.hasSnifferTap = !link.hasSnifferTap;
    this.notify('LINK_UPDATED', link);
    return link.hasSnifferTap;
  }

  /**
   * Routing & Forwarding Resolution: Longest Prefix Match
   */
  lookupRoute(sourceNode, targetIp) {
    if (!sourceNode || !targetIp) return null;
    let bestMatch = null;
    let maxPrefixLen = -1;

    for (const route of sourceNode.routingTable) {
      if (this.ipMatchesNetwork(targetIp, route.destination, route.netmask)) {
        const prefixLen = NetworkGraph.maskToPrefix(route.netmask);
        if (prefixLen > maxPrefixLen) {
          maxPrefixLen = prefixLen;
          bestMatch = route;
        }
      }
    }
    return bestMatch;
  }

  /**
   * Helper: IP Math & CIDR Utilities
   */
  static generateMac() {
    return 'XX:XX:XX:XX:XX:XX'.replace(/X/g, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]);
  }

  static ipToLong(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  }

  static longToIp(long) {
    return [(long >>> 24) & 255, (long >>> 16) & 255, (long >>> 8) & 255, long & 255].join('.');
  }

  static getNetworkAddress(ip, mask) {
    const ipLong = this.ipToLong(ip);
    const maskLong = this.ipToLong(mask);
    return this.longToIp((ipLong & maskLong) >>> 0);
  }

  static maskToPrefix(mask) {
    const long = this.ipToLong(mask);
    return long.toString(2).split('1').length - 1;
  }

  ipMatchesNetwork(ip, network, mask) {
    if (network === '0.0.0.0' && mask === '0.0.0.0') return true;
    const ipLong = NetworkGraph.ipToLong(ip);
    const netLong = NetworkGraph.ipToLong(network);
    const maskLong = NetworkGraph.ipToLong(mask);
    return ((ipLong & maskLong) >>> 0) === ((netLong & maskLong) >>> 0);
  }

  /**
   * Serialization: URL-Hash & JSON for Zero-Backend Sharing
   */
  exportToJson() {
    return JSON.stringify({
      nodes: Array.from(this.nodes.values()),
      links: Array.from(this.links.values())
    }, null, 2);
  }

  importFromJson(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      this.clear();
      data.nodes.forEach(n => this.addNode(n));
      data.links.forEach(l => this.addLink(l));
      this.notify('GRAPH_RESET');
      return true;
    } catch (e) {
      console.error('Failed to import network topology:', e);
      return false;
    }
  }

  exportToUrlHash() {
    const jsonStr = JSON.stringify({
      nodes: Array.from(this.nodes.values()).map(n => ({
        id: n.id, name: n.name, type: n.type, x: n.x, y: n.y,
        interfaces: n.interfaces, gateway: n.gateway, dns: n.dns
      })),
      links: Array.from(this.links.values())
    });
    return encodeURIComponent(btoa(jsonStr));
  }

  importFromUrlHash(hashStr) {
    try {
      const jsonStr = atob(decodeURIComponent(hashStr));
      return this.importFromJson(jsonStr);
    } catch (e) {
      console.error('Failed to parse URL topology hash:', e);
      return false;
    }
  }

  clear() {
    this.nodes.clear();
    this.links.clear();
  }
}
