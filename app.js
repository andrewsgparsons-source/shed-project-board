// Kanban Board Application
// Data stored in localStorage

const STORAGE_KEY = 'shed-project-board';

// Initial sample cards
const DEFAULT_CARDS = [
  {
    id: '1',
    title: 'Dimension constraints implemented',
    description: 'Max 8m x 4m in either orientation. Validation working.',
    status: 'done',
    priority: 'high',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Pent roof positioning for attachments',
    description: 'Fixed rotation and positioning for all 4 attachment directions (left, right, front, back).',
    status: 'done',
    priority: 'high',
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    title: 'Roof height constraints',
    description: 'Add min/max validation for eave and crest heights.',
    status: 'backlog',
    priority: 'medium',
    createdAt: new Date().toISOString()
  },
  {
    id: '4',
    title: 'Door/window size validation',
    description: 'Prevent unrealistic opening sizes.',
    status: 'backlog',
    priority: 'medium',
    createdAt: new Date().toISOString()
  },
  {
    id: '5',
    title: 'Marketing landing page',
    description: 'Create a landing page to showcase the configurator.',
    status: 'ideas',
    priority: 'low',
    createdAt: new Date().toISOString()
  },
  {
    id: '6',
    title: 'README documentation',
    description: 'Write comprehensive README for the GitHub repo.',
    status: 'backlog',
    priority: 'medium',
    createdAt: new Date().toISOString()
  }
];

// State
let cards = [];
let draggedCard = null;

// DOM Elements
const modal = document.getElementById('modal');
const cardForm = document.getElementById('cardForm');
const addCardBtn = document.getElementById('addCardBtn');
const cancelBtn = document.getElementById('cancelBtn');
const deleteBtn = document.getElementById('deleteBtn');
const modalTitle = document.getElementById('modalTitle');

// Initialize
function init() {
  loadCards();
  renderCards();
  setupEventListeners();
}

// Load cards from localStorage
function loadCards() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    cards = JSON.parse(stored);
  } else {
    cards = DEFAULT_CARDS;
    saveCards();
  }
}

// Save cards to localStorage
function saveCards() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

// Render all cards
function renderCards() {
  const columns = document.querySelectorAll('.cards');
  columns.forEach(col => col.innerHTML = '');

  cards.forEach(card => {
    const cardEl = createCardElement(card);
    const column = document.querySelector(`.cards[data-status="${card.status}"]`);
    if (column) {
      column.appendChild(cardEl);
    }
  });

  updateCardCounts();
}

// Create card DOM element
function createCardElement(card) {
  const div = document.createElement('div');
  div.className = `card priority-${card.priority}`;
  div.draggable = true;
  div.dataset.id = card.id;

  div.innerHTML = `
    <div class="card-title">${escapeHtml(card.title)}</div>
    ${card.description ? `<div class="card-description">${escapeHtml(card.description)}</div>` : ''}
    <div class="card-meta">
      <span class="priority-badge ${card.priority}">${card.priority}</span>
      <span>${formatDate(card.createdAt)}</span>
    </div>
  `;

  // Drag events
  div.addEventListener('dragstart', handleDragStart);
  div.addEventListener('dragend', handleDragEnd);
  
  // Click to edit
  div.addEventListener('click', () => openEditModal(card));

  return div;
}

// Update card counts in column headers
function updateCardCounts() {
  document.querySelectorAll('.column').forEach(col => {
    const status = col.dataset.status;
    const count = cards.filter(c => c.status === status).length;
    col.querySelector('.card-count').textContent = count;
  });
}

// Drag and Drop handlers
function handleDragStart(e) {
  draggedCard = e.target;
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  draggedCard = null;
  document.querySelectorAll('.cards').forEach(col => {
    col.classList.remove('drag-over');
  });
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  
  if (!draggedCard) return;
  
  const newStatus = e.currentTarget.dataset.status;
  const cardId = draggedCard.dataset.id;
  
  const card = cards.find(c => c.id === cardId);
  if (card && card.status !== newStatus) {
    card.status = newStatus;
    saveCards();
    renderCards();
  }
}

// Modal functions
function openAddModal() {
  modalTitle.textContent = 'Add Card';
  cardForm.reset();
  document.getElementById('cardId').value = '';
  document.getElementById('cardStatus').value = 'ideas';
  deleteBtn.classList.add('hidden');
  modal.classList.remove('hidden');
  document.getElementById('cardTitle').focus();
}

function openEditModal(card) {
  modalTitle.textContent = 'Edit Card';
  document.getElementById('cardId').value = card.id;
  document.getElementById('cardTitle').value = card.title;
  document.getElementById('cardDescription').value = card.description || '';
  document.getElementById('cardStatus').value = card.status;
  document.getElementById('cardPriority').value = card.priority;
  deleteBtn.classList.remove('hidden');
  modal.classList.remove('hidden');
  document.getElementById('cardTitle').focus();
}

function closeModal() {
  modal.classList.add('hidden');
}

function handleFormSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById('cardId').value;
  const title = document.getElementById('cardTitle').value.trim();
  const description = document.getElementById('cardDescription').value.trim();
  const status = document.getElementById('cardStatus').value;
  const priority = document.getElementById('cardPriority').value;

  if (!title) return;

  if (id) {
    // Edit existing
    const card = cards.find(c => c.id === id);
    if (card) {
      card.title = title;
      card.description = description;
      card.status = status;
      card.priority = priority;
    }
  } else {
    // Add new
    cards.push({
      id: Date.now().toString(),
      title,
      description,
      status,
      priority,
      createdAt: new Date().toISOString()
    });
  }

  saveCards();
  renderCards();
  closeModal();
}

function handleDelete() {
  const id = document.getElementById('cardId').value;
  if (id && confirm('Delete this card?')) {
    cards = cards.filter(c => c.id !== id);
    saveCards();
    renderCards();
    closeModal();
  }
}

// Event listeners setup
function setupEventListeners() {
  // Add card button
  addCardBtn.addEventListener('click', openAddModal);
  
  // Modal
  cancelBtn.addEventListener('click', closeModal);
  deleteBtn.addEventListener('click', handleDelete);
  cardForm.addEventListener('submit', handleFormSubmit);
  
  // Close modal on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  // Close modal on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });

  // Drop zones
  document.querySelectorAll('.cards').forEach(col => {
    col.addEventListener('dragover', handleDragOver);
    col.addEventListener('dragleave', handleDragLeave);
    col.addEventListener('drop', handleDrop);
  });
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// Start the app
init();
