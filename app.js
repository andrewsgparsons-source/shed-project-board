// Kanban Board Application
// Data stored in localStorage + synced from repo JSON

const STORAGE_KEY = 'shed-project-board';
const REPO_JSON_URL = 'data/cards.json';

// Fallback cards if JSON fails to load
const DEFAULT_CARDS = [];

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
async function init() {
  await loadCards();
  renderCards();
  setupEventListeners();
}

// Load cards - fetch from repo JSON, use localStorage as override
async function loadCards() {
  // Check localStorage first
  const stored = localStorage.getItem(STORAGE_KEY);
  const localData = stored ? JSON.parse(stored) : null;
  
  // Try to fetch repo JSON
  try {
    const response = await fetch(REPO_JSON_URL + '?t=' + Date.now()); // Cache bust
    if (response.ok) {
      const repoData = await response.json();
      const repoCards = repoData.cards || [];
      const repoVersion = repoData.version || 0;
      
      // Check if we have a local version marker
      const localVersion = localData?._repoVersion || 0;
      
      if (!localData || repoVersion > localVersion) {
        // Repo is newer or no local data - use repo
        cards = repoCards;
        // Store with version marker
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
        localStorage.setItem(STORAGE_KEY + '_repoVersion', repoVersion.toString());
        console.log('[Kanban] Loaded from repo JSON (version ' + repoVersion + ')');
      } else {
        // Local is current - use local
        cards = localData;
        console.log('[Kanban] Using local data (repo version ' + localVersion + ')');
      }
    } else {
      throw new Error('HTTP ' + response.status);
    }
  } catch (e) {
    console.warn('[Kanban] Could not fetch repo JSON, using localStorage:', e.message);
    cards = localData || DEFAULT_CARDS;
  }
}

// Force reload from repo JSON (discards local changes)
async function reloadFromRepo() {
  if (!confirm('This will discard your local changes and reload from the repo. Continue?')) {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY + '_repoVersion');
  await loadCards();
  renderCards();
}

// Export current cards as JSON download
function exportCards() {
  const data = {
    version: parseInt(localStorage.getItem(STORAGE_KEY + '_repoVersion') || '1') + 1,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'Andrew',
    cards: cards
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'cards.json';
  a.click();
  URL.revokeObjectURL(url);
}

// Import cards from JSON file
function importCards(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      const importedCards = data.cards || data; // Support both {cards:[]} and raw array
      
      if (!Array.isArray(importedCards)) {
        alert('Invalid JSON format - expected cards array');
        return;
      }
      
      cards = importedCards;
      saveCards();
      renderCards();
      
      // Update version if present
      if (data.version) {
        localStorage.setItem(STORAGE_KEY + '_repoVersion', data.version.toString());
      }
      
      alert('Imported ' + cards.length + ' cards successfully!');
    } catch (err) {
      alert('Failed to parse JSON: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// Trigger file picker for import
function triggerImport() {
  document.getElementById('importFile').click();
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
  
  // Import, export, and reload buttons
  document.getElementById('importBtn').addEventListener('click', triggerImport);
  document.getElementById('importFile').addEventListener('change', function(e) {
    if (e.target.files.length > 0) {
      importCards(e.target.files[0]);
      e.target.value = ''; // Reset so same file can be imported again
    }
  });
  document.getElementById('exportBtn').addEventListener('click', exportCards);
  document.getElementById('reloadBtn').addEventListener('click', reloadFromRepo);
  
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
