(function () {
  'use strict';

  var form    = document.getElementById('contactForm');
  var success = document.getElementById('formSuccess');

  if (!form || !success) return;

  var requiredFields = [
    { el: document.getElementById('fullName'), name: 'Full Name' },
    { el: document.getElementById('phone'),    name: 'Phone' },
    { el: document.getElementById('email'),    name: 'Email' },
    { el: document.getElementById('message'),  name: 'Message' }
  ];

  function getErrorEl (field) {
    return field.parentNode.querySelector('.form-error');
  }

  function validate () {
    var valid = true;

    requiredFields.forEach(function (item) {
      var field = item.el;
      var error = getErrorEl(field);

      if (!field.value.trim()) {
        error.textContent = item.name + ' is required.';
        field.classList.add('form-input--error');
        valid = false;
      } else {
        error.textContent = '';
        field.classList.remove('form-input--error');
      }
    });

    return valid;
  }

  function getSubmitBtn () {
    return form.querySelector('[type="submit"]');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!validate()) return;

    form.reset();
    success.querySelector('.form-success__text').textContent = 'Your inquiry has been sent! We will contact you shortly.';
    form.style.display = 'none';
    success.removeAttribute('hidden');
  });

})();