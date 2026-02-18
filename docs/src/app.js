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

  // ── Mobile hamburger menu ──
  (function setupMobileMenu() {
    var hamburger = document.getElementById('gbHamburger');
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('gbSidebarOverlay');
    if (!hamburger || !sidebar || !overlay) return;

    function openMenu() {
      sidebar.classList.add('mobile-open');
      overlay.classList.add('active');
      hamburger.classList.add('hidden');
    }

    function closeMenu() {
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('active');
      hamburger.classList.remove('hidden');
    }

    var sidebarClose = document.getElementById('gbSidebarClose');

    hamburger.addEventListener('click', openMenu);
    overlay.addEventListener('click', closeMenu);
    if (sidebarClose) sidebarClose.addEventListener('click', closeMenu);

    // Close menu when a nav step is clicked
    sidebar.addEventListener('click', function(e) {
      var step = e.target.closest('.gb-step');
      if (step) closeMenu();
    });

    // Expose for use by flyout close
    window.__gbMobileMenu = { open: openMenu, close: closeMenu };
  })();

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
    // Hide hamburger while flyout is open
    var hb = document.getElementById('gbHamburger');
    if (hb) hb.classList.add('hidden');
  }

  // ── Close flyout ──
  document.getElementById("flyoutClose").addEventListener("click", function () {
    document.getElementById("flyout").classList.remove("open");
    // Show hamburger again
    var hb = document.getElementById('gbHamburger');
    if (hb) hb.classList.remove('hidden');
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

      html += '<div class="task-group">';
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

    // For done cards: make the whole card a clickable deliverable launcher
    if (card.status === 'done') {
      var hasDeliverable = getDeliverable(card.id);
      var extracted = extractDeliverables(card);
      var hasArtifacts = extracted.length > 0 || hasDeliverable;

      var artifactHint = '';
      if (extracted.length > 0) {
        var types = {};
        extracted.forEach(function(e) { types[e.type] = (types[e.type] || 0) + 1; });
        var hints = [];
        if (types.file) hints.push(types.file + ' file' + (types.file > 1 ? 's' : ''));
        if (types.commit) hints.push(types.commit + ' commit' + (types.commit > 1 ? 's' : ''));
        if (types.url) hints.push(types.url + ' link' + (types.url > 1 ? 's' : ''));
        if (types.branch) hints.push(types.branch + ' branch' + (types.branch > 1 ? 'es' : ''));
        artifactHint = '<span class="del-artifact-hint">' + hints.join(', ') + '</span>';
      }

      return '<div class="task-card status-done done-clickable' + (hasArtifacts ? ' has-artifacts' : '') + '" data-id="' + card.id + '" data-deliverable-id="' + card.id + '">' +
        '<div class="task-summary">' +
        '<span class="task-title">' + escHtml(card.title) + '</span>' +
        '<span class="task-badges">' +
        artifactHint +
        '<span class="badge badge-priority-' + card.priority + '">' + card.priority + '</span>' +
        '<span class="del-open-icon">→</span>' +
        '</span>' +
        '</div>' +
        '</div>';
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
      '<button class="firebase-detail-btn" data-card-id="' + card.id + '" style="' +
      'margin-top:8px;padding:6px 14px;border-radius:8px;border:1.5px solid #E7E0D8;' +
      'background:#F5F0EB;font-size:13px;cursor:pointer;transition:all 0.15s;' +
      'font-family:inherit;color:#57534E;"' +
      ' onmouseover="this.style.borderColor=\'#C4823A\';this.style.color=\'#C4823A\'"' +
      ' onmouseout="this.style.borderColor=\'#E7E0D8\';this.style.color=\'#57534E\'"' +
      '>📝 Notes &amp; Details</button>' +
      '<div class="card-photos" data-photo-card-id="' + card.id + '"></div>' +
      '</div>' +
      '</details>';
  }

  // ── Deliverables system ──
  var DELIVERABLES_KEY = 'gb_deliverables';
  var GITHUB_REPO = 'https://github.com/andrewsgparsons-source/Parametric-shed2-staging';

  function loadDeliverables() {
    try { return JSON.parse(localStorage.getItem(DELIVERABLES_KEY)) || {}; } catch(e) { return {}; }
  }
  function saveDeliverables(d) { localStorage.setItem(DELIVERABLES_KEY, JSON.stringify(d)); }
  function getDeliverable(cardId) { return loadDeliverables()[cardId] || null; }

  // ── Auto-extract deliverables from card description ──
  function extractDeliverables(card) {
    var desc = card.description || '';
    var items = [];
    var seen = {};

    function addItem(type, value, label) {
      var key = type + ':' + value;
      if (seen[key]) return;
      seen[key] = true;
      items.push({ type: type, value: value, label: label || value });
    }

    // Files: **File:** /path or **Files:** section or **Script:** /path or **References:** section
    var filePatterns = [
      /\*\*(?:File|Script|Files?|References?):\*\*\s*([^\n*]+)/gi,
      /\*\*(?:File|Script|Files?|References?):\*\*\s*\n((?:\s*[•\-]\s*[^\n]+\n?)+)/gi
    ];
    filePatterns.forEach(function(re) {
      var m;
      while ((m = re.exec(desc)) !== null) {
        var block = m[1].trim();
        // Handle bullet lists
        var bullets = block.match(/[•\-]\s*([^\n]+)/g);
        if (bullets) {
          bullets.forEach(function(b) {
            var path = b.replace(/^[•\-]\s*/, '').trim();
            // Extract just the file path if there's extra text
            var pathMatch = path.match(/(\/[\w./_-]+(?:\.\w+)?)/);
            if (pathMatch) addItem('file', pathMatch[1], pathMatch[1]);
          });
        } else {
          var pathMatch = block.match(/(\/[\w./_-]+(?:\.\w+)?)/);
          if (pathMatch) addItem('file', pathMatch[1], pathMatch[1]);
        }
      }
    });

    // Standalone file paths: /path/to/file.ext or /file.ext (not already matched)
    var fpRe = /(?:^|\s)(\/[\w._-]+(?:\/[\w._-]+)*(?:\.\w+))/gm;
    var fpM;
    while ((fpM = fpRe.exec(desc)) !== null) {
      addItem('file', fpM[1].trim(), fpM[1].trim());
    }

    // Commits: **Commit:** hash or **Commits:** list or "Commit hash" inline
    var commitPatterns = [
      /\*\*Commits?:\*\*\s*([^\n]+)/gi,
      /(?:^|\s)(?:Commit|commit)\s+([a-f0-9]{7,40})/gm
    ];
    commitPatterns.forEach(function(re) {
      var m;
      while ((m = re.exec(desc)) !== null) {
        var block = m[1].trim();
        // Extract all hex hashes from the line
        var hashes = block.match(/[a-f0-9]{7,40}/g);
        if (hashes) {
          hashes.forEach(function(h) {
            addItem('commit', h, h.slice(0, 7));
          });
        }
      }
    });

    // Branch: **Branch:** name or "Branch:" inline
    var branchRe = /\*?\*?Branch:?\*?\*?\s*([^\s,]+)/gi;
    var brM;
    while ((brM = branchRe.exec(desc)) !== null) {
      var br = brM[1].replace(/[*`]/g, '').trim();
      if (br.length > 1 && br !== 'safety') addItem('branch', br, br);
    }

    // URLs: https://... or http://...
    var urlRe = /(https?:\/\/[^\s,)\]]+)/gi;
    var urlM;
    while ((urlM = urlRe.exec(desc)) !== null) {
      addItem('url', urlM[1], urlM[1]);
    }

    // Parent card references: **Parent:** Name (#id)
    var parentRe = /\*\*Parent:\*\*\s*([^(]+)\(#(\d+)\)/gi;
    var parM;
    while ((parM = parentRe.exec(desc)) !== null) {
      addItem('parent', parM[2], parM[1].trim() + ' (#' + parM[2] + ')');
    }

    return items;
  }

  // ── Build deliverable link/display ──
  function deliverableItemHtml(item) {
    var icon, href, subtitle;

    switch (item.type) {
      case 'file':
        icon = '📄';
        subtitle = 'File';
        href = null; // Local files aren't linkable from web
        break;
      case 'commit':
        icon = '🔨';
        subtitle = 'Commit';
        href = GITHUB_REPO + '/commit/' + item.value;
        break;
      case 'branch':
        icon = '🌿';
        subtitle = 'Branch';
        href = GITHUB_REPO + '/tree/' + item.value;
        break;
      case 'url':
        icon = '🔗';
        subtitle = 'Link';
        href = item.value;
        break;
      case 'parent':
        icon = '🔗';
        subtitle = 'Parent project';
        href = null;
        break;
      default:
        icon = '📌';
        subtitle = '';
        href = null;
    }

    var linkOpen = href ? '<a href="' + escAttr(href) + '" target="_blank" rel="noopener" class="del-artifact-link">' : '<span class="del-artifact-link no-link">';
    var linkClose = href ? '</a>' : '</span>';

    return '<div class="del-artifact">' +
      linkOpen +
      '<span class="del-artifact-icon">' + icon + '</span>' +
      '<div class="del-artifact-info">' +
      '<span class="del-artifact-label">' + escHtml(item.label) + '</span>' +
      '<span class="del-artifact-type">' + subtitle + (href ? ' ↗' : '') + '</span>' +
      '</div>' +
      linkClose +
      '</div>';
  }

  function seedDeliverables() {
    var d = loadDeliverables();
    if (d._seeded_v2) return;
    // Pre-populate key deliverables
    d['1'] = {
      summary: 'Dimension constraints are fully implemented and validated.',
      details: 'Maximum dimensions set to 8m × 4m in either orientation. The UI enforces min/max/step values for width and depth via params.js. Validation prevents impossible configurations.',
      looseEnds: '',
      updated: '2026-01-26'
    };
    d['6'] = {
      summary: 'Comprehensive README with feature overview, tech details, and contribution guide.',
      details: 'README.md covers: what the configurator does, parametric features, supported building types, how to run locally, architecture overview, and license info.',
      looseEnds: 'Could use a hero screenshot/GIF (see card #14).',
      updated: '2026-01-26'
    };
    d['17'] = {
      summary: 'Mobile-first responsive control panel with bottom drawer UX.',
      details: 'Bottom drawer panel at 55vh height. Larger fonts (14-16px). Touch-friendly controls with adequate tap targets. Auto-collapse on initial load. Tap-to-close. Modern IKEA-inspired clean theme. Works well on phones and tablets.',
      looseEnds: 'Further mobile UX improvements planned (see research/mobile-ux-plan.md).',
      updated: '2026-01-27'
    };
    d['23'] = {
      summary: '50mm PIR insulation between studs with 12mm plywood lining. Fully parametric.',
      details: 'Insulation panels adapt to wall dimensions automatically. Plywood uses CSG boolean subtraction to cut cleanly around door and window openings (card #26). Skips walls that have no insulation variant selected. Added to BOM with accurate quantities.',
      looseEnds: 'Hipped roof insulation not working yet (card #113).',
      updated: '2026-01-27'
    };
    d['27'] = {
      summary: 'Apex purlins now render horizontally and sit on top of rafters correctly.',
      details: 'Root cause was transform hierarchy — parenting to roofRoot caused unexpected tilt. Fixed by computing purlin positions in world space, accounting for roof slope angle. Purlins are horizontal beams that sit ON the rafters rather than following the slope.',
      looseEnds: '',
      updated: '2026-02-09'
    };
    d['39'] = {
      summary: 'Shed configurations shareable via URL with Base64-encoded state.',
      details: 'Format: ?profile=viewer&c=<base64>. Encodes full building state including dimensions, roof type, openings, materials, attachments. Profile=viewer triggers URL state parsing on load. Enables sharing designs with customers via simple link.',
      looseEnds: 'Some state fields were initially missing (fixed in card #115).',
      updated: '2026-01-27'
    };
    d['73'] = {
      summary: 'Consolidated marketing strategy document bringing together all competitive intelligence and positioning insights.',
      details: 'Covers: brand story, key differentiators (parametric 3D, Douglas fir, cutting lists), target customer profiles, competitive positioning vs Crane/Quick Garden/budget brands, messaging pillars, content strategy, SEO priorities, sales funnel design, social proof needs, and prioritised action items.',
      looseEnds: 'Needs regular review as market intelligence grows.',
      updated: '2026-01-29'
    };
    d['84'] = {
      summary: '65-frame animation captured with proper rendering — first successful video production.',
      details: 'Sequence: zoom in (40 frames), door widening 1000→1350mm in 2-frame steps, style change to double M&T, door close + zoom out. Key fix: 4-second delay after preset imports plus forced render cycles eliminated wireframe flicker. Established the animation capture pipeline workflow.',
      looseEnds: 'Pipeline still evolving — see parent card #77.',
      updated: '2026-01-31'
    };
    d['109'] = {
      summary: 'Synthetic slate tile roof covering with full layer stack — membrane, battens, tiles.',
      details: 'Complete layer stack: breathable membrane (light blue, 0.5mm on OSB), tile battens (25×38mm at 143mm spacing), ridge battens, eaves battens, and pewter grey slate surface (5mm). All layers are parametric and adapt to building dimensions.',
      looseEnds: 'Ridge tiles (V-profile cap) still needed. Texture/normal maps for realistic appearance. Visibility toggles for construction breakdown view.',
      updated: '2026-02-04'
    };
    d['118'] = {
      summary: 'Pent roof insulation and ply lining follow the roof slope per-bay using vertex modification.',
      details: 'Instead of CSG (expensive), uses direct vertex modification on box meshes to match slope. Calculates per-wall heights for left and right walls independently. Multiple iterations to get the geometry right across all pent configurations.',
      looseEnds: 'Ghost wireframe issue discovered and fixed separately (card #119).',
      updated: '2026-02-09'
    };
    d._seeded_v2 = true;
    saveDeliverables(d);
  }
  seedDeliverables();

  function openDeliverablePage(cardId) {
    var card = cards.find(function(c) { return c.id === cardId; });
    if (!card) return;
    var del = getDeliverable(cardId) || {};
    var extracted = extractDeliverables(card);
    var mainContent = document.getElementById('mainContent');

    // Close the flyout when viewing a deliverable
    document.getElementById("flyout").classList.remove("open");
    var hb = document.getElementById('gbHamburger');
    if (hb) hb.classList.remove('hidden');

    var html = '<div class="deliverable-page">';
    html += '<button class="gb-back-btn" id="delBackBtn">← Back</button>';

    // Hero card
    html += '<div class="del-hero">';
    html += '<div class="del-hero-check">✅</div>';
    html += '<h2 class="del-title">' + escHtml(card.title) + '</h2>';
    html += '<div class="del-header">';
    html += '<span class="badge badge-category">' + (CAT_EMOJI[card.category] || "") + ' ' + card.category + '</span>';
    html += '<span class="badge badge-priority-' + card.priority + '">' + card.priority + '</span>';
    if (card.completedAt) html += '<span class="del-date">✅ Completed ' + formatDate(card.completedAt) + '</span>';
    if (card.createdAt) html += '<span class="del-date">📅 Created ' + formatDate(card.createdAt) + '</span>';
    html += '</div>';
    html += '</div>';

    // Card description (from JSON)
    if (card.description) {
      html += '<div class="del-section">';
      html += '<h3>📋 Card Description</h3>';
      html += '<div class="del-description-block">' + formatDescription(card.description) + '</div>';
      html += '</div>';
    }

    // Auto-extracted artifacts
    if (extracted.length > 0) {
      html += '<div class="del-section">';
      html += '<h3>📦 Artifacts & References</h3>';
      html += '<div class="del-artifacts-grid">';
      extracted.forEach(function(item) {
        html += deliverableItemHtml(item);
      });
      html += '</div>';
      html += '</div>';
    }

    // Linked child cards (if this is a parent)
    var children = cards.filter(function(c) { return c.parentId === cardId; });
    if (children.length > 0) {
      html += '<div class="del-section">';
      html += '<h3>🔗 Linked Tasks</h3>';
      html += '<div class="del-children">';
      children.forEach(function(child) {
        var statusIcon = child.status === 'done' ? '✅' : child.status === 'in-progress' ? '🔨' : '📋';
        html += '<div class="del-child-card" data-child-id="' + child.id + '">';
        html += '<span class="del-child-status">' + statusIcon + '</span>';
        html += '<span class="del-child-title">' + escHtml(child.title) + '</span>';
        html += '<span class="badge badge-status-' + child.status + '">' + STATUS_LABELS[child.status] + '</span>';
        html += '</div>';
      });
      html += '</div>';
      html += '</div>';
    }

    // Editable deliverable notes
    html += '<div class="del-section">';
    html += '<h3>📝 Deliverable Notes</h3>';
    html += '<p class="del-section-hint">Add your own summary, evidence, or notes about what was delivered.</p>';
    html += '</div>';

    html += '<div class="del-edit-grid">';

    html += '<div class="del-edit-card">';
    html += '<label class="del-edit-label">Executive Summary</label>';
    html += '<textarea id="delSummary" class="del-textarea" placeholder="What was delivered? Key outcomes in 1-2 sentences...">' + escHtml(del.summary || '') + '</textarea>';
    html += '</div>';

    html += '<div class="del-edit-card">';
    html += '<label class="del-edit-label">Details & Evidence</label>';
    html += '<textarea id="delDetails" class="del-textarea del-textarea-lg" placeholder="Technical details, what was built, how it works, lessons learned...">' + escHtml(del.details || '') + '</textarea>';
    html += '</div>';

    html += '<div class="del-edit-card">';
    html += '<label class="del-edit-label">Loose Ends & Follow-ups</label>';
    html += '<textarea id="delLooseEnds" class="del-textarea" placeholder="Remaining issues, future improvements, things to watch...">' + escHtml(del.looseEnds || '') + '</textarea>';
    html += '</div>';

    html += '</div>'; // end edit-grid

    html += '<div class="del-actions">';
    html += '<button id="delSaveBtn" class="gb-save-btn">💾 Save Notes</button>';
    if (del.updated) html += '<span class="del-last-saved">Last saved: ' + del.updated + '</span>';
    html += '</div>';

    // Firebase notes & collaboration section
    html += '<div class="del-section">';
    html += '<h3>🔥 Real-time Notes & Collaboration</h3>';
    html += '<p style="color:var(--gb-text-muted,#78716C);font-size:13px;margin-bottom:12px;">Add notes, docs, and photos that sync across all devices in real-time.</p>';
    html += '<button id="delFirebaseBtn" style="padding:10px 20px;border-radius:10px;border:1.5px solid #C4823A;background:#FEF3C7;font-size:14px;cursor:pointer;font-family:inherit;color:#92400E;transition:all 0.15s;">📝 Open Notes &amp; Details Panel</button>';
    html += '</div>';

    // Photo gallery placeholder
    html += '<div class="del-section">';
    html += '<div id="delPhotos-' + cardId + '"></div>';
    html += '</div>';

    html += '</div>'; // end deliverable-page

    mainContent.innerHTML = html;

    // Render photo gallery and file list
    if (window.__photoModule) {
      var photoContainer = document.getElementById('delPhotos-' + cardId);
      if (photoContainer) {
        window.__photoModule.renderPhotoGallery(photoContainer, cardId);
        window.__photoModule.renderFileList(photoContainer, cardId);
      }
    }

    // Back button
    document.getElementById('delBackBtn').addEventListener('click', function() {
      mainContent.innerHTML = '<div class="gb-welcome"><h2>🏡 Garden Buildings Dashboard</h2><p>Select a section from the sidebar to explore the project.</p></div>';
    });

    // Save button
    document.getElementById('delSaveBtn').addEventListener('click', function() {
      var deliverables = loadDeliverables();
      deliverables[cardId] = {
        summary: document.getElementById('delSummary').value.trim(),
        details: document.getElementById('delDetails').value.trim(),
        looseEnds: document.getElementById('delLooseEnds').value.trim(),
        updated: new Date().toISOString().slice(0, 10)
      };
      saveDeliverables(deliverables);
      var btn = document.getElementById('delSaveBtn');
      btn.textContent = '✅ Saved!';
      btn.style.background = '#2D5016';
      setTimeout(function() { btn.textContent = '💾 Save Notes'; btn.style.background = ''; }, 1500);
    });

    // Firebase notes button on deliverable page
    var fbBtn = document.getElementById('delFirebaseBtn');
    if (fbBtn) {
      fbBtn.addEventListener('click', function() {
        openCardDetail(cardId);
      });
    }

    // Child card click handlers
    mainContent.querySelectorAll('.del-child-card').forEach(function(el) {
      el.addEventListener('click', function() {
        var childId = el.getAttribute('data-child-id');
        var child = cards.find(function(c) { return c.id === childId; });
        if (child && child.status === 'done') {
          openDeliverablePage(childId);
        }
      });
    });
  }

  // Format description text with markdown-light rendering
  function formatDescription(text) {
    // Escape HTML first
    var safe = escHtml(text);
    // Bold: **text**
    safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Bullets: • or - at start of line
    safe = safe.replace(/^([•\-])\s+/gm, '<span class="del-bullet">$1</span> ');
    // Checkmarks
    safe = safe.replace(/✅/g, '<span class="del-check">✅</span>');
    safe = safe.replace(/⬜/g, '<span class="del-todo">⬜</span>');
    return safe;
  }

  function attachCardEvents(container) {
    // Done cards are fully clickable
    container.querySelectorAll('[data-deliverable-id]').forEach(function(el) {
      el.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        openDeliverablePage(el.getAttribute('data-deliverable-id'));
      });
    });
    // Legacy button support
    container.querySelectorAll('.deliverable-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        openDeliverablePage(btn.getAttribute('data-card-id'));
      });
    });

    // Firebase detail buttons on all cards
    container.querySelectorAll('.firebase-detail-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var cardId = btn.getAttribute('data-card-id');
        openCardDetail(cardId);
      });
    });

    // Lazy-load photo galleries when cards are expanded
    if (window.__photoModule) {
      container.querySelectorAll('details.task-card').forEach(function(det) {
        det.addEventListener('toggle', function() {
          if (!det.open) return;
          var photoDiv = det.querySelector('.card-photos[data-photo-card-id]');
          if (!photoDiv || photoDiv.dataset.photosLoaded) return;
          photoDiv.dataset.photosLoaded = '1';
          window.__photoModule.renderPhotoGallery(photoDiv, photoDiv.dataset.photoCardId);
          window.__photoModule.renderFileList(photoDiv, photoDiv.dataset.photoCardId);
        });
      });
    }
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
    html += '<th>📝</th>';
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
      var rowClass = c.status === 'done' ? ' class="done-row"' : '';
      var dataAttr = c.status === 'done' ? ' data-deliverable-id="' + c.id + '"' : '';
      return '<tr' + rowClass + dataAttr + '>' +
        '<td>' + c.id + '</td>' +
        '<td title="' + escAttr(c.description || '') + '"><strong>' + escHtml(c.title) + '</strong>' + (c.status === 'done' ? ' <span class="table-del-hint">→ View</span>' : '') + '</td>' +
        '<td><span class="badge badge-status-' + c.status + '">' + STATUS_LABELS[c.status] + '</span></td>' +
        '<td><span class="badge badge-priority-' + c.priority + '">' + c.priority + '</span></td>' +
        '<td>' + (CAT_EMOJI[c.category] || "") + ' ' + c.category + '</td>' +
        '<td>' + formatDate(c.createdAt) + '</td>' +
        '<td><button class="firebase-detail-btn table-notes-btn" data-card-id="' + c.id + '" style="padding:4px 10px;border-radius:6px;border:1px solid #E7E0D8;background:#F5F0EB;font-size:12px;cursor:pointer;color:#57534E;">📝</button></td>' +
        '</tr>';
    }).join("");

    // Make Done rows clickable
    tbody.querySelectorAll('.done-row').forEach(function(row) {
      row.addEventListener('click', function(e) {
        // Don't navigate if clicking the notes button
        if (e.target.classList.contains('firebase-detail-btn')) return;
        openDeliverablePage(row.getAttribute('data-deliverable-id'));
      });
    });

    // Firebase detail buttons in table
    tbody.querySelectorAll('.firebase-detail-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var cardId = btn.getAttribute('data-card-id');
        openCardDetail(cardId);
      });
    });
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
        '<div class="card-photos" data-photo-card-id="' + idea.id + '"></div>' +
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

    // Lazy-load photo galleries when idea cards are expanded
    if (window.__photoModule) {
      list.querySelectorAll('details.idea-card').forEach(function(det) {
        det.addEventListener('toggle', function() {
          if (!det.open) return;
          var photoDiv = det.querySelector('.card-photos[data-photo-card-id]');
          if (!photoDiv || photoDiv.dataset.photosLoaded) return;
          photoDiv.dataset.photosLoaded = '1';
          window.__photoModule.renderPhotoGallery(photoDiv, photoDiv.dataset.photoCardId);
          window.__photoModule.renderFileList(photoDiv, photoDiv.dataset.photoCardId);
        });
      });
    }
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

  // Seed default ideas if empty
  (function seedDefaultIdeas() {
    var ideas = getLocalIdeas();
    if (ideas.length > 0) return;
    ideas.push({
      id: "idea-seed-001",
      title: "AI Transition Coaching Business",
      description: "New business concept: help people and small businesses leverage AI the way Andrew has.\n\nThe insight: In 2 weeks, Andrew went from a traditional garden buildings business to having a parametric 3D configurator, two business dashboards, automated data pipelines, and a multi-business farm management platform — all built with AI assistance.\n\nMost people don't know this is possible yet. The ones who are starting to realise are scared, confused, or don't know where to begin.\n\nPossible directions:\n\nA) Consultancy/coaching — Work 1-to-1 with small business owners to set up AI-assisted workflows. Walk them through the same journey.\n\nB) Course/community — Package the journey into a course. 'From spreadsheets to dashboards in a weekend.' Build a community around it.\n\nC) Done-for-you service — Build dashboards, configurators, automation for other businesses. Productised service.\n\nD) All of the above — start with consultancy, document everything, turn it into a course, then scale.\n\nKey selling point: Andrew is the living proof of concept. Not a tech company saying 'use our AI tool' — a real person running real businesses who can show the results.\n\nWith the advent of AI, a lot of people will find themselves displaced. But this is a transition. AI will generate way more jobs than it takes eventually. This business helps people through that transition.",
      createdAt: "2026-02-12T11:34:00Z"
    });
    saveLocalIdeas(ideas);
  })();

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

  // ── Firebase Integration ──
  var SHED_TASKS_PATH = 'business/sheds/tasks';
  var firebaseTasks = {};  // Firebase tasks keyed by firebase ID
  var firebaseReady = false;

  function initFirebase() {
    // Auto-set user to Andrew (single-user dashboard)
    if (window.FireSync) {
      FireSync.setUser('Andrew');

      // Listen for shed tasks from Firebase
      FireSync.onTasks(SHED_TASKS_PATH, function(tasks) {
        firebaseTasks = tasks || {};
        firebaseReady = true;
        // Re-render if a step is active
        if (activeStep) {
          var body = document.getElementById("flyoutBody");
          if (body && activeStep !== "overview" && activeStep !== "all-tasks" && activeStep !== "ideas") {
            // Don't re-render while user is interacting — just mark as stale
          }
        }
      });

      // Sync cards.json items to Firebase (one-time seed)
      syncCardsToFirebase();

      // Render attention items in main content
      renderAttentionSection();
    }
  }

  // Sync cards.json → Firebase (only adds missing cards, never overwrites)
  function syncCardsToFirebase() {
    if (!window.FireSync) return;
    FireSync.getTasks(SHED_TASKS_PATH, function(existingTasks) {
      var existing = existingTasks || {};
      // Build a map of existing card IDs (stored as cardJsonId field)
      var existingCardIds = {};
      Object.keys(existing).forEach(function(fbId) {
        if (existing[fbId].cardJsonId) {
          existingCardIds[existing[fbId].cardJsonId] = fbId;
        }
      });

      // Add any cards from cards.json that aren't in Firebase yet
      cards.forEach(function(card) {
        if (!existingCardIds[card.id]) {
          var fbTask = {
            cardJsonId: card.id,
            title: card.title,
            description: card.description || '',
            status: card.status,
            priority: card.priority || 'medium',
            category: card.category,
            createdAt: card.createdAt || new Date().toISOString(),
            source: 'cards.json'
          };
          if (card.completedAt) fbTask.completedAt = card.completedAt;
          FireSync._addTask(SHED_TASKS_PATH, fbTask);
        }
      });
    });
  }

  // ── Attention Items Section (main content area) ──
  function renderAttentionSection() {
    if (!window.FireSync) return;

    FireSync.onAttentionItems(function(items) {
      var mainContent = document.getElementById("mainContent");
      // Only render attention section if we're showing the welcome screen
      var welcomeDiv = mainContent.querySelector('.gb-welcome');
      if (!welcomeDiv) return;

      // Filter for active shed-related attention items
      var activeItems = [];
      Object.keys(items).forEach(function(id) {
        var item = items[id];
        if (item.status === 'active' && (item.biz === 'sheds' || item.biz === '🏡' || !item.biz)) {
          item._id = id;
          activeItems.push(item);
        }
      });

      // Remove existing attention section if present
      var existingSection = mainContent.querySelector('.gb-attention-section');
      if (existingSection) existingSection.remove();

      if (activeItems.length === 0) return;

      var section = document.createElement('div');
      section.className = 'gb-attention-section';
      var html = '<h3 style="margin:24px 0 12px;color:var(--gb-accent,#C4823A);">⚡ Needs Your Attention</h3>';
      html += '<div class="gb-attention-list">';

      activeItems.forEach(function(item) {
        var prioClass = item.priority === 'high' ? 'badge-priority-high' : item.priority === 'low' ? 'badge-priority-low' : 'badge-priority-medium';
        html += '<div class="gb-attention-card" data-attention-id="' + item._id + '" style="' +
          'background:var(--gb-surface,#fff);border:1px solid var(--gb-border,#E7E0D8);border-radius:10px;' +
          'padding:12px 16px;margin-bottom:8px;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:12px;">';
        html += '<span class="badge ' + prioClass + '" style="flex-shrink:0;">' + (item.priority || 'medium') + '</span>';
        html += '<div style="flex:1;min-width:0;">';
        html += '<div style="font-weight:600;color:var(--gb-text,#1C1917);">' + escHtml(item.title || '') + '</div>';
        if (item.detail) html += '<div style="font-size:13px;color:var(--gb-text-muted,#78716C);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escHtml(item.detail) + '</div>';
        html += '</div>';
        html += '<span style="color:var(--gb-text-muted,#78716C);font-size:18px;">→</span>';
        html += '</div>';
      });

      html += '</div>';
      section.innerHTML = html;
      welcomeDiv.after(section);

      // Click handlers for attention items
      section.querySelectorAll('.gb-attention-card').forEach(function(el) {
        el.addEventListener('click', function() {
          var id = el.getAttribute('data-attention-id');
          var item = items[id];
          if (item && window.ItemDetail) {
            ItemDetail.open(id, item);
          }
        });
        // Hover effect
        el.addEventListener('mouseenter', function() { el.style.borderColor = 'var(--gb-accent,#C4823A)'; });
        el.addEventListener('mouseleave', function() { el.style.borderColor = 'var(--gb-border,#E7E0D8)'; });
      });
    });
  }

  // ── Open Item Detail for a card ──
  function openCardDetail(cardId) {
    var card = cards.find(function(c) { return c.id === cardId; });
    if (!card) return;

    if (window.ItemDetail) {
      // Build an item-detail-compatible object from the card
      var itemData = {
        title: card.title,
        detail: card.description || '',
        biz: '🏡',
        priority: card.priority || 'medium',
        status: card.status === 'in-progress' ? 'active' : card.status
      };
      // Use 'card-' prefix so card notes don't collide with attention item notes
      ItemDetail.open('card-' + cardId, itemData);
    }
  }

  // ── Init ──
  document.addEventListener("DOMContentLoaded", function() {
    loadData();
    // Init Firebase after a short delay to let FireSync load its SDK
    setTimeout(initFirebase, 500);
  });

})();
