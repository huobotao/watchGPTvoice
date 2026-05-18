(function () {
  'use strict';

  // ===== Status bar clock =====
  function tickClock() {
    var el = document.getElementById('statusTime');
    if (!el) return;
    var d = new Date();
    var hh = d.getHours();
    var mm = d.getMinutes();
    el.textContent = hh + ':' + (mm < 10 ? '0' + mm : mm);
  }
  tickClock();
  setInterval(tickClock, 30000);

  // ===== View switching =====
  var views = document.querySelectorAll('.view');
  var tabBar = document.getElementById('tabBar');
  var tabs = document.querySelectorAll('.tab');

  function showView(id, opts) {
    opts = opts || {};
    views.forEach(function (v) { v.classList.toggle('is-active', v.id === id); });

    // Tab bar visible only on main tabs
    var mainViews = ['viewHome', 'viewPay', 'viewSave', 'viewGrow', 'viewProfile'];
    var isMain = mainViews.indexOf(id) >= 0;
    var loginish = id === 'viewLogin';
    tabBar.classList.toggle('hidden', loginish || !!opts.hideTab);

    // Sync tab active state
    if (isMain) {
      tabs.forEach(function (t) {
        t.classList.toggle('is-active', t.getAttribute('data-target') === id);
      });
    }

    // Scroll page-scroll back to top
    var v = document.getElementById(id);
    if (v) {
      var scroll = v.querySelector('.page-scroll');
      if (scroll) scroll.scrollTop = 0;
    }
  }

  // ===== Login / PIN =====
  var pin = '';
  var dots = document.querySelectorAll('#pinDots .dot');
  var keypad = document.getElementById('keypad');
  var pinDel = document.getElementById('pinDel');
  var faceId = document.getElementById('faceId');

  function renderDots() {
    dots.forEach(function (d, i) {
      d.classList.toggle('filled', i < pin.length);
    });
  }

  function onLogin() {
    showView('viewHome');
    // reset pin
    pin = '';
    renderDots();
  }

  if (keypad) {
    keypad.addEventListener('click', function (e) {
      var btn = e.target.closest('.key');
      if (!btn) return;
      if (btn === pinDel) {
        pin = pin.slice(0, -1);
      } else if (btn === faceId) {
        onLogin();
        return;
      } else {
        if (pin.length < 6) pin += (btn.textContent || '').trim();
      }
      renderDots();
      if (pin.length === 6) {
        setTimeout(onLogin, 180);
      }
    });
  }

  // ===== Tab clicks =====
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      var target = t.getAttribute('data-target');
      if (target) showView(target);
    });
  });

  // ===== Account row → detail =====
  var accountTitleEl = document.getElementById('accountTitle');
  var accountAmtEl = document.getElementById('accountAmt');
  document.querySelectorAll('.account-row').forEach(function (row) {
    row.addEventListener('click', function () {
      var name = row.querySelector('.acc-name');
      var amt = row.querySelector('.acc-amt');
      if (accountTitleEl && name) accountTitleEl.textContent = name.textContent;
      if (accountAmtEl && amt) accountAmtEl.textContent = amt.textContent;
      showView('viewAccount', { hideTab: true });
    });
  });

  var backFromAccount = document.getElementById('backFromAccount');
  if (backFromAccount) {
    backFromAccount.addEventListener('click', function () {
      showView('viewHome');
    });
  }

  // ===== Logout =====
  var logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      showView('viewLogin');
    });
  }
})();
