/**
 * ============================================================================
 * CyberForge NetLab - Production CCNA & NOC Incident Ticket Database
 * Defines 8 Real-World Enterprise Diagnostic Scenarios with Complete
 * Topologies, Fault Injections, Verification Rules, Hints, & RCA metadata.
 * ============================================================================
 */

export const SCENARIOS = [
  {
    id: 'INC-101',
    title: 'The Silent Gateway',
    severity: 'critical',
    difficulty: 'Beginner',
    domain: 'CCNA 200-301 // IP Connectivity',
    description: 'Accounting Workstation (PC-1) cannot access Intranet Server (10.0.5.10) or Google DNS (8.8.8.8). Physical link LEDs are green, but all outbound traffic is dropped at the local segment.',
    symptoms: [
      'PC-1 can ping its own IP (192.168.1.15)',
      'PC-1 fails to ping Default Gateway (192.168.1.1)',
      'Outbound packets to 10.0.5.10 time out'
    ],
    rootCause: 'Default Gateway on PC-1 was mistakenly configured as 192.168.1.254 (non-existent) instead of the router interface 192.168.1.1.',
    hints: [
      'Inspect the local IP configuration on PC-1 using "ipconfig". Notice the Default Gateway address.',
      'Check the IP address assigned to Router-Edge interface GigabitEthernet0/0 using "show ip int brief".',
      'Fix the gateway on PC-1 by typing: ipconfig /setgateway 192.168.1.1'
    ],
    verify: (graph) => {
      const pc1 = graph.getNodeByName('PC-1');
      return pc1 && pc1.gateway === '192.168.1.1';
    },
    topology: {
      nodes: [
        { id: 'n-pc1', name: 'PC-1', type: 'host', x: 80, y: 180, gateway: '192.168.1.254', dns: '8.8.8.8',
          interfaces: [{ name: 'eth0', ip: '192.168.1.15', subnetMask: '255.255.255.0' }] },
        { id: 'n-sw1', name: 'Switch-1', type: 'switch', x: 260, y: 180,
          interfaces: [{ name: 'Fa0/1' }, { name: 'Fa0/2' }, { name: 'Gi0/1' }] },
        { id: 'n-r1', name: 'Router-Edge', type: 'router', x: 440, y: 180,
          interfaces: [
            { name: 'Gi0/0', ip: '192.168.1.1', subnetMask: '255.255.255.0' },
            { name: 'Gi0/1', ip: '10.0.5.1', subnetMask: '255.255.255.0' }
          ] },
        { id: 'n-srv1', name: 'Intranet-Server', type: 'server', x: 620, y: 180, gateway: '10.0.5.1',
          interfaces: [{ name: 'eth0', ip: '10.0.5.10', subnetMask: '255.255.255.0' }] }
      ],
      links: [
        { sourceNodeId: 'n-pc1', sourceInterface: 'eth0', targetNodeId: 'n-sw1', targetInterface: 'Fa0/1' },
        { sourceNodeId: 'n-sw1', sourceInterface: 'Gi0/1', targetNodeId: 'n-r1', targetInterface: 'Gi0/0' },
        { sourceNodeId: 'n-r1', sourceInterface: 'Gi0/1', targetNodeId: 'n-srv1', targetInterface: 'eth0' }
      ]
    }
  },

  {
    id: 'INC-204',
    title: 'Broken DNS Resolver',
    severity: 'elevated',
    difficulty: 'Beginner',
    domain: 'CCNA 200-301 // IP Services',
    description: 'Employees report that internal portals cannot be opened by hostname (portal.internal.corp). Pinging raw public IP 8.8.8.8 succeeds, but domain lookups fail.',
    symptoms: [
      'ping 8.8.8.8 succeeds with 12ms RTT',
      'nslookup portal.internal.corp returns "server can\'t find host"',
      'Intranet web services are unreachable by FQDN'
    ],
    rootCause: 'PC-1 was assigned a dead external DNS address (1.1.1.99) that does not exist or forward corporate DNS zones.',
    hints: [
      'Run "nslookup portal.internal.corp" on PC-1 to view the current DNS server address.',
      'Check what DNS server is active with "ipconfig".',
      'Update the DNS server on PC-1 to the corporate resolver (8.8.8.8) using: ipconfig /setdns 8.8.8.8'
    ],
    verify: (graph) => {
      const pc1 = graph.getNodeByName('PC-1');
      return pc1 && pc1.dns === '8.8.8.8';
    },
    topology: {
      nodes: [
        { id: 'n-pc1', name: 'PC-1', type: 'host', x: 80, y: 180, gateway: '192.168.1.1', dns: '1.1.1.99',
          interfaces: [{ name: 'eth0', ip: '192.168.1.15', subnetMask: '255.255.255.0' }] },
        { id: 'n-sw1', name: 'Switch-1', type: 'switch', x: 260, y: 180,
          interfaces: [{ name: 'Fa0/1' }, { name: 'Gi0/1' }] },
        { id: 'n-r1', name: 'Router-Edge', type: 'router', x: 440, y: 180,
          interfaces: [
            { name: 'Gi0/0', ip: '192.168.1.1', subnetMask: '255.255.255.0' },
            { name: 'Gi0/1', ip: '10.0.5.1', subnetMask: '255.255.255.0' }
          ] },
        { id: 'n-srv1', name: 'DNS-Server', type: 'server', x: 620, y: 180, gateway: '10.0.5.1',
          interfaces: [{ name: 'eth0', ip: '8.8.8.8', subnetMask: '255.255.255.0' }] }
      ],
      links: [
        { sourceNodeId: 'n-pc1', sourceInterface: 'eth0', targetNodeId: 'n-sw1', targetInterface: 'Fa0/1' },
        { sourceNodeId: 'n-sw1', sourceInterface: 'Gi0/1', targetNodeId: 'n-r1', targetInterface: 'Gi0/0' },
        { sourceNodeId: 'n-r1', sourceInterface: 'Gi0/1', targetNodeId: 'n-srv1', targetInterface: 'eth0' }
      ]
    }
  },

  {
    id: 'INC-308',
    title: 'The Severed Trunk & Physical Outage',
    severity: 'critical',
    difficulty: 'Intermediate',
    domain: 'CCNA 200-301 // Network Access & L1/L2',
    description: 'During a datacenter maintenance window, connectivity between Branch Switch and the Core Router was abruptly terminated. Packets cannot leave the local building.',
    symptoms: [
      'Red dashed line between Switch-1 and Router-Edge',
      'Interface status shows physical down / packet drop',
      'All branch nodes completely isolated'
    ],
    rootCause: 'Fiber optic patch cable between Switch-1 and Router-Edge was severed / disconnected.',
    hints: [
      'Examine the visual topology canvas. Notice the link between Switch-1 and Router-Edge is red.',
      'Click on the severed cable link in the topology to re-splice and bring it back to OPERATIONAL state.',
      'Verify connectivity by switching to PC-1 and typing: ping 10.0.5.10'
    ],
    verify: (graph) => {
      for (const link of graph.links.values()) {
        if (link.status === 'SEVERED') return false;
      }
      return true;
    },
    topology: {
      nodes: [
        { id: 'n-pc1', name: 'PC-1', type: 'host', x: 80, y: 180, gateway: '192.168.1.1', dns: '8.8.8.8',
          interfaces: [{ name: 'eth0', ip: '192.168.1.15', subnetMask: '255.255.255.0' }] },
        { id: 'n-sw1', name: 'Switch-1', type: 'switch', x: 260, y: 180,
          interfaces: [{ name: 'Fa0/1' }, { name: 'Gi0/1' }] },
        { id: 'n-r1', name: 'Router-Edge', type: 'router', x: 440, y: 180,
          interfaces: [
            { name: 'Gi0/0', ip: '192.168.1.1', subnetMask: '255.255.255.0' },
            { name: 'Gi0/1', ip: '10.0.5.1', subnetMask: '255.255.255.0' }
          ] },
        { id: 'n-srv1', name: 'Intranet-Server', type: 'server', x: 620, y: 180, gateway: '10.0.5.1',
          interfaces: [{ name: 'eth0', ip: '10.0.5.10', subnetMask: '255.255.255.0' }] }
      ],
      links: [
        { sourceNodeId: 'n-pc1', sourceInterface: 'eth0', targetNodeId: 'n-sw1', targetInterface: 'Fa0/1' },
        { sourceNodeId: 'n-sw1', sourceInterface: 'Gi0/1', targetNodeId: 'n-r1', targetInterface: 'Gi0/0', status: 'SEVERED' },
        { sourceNodeId: 'n-r1', sourceInterface: 'Gi0/1', targetNodeId: 'n-srv1', targetInterface: 'eth0' }
      ]
    }
  },

  {
    id: 'INC-520',
    title: 'Ghost in the Firewall (ACL Drop)',
    severity: 'critical',
    difficulty: 'Advanced',
    domain: 'CCNA 200-301 // Security Fundamentals',
    description: 'Workstations can resolve DNS and ping the edge router, but all attempts to ping or connect to the Enterprise Database Server are blocked at the perimeter firewall.',
    symptoms: [
      'Ping packets show red burst collision in topology canvas',
      'Packet sniffer detects "Packet dropped by Firewall ACL Rule"',
      'Firewall state logs indicate deny policy active'
    ],
    rootCause: 'Firewall-Edge has an explicit deny-all rule blocking ICMP and data traffic.',
    hints: [
      'Switch terminal tab to Firewall-Edge.',
      'Elevate to privileged mode with "enable", then "conf t".',
      'Permit ICMP traffic by typing: access-list 101 permit icmp'
    ],
    verify: (graph) => {
      const fw = graph.getNodeByName('Firewall-Edge');
      if (!fw) return false;
      return fw.aclRules.some(r => r.action === 'permit' && (r.protocol === 'icmp' || r.protocol === 'any'));
    },
    topology: {
      nodes: [
        { id: 'n-pc1', name: 'PC-1', type: 'host', x: 80, y: 180, gateway: '192.168.1.1', dns: '8.8.8.8',
          interfaces: [{ name: 'eth0', ip: '192.168.1.15', subnetMask: '255.255.255.0' }] },
        { id: 'n-r1', name: 'Router-Edge', type: 'router', x: 260, y: 180,
          interfaces: [
            { name: 'Gi0/0', ip: '192.168.1.1', subnetMask: '255.255.255.0' },
            { name: 'Gi0/1', ip: '10.0.1.1', subnetMask: '255.255.255.0' }
          ] },
        { id: 'n-fw1', name: 'Firewall-Edge', type: 'firewall', x: 440, y: 180,
          interfaces: [
            { name: 'eth0', ip: '10.0.1.2', subnetMask: '255.255.255.0' },
            { name: 'eth1', ip: '10.0.5.1', subnetMask: '255.255.255.0' }
          ] },
        { id: 'n-srv1', name: 'Database-Server', type: 'server', x: 620, y: 180, gateway: '10.0.5.1',
          interfaces: [{ name: 'eth0', ip: '10.0.5.10', subnetMask: '255.255.255.0' }] }
      ],
      links: [
        { sourceNodeId: 'n-pc1', sourceInterface: 'eth0', targetNodeId: 'n-r1', targetInterface: 'Gi0/0' },
        { sourceNodeId: 'n-r1', sourceInterface: 'Gi0/1', targetNodeId: 'n-fw1', targetInterface: 'eth0' },
        { sourceNodeId: 'n-fw1', sourceInterface: 'eth1', targetNodeId: 'n-srv1', targetInterface: 'eth0' }
      ]
    }
  },

  {
    id: 'INC-412',
    title: 'Subnet Mask Overlap & Black Hole',
    severity: 'elevated',
    difficulty: 'Intermediate',
    domain: 'CCNA 200-301 // IP Addressing & Subnetting',
    description: 'PC-1 cannot reach Server-2 (192.168.2.50). PC-1 assumes Server-2 is local because its own subnet mask was mistakenly set to /16 (255.255.0.0) instead of /24 (255.255.255.0), causing it to emit ARP requests locally instead of forwarding to the gateway.',
    symptoms: [
      'PC-1 can ping Default Gateway 192.168.1.1',
      'PC-1 fails to reach 192.168.2.50 across router',
      'ARP cache on PC-1 floods with unresolved queries for 192.168.2.50'
    ],
    rootCause: 'PC-1 subnet mask is 255.255.0.0 (/16). It mistakenly believes 192.168.2.50 is on its local broadcast domain.',
    hints: [
      'Check the subnet mask on PC-1 by typing "ipconfig". Notice it is 255.255.0.0.',
      'Check the router interface Gi0/0 subnet mask using "show ip int brief". It is a /24 (255.255.255.0).',
      'Set the correct /24 subnet mask on PC-1 via terminal: ipconfig /setmask 255.255.255.0'
    ],
    verify: (graph) => {
      const pc1 = graph.getNodeByName('PC-1');
      return pc1 && pc1.interfaces[0]?.subnetMask === '255.255.255.0';
    },
    topology: {
      nodes: [
        { id: 'n-pc1', name: 'PC-1', type: 'host', x: 80, y: 180, gateway: '192.168.1.1', dns: '8.8.8.8',
          interfaces: [{ name: 'eth0', ip: '192.168.1.15', subnetMask: '255.255.0.0' }] },
        { id: 'n-r1', name: 'Router-Edge', type: 'router', x: 350, y: 180,
          interfaces: [
            { name: 'Gi0/0', ip: '192.168.1.1', subnetMask: '255.255.255.0' },
            { name: 'Gi0/1', ip: '192.168.2.1', subnetMask: '255.255.255.0' }
          ] },
        { id: 'n-srv2', name: 'Server-2', type: 'server', x: 620, y: 180, gateway: '192.168.2.1',
          interfaces: [{ name: 'eth0', ip: '192.168.2.50', subnetMask: '255.255.255.0' }] }
      ],
      links: [
        { sourceNodeId: 'n-pc1', sourceInterface: 'eth0', targetNodeId: 'n-r1', targetInterface: 'Gi0/0' },
        { sourceNodeId: 'n-r1', sourceInterface: 'Gi0/1', targetNodeId: 'n-srv2', targetInterface: 'eth0' }
      ]
    }
  },

  {
    id: 'INC-630',
    title: 'Interface Administratively Down',
    severity: 'critical',
    difficulty: 'Intermediate',
    domain: 'CCNA 200-301 // Cisco IOS Interface Management',
    description: 'Finance department reported a sudden loss of connection to the Core Gateway. Investigation shows the router interface was left administratively shut down during last night\'s security patch cycle.',
    symptoms: [
      'show ip int brief shows GigabitEthernet0/0 is "administratively down, line protocol down"',
      'No frames traverse the link from Switch-1 to Router-Core',
      'PC-1 reports "Destination host unreachable"'
    ],
    rootCause: 'Router-Core interface Gi0/0 has "shutdown" state active.',
    hints: [
      'Connect to Router-Core terminal.',
      'Elevate to privileged mode with "enable", then "conf t".',
      'Enter interface config "int Gi0/0" and bring it up with: no shutdown'
    ],
    verify: (graph) => {
      const r = graph.getNodeByName('Router-Core');
      if (!r) return false;
      const iface = r.getInterface('Gi0/0');
      return iface && iface.status === 'UP';
    },
    topology: {
      nodes: [
        { id: 'n-pc1', name: 'PC-1', type: 'host', x: 80, y: 180, gateway: '192.168.1.1', dns: '8.8.8.8',
          interfaces: [{ name: 'eth0', ip: '192.168.1.15', subnetMask: '255.255.255.0' }] },
        { id: 'n-sw1', name: 'Switch-1', type: 'switch', x: 260, y: 180,
          interfaces: [{ name: 'Fa0/1' }, { name: 'Gi0/1' }] },
        { id: 'n-r1', name: 'Router-Core', type: 'router', x: 440, y: 180,
          interfaces: [
            { name: 'Gi0/0', ip: '192.168.1.1', subnetMask: '255.255.255.0', status: 'ADMIN_DOWN' },
            { name: 'Gi0/1', ip: '10.0.5.1', subnetMask: '255.255.255.0' }
          ] },
        { id: 'n-srv1', name: 'Intranet-Server', type: 'server', x: 620, y: 180, gateway: '10.0.5.1',
          interfaces: [{ name: 'eth0', ip: '10.0.5.10', subnetMask: '255.255.255.0' }] }
      ],
      links: [
        { sourceNodeId: 'n-pc1', sourceInterface: 'eth0', targetNodeId: 'n-sw1', targetInterface: 'Fa0/1' },
        { sourceNodeId: 'n-sw1', sourceInterface: 'Gi0/1', targetNodeId: 'n-r1', targetInterface: 'Gi0/0' },
        { sourceNodeId: 'n-r1', sourceInterface: 'Gi0/1', targetNodeId: 'n-srv1', targetInterface: 'eth0' }
      ]
    }
  },

  {
    id: 'INC-744',
    title: 'Static Route Black Hole',
    severity: 'elevated',
    difficulty: 'Advanced',
    domain: 'CCNA 200-301 // IP Routing Technologies',
    description: 'Branch Office PC can ping its local router, but traffic destined for Cloud Subnet (172.16.0.0/16) is dropped at Edge Router because no route to the cloud network exists in the routing table.',
    symptoms: [
      'ping 172.16.50.2 fails with "No route to host"',
      'show ip route on Router-Edge does not contain 172.16.0.0/16',
      'Packets vanish at Router-Edge'
    ],
    rootCause: 'Router-Edge is missing a static or default route to next-hop 192.168.100.2 for destination 172.16.0.0.',
    hints: [
      'Inspect the routing table on Router-Edge using "show ip route".',
      'Notice that network 172.16.0.0 is missing.',
      'Add the static route in config mode: ip route 172.16.0.0 255.255.0.0 192.168.100.2'
    ],
    verify: (graph) => {
      const r = graph.getNodeByName('Router-Edge');
      if (!r) return false;
      return r.routingTable.some(rt => rt.destination === '172.16.0.0');
    },
    topology: {
      nodes: [
        { id: 'n-pc1', name: 'PC-1', type: 'host', x: 80, y: 180, gateway: '192.168.1.1', dns: '8.8.8.8',
          interfaces: [{ name: 'eth0', ip: '192.168.1.15', subnetMask: '255.255.255.0' }] },
        { id: 'n-r1', name: 'Router-Edge', type: 'router', x: 260, y: 180,
          interfaces: [
            { name: 'Gi0/0', ip: '192.168.1.1', subnetMask: '255.255.255.0' },
            { name: 'Gi0/1', ip: '192.168.100.1', subnetMask: '255.255.255.0' }
          ] },
        { id: 'n-r2', name: 'Router-Cloud', type: 'router', x: 440, y: 180,
          interfaces: [
            { name: 'Gi0/0', ip: '192.168.100.2', subnetMask: '255.255.255.0' },
            { name: 'Gi0/1', ip: '172.16.0.1', subnetMask: '255.255.0.0' }
          ] },
        { id: 'n-srv1', name: 'Cloud-Server', type: 'server', x: 620, y: 180, gateway: '172.16.0.1',
          interfaces: [{ name: 'eth0', ip: '172.16.50.2', subnetMask: '255.255.0.0' }] }
      ],
      links: [
        { sourceNodeId: 'n-pc1', sourceInterface: 'eth0', targetNodeId: 'n-r1', targetInterface: 'Gi0/0' },
        { sourceNodeId: 'n-r1', sourceInterface: 'Gi0/1', targetNodeId: 'n-r2', targetInterface: 'Gi0/0' },
        { sourceNodeId: 'n-r2', sourceInterface: 'Gi0/1', targetNodeId: 'n-srv1', targetInterface: 'eth0' }
      ]
    }
  },

  {
    id: 'INC-890',
    title: 'Zero-Day Infiltration (SOC Triage)',
    severity: 'critical',
    difficulty: 'Expert',
    domain: 'CCNA 200-301 // Security Operations & ACL Hardening',
    description: 'SIEM detected anomalous outbound traffic from the Database Server. A compromised port was identified, and the security analyst must inspect the firewall and configure an explicit emergency permit/deny policy.',
    symptoms: [
      'Suspicious socket activity on Database-Server',
      'Unrestricted outbound flows bypassing inspection',
      'Emergency policy required on Firewall-Perimeter'
    ],
    rootCause: 'Firewall-Perimeter was lacking standard ACL filtering rules.',
    hints: [
      'Switch console to Firewall-Perimeter.',
      'Enter privileged config mode: enable -> conf t',
      'Apply standard security ACL rule: access-list 101 permit icmp'
    ],
    verify: (graph) => {
      const fw = graph.getNodeByName('Firewall-Perimeter');
      if (!fw) return false;
      return fw.aclRules.some(r => r.action === 'permit');
    },
    topology: {
      nodes: [
        { id: 'n-pc1', name: 'PC-1', type: 'host', x: 80, y: 180, gateway: '192.168.1.1', dns: '8.8.8.8',
          interfaces: [{ name: 'eth0', ip: '192.168.1.15', subnetMask: '255.255.255.0' }] },
        { id: 'n-r1', name: 'Router-Edge', type: 'router', x: 260, y: 180,
          interfaces: [
            { name: 'Gi0/0', ip: '192.168.1.1', subnetMask: '255.255.255.0' },
            { name: 'Gi0/1', ip: '10.0.1.1', subnetMask: '255.255.255.0' }
          ] },
        { id: 'n-fw1', name: 'Firewall-Perimeter', type: 'firewall', x: 440, y: 180,
          interfaces: [
            { name: 'eth0', ip: '10.0.1.2', subnetMask: '255.255.255.0' },
            { name: 'eth1', ip: '10.0.5.1', subnetMask: '255.255.255.0' }
          ] },
        { id: 'n-srv1', name: 'Database-Server', type: 'server', x: 620, y: 180, gateway: '10.0.5.1',
          interfaces: [{ name: 'eth0', ip: '10.0.5.10', subnetMask: '255.255.255.0' }] }
      ],
      links: [
        { sourceNodeId: 'n-pc1', sourceInterface: 'eth0', targetNodeId: 'n-r1', targetInterface: 'Gi0/0' },
        { sourceNodeId: 'n-r1', sourceInterface: 'Gi0/1', targetNodeId: 'n-fw1', targetInterface: 'eth0' },
        { sourceNodeId: 'n-fw1', sourceInterface: 'eth1', targetNodeId: 'n-srv1', targetInterface: 'eth0' }
      ]
    }
  }
];

