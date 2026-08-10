/* 通用 UI 组件：Toast / Modal / Confirm / Lightbox / 表单片段 */
(function (A) {
  'use strict';

  /* ---------- Toast ---------- */
  A.toast = function (msg, type) {
    var root = A.$('#toast-root'); if (!root) return;
    var el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(function () {
      el.style.transition = '.25s'; el.style.opacity = '0'; el.style.transform = 'translateY(6px)';
      setTimeout(function () { el.remove(); }, 250);
    }, 2100);
  };

  /* ---------- Modal ---------- */
  A.modal = function (opt) {
    opt = opt || {};
    var root = A.$('#modal-root');
    var mask = document.createElement('div');
    mask.className = 'mask';
    mask.innerHTML =
      '<div class="modal' + (opt.wide ? ' wide' : '') + '" role="dialog">' +
      '<div class="modal-head"><h3>' + A.esc(opt.title || '') + '</h3>' +
      '<button class="x-btn" data-close><svg viewBox="0 0 24 24" class="ic"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
      '<div class="modal-body">' + (opt.body || '') + '</div>' +
      (opt.footer === null ? '' : '<div class="modal-foot">' + (opt.footer || '<button class="btn" data-close>关闭</button>') + '</div>') +
      '</div>';
    root.appendChild(mask);

    function close() {
      mask.style.opacity = '0';
      setTimeout(function () { mask.remove(); }, 140);
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);

    mask.addEventListener('click', function (e) {
      if (e.target === mask) return close();
      if (e.target.closest('[data-close]')) close();
    });

    if (opt.onMount) opt.onMount(mask.querySelector('.modal'), close);
    var first = mask.querySelector('[data-autofocus]');
    if (first) setTimeout(function () { first.focus(); }, 60);
    return close;
  };

  /* ---------- Confirm ---------- */
  A.confirm = function (opt) {
    opt = opt || {};
    return new Promise(function (resolve) {
      var done = false;
      var close = A.modal({
        title: opt.title || '请确认',
        body: '<p style="font-size:14px;line-height:1.7;color:var(--ink2)">' + (opt.html || A.esc(opt.text || '')) + '</p>',
        footer: '<button class="btn" data-close>取消</button>' +
          '<button class="btn ' + (opt.danger ? 'btn-warn' : 'btn-primary') + '" data-ok>' + A.esc(opt.okText || '确定') + '</button>',
        onMount: function (m, cl) {
          m.querySelector('[data-ok]').onclick = function () { done = true; resolve(true); cl(); };
          m.addEventListener('click', function (e) {
            if (e.target.closest('[data-close]') && !done) { done = true; resolve(false); }
          });
        }
      });
      void close;
    });
  };

  /* ---------- Lightbox ---------- */
  A.lightbox = function (src) {
    var d = document.createElement('div');
    d.className = 'lightbox';
    d.innerHTML = '<img src="' + src + '" alt="">';
    d.onclick = function () { d.remove(); };
    document.body.appendChild(d);
  };

  /* ---------- 表单片段 ---------- */
  A.f = {};

  A.f.field = function (label, inner, req) {
    return '<div class="field"><label>' + A.esc(label) + (req ? '<span class="req">*</span>' : '') + '</label>' + inner + '</div>';
  };

  A.f.input = function (name, val, ph, type) {
    return '<input class="inp" name="' + name + '" type="' + (type || 'text') + '" value="' + A.esc(val || '') + '" placeholder="' + A.esc(ph || '') + '">';
  };

  A.f.textarea = function (name, val, ph, rows) {
    return '<textarea class="ta" name="' + name + '" rows="' + (rows || 3) + '" placeholder="' + A.esc(ph || '') + '">' + A.esc(val || '') + '</textarea>';
  };

  A.f.select = function (name, dict, val, blank) {
    var h = '<select class="sel" name="' + name + '">';
    if (blank) h += '<option value="">' + A.esc(blank) + '</option>';
    Object.keys(dict).forEach(function (k) {
      h += '<option value="' + A.esc(k) + '"' + (String(val) === String(k) ? ' selected' : '') + '>' + A.esc(dict[k]) + '</option>';
    });
    return h + '</select>';
  };

  function pillOnClass(k) {
    if (k === 'P0' || k === '严重' || k === '拒绝' || k === 'stalled') return 'on-danger';
    if (k === 'P1' || k === '一般' || k === '犹豫' || k === 'risk') return 'on-warn';
    return 'on';
  }
  A.f.pillOnClass = pillOnClass;

  A.f.pills = function (name, dict, val, style) {
    var h = '<div class="pills" data-pills="' + name + '" data-value="' + A.esc(val || '') + '">';
    Object.keys(dict).forEach(function (k) {
      var on = String(val) === String(k);
      h += '<span class="pill' + (on ? ' ' + (style || pillOnClass(k)) : '') + '" data-v="' + A.esc(k) + '">' + A.esc(dict[k]) + '</span>';
    });
    return h + '</div>';
  };

  A.f.multiPills = function (name, dict, vals) {
    vals = vals || [];
    var h = '<div class="pills" data-mpills="' + name + '">';
    Object.keys(dict).forEach(function (k) {
      var on = vals.indexOf(k) >= 0;
      h += '<span class="pill' + (on ? ' on' : '') + '" data-v="' + A.esc(k) + '">' + A.esc(dict[k]) + '</span>';
    });
    return h + '</div>';
  };

  A.f.projectSelect = function (name, val, blank) {
    var dict = {};
    A.store.projects().forEach(function (p) { dict[p.id] = p.name; });
    return A.f.select(name, dict, val, blank === undefined ? '不关联项目' : blank);
  };

  // 在容器内启用胶囊交互，返回读值函数
  A.f.bindPills = function (root) {
    A.$$('[data-pills]', root).forEach(function (g) {
      g.addEventListener('click', function (e) {
        var p = e.target.closest('.pill'); if (!p) return;
        A.$$('.pill', g).forEach(function (x) { x.className = 'pill'; });
        var v = p.getAttribute('data-v');
        p.className = 'pill ' + pillOnClass(v);
        g.setAttribute('data-value', v);
      });
    });
    A.$$('[data-mpills]', root).forEach(function (g) {
      g.addEventListener('click', function (e) {
        var p = e.target.closest('.pill'); if (!p) return;
        p.classList.toggle('on');
      });
    });
  };

  A.f.read = function (root) {
    var o = {};
    A.$$('input[name],select[name],textarea[name]', root).forEach(function (el) {
      if (el.type === 'checkbox') o[el.name] = el.checked;
      else o[el.name] = el.value;
    });
    A.$$('[data-pills]', root).forEach(function (g) { o[g.getAttribute('data-pills')] = g.getAttribute('data-value') || ''; });
    A.$$('[data-mpills]', root).forEach(function (g) {
      o[g.getAttribute('data-mpills')] = A.$$('.pill.on', g).map(function (p) { return p.getAttribute('data-v'); });
    });
    return o;
  };

  /* ---------- 小组件 ---------- */
  A.ui = {};

  A.ui.empty = function (emoji, text, btn) {
    return '<div class="empty"><div class="e-emoji">' + emoji + '</div><div class="e-t">' + A.esc(text) + '</div>' + (btn || '') + '</div>';
  };

  A.ui.ring = function (pct, label, sub, color) {
    pct = Math.max(0, Math.min(100, Math.round(pct || 0)));
    var r = 38, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
    return '<div class="ring"><svg width="92" height="92">' +
      '<circle cx="46" cy="46" r="' + r + '" stroke="#eef1f6" stroke-width="9" fill="none"/>' +
      '<circle cx="46" cy="46" r="' + r + '" stroke="' + (color || '#2563eb') + '" stroke-width="9" fill="none" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/>' +
      '</svg><div class="rv"><b>' + A.esc(label) + '</b><span>' + A.esc(sub || '') + '</span></div></div>';
  };

  A.ui.tagPrio = function (p) {
    return '<span class="tag tag-' + p.toLowerCase() + '">' + A.esc(A.PRIO[p] || p) + '</span>';
  };

  A.ui.stageTag = function (stage) {
    return '<span class="tag" style="background:' + A.stageColor(stage) + '18;color:' + A.stageColor(stage) + ';border-color:' + A.stageColor(stage) + '33">' + A.esc(A.stageName(stage)) + '</span>';
  };

  A.ui.avatar = function (name) {
    var n = String(name || '?');
    var ch = n.length > 2 ? n.slice(n.length - 2) : n;
    return '<div class="avatar" style="background:' + A.colorOf(n) + '">' + A.esc(ch) + '</div>';
  };

  /* ---------- 图片选择器（多图） ---------- */
  A.ui.imagePicker = function (initial) {
    var imgs = (initial || []).slice();
    var api = {
      images: function () { return imgs; },
      html: function () {
        return '<div class="note-imgs" data-imgpicker>' + imgs.map(function (src, i) {
          return '<div class="thumb"><img src="' + src + '" alt=""><button class="del" data-i="' + i + '" type="button">×</button></div>';
        }).join('') + '</div>';
      },
      bind: function (root, onChange) {
        var box = A.$('[data-imgpicker]', root);
        function refresh() {
          box.innerHTML = imgs.map(function (src, i) {
            return '<div class="thumb"><img src="' + src + '" alt=""><button class="del" data-i="' + i + '" type="button">×</button></div>';
          }).join('');
          onChange && onChange(imgs);
        }
        box.addEventListener('click', function (e) {
          var b = e.target.closest('.del'); if (!b) return;
          imgs.splice(+b.getAttribute('data-i'), 1); refresh();
        });
        api.add = function (files) {
          var list = Array.prototype.slice.call(files).filter(function (f) { return /^image\//.test(f.type); });
          if (!list.length) return;
          var todo = list.slice(0, Math.max(0, 9 - imgs.length));
          if (!todo.length) { A.toast('最多 9 张图片', 'warn'); return; }
          Promise.all(todo.map(function (f) { return A.readImage(f); })).then(function (arr) {
            imgs = imgs.concat(arr); refresh();
          });
        };
      }
    };
    return api;
  };

})(window.App);
