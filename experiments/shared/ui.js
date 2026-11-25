/**
 * Small shared lab UI: real control panel, actions and stats.
 * No formal-project dependency.
 */
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

export function createLabUI(options) {
  const {
    number = '01',
    title = 'Lab',
    kicker = 'F2 VISUAL LAB',
    description = '',
    sections = [],
    actions = [],
    onChange = () => {},
    onAction = () => {}
  } = options;

  document.querySelectorAll('.lab-ui').forEach((node) => node.remove());
  const ui = el('div', 'lab-ui');
  document.body.append(ui);

  const header = el('header', 'lab-header');
  const brand = el('div', 'lab-brand');
  brand.innerHTML = `<span class="lab-orb"></span><div><b>A CHRISTMAS WISH</b><small>VISUAL LAB / ${number}</small></div>`;
  header.append(brand);

  const topActions = el('div', 'lab-top-actions');
  const panelToggle = el('button', 'lab-mini-button', '参数');
  panelToggle.type = 'button';
  const resetViewButton = el('button', 'lab-mini-button', '复位视角');
  resetViewButton.type = 'button';
  resetViewButton.dataset.action = 'reset-view';
  const exitButton = el('button', 'lab-mini-button', '退出实验');
  exitButton.type = 'button';
  exitButton.addEventListener('click', () => { window.location.href = '../'; });
  topActions.append(panelToggle, resetViewButton, exitButton);
  header.append(topActions);
  ui.append(header);

  const copy = el('section', 'lab-copy');
  copy.innerHTML = `<p class="lab-kicker">${kicker}</p><h1>${title}</h1><p class="lab-sub">${description}</p>`;
  ui.append(copy);

  const panel = el('aside', 'lab-panel is-open');
  const panelHeader = el('div', 'lab-panel-head');
  panelHeader.innerHTML = `<div><span>LIVE CONTROLS</span><b>实时实验参数</b></div>`;
  const closeButton = el('button', 'lab-panel-close', '×');
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', '收起参数');
  panelHeader.append(closeButton);
  panel.append(panelHeader);

  const scroll = el('div', 'lab-panel-scroll');
  panel.append(scroll);
  const values = {};
  const controls = new Map();
  const actionsMap = new Map();

  const updateRangeFill = (input) => {
    const min = Number(input.min);
    const max = Number(input.max);
    const value = Number(input.value);
    input.style.setProperty('--p', `${((value - min) / (max - min)) * 100}%`);
  };

  for (const section of sections) {
    const sectionNode = el('section', 'lab-section');
    const h = el('div', 'lab-section-title');
    h.innerHTML = `<span>${section.index || ''}</span><b>${section.title}</b>`;
    sectionNode.append(h);
    const grid = el('div', 'lab-controls');
    for (const control of section.controls) {
      values[control.key] = control.value;
      const row = el('label', `lab-control ${control.type === 'toggle' ? 'is-toggle' : ''}`);
      const head = el('span', 'lab-control-head');
      head.append(el('b', '', control.label));
      const output = el('output', '', control.format ? control.format(control.value) : String(control.value));
      head.append(output);
      row.append(head);
      let input;
      if (control.type === 'color') {
        input = el('input', 'lab-color');
        input.type = 'color';
        input.value = control.value;
        input.addEventListener('input', () => {
          values[control.key] = input.value;
          output.textContent = input.value.toUpperCase();
          onChange(control.key, input.value);
        });
      } else if (control.type === 'toggle') {
        input = el('input', 'lab-switch');
        input.type = 'checkbox';
        input.checked = Boolean(control.value);
        row.classList.add('lab-toggle-row');
        const label = el('span', 'lab-switch-track');
        row.append(label);
        input.addEventListener('change', () => {
          values[control.key] = input.checked;
          onChange(control.key, input.checked);
        });
      } else {
        input = el('input', 'lab-range');
        input.type = 'range';
        input.min = control.min;
        input.max = control.max;
        input.step = control.step ?? 1;
        input.value = control.value;
        updateRangeFill(input);
        input.addEventListener('input', () => {
          const value = Number(input.value);
          values[control.key] = value;
          output.textContent = control.format ? control.format(value) : String(value);
          updateRangeFill(input);
          onChange(control.key, value);
        });
      }
      row.append(input);
      controls.set(control.key, { row, input, output });
      grid.append(row);
    }
    sectionNode.append(grid);
    scroll.append(sectionNode);
  }

  if (actions.length) {
    const actionSection = el('section', 'lab-section lab-actions-section');
    const title = el('div', 'lab-section-title');
    title.innerHTML = `<span>+</span><b>动作 / 状态</b>`;
    actionSection.append(title);
    const grid = el('div', 'lab-actions');
    for (const action of actions) {
      const button = el('button', `lab-action ${action.primary ? 'is-primary' : ''}`, action.label);
      button.type = 'button';
      button.dataset.action = action.key;
      button.addEventListener('click', () => onAction(action.key, button));
      actionsMap.set(action.key, button);
      grid.append(button);
    }
    actionSection.append(grid);
    scroll.append(actionSection);
  }

  const footer = el('div', 'lab-panel-foot');
  footer.innerHTML = `<span>Three.js 0.160.0</span><span>local lab build</span>`;
  panel.append(footer);
  ui.append(panel);

  const stats = el('div', 'lab-stats');
  stats.innerHTML = '<span><i></i><b data-fps>--</b> FPS</span><span><b data-calls>--</b> calls</span><span><b data-particles>--</b> particles</span>';
  ui.append(stats);

  const status = el('div', 'lab-status', 'READY');
  ui.append(status);

  const setOpen = (open) => {
    panel.classList.toggle('is-open', open);
    document.body.classList.toggle('panel-closed', !open);
  };
  panelToggle.addEventListener('click', () => setOpen(!panel.classList.contains('is-open')));
  closeButton.addEventListener('click', () => setOpen(false));
  document.body.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'reset-view') onAction('reset-view');
  });

  setOpen(true);

  return {
    panel,
    scroll,
    values,
    onAction,
    appendCustom(node) {
      scroll.append(node);
      return node;
    },
    setValue(key, value) {
      values[key] = value;
      const c = controls.get(key);
      if (!c) return;
      if (c.input.type === 'checkbox') c.input.checked = Boolean(value);
      else c.input.value = value;
      c.output.textContent =
        key.includes('color') || String(value).startsWith('#') ? String(value).toUpperCase() : String(value);
      if (c.input.type === 'range') updateRangeFill(c.input);
    },
    setStats(fps, calls, particles) {
      const f = stats.querySelector('[data-fps]');
      const c = stats.querySelector('[data-calls]');
      const p = stats.querySelector('[data-particles]');
      if (f) f.textContent = String(fps || '--');
      if (c) c.textContent = String(calls || '--');
      if (p) p.textContent = String(particles ?? '--');
    },
    setStatus(text, tone = '') {
      status.textContent = text;
      status.dataset.tone = tone;
    },
    setActionActive(key, active) {
      actionsMap.get(key)?.classList.toggle('is-active', Boolean(active));
    },
    setOpen,
    close: () => setOpen(false),
    open: () => setOpen(true),
    hideCopy() {
      copy.style.opacity = '0';
      copy.style.pointerEvents = 'none';
    }
  };
}

export function setStatsFromRenderer(ui, renderer, fps, particles) {
  ui.setStats(fps, renderer.info.render.calls, particles);
}
