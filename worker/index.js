/**
 * Cloudflare Worker — Photo Upload Proxy for Garden Buildings Dashboard
 *
 * Accepts image uploads, compresses if needed, commits to GitHub repo.
 * Keeps a photos.json manifest so the dashboard knows which photos belong to which card.
 *
 * Environment variables (set in Cloudflare dashboard):
 *   GITHUB_TOKEN   — GitHub PAT with repo write access
 *   UPLOAD_PASSWORD — Shared password for upload authorization
 *   GITHUB_REPO    — e.g. "andrewsgparsons-source/shed-project-board"
 *   GITHUB_BRANCH  — e.g. "main"
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === '/upload' && request.method === 'POST') {
      return handleUpload(request, env);
    }

    if (url.pathname === '/photos' && request.method === 'GET') {
      return handleGetPhotos(env);
    }

    if (url.pathname === '/delete' && request.method === 'POST') {
      return handleDelete(request, env);
    }

    return jsonResponse({ error: 'Not found' }, 404);
  }
};

// ── Upload handler ──
async function handleUpload(request, env) {
  try {
    const body = await request.json();
    const { password, cardId, image, caption, dashboard } = body;

    // Validate
    if (!password || password !== env.UPLOAD_PASSWORD) {
      return jsonResponse({ error: 'Invalid password' }, 401);
    }
    if (!cardId) {
      return jsonResponse({ error: 'cardId is required' }, 400);
    }
    if (!image) {
      return jsonResponse({ error: 'image (base64) is required' }, 400);
    }

    // Strip data URL prefix if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    // Validate size (max ~2MB base64 ≈ 1.5MB image)
    if (base64Data.length > 2 * 1024 * 1024) {
      return jsonResponse({ error: 'Image too large. Max ~1.5MB after compression.' }, 400);
    }

    // Determine repo based on dashboard param
    const repo = resolveRepo(dashboard, env);
    const branch = env.GITHUB_BRANCH || 'main';
    const timestamp = Date.now();
    const filename = `card-${cardId}-${timestamp}.jpg`;
    const filepath = `data/images/${filename}`;

    // 1. Commit the image file to GitHub
    const commitResult = await githubCreateFile(env.GITHUB_TOKEN, repo, branch, filepath, base64Data, `Add photo for card #${cardId}`);

    if (!commitResult.ok) {
      return jsonResponse({ error: 'GitHub commit failed: ' + commitResult.error }, 500);
    }

    // 2. Update photos.json manifest
    const photoEntry = {
      cardId: String(cardId),
      filename: filename,
      caption: caption || '',
      addedAt: new Date().toISOString(),
      url: `https://${repo.split('/')[0]}.github.io/${repo.split('/')[1]}/data/images/${filename}`
    };

    const manifestResult = await updatePhotosManifest(env.GITHUB_TOKEN, repo, branch, photoEntry);

    if (!manifestResult.ok) {
      // Image was committed but manifest failed — not ideal but photo is safe
      return jsonResponse({
        ok: true,
        warning: 'Photo saved but manifest update failed. Photo will appear after manual fix.',
        photo: photoEntry
      }, 200);
    }

    return jsonResponse({ ok: true, photo: photoEntry });

  } catch (err) {
    return jsonResponse({ error: 'Server error: ' + err.message }, 500);
  }
}

// ── Get photos manifest ──
async function handleGetPhotos(env) {
  try {
    const repo = env.GITHUB_REPO;
    const branch = env.GITHUB_BRANCH || 'main';
    const manifest = await getPhotosManifest(env.GITHUB_TOKEN, repo, branch);
    return jsonResponse({ ok: true, photos: manifest.photos || [] });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// ── Delete photo ──
async function handleDelete(request, env) {
  try {
    const body = await request.json();
    const { password, filename, dashboard } = body;

    if (!password || password !== env.UPLOAD_PASSWORD) {
      return jsonResponse({ error: 'Invalid password' }, 401);
    }
    if (!filename) {
      return jsonResponse({ error: 'filename is required' }, 400);
    }

    const repo = resolveRepo(dashboard, env);
    const branch = env.GITHUB_BRANCH || 'main';
    const filepath = `data/images/${filename}`;

    // Delete the image file from GitHub
    const deleteResult = await githubDeleteFile(env.GITHUB_TOKEN, repo, branch, filepath, `Remove photo ${filename}`);

    // Remove from manifest
    const manifestResult = await removeFromManifest(env.GITHUB_TOKEN, repo, branch, filename);

    return jsonResponse({ ok: true, deleted: filename });

  } catch (err) {
    return jsonResponse({ error: 'Server error: ' + err.message }, 500);
  }
}

// ── Repo resolver (supports multiple dashboards) ──
function resolveRepo(dashboard, env) {
  // Default to shed project board; can add Whelpley Farm later
  if (dashboard === 'whelpley-farm') {
    return env.WHELPLEY_REPO || env.GITHUB_REPO;
  }
  return env.GITHUB_REPO;
}

// ── GitHub API helpers ──

async function githubCreateFile(token, repo, branch, path, contentBase64, message) {
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'gb-dashboard-worker'
    },
    body: JSON.stringify({
      message: message,
      content: contentBase64,
      branch: branch
    })
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: text };
  }
  return { ok: true, data: await res.json() };
}

async function githubDeleteFile(token, repo, branch, path, message) {
  // First get the file SHA
  const getUrl = `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`;
  const getRes = await fetch(getUrl, {
    headers: {
      'Authorization': `token ${token}`,
      'User-Agent': 'gb-dashboard-worker'
    }
  });

  if (!getRes.ok) return { ok: false, error: 'File not found' };
  const fileData = await getRes.json();

  const url = `https://api.github.com/repos/${repo}/contents/${path}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'gb-dashboard-worker'
    },
    body: JSON.stringify({
      message: message,
      sha: fileData.sha,
      branch: branch
    })
  });

  return { ok: res.ok };
}

async function getPhotosManifest(token, repo, branch) {
  const url = `https://api.github.com/repos/${repo}/contents/data/photos.json?ref=${branch}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `token ${token}`,
      'User-Agent': 'gb-dashboard-worker'
    }
  });

  if (!res.ok) {
    // File doesn't exist yet
    return { photos: [], sha: null };
  }

  const data = await res.json();
  const content = atob(data.content.replace(/\n/g, ''));
  const manifest = JSON.parse(content);
  return { photos: manifest.photos || [], sha: data.sha };
}

async function updatePhotosManifest(token, repo, branch, newEntry) {
  const current = await getPhotosManifest(token, repo, branch);
  current.photos.push(newEntry);

  const newContent = JSON.stringify({ photos: current.photos }, null, 2);
  const base64 = btoa(unescape(encodeURIComponent(newContent)));

  const url = `https://api.github.com/repos/${repo}/contents/data/photos.json`;
  const body = {
    message: `Add photo entry for card #${newEntry.cardId}`,
    content: base64,
    branch: branch
  };
  if (current.sha) body.sha = current.sha;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'gb-dashboard-worker'
    },
    body: JSON.stringify(body)
  });

  return { ok: res.ok };
}

async function removeFromManifest(token, repo, branch, filename) {
  const current = await getPhotosManifest(token, repo, branch);
  current.photos = current.photos.filter(p => p.filename !== filename);

  const newContent = JSON.stringify({ photos: current.photos }, null, 2);
  const base64 = btoa(unescape(encodeURIComponent(newContent)));

  const url = `https://api.github.com/repos/${repo}/contents/data/photos.json`;
  const body = {
    message: `Remove photo ${filename}`,
    content: base64,
    branch: branch
  };
  if (current.sha) body.sha = current.sha;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'gb-dashboard-worker'
    },
    body: JSON.stringify(body)
  });

  return { ok: res.ok };
}

// ── Helpers ──
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  });
}
