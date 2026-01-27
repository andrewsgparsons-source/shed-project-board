// Decision Map Application
// Interactive flowchart for strategic decisions

const STORAGE_KEY = 'shed-decision-map';

// Default decisions for first load
const DEFAULT_DECISIONS = [
  {
    id: '1',
    question: 'Open Source License',
    context: 'What license to use for the parametric shed repo?',
    options: [
      { id: 'opt1', text: 'MIT License', selected: false, linksTo: null },
      { id: 'opt2', text: 'GPL', selected: false, linksTo: null },
      { id: 'opt3', text: 'Apache 2.0', selected: false, linksTo: null }
    ],
    status: 'open',
    x: 100,
    y: 100
  }
];

// State
let decisions = [];
let dragState = null;
let connectState = null; // { decisionId, optionId }

// DOM Elements
const canvas = document.getElementById('canvas');
const connectionsLayer = document.getElementById('connections');
const decisionModal = document.getElementById('decisionModal');
const decisionForm = document.getElementById('decisionForm');
const connectModal = document.getElementById('connectModal');

// Initialize
function init() {
  loadDecisions();
  renderAll();
  setupEventListeners();
}

// Load from localStorage
function loadDecisions() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    decisions = JSON.parse(stored);
  } else {
    decisions = DEFAULT_DECISIONS;
    saveDecisions();
  }
}

// Save to localStorage
function saveDecisions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
}

// Render everything
function renderAll() {
  renderDecisions();
  renderConnections();
  renderEmptyState();
}

