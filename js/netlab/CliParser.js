/**
 * ============================================================================
 * CyberForge NetLab - Dual-Mode CLI Parser & Touch-Chips Engine
 * Supports Cisco IOS hierarchy (User EXEC -> Privileged -> Global Config -> Int)
 * and Standard Workstation/Host CLI (ipconfig, ping, nslookup, traceroute, arp).
 * ============================================================================
 */

export class CliParser {
  constructor({ terminalBody, inputEl, promptEl, chipsContainer, networkGraph, packetEngine }) {
    this.terminalBody = terminalBody;
    this.inputEl = inputEl;
    this.promptEl = promptEl;
    this.chipsContainer = chipsContainer;
    this.graph = networkGraph;
    this.packetEngine = packetEngine;

    this.activeNodeId = null;
    this.history = [];
    this.historyIndex = -1;

    this.initListeners();
  }

  setActiveNode(nodeId) {
    this.activeNodeId = nodeId;
    const node = this.graph.getNode(nodeId);
    if (!node) return;

    this.updatePrompt();
    this.updateCyberChips();
    this.printLine(`[CONSOLE ATTACHED] Connected to serial console of ${node.name} (${node.type.toUpperCase()})`, 'system-msg');
  }

  getActiveNode() {
    return this.graph.getNode(this.activeNodeId);
  }

  initListeners() {
    if (!this.inputEl) return;

    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const cmd = this.inputEl.value.trim();
        this.inputEl.value = '';
        if (cmd) {
          this.history.push(cmd);
          this.historyIndex = this.history.length;
          this.execute(cmd);
        } else {
          this.printPromptEcho('');
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.historyIndex > 0) {
          this.historyIndex--;
          this.inputEl.value = this.history[this.historyIndex];
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (this.historyIndex < this.history.length - 1) {
          this.historyIndex++;
          this.inputEl.value = this.history[this.historyIndex];
        } else {
          this.historyIndex = this.history.length;
          this.inputEl.value = '';
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        this.handleTabAutocomplete();
      }
      this.updateCyberChips();
    });

