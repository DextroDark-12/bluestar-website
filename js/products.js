(function () {
  'use strict';

  var CATALOG_CATEGORIES = ['Granite', 'Marble', 'Finish'];

  function localAsset(path) {
    if (!path) return '';
    if (path.charAt(0) === '/') return '.' + path;
    return path;
  }

  function escAttr(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function filterKeyForCategory(cat) {
    if (cat === 'Granite') return 'granite';
    if (cat === 'Marble') return 'marble';
    if (cat === 'Finish') return 'finish';
    return 'other';
  }

  function originTag(origin) {
    if (!origin || origin === 'N/A') return 'Catalogue';
    return origin;
  }

  function buildCard(stone) {
    var imgPath = stone.image && (stone.image.card || stone.image.card_jpeg);
    var url = localAsset(imgPath);
    var fk = filterKeyForCategory(stone.category);
    var href = 'stone-detail.html?stone=' + encodeURIComponent(stone.id);
    var sw = '<div class="card__swatch" style="background-image:url(\'' + escAttr(url) + '\');background-size:cover;background-position:center;"></div>';
    var badge = '<span class="card-badge">' + escAttr(stone.category) + '</span>';
    var title = '<h3 class="card__title">' + escAttr(stone.name) + '</h3>';
    var tag = '<div class="card__tags"><span class="card__tag">' + escAttr(originTag(stone.origin)) + '</span></div>';
    var btn = '<a class="btn-outline" href="' + escAttr(href) + '">View Details</a>';
    var wrap = document.createElement('div');
    wrap.className = 'card product-card';
    wrap.setAttribute('data-category', fk);
    wrap.setAttribute('role', 'listitem');
    wrap.innerHTML = sw + '<div class="card__body">' + badge + title + tag + btn + '</div>';
    return wrap;
  }

  function wireFilters() {
    var filterButtons = document.querySelectorAll('.filter-bar .filter-btn');

    function applyFilter(filter) {
      var cards = document.querySelectorAll('#catalog-grid .product-card');
      cards.forEach(function (card) {
        var show = filter === 'all' || card.getAttribute('data-category') === filter;
        card.style.display = show ? 'block' : 'none';
      });
    }

    filterButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterButtons.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        applyFilter(btn.getAttribute('data-filter'));
      });
    });
  }

  function showStatus(msg, isError) {
    var el = document.getElementById('catalog-status');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    if (isError) el.style.color = '#8b2942';
    else el.style.color = '';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var grid = document.getElementById('catalog-grid');
    if (!grid) return;

    fetch('data/stones.json')
      .then(function (r) {
        if (!r.ok) throw new Error('Could not load data/stones.json (' + r.status + ')');
        return r.json();
      })
      .then(function (rows) {
        var list = rows.filter(function (s) {
          return CATALOG_CATEGORIES.indexOf(s.category) >= 0;
        });

        if (!list.length) {
          grid.innerHTML = '';
          grid.setAttribute('aria-busy', 'false');
          showStatus('No catalogue stones found. Run scripts/extract-stones.py and ensure data/stones.json exists.', true);
          return;
        }

        list.sort(function (a, b) {
          return (a.category + a.name).localeCompare(b.category + b.name);
        });

        grid.innerHTML = '';
        list.forEach(function (stone) {
          grid.appendChild(buildCard(stone));
        });

        grid.setAttribute('aria-busy', 'false');
        grid.classList.add('visible');
        wireFilters();

        var pref = new URLSearchParams(window.location.search).get('filter');
        if (pref) {
          var allowed = { all: 1, granite: 1, marble: 1, finish: 1 };
          if (allowed[pref]) {
            document.querySelectorAll('.filter-bar .filter-btn').forEach(function (b) {
              if (b.getAttribute('data-filter') === pref) b.click();
            });
          }
        }
      })
      .catch(function (err) {
        grid.innerHTML = '';
        grid.setAttribute('aria-busy', 'false');
        showStatus('Failed to load catalogue: ' + err.message, true);
      });
  });
})();