// Render empty state
function renderEmptyState() {
  const existing = document.querySelector('.empty-state');
  if (existing) existing.remove();

  if (decisions.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <div class="empty-state-icon">🤔</div>
      <h2>No decisions yet</h2>
      <p>Click "+ Add Decision" to map your first strategic choice</p>
    `;
    canvas.appendChild(empty);
  }
}

// Render decision nodes
function renderDecisions() {
  // Remove existing nodes
  document.querySelectorAll('.decision-node').forEach(el => el.remove());

  decisions.forEach(decision => {
    const node = createDecisionNode(decision);
    canvas.appendChild(node);
  });
}

// Create decision node element
function createDecisionNode(decision) {
  const div = document.createElement('div');
  div.className = `decision-node status-${decision.status}`;
  div.dataset.id = decision.id;
  div.style.left = decision.x + 'px';
  div.style.top = decision.y + 'px';

  const optionsHtml = decision.options.map(opt => `
    <div class="decision-option ${opt.selected ? 'selected' : ''}" data-option-id="${opt.id}">
      <span class="option-bullet"></span>
      <span class="option-text">${escapeHtml(opt.text)}</span>
      <button class="option-link-btn ${opt.linksTo ? 'linked' : ''}" 
              data-action="link" 
              title="${opt.linksTo ? 'Edit link' : 'Link to decision'}">
        ${opt.linksTo ? '🔗' : '➔'}
      </button>
    </div>
  `).join('');

  div.innerHTML = `
    <button class="decision-edit-btn" data-action="edit">✏️ Edit</button>
    <div class="decision-header">
      <div class="decision-question">${escapeHtml(decision.question)}</div>
      ${decision.context ? `<div class="decision-context">${escapeHtml(decision.context)}</div>` : ''}
      <span class="decision-status-badge ${decision.status}">${formatStatus(decision.status)}</span>
    </div>
    <div class="decision-options">
      ${optionsHtml}
    </div>
  `;

  // Drag events
  div.addEventListener('mousedown', handleDragStart);
  
  // Click events
  div.addEventListener('click', handleNodeClick);

  return div;
}

// Render SVG connections
function renderConnections() {
  connectionsLayer.innerHTML = '';

  decisions.forEach(decision => {
    decision.options.forEach(option => {
      if (option.linksTo) {
        const targetDecision = decisions.find(d => d.id === option.linksTo);
        if (targetDecision) {
          const path = createConnectionPath(decision, option, targetDecision);
          if (path) {
            connectionsLayer.appendChild(path);
          }
        }
      }
    });
  });
}

// Create SVG path between nodes
function createConnectionPath(fromDecision, option, toDecision) {
  const fromNode = document.querySelector(`.decision-node[data-id="${fromDecision.id}"]`);
  const toNode = document.querySelector(`.decision-node[data-id="${toDecision.id}"]`);
  
  if (!fromNode || !toNode) return null;

  const optionEl = fromNode.querySelector(`[data-option-id="${option.id}"]`);
  if (!optionEl) return null;

  // Calculate positions
  const fromRect = fromNode.getBoundingClientRect();
  const optRect = optionEl.getBoundingClientRect();
  const toRect = toNode.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();

  // Start from right side of option
  const startX = fromRect.right - canvasRect.left + canvas.scrollLeft;
  const startY = optRect.top + optRect.height / 2 - canvasRect.top + canvas.scrollTop;

  // End at left side of target node
  const endX = toRect.left - canvasRect.left + canvas.scrollLeft;
  const endY = toRect.top + toRect.height / 2 - canvasRect.top + canvas.scrollTop;

  // Create curved path
  const midX = (startX + endX) / 2;
  const pathD = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', pathD);
  path.dataset.from = fromDecision.id;
  path.dataset.option = option.id;
  path.dataset.to = toDecision.id;

  return path;
}

// Drag handling
function handleDragStart(e) {
  // Ignore if clicking a button or option
  if (e.target.closest('button') || e.target.closest('.decision-option')) return;

  const node = e.target.closest('.decision-node');
  if (!node) return;

  e.preventDefault();
  
  const rect = node.getBoundingClientRect();
  dragState = {
    node: node,
    id: node.dataset.id,
    startX: e.clientX,
    startY: e.clientY,
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top,
    origX: parseInt(node.style.left),
    origY: parseInt(node.style.top)
  };

  node.classList.add('dragging');
  document.addEventListener('mousemove', handleDragMove);
  document.addEventListener('mouseup', handleDragEnd);
}

function handleDragMove(e) {
  if (!dragState) return;

  const canvasRect = canvas.getBoundingClientRect();
  const x = e.clientX - canvasRect.left - dragState.offsetX + canvas.scrollLeft;
  const y = e.clientY - canvasRect.top - dragState.offsetY + canvas.scrollTop;

  dragState.node.style.left = Math.max(0, x) + 'px';
  dragState.node.style.top = Math.max(0, y) + 'px';

  // Update connections while dragging
  renderConnections();
}

function handleDragEnd(e) {
  if (!dragState) return;

  const decision = decisions.find(d => d.id === dragState.id);
  if (decision) {
    decision.x = parseInt(dragState.node.style.left);
    decision.y = parseInt(dragState.node.style.top);
    saveDecisions();
  }

  dragState.node.classList.remove('dragging');
  dragState = null;

  document.removeEventListener('mousemove', handleDragMove);
  document.removeEventListener('mouseup', handleDragEnd);
}

// Node click handling
function handleNodeClick(e) {
  const node = e.target.closest('.decision-node');
  if (!node) return;

  const decisionId = node.dataset.id;
  const decision = decisions.find(d => d.id === decisionId);
  if (!decision) return;

  // Edit button
  if (e.target.closest('[data-action="edit"]')) {
    openEditModal(decision);
    return;
  }

  // Link button
  if (e.target.closest('[data-action="link"]')) {
    const optionEl = e.target.closest('.decision-option');
    if (optionEl) {
      const optionId = optionEl.dataset.optionId;
      openConnectModal(decisionId, optionId);
    }
    return;
  }

  // Toggle option selection
  const optionEl = e.target.closest('.decision-option');
  if (optionEl) {
    const optionId = optionEl.dataset.optionId;
    toggleOptionSelection(decisionId, optionId);
  }
}

// Toggle option selection
function toggleOptionSelection(decisionId, optionId) {
  const decision = decisions.find(d => d.id === decisionId);
  if (!decision) return;

  decision.options.forEach(opt => {
    opt.selected = opt.id === optionId ? !opt.selected : false;
  });

  // Auto-update status based on selection
  const hasSelected = decision.options.some(o => o.selected);
  if (hasSelected && decision.status === 'open') {
    decision.status = 'leaning';
  }

  saveDecisions();
  renderAll();
}

// Modal: Add Decision
function openAddModal() {
  document.getElementById('decisionModalTitle').textContent = 'Add Decision';
  document.getElementById('decisionId').value = '';
  document.getElementById('decisionQuestion').value = '';
  document.getElementById('decisionContext').value = '';
  document.getElementById('decisionStatus').value = 'open';
  document.getElementById('decisionDeleteBtn').classList.add('hidden');
  
  // Clear and add two empty options
  const container = document.getElementById('optionsContainer');
  container.innerHTML = '';
  addOptionInput('');
  addOptionInput('');

  decisionModal.classList.remove('hidden');
  document.getElementById('decisionQuestion').focus();
}

// Modal: Edit Decision
function openEditModal(decision) {
  document.getElementById('decisionModalTitle').textContent = 'Edit Decision';
  document.getElementById('decisionId').value = decision.id;
  document.getElementById('decisionQuestion').value = decision.question;
  document.getElementById('decisionContext').value = decision.context || '';
  document.getElementById('decisionStatus').value = decision.status;
  document.getElementById('decisionDeleteBtn').classList.remove('hidden');

  // Populate options
  const container = document.getElementById('optionsContainer');
  container.innerHTML = '';
  decision.options.forEach(opt => addOptionInput(opt.text, opt.id));

  decisionModal.classList.remove('hidden');
  document.getElementById('decisionQuestion').focus();
}

// Add option input row
function addOptionInput(value = '', optionId = null) {
  const container = document.getElementById('optionsContainer');
  const row = document.createElement('div');
  row.className = 'option-input-row';
  row.innerHTML = `
    <input type="text" 
           class="option-input" 
           value="${escapeHtml(value)}" 
           placeholder="Option..." 
           data-option-id="${optionId || ''}">
    <button type="button" class="btn-remove-option" title="Remove">×</button>
  `;

  row.querySelector('.btn-remove-option').addEventListener('click', () => {
    if (container.children.length > 1) {
      row.remove();
    }
  });

  container.appendChild(row);
  return row.querySelector('input');
}

// Close decision modal
function closeDecisionModal() {
  decisionModal.classList.add('hidden');
}

// Handle form submit
function handleDecisionFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('decisionId').value;
  const question = document.getElementById('decisionQuestion').value.trim();
  const context = document.getElementById('decisionContext').value.trim();
  const status = document.getElementById('decisionStatus').value;

  if (!question) return;

  // Gather options
  const optionInputs = document.querySelectorAll('.option-input');
  const options = [];
  optionInputs.forEach(input => {
    const text = input.value.trim();
    if (text) {
      const existingId = input.dataset.optionId;
      const existingOpt = id ? 
        decisions.find(d => d.id === id)?.options.find(o => o.id === existingId) : null;
      
      options.push({
        id: existingId || 'opt' + Date.now() + Math.random().toString(36).substr(2, 5),
        text: text,
        selected: existingOpt?.selected || false,
        linksTo: existingOpt?.linksTo || null
      });
    }
  });

  if (options.length === 0) {
    options.push({ id: 'opt' + Date.now(), text: 'Option 1', selected: false, linksTo: null });
  }

  if (id) {
    // Edit existing
    const decision = decisions.find(d => d.id === id);
    if (decision) {
      decision.question = question;
      decision.context = context;
      decision.status = status;
      decision.options = options;
    }
  } else {
    // Add new
    // Position to the right of existing nodes
    const maxX = decisions.reduce((max, d) => Math.max(max, d.x), 0);
    const baseY = decisions.length > 0 ? 100 : 100;

    decisions.push({
      id: Date.now().toString(),
      question,
      context,
      options,
      status,
      x: maxX + 350,
      y: baseY
    });
  }

  saveDecisions();
  renderAll();
  closeDecisionModal();
}

// Delete decision
function handleDeleteDecision() {
  const id = document.getElementById('decisionId').value;
  if (id && confirm('Delete this decision?')) {
    // Remove links pointing to this decision
    decisions.forEach(d => {
      d.options.forEach(opt => {
        if (opt.linksTo === id) opt.linksTo = null;
      });
    });

    decisions = decisions.filter(d => d.id !== id);
    saveDecisions();
    renderAll();
    closeDecisionModal();
  }
}

// Connect modal
function openConnectModal(decisionId, optionId) {
  connectState = { decisionId, optionId };

  const currentDecision = decisions.find(d => d.id === decisionId);
  const currentOption = currentDecision?.options.find(o => o.id === optionId);

  // Show disconnect button if already linked
  const disconnectBtn = document.getElementById('disconnectBtn');
  if (currentOption?.linksTo) {
    disconnectBtn.classList.remove('hidden');
  } else {
    disconnectBtn.classList.add('hidden');
  }

  // Build target list (excluding current decision)
  const container = document.getElementById('connectTargets');
  container.innerHTML = '';

  const otherDecisions = decisions.filter(d => d.id !== decisionId);
  
  if (otherDecisions.length === 0) {
    container.innerHTML = '<p style="color: #808080; text-align: center;">No other decisions to link to yet.</p>';
  } else {
    otherDecisions.forEach(d => {
      const div = document.createElement('div');
      div.className = 'connect-target';
      div.innerHTML = `
        <div class="connect-target-question">${escapeHtml(d.question)}</div>
        <div class="connect-target-options">${d.options.map(o => o.text).join(' • ')}</div>
      `;
      div.addEventListener('click', () => {
        linkOption(decisionId, optionId, d.id);
        closeConnectModal();
      });
      container.appendChild(div);
    });
  }

  connectModal.classList.remove('hidden');
}

function closeConnectModal() {
  connectModal.classList.add('hidden');
  connectState = null;
}

function linkOption(decisionId, optionId, targetId) {
  const decision = decisions.find(d => d.id === decisionId);
  if (!decision) return;

  const option = decision.options.find(o => o.id === optionId);
  if (option) {
    option.linksTo = targetId;
    saveDecisions();
    renderAll();
  }
}

function unlinkOption() {
  if (!connectState) return;

  const decision = decisions.find(d => d.id === connectState.decisionId);
  if (!decision) return;

  const option = decision.options.find(o => o.id === connectState.optionId);
  if (option) {
    option.linksTo = null;
    saveDecisions();
    renderAll();
  }

  closeConnectModal();
}

// Fit view
function fitView() {
  if (decisions.length === 0) return;

  const minX = Math.min(...decisions.map(d => d.x));
  const minY = Math.min(...decisions.map(d => d.y));

  canvas.parentElement.scrollTo({
    left: Math.max(0, minX - 40),
    top: Math.max(0, minY - 40),
    behavior: 'smooth'
  });
}

// Event listeners setup
function setupEventListeners() {
  // Add decision
  document.getElementById('addDecisionBtn').addEventListener('click', openAddModal);
  
  // Fit view
  document.getElementById('fitViewBtn').addEventListener('click', fitView);

  // Decision modal
  document.getElementById('decisionCancelBtn').addEventListener('click', closeDecisionModal);
  document.getElementById('decisionDeleteBtn').addEventListener('click', handleDeleteDecision);
  decisionForm.addEventListener('submit', handleDecisionFormSubmit);
  document.getElementById('addOptionBtn').addEventListener('click', () => {
    const input = addOptionInput();
    input.focus();
  });

  // Connect modal
  document.getElementById('connectCancelBtn').addEventListener('click', closeConnectModal);
  document.getElementById('disconnectBtn').addEventListener('click', unlinkOption);

  // Close modals on backdrop click
  decisionModal.addEventListener('click', (e) => {
    if (e.target === decisionModal) closeDecisionModal();
  });
  connectModal.addEventListener('click', (e) => {
    if (e.target === connectModal) closeConnectModal();
  });

  // Escape to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!decisionModal.classList.contains('hidden')) closeDecisionModal();
      if (!connectModal.classList.contains('hidden')) closeConnectModal();
    }
  });

  // Update connections on scroll/resize
  canvas.parentElement.addEventListener('scroll', () => {
    // Connections are in canvas coords, no update needed
  });
  window.addEventListener('resize', renderConnections);
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatStatus(status) {
  const labels = {
    'open': 'Open',
    'leaning': 'Leaning',
    'decided': 'Decided',
    'blocked': 'Blocked'
  };
  return labels[status] || status;
}

// Start the app
init();