    this.inputEl.addEventListener('input', () => {
      this.updateCyberChips();
    });
  }

  updatePrompt() {
    const node = this.getActiveNode();
    if (!node || !this.promptEl) return;

    let p = '';
    if (node.type === 'switch' || node.type === 'router' || node.type === 'firewall') {
      switch (node.cliPromptContext) {
        case 'PRIVILEGED':
          p = `${node.name}#`;
          break;
        case 'CONFIG':
          p = `${node.name}(config)#`;
          break;
        case 'CONFIG_IF':
          p = `${node.name}(config-if)#`;
          break;
        default:
          p = `${node.name}>`;
          break;
      }
    } else {
      p = `C:\\Users\\Admin>`;
    }

    this.promptEl.textContent = p;
  }

  printPromptEcho(cmd) {
    const promptText = this.promptEl ? this.promptEl.textContent : '>';
    this.printLine(`${promptText} ${cmd}`, 'cmd-echo');
  }

  printLine(text, className = '') {
    if (!this.terminalBody) return;
    const div = document.createElement('div');
    div.className = `term-line ${className}`;
    div.textContent = text;
    this.terminalBody.appendChild(div);
    this.terminalBody.scrollTop = this.terminalBody.scrollHeight;
  }

  clear() {
    if (this.terminalBody) this.terminalBody.innerHTML = '';
  }

  /**
   * Command Execution Router
   */
  async execute(rawCmd) {
    const node = this.getActiveNode();
    if (!node) {
      this.printLine('No device selected.', 'error-msg');
      return;
    }

    this.printPromptEcho(rawCmd);
    const parts = rawCmd.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (cmd === 'clear' || cmd === 'cls') {
      this.clear();
      return;
    }

    if (cmd === 'help' || cmd === '?') {
      this.showHelp(node);
      return;
    }

    if (node.type === 'switch' || node.type === 'router' || node.type === 'firewall') {
      await this.executeCiscoCommand(node, cmd, args, rawCmd);
    } else {
      await this.executeHostCommand(node, cmd, args);
    }

    this.updatePrompt();
    this.updateCyberChips();
  }

  /**
   * Cisco IOS Execution Engine
   */
  async executeCiscoCommand(node, cmd, args, rawCmd) {
    const ctx = node.cliPromptContext;

    // Global transitions
    if (cmd === 'enable' || cmd === 'en') {
      node.cliPromptContext = 'PRIVILEGED';
      return;
    }

    if (cmd === 'disable') {
      node.cliPromptContext = 'EXEC';
      return;
    }

    if (cmd === 'exit') {
      if (ctx === 'CONFIG_IF') node.cliPromptContext = 'CONFIG';
      else if (ctx === 'CONFIG') node.cliPromptContext = 'PRIVILEGED';
      else if (ctx === 'PRIVILEGED') node.cliPromptContext = 'EXEC';
      return;
    }

    if (cmd === 'end') {
      node.cliPromptContext = 'PRIVILEGED';
      return;
    }

    if (cmd === 'configure' || cmd === 'conf') {
      if (args[0] === 'terminal' || args[0] === 't') {
        if (ctx === 'EXEC') {
          this.printLine('% Error: Privilege level must be elevated (run "enable" first)', 'error-msg');
          return;
        }
        node.cliPromptContext = 'CONFIG';
        this.printLine('Enter configuration commands, one per line. End with CNTL/Z or "end".', 'system-msg');
        return;
      }
    }

    // Config Mode Commands
    if (ctx === 'CONFIG' || ctx === 'CONFIG_IF') {
      if (cmd === 'hostname') {
        if (args[0]) {
          node.name = args[0];
          this.printLine(`Hostname changed to ${args[0]}`, 'success-msg');
        }
        return;
      }

      if (cmd === 'interface' || cmd === 'int') {
        const ifaceName = args[0];
        const iface = node.getInterface(ifaceName);
        if (iface) {
          node.activeInterface = iface;
          node.cliPromptContext = 'CONFIG_IF';
        } else {
          this.printLine(`% Invalid interface ${ifaceName}. Available: ${node.interfaces.map(i => i.name).join(', ')}`, 'error-msg');
        }
        return;
      }

      if (cmd === 'ip' && args[0] === 'route') {
        // ip route <net> <mask> <gw>
        if (args.length >= 4) {
          node.addRoute({
            destination: args[1],
            netmask: args[2],
            gateway: args[3],
            interface: node.interfaces[0]?.name || 'eth0',
            type: 'S',
            metric: 1
          });
          this.printLine(`Static route to ${args[1]}/${args[2]} via ${args[3]} added.`, 'success-msg');
          return;
        }
        this.printLine('% Incomplete command: ip route <network> <netmask> <gateway>', 'error-msg');
        return;
      }

      if (cmd === 'access-list' || cmd === 'acl') {
        // access-list 101 permit/deny tcp/icmp/any
        const action = args[1]?.toLowerCase();
        const protocol = args[2]?.toLowerCase() || 'any';
        if (action === 'permit' || action === 'deny') {
          node.aclRules.push({ id: args[0], action, protocol });
          this.printLine(`Access-list ${args[0]} ${action} ${protocol} configured.`, 'success-msg');
          return;
        }
      }
    }

    // Interface Config Mode
    if (ctx === 'CONFIG_IF') {
      const iface = node.activeInterface;
      if (cmd === 'ip' && args[0] === 'address') {
        if (args.length >= 3) {
          iface.ip = args[1];
          iface.subnetMask = args[2];
          node.initDefaultRoutes();
          this.printLine(`IP address ${args[1]} ${args[2]} configured on ${iface.name}`, 'success-msg');
          return;
        }
      }

      if (cmd === 'no' && args[0] === 'shutdown') {
        iface.status = 'UP';
        this.printLine(`%LINK-3-UPDOWN: Interface ${iface.name}, changed state to up`, 'success-msg');
        return;
      }

      if (cmd === 'shutdown') {
        iface.status = 'ADMIN_DOWN';
        this.printLine(`%LINK-5-CHANGED: Interface ${iface.name}, changed state to administratively down`, 'warning-msg');
        return;
      }

      if (cmd === 'switchport') {
        this.printLine(`Switchport configured on ${iface.name}`, 'success-msg');
        return;
      }
    }

    // Show Commands (Available in Privileged & Config)
    if (cmd === 'show' || cmd === 'sh') {
      const sub = args[0]?.toLowerCase();
      if (sub === 'ip' && (args[1]?.toLowerCase() === 'interface' || args[1]?.toLowerCase() === 'int')) {
        this.renderShowIpIntBrief(node);
        return;
      }
      if (sub === 'ip' && args[1]?.toLowerCase() === 'route') {
        this.renderShowIpRoute(node);
        return;
      }
      if (sub === 'running-config' || sub === 'run') {
        this.renderShowRunningConfig(node);
        return;
      }
      if (sub === 'vlan' || sub === 'vlan-brief') {
        this.printLine('VLAN Name                             Status    Ports\n---- -------------------------------- --------- -------------------\n1    default                          active    Fa0/1, Fa0/2, Fa0/3\n20   Marketing                        active    Fa0/4');
        return;
      }
    }

    // Ping from Router
    if (cmd === 'ping') {
      if (args[0]) {
        await this.handlePing(node, args[0]);
        return;
      }
    }

    this.printLine(`% Invalid input detected at marker: "${rawCmd}". Type "?" for help.`, 'error-msg');
  }

  /**
   * Host / PC / Server Execution Engine
   */
  async executeHostCommand(node, cmd, args) {
    if (cmd === 'ipconfig' || cmd === 'ifconfig') {
      if (args[0] === '/setgateway') {
        node.gateway = args[1] || '';
        node.initDefaultRoutes();
        this.printLine(`Default gateway updated to ${args[1]}`, 'success-msg');
        return;
      }
      if (args[0] === '/setdns') {
        node.dns = args[1] || '';
        this.printLine(`DNS server updated to ${args[1]}`, 'success-msg');
        return;
      }
      if (args[0] === '/setmask') {
        if (node.interfaces[0]) {
          node.interfaces[0].subnetMask = args[1] || '255.255.255.0';
          node.initDefaultRoutes();
          this.printLine(`Subnet mask updated to ${args[1]} on ${node.interfaces[0].name}`, 'success-msg');
          return;
        }
      }
      this.renderIpconfig(node);
      return;
    }

    if (cmd === 'ping') {
      if (args[0]) {
        await this.handlePing(node, args[0]);
        return;
      }
      this.printLine('Usage: ping <IP or Domain Name>', 'warning-msg');
      return;
    }

    if (cmd === 'nslookup') {
      if (args[0]) {
        this.printLine(`Server:  resolver.cyberforge.local\nAddress: ${node.dns || 'Not configured'}\n`);
        const res = await this.packetEngine.resolveDns(node, args[0]);
        if (res.success) {
          this.printLine(`Non-authoritative answer:\nName:    ${args[0]}\nAddress: ${res.resolvedIp}`, 'success-msg');
        } else {
          this.printLine(res.reason, 'error-msg');
        }
        return;
      }
      this.printLine('Usage: nslookup <domain-name>', 'warning-msg');
      return;
    }

    if (cmd === 'traceroute' || cmd === 'tracert') {
      if (args[0]) {
        this.printLine(`Tracing route to ${args[0]} over a maximum of 30 hops:`);
        this.printLine(`  1    <1 ms    <1 ms    <1 ms  ${node.gateway || '192.168.1.1'}`);
        this.printLine(`  2     4 ms     5 ms     4 ms  10.0.0.1`);
        this.printLine(`  3     8 ms     8 ms     7 ms  ${args[0]}`);
        this.printLine('Trace complete.', 'success-msg');
        return;
      }
    }

    if (cmd === 'arp' && args[0] === '-a') {
      this.printLine('Interface: ' + (node.interfaces[0]?.ip || '0.0.0.0'));
      this.printLine('  Internet Address      Physical Address      Type');
      this.printLine('  ' + (node.gateway || '192.168.1.1').padEnd(22, ' ') + '00-50-56-a1-b2-c3     dynamic');
      return;
    }

    this.printLine(`'${cmd}' is not recognized as an internal or external command, operable program or batch file.`, 'error-msg');
  }

  async handlePing(node, target) {
    this.printLine(`Pinging ${target} with 32 bytes of data:`);
    
    // Simulate 4 echo requests
    let replies = 0;
    for (let i = 0; i < 4; i++) {
      const result = await this.packetEngine.sendPing(node.id, target);
      if (result.success) {
        this.printLine(`Reply from ${result.targetIp}: bytes=${result.bytes} time=${result.rtt}ms TTL=${result.ttl}`);
        replies++;
      } else {
        this.printLine(`Request timed out. (${result.error || 'Destination host unreachable'})`, 'error-msg');
      }
      await new Promise(r => setTimeout(r, 120));
    }

    const loss = ((4 - replies) / 4) * 100;
    this.printLine(`\nPing statistics for ${target}:`);
    this.printLine(`    Packets: Sent = 4, Received = ${replies}, Lost = ${4 - replies} (${loss}% loss)`);
    if (replies > 0) {
      this.printLine(`Approximate round trip times: Minimum = 8ms, Maximum = 16ms, Average = 12ms`, 'success-msg');
    }
  }

  renderShowIpIntBrief(node) {
    let out = 'Interface              IP-Address      OK? Method Status                Protocol\n';
    node.interfaces.forEach(i => {
      const name = i.name.padEnd(22, ' ');
      const ip = (i.ip || 'unassigned').padEnd(16, ' ');
      const status = (i.status === 'UP' ? 'up' : 'administratively down').padEnd(21, ' ');
      const proto = i.status === 'UP' ? 'up' : 'down';
      out += `${name} ${ip} YES manual ${status} ${proto}\n`;
    });
    this.printLine(out);
  }

  renderShowIpRoute(node) {
    let out = 'Codes: C - connected, S - static, R - RIP, O - OSPF\n\nGateway of last resort is not set\n\n';
    node.routingTable.forEach(r => {
      out += `${r.type}    ${r.destination}/${r.netmask} is directly connected, ${r.interface} (gw: ${r.gateway})\n`;
    });
    this.printLine(out);
  }

  renderShowRunningConfig(node) {
    let out = `Building configuration...\n\nCurrent configuration : 940 bytes\n!\nversion 15.2\nhostname ${node.name}\n!\n`;
    node.interfaces.forEach(i => {
      out += `interface ${i.name}\n`;
      if (i.ip) out += ` ip address ${i.ip} ${i.subnetMask}\n`;
      if (i.status === 'ADMIN_DOWN') out += ` shutdown\n`;
      else out += ` no shutdown\n`;
      out += `!\n`;
    });
    out += `end`;
    this.printLine(out);
  }

  renderIpconfig(node) {
    this.printLine('Windows IP Configuration\n');
    node.interfaces.forEach(i => {
      this.printLine(`Ethernet adapter ${i.name}:`);
      this.printLine(`   Connection-specific DNS Suffix  . : cyberforge.local`);
      this.printLine(`   IPv4 Address. . . . . . . . . . . : ${i.ip || '0.0.0.0'}`);
      this.printLine(`   Subnet Mask . . . . . . . . . . . : ${i.subnetMask}`);
      this.printLine(`   Default Gateway . . . . . . . . . : ${node.gateway || 'None'}`);
      this.printLine(`   DNS Servers . . . . . . . . . . . : ${node.dns || 'None'}\n`);
    });
  }

  showHelp(node) {
    if (node.type === 'switch' || node.type === 'router' || node.type === 'firewall') {
      this.printLine('Available Cisco IOS Commands:');
      this.printLine('  enable              Elevate to privileged EXEC mode');
      this.printLine('  configure terminal  Enter global configuration mode');
      this.printLine('  interface <id>      Configure an interface');
      this.printLine('  ip address <ip> <m> Set interface IP & mask');
      this.printLine('  no shutdown         Bring interface UP');
      this.printLine('  ip route <n> <m> <g>Add static route');
      this.printLine('  access-list <rule>  Configure ACL filter');
      this.printLine('  show ip int brief   Display interface status');
      this.printLine('  show ip route       Display routing table');
      this.printLine('  ping <target>       Send ICMP echo requests');
      this.printLine('  exit / end          Exit current configuration level');
    } else {
      this.printLine('Available Host Commands:');
      this.printLine('  ipconfig            View IP, subnet mask, gateway, DNS');
      this.printLine('  ipconfig /setgateway Set default gateway IP');
      this.printLine('  ipconfig /setdns    Set DNS server IP');
      this.printLine('  ping <target>       Test connectivity');
      this.printLine('  nslookup <domain>   Query DNS name resolution');
      this.printLine('  tracert <target>    Trace network hops');
      this.printLine('  arp -a              View ARP cache');
      this.printLine('  clear / cls         Clear terminal screen');
    }
  }

  /**
   * Mobile Cyber-Chips Contextual Generator
   */
  updateCyberChips() {
    if (!this.chipsContainer) return;
    const node = this.getActiveNode();
    if (!node) return;

    const currentText = this.inputEl ? this.inputEl.value : '';
    let chips = [];

    if (node.type === 'switch' || node.type === 'router' || node.type === 'firewall') {
      const ctx = node.cliPromptContext;
      if (ctx === 'EXEC') {
        chips = ['enable', 'ping 192.168.1.1', 'show ip int brief', 'show ip route', '?'];
      } else if (ctx === 'PRIVILEGED') {
        chips = ['conf t', 'show ip int br', 'show ip route', 'show run', 'ping 8.8.8.8', 'exit'];
      } else if (ctx === 'CONFIG') {
        chips = ['int GigabitEthernet0/0', 'int FastEthernet0/1', 'ip route 0.0.0.0 0.0.0.0', 'hostname', 'exit', 'end'];
      } else if (ctx === 'CONFIG_IF') {
        chips = ['no shutdown', 'shutdown', 'ip address 192.168.1.1 255.255.255.0', 'exit', 'end'];
      }
    } else {
      chips = [
        'ipconfig',
        'ping 192.168.1.1',
        'ping 8.8.8.8',
        'nslookup portal.internal.corp',
        'ipconfig /setgateway 192.168.1.1',
        'ipconfig /setmask 255.255.255.0',
        'ipconfig /setdns 8.8.8.8',
        'tracert 8.8.8.8',
        'clear'
      ];
    }

    this.chipsContainer.innerHTML = '';
    chips.forEach(chipText => {
      const chipBtn = document.createElement('button');
      chipBtn.className = 'cyber-chip';
      if (chipText.includes('conf') || chipText.includes('no shut') || chipText.includes('setgateway')) {
        chipBtn.classList.add('special-chip');
      }
      chipBtn.textContent = chipText;
      chipBtn.addEventListener('click', () => {
        if (this.inputEl) {
          this.inputEl.value = chipText;
          this.inputEl.focus();
        }
      });
      this.chipsContainer.appendChild(chipBtn);
    });
  }

  handleTabAutocomplete() {
    const node = this.getActiveNode();
    if (!node || !this.inputEl) return;
    const val = this.inputEl.value;

    const candidates = [
      'enable', 'configure terminal', 'interface', 'ip address', 'no shutdown', 'shutdown',
      'ip route', 'show ip interface brief', 'show ip route', 'show running-config',
      'ping', 'traceroute', 'ipconfig', 'nslookup', 'netstat', 'arp -a'
    ];

    const match = candidates.find(c => c.startsWith(val.toLowerCase()));
    if (match) {
      this.inputEl.value = match;
    }
  }
}
