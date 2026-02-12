/* ============================================================
   Garden Buildings Dashboard — app.js
   Loads cards.json, renders sidebar-wizard UI with charts
   ============================================================ */

(function () {
  "use strict";

  // ── State ──
  var cards = [];
  var categories = [];
  var activeStep = null;
  var activeCharts = {};
  var sortState = { col: null, asc: true };

  // Category emojis (fallback)
  var CAT_EMOJI = {
    configurator: "🔧",
    website: "🌐",
    business: "📈",
    marketing: "📣",
    operations: "🛠️",
    animation: "🎬"
  };

  // Status display order
  var STATUS_ORDER = ["in-progress", "backlog", "ideas", "done"];
  var STATUS_LABELS = {
    "in-progress": "In Progress",
    "backlog": "Backlog",
    "ideas": "Ideas",
    "done": "Done"
  };

  // Chart colors matching green/brown theme
  var CHART_COLORS = [
    '#2D5016', '#C4823A', '#D4A574', '#1E3A0E', '#A06A2E',
    '#85c1e9', '#58d68d', '#eb984e', '#f4d03f', '#aeb6bf'
  ];

  // ── Nav steps config ──
  var NAV_STEPS = [
    { id: "overview",      label: "Project Overview", icon: "📊" },
    { id: "configurator",  label: "Configurator",     icon: "🔧" },
    { id: "website",       label: "Website",          icon: "🌐" },
    { id: "business",      label: "Business",         icon: "📈" },
    { id: "marketing",     label: "Marketing",        icon: "📣" },
    { id: "operations",    label: "Operations",       icon: "🛠️" },
    { id: "animation",     label: "Animation / Video",icon: "🎬" },
    { id: "all-tasks",     label: "All Tasks",        icon: "📋" },
    { id: "ideas",         label: "Ideas",            icon: "💡" }
  ];

  // ── Load data ──
  function loadData() {
    // Try data/cards.json first (GitHub Pages serves from docs/),
    // then fall back to ../data/cards.json (local dev server from docs/)
    fetch("data/cards.json")
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        cards = data.cards || [];
        categories = data.categories || [];
        updateDashStrip();
        buildNav();
      })
      .catch(function (err) {
        console.warn("Primary path failed, trying alternate:", err);
        fetch("../data/cards.json")
          .then(function (r) { return r.json(); })
          .then(function (data) {
            cards = data.cards || [];
            categories = data.categories || [];
            updateDashStrip();
            buildNav();
          })
          .catch(function (err2) {
            console.error("Failed to load cards.json:", err2);
          });
      });
  }

  // ── Update dashboard strip ──
  function updateDashStrip() {
    var counts = { "in-progress": 0, backlog: 0, done: 0, ideas: 0 };
    cards.forEach(function (c) {
      if (counts[c.status] !== undefined) counts[c.status]++;
    });
    document.getElementById("dash-inprogress").textContent = counts["in-progress"];
    document.getElementById("dash-backlog").textContent = counts.backlog;
    document.getElementById("dash-done").textContent = counts.done;
    document.getElementById("dash-total").textContent = cards.length;
  }

  // ── Build navigation ──
  function buildNav() {
    var nav = document.getElementById("navSteps");
    nav.innerHTML = "";

    NAV_STEPS.forEach(function (step, i) {
      var btn = document.createElement("button");
      btn.className = "gb-step";
      btn.setAttribute("data-step", step.id);

      var count = getStepCount(step.id);

      btn.innerHTML =
        '<span class="gb-step-num">' + step.icon + '</span>' +
        '<span class="gb-step-label">' + step.label + '</span>' +
        (count !== null ? '<span class="gb-step-count">' + count + '</span>' : '') +
        '<span class="gb-step-arrow">›</span>';

      btn.addEventListener("click", function () {
        openStep(step.id);
      });

      nav.appendChild(btn);
    });
  }

  function getStepCount(stepId) {
    if (stepId === "overview" || stepId === "all-tasks") return null;
    if (stepId === "ideas") {
      var localIdeas = getLocalIdeas();
      return localIdeas.length;
    }
    var filtered = cards.filter(function (c) { return c.category === stepId; });
    return filtered.length;
  }

  // ── Open a step ──
  function openStep(stepId) {
    activeStep = stepId;

    // Update active state
    document.querySelectorAll(".gb-step").forEach(function (el) {
      el.classList.toggle("active", el.getAttribute("data-step") === stepId);
    });

    // Set title
    var step = NAV_STEPS.find(function (s) { return s.id === stepId; });
    document.getElementById("flyoutTitle").textContent = step ? step.label : stepId;

    // Render content
    var body = document.getElementById("flyoutBody");
    destroyCharts();

    if (stepId === "overview") {
      renderOverview(body);
    } else if (stepId === "all-tasks") {
      renderAllTasks(body);
    } else if (stepId === "ideas") {
      renderIdeas(body);
    } else {
      renderCategoryView(body, stepId);
    }

    // Open flyout
    document.getElementById("flyout").classList.add("open");
  }

  // ── Close flyout ──
  document.getElementById("flyoutClose").addEventListener("click", function () {
    document.getElementById("flyout").classList.remove("open");
    activeStep = null;
    document.querySelectorAll(".gb-step").forEach(function (el) {
      el.classList.remove("active");
    });
  });

  // ── Dash strip click handlers ──
  document.querySelectorAll(".gb-dash-item").forEach(function (el) {
    el.addEventListener("click", function () {
      var filter = el.getAttribute("data-filter");
      if (filter === "all") {
        openStep("all-tasks");
      } else {
        // Open all tasks with a filter
        openStep("all-tasks");
        // After rendering, set the filter dropdown
        setTimeout(function () {
          var select = document.getElementById("allTasksStatusFilter");
          if (select) {
            select.value = filter;
            select.dispatchEvent(new Event("change"));
          }
        }, 50);
      }
    });
  });

  // ── Render: Project Overview ──
  function renderOverview(container) {
    var counts = { "in-progress": 0, backlog: 0, done: 0, ideas: 0 };
    var catCounts = {};
    var priorityCounts = { high: 0, medium: 0, low: 0 };

    cards.forEach(function (c) {
      if (counts[c.status] !== undefined) counts[c.status]++;
      catCounts[c.category] = (catCounts[c.category] || 0) + 1;
      if (priorityCounts[c.priority] !== undefined) priorityCounts[c.priority]++;
    });

    var completionPct = cards.length ? Math.round((counts.done / cards.length) * 100) : 0;

    var html = '';

    // KPI row
    html += '<div class="gb-kpi-grid">';
    html += kpiCard("📋", cards.length, "Total Cards", "amber");
    html += kpiCard("🔄", counts["in-progress"], "In Progress", "blue");
    html += kpiCard("📥", counts.backlog, "Backlog", "amber");
    html += kpiCard("✅", counts.done, "Done", "green");
    html += kpiCard("💡", counts.ideas, "Ideas", "");
    html += kpiCard("📈", completionPct + "%", "Completion", "green");
    html += kpiCard("🔴", priorityCounts.high, "High Priority", "red");
    html += kpiCard("🟡", priorityCounts.medium, "Medium Priority", "amber");
    html += '</div>';

    // Charts
    html += '<div class="chart-row">';
    html += '<div class="gb-chart-wrap"><h4>Status Distribution</h4><canvas id="chartStatus"></canvas></div>';
    html += '<div class="gb-chart-wrap"><h4>Category Breakdown</h4><canvas id="chartCategory"></canvas></div>';
    html += '</div>';

    html += '<div class="chart-row">';
    html += '<div class="gb-chart-wrap"><h4>Priority Distribution</h4><canvas id="chartPriority"></canvas></div>';
    html += '<div class="gb-chart-wrap"><h4>Completion Timeline</h4><canvas id="chartTimeline"></canvas></div>';
    html += '</div>';

    // Category summary table
    html += '<h3 class="gb-section-header">Category Summary</h3>';
    html += '<div class="gb-table-wrap"><table class="gb-table">';
    html += '<thead><tr><th>Category</th><th>Total</th><th>In Progress</th><th>Backlog</th><th>Done</th><th>Ideas</th></tr></thead>';
    html += '<tbody>';

    categories.forEach(function (cat) {
      var catCards = cards.filter(function (c) { return c.category === cat.id; });
      var cs = { "in-progress": 0, backlog: 0, done: 0, ideas: 0 };
      catCards.forEach(function (c) { if (cs[c.status] !== undefined) cs[c.status]++; });
      html += '<tr>';
      html += '<td><strong>' + cat.emoji + ' ' + cat.name + '</strong></td>';
      html += '<td>' + catCards.length + '</td>';
      html += '<td>' + cs["in-progress"] + '</td>';
      html += '<td>' + cs.backlog + '</td>';
      html += '<td>' + cs.done + '</td>';
      html += '<td>' + cs.ideas + '</td>';
      html += '</tr>';
    });

    html += '</tbody></table></div>';

    container.innerHTML = html;

    // Create charts
    createStatusChart(counts);
    createCategoryChart(catCounts);
    createPriorityChart(priorityCounts);
    createTimelineChart();
  }

  function kpiCard(icon, value, label, colorClass) {
    return '<div class="gb-kpi ' + colorClass + '">' +
      '<div class="gb-kpi-icon">' + icon + '</div>' +
      '<div class="gb-kpi-value">' + value + '</div>' +
      '<div class="gb-kpi-label">' + label + '</div>' +
      '</div>';
  }

  // ── Charts ──
  function destroyCharts() {
    Object.keys(activeCharts).forEach(function (k) {
      if (activeCharts[k]) activeCharts[k].destroy();
    });
    activeCharts = {};
  }

  function createStatusChart(counts) {
    var ctx = document.getElementById("chartStatus");
    if (!ctx) return;
    activeCharts.status = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Done', 'In Progress', 'Backlog', 'Ideas'],
        datasets: [{
          data: [counts.done, counts["in-progress"], counts.backlog, counts.ideas],
          backgroundColor: ['#27ae60', '#2980b9', '#e67e22', '#95a5a6'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { padding: 12, font: { size: 11 } } }
        }
      }
    });
  }

  function createCategoryChart(catCounts) {
    var ctx = document.getElementById("chartCategory");
    if (!ctx) return;
    var labels = [];
    var data = [];
    categories.forEach(function (cat) {
      labels.push(cat.emoji + ' ' + cat.name);
      data.push(catCounts[cat.id] || 0);
    });
    activeCharts.category = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Cards',
          data: data,
          backgroundColor: CHART_COLORS.slice(0, labels.length),
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 5 } },
          x: { ticks: { font: { size: 10 } } }
        }
      }
    });
  }

  function createPriorityChart(priorityCounts) {
    var ctx = document.getElementById("chartPriority");
    if (!ctx) return;
    activeCharts.priority = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['High', 'Medium', 'Low'],
        datasets: [{
          data: [priorityCounts.high, priorityCounts.medium, priorityCounts.low],
          backgroundColor: ['#c0392b', '#e67e22', '#95a5a6'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { padding: 12, font: { size: 11 } } }
        }
      }
    });
  }

  function createTimelineChart() {
    var ctx = document.getElementById("chartTimeline");
    if (!ctx) return;

    // Gather completed cards with dates
    var completed = cards.filter(function (c) { return c.completedAt; });
    if (completed.length === 0) return;

    // Group by date
    var dateMap = {};
    completed.forEach(function (c) {
      var d = c.completedAt.split("T")[0];
      dateMap[d] = (dateMap[d] || 0) + 1;
    });

    var dates = Object.keys(dateMap).sort();
    var counts = dates.map(function (d) { return dateMap[d]; });

    // Cumulative
    var cumulative = [];
    var total = 0;
    counts.forEach(function (c) {
      total += c;
      cumulative.push(total);
    });

    // Format dates for display
    var labels = dates.map(function (d) {
      var parts = d.split("-");
      return parts[2] + "/" + parts[1];
    });

    activeCharts.timeline = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Cumulative Done',
          data: cumulative,
          borderColor: '#2D5016',
          backgroundColor: 'rgba(45, 80, 22, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: '#2D5016'
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Tasks Completed' } },
          x: { ticks: { font: { size: 10 }, maxRotation: 45 } }
        }
      }
    });
  }

  // ── Render: Category View ──
  function renderCategoryView(container, categoryId) {
    var catCards = cards.filter(function (c) { return c.category === categoryId; });
    var cat = categories.find(function (c) { return c.id === categoryId; });
    var catName = cat ? cat.name : categoryId;

    if (catCards.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gb-text-muted);">' +
        '<div style="font-size:40px;margin-bottom:12px;">📭</div>' +
        '<h4>No cards in ' + catName + '</h4></div>';
      return;
    }

    var html = '';

    // Group by status
    STATUS_ORDER.forEach(function (status) {
      var statusCards = catCards.filter(function (c) { return c.status === status; });
      if (statusCards.length === 0) return;

      var collapsed = status === "done" ? " collapsed" : "";
      html += '<div class="task-group' + collapsed + '">';
      html += '<div class="task-group-header status-' + status + '" onclick="this.parentElement.classList.toggle(\'collapsed\')">';
      html += '<h3>' + STATUS_LABELS[status] + '</h3>';
      html += '<span class="count">' + statusCards.length + '</span>';
      html += '<span class="toggle">▼</span>';
      html += '</div>';
      html += '<div class="task-list">';

      statusCards.forEach(function (card) {
        html += renderTaskCard(card);
      });

      html += '</div></div>';
    });

    container.innerHTML = html;
    attachCardEvents(container);
  }

  // ── Render: single task card ──
  function renderTaskCard(card) {
    var desc = card.description || "No description";
    var date = card.createdAt ? formatDate(card.createdAt) : "";
    var completedDate = card.completedAt ? " • Completed: " + formatDate(card.completedAt) : "";

    var deliverableBtn = '';
    if (card.status === 'done') {
      var hasDeliverable = getDeliverable(card.id);
      var btnLabel = hasDeliverable ? '📄 View Deliverable' : '📝 Add Deliverable';
      var btnClass = hasDeliverable ? 'deliverable-btn has-content' : 'deliverable-btn';
      deliverableBtn = '<button class="' + btnClass + '" data-card-id="' + card.id + '">' + btnLabel + '</button>';
    }

    return '<details class="task-card status-' + card.status + '" data-id="' + card.id + '">' +
      '<summary class="task-summary">' +
      '<span class="task-title">' + escHtml(card.title) + '</span>' +
      '<span class="task-badges">' +
      '<span class="badge badge-priority-' + card.priority + '">' + card.priority + '</span>' +
      '</span>' +
      '</summary>' +
      '<div class="task-body">' +
      '<div class="task-description">' + escHtml(desc) + '</div>' +
      '<div class="task-meta">' +
      '<span class="task-date">Created: ' + date + completedDate + '</span>' +
      '<span class="badge badge-category">' + (CAT_EMOJI[card.category] || "") + ' ' + card.category + '</span>' +
      '</div>' +
      deliverableBtn +
      '</div>' +
      '</details>';
  }

  // ── Deliverables system ──
  var DELIVERABLES_KEY = 'gb_deliverables';

  function loadDeliverables() {
    try { return JSON.parse(localStorage.getItem(DELIVERABLES_KEY)) || {}; } catch(e) { return {}; }
  }
  function saveDeliverables(d) { localStorage.setItem(DELIVERABLES_KEY, JSON.stringify(d)); }
  function getDeliverable(cardId) { return loadDeliverables()[cardId] || null; }

  function seedDeliverables() {
    var d = loadDeliverables();
    if (Object.keys(d).length > 0) return;
    // Pre-populate a few key deliverables
    d['1'] = {
      summary: 'Dimension constraints are fully implemented and validated.',
      details: 'Maximum dimensions set to 8m × 4m in either orientation. The UI enforces min/max/step values for width and depth via params.js. Validation prevents impossible configurations.',
      looseEnds: 'None — this is fully complete.',
      updated: '2026-01-26'
    };
    d['2'] = {
      summary: 'Roof system supports Apex, Pent, and Hipped styles with automatic geometry recalculation.',
      details: 'Roof pitch, ridge height, and eave positions all derive from wall plate height and span. Switching between styles triggers a clean full rebuild. Hipped roof includes hip rafters, jack rafters, OSB, membrane, battens, and tile layers.',
      looseEnds: 'Flat roof style not yet implemented. Roof tile material options could be expanded.',
      updated: '2026-02-01'
    };
    d['5'] = {
      summary: 'Building type selector implemented with Gazebo as the first alternative type.',
      details: 'Dropdown replaces "Design Your Shed" title. 8 building types listed (Shed, Gazebo, Summer House, Garden Room, Workshop, Log Cabin, Garage, Carport). Gazebo renders with 4 corner posts, ring beams, hipped roof, fascia boards, and 8 knee braces at 45°. Auto-bumps to hipped minimum dimensions and hides irrelevant UI sections.',
      looseEnds: 'Remaining 6 building types need wiring up with their own defaults and rendering rules. Gazebo knee brace rotation may need final tweaking.',
      updated: '2026-02-11'
    };
    saveDeliverables(d);
  }
  seedDeliverables();

  function openDeliverablePage(cardId) {
    var card = cards.find(function(c) { return c.id === cardId; });
    if (!card) return;
    var del = getDeliverable(cardId) || {};
    var mainContent = document.getElementById('mainContent');

    var html = '<div class="deliverable-page">';
    html += '<button class="gb-back-btn" id="delBackBtn">← Back</button>';
    html += '<div class="del-header">';
    html += '<span class="badge badge-category">' + (CAT_EMOJI[card.category] || "") + ' ' + card.category + '</span>';
    html += '<span class="badge badge-priority-' + card.priority + '">' + card.priority + '</span>';
    if (card.completedAt) html += '<span class="del-date">Completed: ' + formatDate(card.completedAt) + '</span>';
    html += '</div>';
    html += '<h2 class="del-title">✅ ' + escHtml(card.title) + '</h2>';

    // Editable sections
    html += '<div class="del-section">';
    html += '<h3>Executive Summary</h3>';
    html += '<textarea id="delSummary" class="del-textarea" placeholder="What was delivered? Key outcomes...">' + escHtml(del.summary || '') + '</textarea>';
    html += '</div>';

    html += '<div class="del-section">';
    html += '<h3>Deliverable Details</h3>';
    html += '<textarea id="delDetails" class="del-textarea del-textarea-lg" placeholder="Technical details, what was built, how it works, screenshots/evidence...">' + escHtml(del.details || '') + '</textarea>';
    html += '</div>';

    html += '<div class="del-section">';
    html += '<h3>Loose Ends & Follow-ups</h3>';
    html += '<textarea id="delLooseEnds" class="del-textarea" placeholder="Any remaining issues, future improvements, things to watch...">' + escHtml(del.looseEnds || '') + '</textarea>';
    html += '</div>';

    html += '<button id="delSaveBtn" class="gb-save-btn">💾 Save Deliverable</button>';
    html += '</div>';

    mainContent.innerHTML = html;

    document.getElementById('delBackBtn').addEventListener('click', function() {
      mainContent.innerHTML = '<div class="gb-welcome"><h2>Garden Buildings</h2><p>Select a section from the sidebar.</p></div>';
    });

    document.getElementById('delSaveBtn').addEventListener('click', function() {
      var deliverables = loadDeliverables();
      deliverables[cardId] = {
        summary: document.getElementById('delSummary').value.trim(),
        details: document.getElementById('delDetails').value.trim(),
        looseEnds: document.getElementById('delLooseEnds').value.trim(),
        updated: new Date().toISOString().slice(0, 10)
      };
      saveDeliverables(deliverables);
      // Visual feedback
      var btn = document.getElementById('delSaveBtn');
      btn.textContent = '✅ Saved!';
      btn.style.background = '#2D5016';
      setTimeout(function() { btn.textContent = '💾 Save Deliverable'; btn.style.background = ''; }, 1500);
    });
  }

  function attachCardEvents(container) {
    container.querySelectorAll('.deliverable-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        openDeliverablePage(btn.getAttribute('data-card-id'));
      });
    });
  }

  // ── Render: All Tasks ──
  function renderAllTasks(container) {
    var html = '';

    // Filter bar
    html += '<div class="gb-filter-bar">';
    html += '<label>Status:</label>';
    html += '<select id="allTasksStatusFilter">';
    html += '<option value="">All</option>';
    STATUS_ORDER.forEach(function (s) {
      html += '<option value="' + s + '">' + STATUS_LABELS[s] + '</option>';
    });
    html += '</select>';

    html += '<label>Category:</label>';
    html += '<select id="allTasksCategoryFilter">';
    html += '<option value="">All</option>';
    categories.forEach(function (cat) {
      html += '<option value="' + cat.id + '">' + cat.name + '</option>';
    });
    html += '</select>';

    html += '<label>Priority:</label>';
    html += '<select id="allTasksPriorityFilter">';
    html += '<option value="">All</option>';
    html += '<option value="high">High</option>';
    html += '<option value="medium">Medium</option>';
    html += '<option value="low">Low</option>';
    html += '</select>';

    html += '<label>Search:</label>';
    html += '<input type="text" id="allTasksSearch" placeholder="Type to search...">';
    html += '</div>';

    // Table
    html += '<div class="gb-table-wrap">';
    html += '<table class="gb-table" id="allTasksTable">';
    html += '<thead><tr>';
    html += '<th data-col="id" class="sorted">ID <span class="sort-arrow">▲</span></th>';
    html += '<th data-col="title">Title <span class="sort-arrow">▲</span></th>';
    html += '<th data-col="status">Status <span class="sort-arrow">▲</span></th>';
    html += '<th data-col="priority">Priority <span class="sort-arrow">▲</span></th>';
    html += '<th data-col="category">Category <span class="sort-arrow">▲</span></th>';
    html += '<th data-col="createdAt">Created <span class="sort-arrow">▲</span></th>';
    html += '</tr></thead>';
    html += '<tbody id="allTasksBody">';
    html += '</tbody></table></div>';

    container.innerHTML = html;

    // Init sort state
    sortState = { col: "id", asc: true };

    // Populate table
    renderAllTasksTable();

    // Event listeners
    var statusFilter = document.getElementById("allTasksStatusFilter");
    var catFilter = document.getElementById("allTasksCategoryFilter");
    var prioFilter = document.getElementById("allTasksPriorityFilter");
    var searchInput = document.getElementById("allTasksSearch");

    [statusFilter, catFilter, prioFilter].forEach(function (el) {
      el.addEventListener("change", renderAllTasksTable);
    });
    searchInput.addEventListener("input", renderAllTasksTable);

    // Sortable headers
    document.querySelectorAll("#allTasksTable th[data-col]").forEach(function (th) {
      th.addEventListener("click", function () {
        var col = th.getAttribute("data-col");
        if (sortState.col === col) {
          sortState.asc = !sortState.asc;
        } else {
          sortState.col = col;
          sortState.asc = true;
        }
        // Update sort arrows
        document.querySelectorAll("#allTasksTable th").forEach(function (h) {
          h.classList.remove("sorted");
          h.querySelector(".sort-arrow").textContent = "▲";
        });
        th.classList.add("sorted");
        th.querySelector(".sort-arrow").textContent = sortState.asc ? "▲" : "▼";

        renderAllTasksTable();
      });
    });
  }

  function renderAllTasksTable() {
    var statusFilter = (document.getElementById("allTasksStatusFilter") || {}).value || "";
    var catFilter = (document.getElementById("allTasksCategoryFilter") || {}).value || "";
    var prioFilter = (document.getElementById("allTasksPriorityFilter") || {}).value || "";
    var search = ((document.getElementById("allTasksSearch") || {}).value || "").toLowerCase();

    var filtered = cards.filter(function (c) {
      if (statusFilter && c.status !== statusFilter) return false;
      if (catFilter && c.category !== catFilter) return false;
      if (prioFilter && c.priority !== prioFilter) return false;
      if (search && (c.title.toLowerCase().indexOf(search) === -1 && (c.description || "").toLowerCase().indexOf(search) === -1)) return false;
      return true;
    });

    // Sort
    if (sortState.col) {
      filtered.sort(function (a, b) {
        var va = a[sortState.col] || "";
        var vb = b[sortState.col] || "";
        if (sortState.col === "id") {
          va = parseInt(va, 10);
          vb = parseInt(vb, 10);
        }
        if (va < vb) return sortState.asc ? -1 : 1;
        if (va > vb) return sortState.asc ? 1 : -1;
        return 0;
      });
    }

    var tbody = document.getElementById("allTasksBody");
    if (!tbody) return;

    tbody.innerHTML = filtered.map(function (c) {
      return '<tr>' +
        '<td>' + c.id + '</td>' +
        '<td title="' + escAttr(c.description || '') + '"><strong>' + escHtml(c.title) + '</strong></td>' +
        '<td><span class="badge badge-status-' + c.status + '">' + STATUS_LABELS[c.status] + '</span></td>' +
        '<td><span class="badge badge-priority-' + c.priority + '">' + c.priority + '</span></td>' +
        '<td>' + (CAT_EMOJI[c.category] || "") + ' ' + c.category + '</td>' +
        '<td>' + formatDate(c.createdAt) + '</td>' +
        '</tr>';
    }).join("");
  }

  // ── Render: Ideas ──
  function renderIdeas(container) {
    var html = '<div class="ideas-page">';

    // Add new idea form
    html += '<div class="ideas-add">';
    html += '<h3 class="gb-section-header" style="margin-top:0">💡 Add New Idea</h3>';
    html += '<input type="text" id="ideaTitle" placeholder="Idea title...">';
    html += '<textarea id="ideaDesc" placeholder="Describe your idea..."></textarea>';
    html += '<button id="ideaAddBtn">Add Idea</button>';
    html += '</div>';

    // Existing ideas
    html += '<h3 class="gb-section-header">Your Ideas</h3>';
    html += '<div id="ideasList"></div>';

    html += '</div>';
    container.innerHTML = html;

    renderIdeasList();

    document.getElementById("ideaAddBtn").addEventListener("click", function () {
      var title = document.getElementById("ideaTitle").value.trim();
      var desc = document.getElementById("ideaDesc").value.trim();
      if (!title) return;

      var ideas = getLocalIdeas();
      ideas.push({
        id: "idea-" + Date.now(),
        title: title,
        description: desc,
        createdAt: new Date().toISOString()
      });
      saveLocalIdeas(ideas);
      document.getElementById("ideaTitle").value = "";
      document.getElementById("ideaDesc").value = "";
      renderIdeasList();
      // Update nav count
      buildNav();
    });
  }

  function renderIdeasList() {
    var ideas = getLocalIdeas();
    var list = document.getElementById("ideasList");
    if (!list) return;

    if (ideas.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gb-text-muted);">' +
        '<p>No ideas yet. Add one above!</p></div>';
      return;
    }

    list.innerHTML = ideas.map(function (idea) {
      return '<details class="idea-card">' +
        '<summary class="idea-summary">' +
        '<span class="idea-title">' + escHtml(idea.title) + '</span>' +
        '<span class="idea-date">' + formatDate(idea.createdAt) + '</span>' +
        '</summary>' +
        '<div class="idea-body">' +
        (idea.description ? '<div class="idea-content">' + escHtml(idea.description) + '</div>' : '') +
        '<div class="idea-actions">' +
        '<button class="idea-delete" data-id="' + idea.id + '">🗑 Delete</button>' +
        '</div>' +
        '</div>' +
        '</details>';
    }).join("");

    // Delete handlers
    list.querySelectorAll(".idea-delete").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var id = btn.getAttribute("data-id");
        var ideas = getLocalIdeas().filter(function (i) { return i.id !== id; });
        saveLocalIdeas(ideas);
        renderIdeasList();
        buildNav();
      });
    });
  }

  function getLocalIdeas() {
    try {
      return JSON.parse(localStorage.getItem("gb-ideas") || "[]");
    } catch (e) {
      return [];
    }
  }

  function saveLocalIdeas(ideas) {
    localStorage.setItem("gb-ideas", JSON.stringify(ideas));
  }

  // ── Helpers ──
  function formatDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    var day = d.getDate();
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return day + " " + months[d.getMonth()] + " " + d.getFullYear();
  }

  function escHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function escAttr(str) {
    return str.replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // ── Init ──
  document.addEventListener("DOMContentLoaded", loadData);

})();
