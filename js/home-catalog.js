(function () {
  'use strict';

  var CATALOG_CATEGORIES = ['Granite', 'Marble', 'Finish'];
  var MAX = 6;

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

  function buildCard(stone) {
    var imgPath = stone.image && (stone.image.card || stone.image.card_jpeg);
    var url = localAsset(imgPath);
    var href = 'stone-detail.html?stone=' + encodeURIComponent(stone.id);
    var sw = '<div class="card__swatch" style="background-image:url(\'' + escAttr(url) + '\');"></div>';
    var badge = '<span class="card-badge">' + escAttr(stone.category) + '</span>';
    var title = '<h3 class="card__title">' + escAttr(stone.name) + '</h3>';
    var tag = '<div class="card__tags"><span class="card__tag">' + escAttr(stone.origin || 'Catalogue') + '</span></div>';
    var btn = '<a class="btn-outline" href="' + escAttr(href) + '" style="margin-top:0.75rem;display:inline-block;">View</a>';
    var wrap = document.createElement('div');
    wrap.className = 'card product-card';
    wrap.setAttribute('role', 'listitem');
    wrap.innerHTML = sw + '<div class="card__body">' + badge + title + tag + btn + '</div>';
    return wrap;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var strip = document.getElementById('home-catalog-strip');
    if (!strip) return;

    fetch('data/stones.json')
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        var list = rows.filter(function (s) {
          return CATALOG_CATEGORIES.indexOf(s.category) >= 0;
        });
        list.sort(function (a, b) {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return (a.name || '').localeCompare(b.name || '');
        });
        list.slice(0, MAX).forEach(function (stone) {
          strip.appendChild(buildCard(stone));
        });
        strip.classList.add('visible');
      })
      .catch(function () {});
  });
})();
