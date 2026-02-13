/**
 * Photo Gallery Module for Garden Buildings Dashboard
 *
 * Handles photo upload (via Cloudflare Worker proxy), display, and management.
 * Works on any card — done, in-progress, backlog, ideas.
 */

(function () {
  "use strict";

  // ── Config ──
  var WORKER_URL_KEY = 'gb_photo_worker_url';
  var UPLOAD_PW_KEY = 'gb_photo_password';
  var PHOTOS_CACHE_KEY = 'gb_photos_cache';
  var PHOTOS_CACHE_TTL = 60000; // 1 minute cache

  var DEFAULT_WORKER_URL = ''; // Set after deployment

  // ── Max dimensions for compression ──
  var MAX_WIDTH = 1600;
  var MAX_HEIGHT = 1200;
  var JPEG_QUALITY = 0.75; // Target ~200-500KB

  // ── Photos cache ──
  var photosCache = null;
  var photosCacheTime = 0;

  // ── Get/set config ──
  function getWorkerUrl() {
    return localStorage.getItem(WORKER_URL_KEY) || DEFAULT_WORKER_URL;
  }

  function getUploadPassword() {
    return localStorage.getItem(UPLOAD_PW_KEY) || '';
  }

  function saveConfig(workerUrl, password) {
    if (workerUrl) localStorage.setItem(WORKER_URL_KEY, workerUrl);
    if (password) localStorage.setItem(UPLOAD_PW_KEY, password);
  }

  function isConfigured() {
    return !!(getWorkerUrl() && getUploadPassword());
  }

  // ── Prompt for config if not set ──
  function ensureConfig(callback) {
    if (isConfigured()) {
      callback();
      return;
    }
    showConfigDialog(callback);
  }

  function showConfigDialog(callback) {
    var overlay = document.createElement('div');
    overlay.className = 'photo-config-overlay';
    overlay.innerHTML =
      '<div class="photo-config-dialog">' +
      '<h3>📷 Photo Upload Setup</h3>' +
      '<p>One-time setup to enable photo uploads.</p>' +
      '<label>Worker URL<input type="url" id="photoWorkerUrl" placeholder="https://gb-photo-upload.yourname.workers.dev" value="' + escAttr(getWorkerUrl()) + '"></label>' +
      '<label>Upload Password<input type="password" id="photoPassword" placeholder="Shared upload password" value="' + escAttr(getUploadPassword()) + '"></label>' +
      '<div class="photo-config-actions">' +
      '<button id="photoConfigCancel" class="photo-btn-cancel">Cancel</button>' +
      '<button id="photoConfigSave" class="photo-btn-save">Save</button>' +
      '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    document.getElementById('photoConfigCancel').onclick = function () {
      overlay.remove();
    };

    document.getElementById('photoConfigSave').onclick = function () {
      var url = document.getElementById('photoWorkerUrl').value.trim();
      var pw = document.getElementById('photoPassword').value.trim();
      if (!url || !pw) {
        alert('Both fields are required.');
        return;
      }
      saveConfig(url, pw);
      overlay.remove();
      if (callback) callback();
    };
  }

  // ── Fetch photos from worker or cache ──
  function fetchPhotos(callback) {
    var now = Date.now();
    if (photosCache && (now - photosCacheTime) < PHOTOS_CACHE_TTL) {
      callback(photosCache);
      return;
    }

    // Try fetching from worker
    var workerUrl = getWorkerUrl();
    if (!workerUrl) {
      // Fall back to direct GitHub fetch
      fetchPhotosDirect(callback);
      return;
    }

    fetch(workerUrl + '/photos')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.ok && data.photos) {
          photosCache = data.photos;
          photosCacheTime = Date.now();
          try { localStorage.setItem(PHOTOS_CACHE_KEY, JSON.stringify(data.photos)); } catch (e) { }
          callback(data.photos);
        } else {
          fetchPhotosDirect(callback);
        }
      })
      .catch(function () {
        fetchPhotosDirect(callback);
      });
  }

  // ── Direct GitHub fetch fallback ──
  function fetchPhotosDirect(callback) {
    // Try to load from the repo directly (public repo, no auth needed)
    var repoBase = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
    fetch(repoBase + '/data/photos.json')
      .then(function (res) {
        if (!res.ok) throw new Error('No photos.json');
        return res.json();
      })
      .then(function (data) {
        var photos = data.photos || [];
        photosCache = photos;
        photosCacheTime = Date.now();
        callback(photos);
      })
      .catch(function () {
        // No photos yet — try localStorage cache
        try {
          var cached = JSON.parse(localStorage.getItem(PHOTOS_CACHE_KEY) || '[]');
          callback(cached);
        } catch (e) {
          callback([]);
        }
      });
  }

  // ── Get photos for a specific card ──
  function getPhotosForCard(cardId, callback) {
    fetchPhotos(function (allPhotos) {
      var cardPhotos = allPhotos.filter(function (p) {
        return String(p.cardId) === String(cardId);
      });
      callback(cardPhotos);
    });
  }

  // ── Compress image ──
  function compressImage(file, callback) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement('canvas');
        var w = img.width;
        var h = img.height;

        // Scale down if too large
        if (w > MAX_WIDTH || h > MAX_HEIGHT) {
          var ratio = Math.min(MAX_WIDTH / w, MAX_HEIGHT / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        // Convert to JPEG base64
        var dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        var base64 = dataUrl.split(',')[1];

        // Check size, reduce quality if still too large
        if (base64.length > 1.5 * 1024 * 1024) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.5);
          base64 = dataUrl.split(',')[1];
        }

        callback({ base64: base64, dataUrl: dataUrl, width: w, height: h });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ── Upload photo ──
  function uploadPhoto(cardId, base64, caption, statusCallback) {
    var workerUrl = getWorkerUrl();
    var password = getUploadPassword();

    statusCallback('uploading', 'Uploading photo...');

    fetch(workerUrl + '/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: password,
        cardId: String(cardId),
        image: base64,
        caption: caption || '',
        dashboard: 'shed'
      })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.ok) {
          // Invalidate cache
          photosCache = null;
          photosCacheTime = 0;
          statusCallback('success', 'Photo uploaded!', data.photo);
        } else {
          statusCallback('error', data.error || 'Upload failed');
        }
      })
      .catch(function (err) {
        statusCallback('error', 'Network error: ' + err.message);
      });
  }

  // ── Delete photo ──
  function deletePhoto(filename, statusCallback) {
    var workerUrl = getWorkerUrl();
    var password = getUploadPassword();

    statusCallback('deleting', 'Removing photo...');

    fetch(workerUrl + '/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: password,
        filename: filename,
        dashboard: 'shed'
      })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.ok) {
          photosCache = null;
          photosCacheTime = 0;
          statusCallback('success', 'Photo removed');
        } else {
          statusCallback('error', data.error || 'Delete failed');
        }
      })
      .catch(function (err) {
        statusCallback('error', 'Network error: ' + err.message);
      });
  }

  // ── Render photo gallery for a card ──
  function renderPhotoGallery(container, cardId, options) {
    options = options || {};
    var galleryDiv = document.createElement('div');
    galleryDiv.className = 'photo-gallery';
    galleryDiv.innerHTML = '<div class="photo-gallery-loading">Loading photos...</div>';
    container.appendChild(galleryDiv);

    getPhotosForCard(cardId, function (photos) {
      var html = '';

      // Header
      html += '<div class="photo-gallery-header">';
      html += '<h3>📸 Photos' + (photos.length > 0 ? ' (' + photos.length + ')' : '') + '</h3>';
      html += '<button class="photo-add-btn" data-card-id="' + cardId + '">📷 Add Photo</button>';
      html += '</div>';

      // Photo grid
      if (photos.length > 0) {
        html += '<div class="photo-grid">';
        photos.forEach(function (photo) {
          html += '<div class="photo-item" data-filename="' + escAttr(photo.filename) + '">';
          html += '<img src="' + escAttr(photo.url) + '" alt="' + escAttr(photo.caption || 'Photo') + '" loading="lazy" onclick="window.__photoModule.openLightbox(this.src, \'' + escAttr(photo.caption || '') + '\')">';
          if (photo.caption) html += '<div class="photo-caption">' + escHtml(photo.caption) + '</div>';
          html += '<div class="photo-meta">' + formatPhotoDate(photo.addedAt) + '</div>';
          html += '<button class="photo-delete-btn" title="Delete photo" data-filename="' + escAttr(photo.filename) + '">✕</button>';
          html += '</div>';
        });
        html += '</div>';
      } else {
        html += '<div class="photo-empty">No photos yet. Tap "Add Photo" to get started.</div>';
      }

      // Upload status area
      html += '<div class="photo-upload-status" id="photoStatus-' + cardId + '"></div>';

      // Hidden file input
      html += '<input type="file" accept="image/*" class="photo-file-input" id="photoInput-' + cardId + '" style="display:none">';

      galleryDiv.innerHTML = html;

      // Wire up add button
      var addBtn = galleryDiv.querySelector('.photo-add-btn');
      if (addBtn) {
        addBtn.addEventListener('click', function () {
          ensureConfig(function () {
            document.getElementById('photoInput-' + cardId).click();
          });
        });
      }

      // Wire up file input
      var fileInput = document.getElementById('photoInput-' + cardId);
      if (fileInput) {
        fileInput.addEventListener('change', function (e) {
          var file = e.target.files && e.target.files[0];
          if (!file) return;

          var caption = prompt('Caption (optional):', '') || '';
          var statusEl = document.getElementById('photoStatus-' + cardId);

          compressImage(file, function (result) {
            uploadPhoto(cardId, result.base64, caption, function (status, message, photo) {
              if (statusEl) {
                statusEl.textContent = message;
                statusEl.className = 'photo-upload-status photo-status-' + status;
              }
              if (status === 'success') {
                // Refresh the gallery
                setTimeout(function () {
                  galleryDiv.innerHTML = '';
                  renderPhotoGallery(galleryDiv.parentNode, cardId, options);
                  galleryDiv.remove();
                }, 1500);
              }
            });
          });

          // Reset input so same file can be re-selected
          fileInput.value = '';
        });
      }

      // Wire up delete buttons
      galleryDiv.querySelectorAll('.photo-delete-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var fn = btn.getAttribute('data-filename');
          if (!confirm('Delete this photo?')) return;
          ensureConfig(function () {
            deletePhoto(fn, function (status, message) {
              if (status === 'success') {
                galleryDiv.innerHTML = '';
                renderPhotoGallery(galleryDiv.parentNode, cardId, options);
                galleryDiv.remove();
              } else {
                alert(message);
              }
            });
          });
        });
      });
    });
  }

  // ── Lightbox ──
  function openLightbox(src, caption) {
    var overlay = document.createElement('div');
    overlay.className = 'photo-lightbox';
    overlay.innerHTML =
      '<div class="photo-lightbox-content">' +
      '<img src="' + src + '" alt="' + (caption || 'Photo') + '">' +
      (caption ? '<div class="photo-lightbox-caption">' + escHtml(caption) + '</div>' : '') +
      '</div>';
    overlay.addEventListener('click', function () { overlay.remove(); });
    document.body.appendChild(overlay);
  }

  // ── Helpers ──
  function escHtml(s) {
    var d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function escAttr(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;');
  }

  function formatPhotoDate(isoStr) {
    if (!isoStr) return '';
    try {
      var d = new Date(isoStr);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return ''; }
  }

  // ── Expose public API ──
  window.__photoModule = {
    renderPhotoGallery: renderPhotoGallery,
    openLightbox: openLightbox,
    isConfigured: isConfigured,
    showConfigDialog: showConfigDialog,
    ensureConfig: ensureConfig,
    invalidateCache: function () { photosCache = null; photosCacheTime = 0; }
  };

})();
