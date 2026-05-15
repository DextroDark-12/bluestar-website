(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var buttons = document.querySelectorAll('.gallery-tabs .filter-btn');
    var items   = document.querySelectorAll('.gallery-item');

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        buttons.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');

        var filter = btn.getAttribute('data-filter');

        items.forEach(function (item) {
          item.style.display =
            filter === 'all' || item.getAttribute('data-category') === filter
              ? 'block'
              : 'none';
        });
      });
    });
  });

})();