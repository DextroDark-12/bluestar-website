(function () {
  'use strict';

  var ALLOWED_RELATED = { Granite: 1, Marble: 1, Finish: 1 };

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

  function applyStone(stone) {
    var titleEl = document.getElementById('detailTitle');
    var typeEl = document.getElementById('detailType');
    var finishEl = document.getElementById('detailFinish');
    var originEl = document.getElementById('detailOrigin');
    var imgEl = document.getElementById('detailMainImg');
    if (!titleEl || !typeEl || !finishEl || !originEl || !imgEl) return;

    titleEl.textContent = stone.name;
    typeEl.textContent = stone.type;
    originEl.textContent = stone.origin;
    finishEl.textContent = stone.finish;

    document.title = stone.name + ' — BlueStar Granite & Marble';

    var u = localAsset(stone.image);
    imgEl.style.backgroundImage = 'url("' + u.replace(/\\/g, '/').replace(/"/g, '\\"') + '")';
  }

  function fromCatalogRow(row) {
    var fin = 'Various';
    if (row.tags && row.tags.length) {
      fin = row.tags.slice(0, 4).join(', ');
    }
    var img = row.image && (row.image.detail || row.image.card || row.image.card_jpeg);
    return {
      name: row.name,
      type: row.category,
      origin: row.origin || '—',
      finish: fin,
      image: img
    };
  }

  function buildRelatedCard(stone) {
    var imgPath = stone.image && (stone.image.card || stone.image.card_jpeg);
    var url = localAsset(imgPath);
    var href = 'stone-detail.html?stone=' + encodeURIComponent(stone.id);
    var sw = '<div class="card__swatch" style="background-image:url(\'' + escAttr(url) + '\');"></div>';
    var badge = '<span class="card-badge">' + escAttr(stone.category) + '</span>';
    var title = '<h3 class="card__title">' + escAttr(stone.name) + '</h3>';
    var btn = '<a class="btn-outline" href="' + escAttr(href) + '" style="margin-top:0.75rem;display:inline-block;">View</a>';
    var wrap = document.createElement('div');
    wrap.className = 'card product-card';
    wrap.setAttribute('role', 'listitem');
    wrap.innerHTML = sw + '<div class="card__body">' + badge + title + btn + '</div>';
    return wrap;
  }

  function fillRelated(rows, excludeId, preferCategory) {
    var el = document.getElementById('related-grid');
    var section = document.querySelector('.stone-detail-related');
    if (!el) return;

    var pool = (rows || []).filter(function (r) {
      if (!ALLOWED_RELATED[r.category]) return false;
      if (excludeId && r.id === excludeId) return false;
      return true;
    });

    pool.sort(function (a, b) {
      var ap = (a.category === preferCategory) ? 0 : 1;
      var bp = (b.category === preferCategory) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });

    var pick = pool.slice(0, 4);
    if (!pick.length) {
      if (section) section.style.display = 'none';
      return;
    }

    el.innerHTML = '';
    pick.forEach(function (s) {
      el.appendChild(buildRelatedCard(s));
    });
  }

  function legacyStone(name) {
    if (name === 'absolute-black') {
      return { name: 'Absolute Black', type: 'Granite', origin: 'Karnataka India', finish: 'Polished/Honed/Brushed', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80' };
    }
    if (name === 'kashmir-gold') {
      return { name: 'Kashmir Gold', type: 'Granite', origin: 'Rajasthan India', finish: 'Polished/Honed', image: 'https://images.unsplash.com/photo-1541123437800-1bb1317badc2?w=800&q=80' };
    }
    if (name === 'imperial-red') {
      return { name: 'Imperial Red', type: 'Granite', origin: 'Tamil Nadu India', finish: 'Polished/Brushed', image: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80' };
    }
    if (name === 'steel-grey') {
      return { name: 'Steel Grey', type: 'Granite', origin: 'Andhra Pradesh India', finish: 'Polished/Honed', image: 'https://images.unsplash.com/photo-1518733057094-95b53143d2a7?w=800&q=80' };
    }
    if (name === 'carrara-white') {
      return { name: 'Carrara White', type: 'Marble', origin: 'Tuscany Italy', finish: 'Polished/Honed', image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80' };
    }
    if (name === 'emperador-brown') {
      return { name: 'Emperador Brown', type: 'Marble', origin: 'Makrana India', finish: 'Polished/Honed/Brushed', image: 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800&q=80' };
    }
    if (name === 'onyx-black') {
      return { name: 'Onyx Black', type: 'Marble', origin: 'Rajasthan India', finish: 'Polished/Honed', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80' };
    }
    if (name === 'rosa-aurora') {
      return { name: 'Rosa Aurora', type: 'Marble', origin: 'Portugal', finish: 'Polished/Honed', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80' };
    }
    if (name === 'arctic-white') {
      return { name: 'Arctic White', type: 'Quartzite', origin: 'Rajasthan India', finish: 'Polished/Honed/Brushed', image: 'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=800&q=80' };
    }
    if (name === 'sea-pearl') {
      return { name: 'Sea Pearl', type: 'Quartzite', origin: 'Brazil', finish: 'Polished/Honed', image: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=800&q=80' };
    }
    if (name === 'teak-wood') {
      return { name: 'Teak Wood', type: 'Sandstone', origin: 'Rajasthan India', finish: 'Natural/Brushed', image: 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800&q=80' };
    }
    if (name === 'buff') {
      return { name: 'Buff', type: 'Sandstone', origin: 'Rajasthan India', finish: 'Natural/Honed', image: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=80' };
    }
    return null;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var raw = new URLSearchParams(window.location.search).get('stone');
    var key = raw ? decodeURIComponent(raw.replace(/\+/g, ' ')).trim() : '';

    if (!key) {
      window.location.replace('products.html');
      return;
    }

    fetch('data/stones.json')
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        var row = null;
        if (Array.isArray(rows)) {
          for (var i = 0; i < rows.length; i++) {
            if (rows[i].id === key) {
              row = rows[i];
              break;
            }
          }
        }

        var stone = row ? fromCatalogRow(row) : legacyStone(key);
        if (!stone) {
          window.location.replace('products.html');
          return;
        }

        applyStone(stone);
        fillRelated(rows, row ? row.id : null, row ? row.category : stone.type);
      })
      .catch(function () {
        var legacy = legacyStone(key);
        if (legacy) {
          applyStone(legacy);
          fillRelated([], null, legacy.type);
        } else {
          window.location.replace('products.html');
        }
      });
  });
})();
