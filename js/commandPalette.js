/**
 * ============================================================================
 * CyberForge Global Command Palette (Ctrl+K) & Spotlight Search
 * ============================================================================
 */

export class CommandPalette {
  constructor(actions = []) {
    this.actions = actions;
    this.isOpen = false;
    this.selectedIndex = 0;
    this.filteredActions = [...actions];

    this.initGlobalShortcuts();
  }

  initGlobalShortcuts() {
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.toggle();
      } else if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    this.isOpen = true;
    this.selectedIndex = 0;
    this.filteredActions = [...this.actions];

    const modal = document.createElement('div');
    modal.id = 'command-palette-modal';
    modal.className = 'modal-backdrop';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(5,7,13,0.88);backdrop-filter:blur(10px);display:flex;align-items:flex-start;justify-content:center;padding-top:12vh;z-index:3500;';

    modal.innerHTML = `
      <div class="tactical-frame" style="max-width:600px;width:92%;background:var(--bg-surface-raised);box-shadow:0 20px 60px rgba(0,0,0,0.8);border-color:var(--cyber-cyan-border);">
        <div style="display:flex;align-items:center;padding:14px 18px;border-bottom:1px solid var(--border-subtle);gap:10px;">
          <span style="color:var(--cyber-cyan);font-size:1.1rem;">⌘</span>
          <input type="text" id="cmd-palette-input" placeholder="Type a command or jump to section..." 
                 style="flex:1;background:none;border:none;outline:none;font-family:var(--font-mono);font-size:0.95rem;color:var(--text-primary);" />
          <span class="kbd-shortcut">ESC</span>
        </div>
        <div id="cmd-palette-list" style="max-height:360px;overflow-y:auto;padding:8px 0;"></div>
      </div>
    `;

    document.body.appendChild(modal);

    const input = modal.querySelector('#cmd-palette-input');
    input.focus();

    input.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      this.filteredActions = this.actions.filter(a => 
        a.title.toLowerCase().includes(q) || (a.category && a.category.toLowerCase().includes(q))
      );
      this.selectedIndex = 0;
      this.renderList();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectedIndex = (this.selectedIndex + 1) % this.filteredActions.length;
        this.renderList();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectedIndex = (this.selectedIndex - 1 + this.filteredActions.length) % this.filteredActions.length;
        this.renderList();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const action = this.filteredActions[this.selectedIndex];
        if (action && action.handler) {
          this.close();
          action.handler();
        }
      }
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.close();
    });

    this.renderList();
  }

  close() {
    this.isOpen = false;
    const el = document.getElementById('command-palette-modal');
    if (el) el.remove();
  }

  renderList() {
    const list = document.getElementById('cmd-palette-list');
    if (!list) return;

    if (this.filteredActions.length === 0) {
      list.innerHTML = `<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.85rem;">No matching commands</div>`;
      return;
    }

    list.innerHTML = this.filteredActions.map((a, i) => `
      <div class="cmd-item" data-idx="${i}" style="display:flex;align-items:center;justify-content:space-between;padding:10px 18px;cursor:pointer;background:${i === this.selectedIndex ? 'var(--cyber-cyan-dim)' : 'transparent'};color:${i === this.selectedIndex ? 'var(--cyber-cyan)' : 'var(--text-secondary)'};border-left:3px solid ${i === this.selectedIndex ? 'var(--cyber-cyan)' : 'transparent'};">
        <div style="display:flex;align-items:center;gap:10px;font-family:var(--font-mono);font-size:0.85rem;">
          <span>${a.icon || '▸'}</span>
          <span>${a.title}</span>
        </div>
        <span style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;font-family:var(--font-mono);">${a.category || 'System'}</span>
      </div>
    `).join('');

    list.querySelectorAll('.cmd-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.getAttribute('data-idx'), 10);
        const action = this.filteredActions[idx];
        if (action && action.handler) {
          this.close();
          action.handler();
        }
      });
    });
  }
}
