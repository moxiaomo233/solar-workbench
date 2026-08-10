/* 应用入口：路由 / 导航 / 快捷键 / 全局交互 */
(function (A) {
  'use strict';

  var ICONS = {
    dashboard: '<path d="M4 13h7V4H4zM13 9h7V4h-7zM13 20h7v-9h-7zM4 20h7v-5H4z"/>',
    todos: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
    notes: '<path d="M4 5a2 2 0 012-2h9l5 5v11a2 2 0 01-2 2H6a2 2 0 01-2-2z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    projects: '<rect x="3" y="4" width="6" height="16" rx="1"/><rect x="10" y="4" width="6" height="10" rx="1"/><rect x="17" y="4" width="4" height="14" rx="1"/>',
    sitelogs: '<path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13" r="3.2"/>',
    contacts: '<path d="M5 3h14v18H5z"/><circle cx="12" cy="10" r="2.6"/><path d="M8 17c1-2 2.4-3 4-3s3 1 4 3"/>',
    docs: '<path d="M4 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2z"/>',
    commission: '<circle cx="12" cy="12" r="9"/><path d="M9 9h6M9 13h6M12 9v8M9.5 6.5L12 9l2.5-2.5"/>',
    reports: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h5M9 8h4"/>',
    me: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20c1.4-3.6 4.2-5.4 7.5-5.4S18.1 16.4 19.5 20"/>'
  };

  var NAV = [
    { g: '工作', items: ['dashboard', 'todos', 'notes'] },
    { g: '业务', items: ['projects', 'sitelogs', 'contacts', 'docs'] },
    { g: '收益与总结', items: ['commission', 'reports'] },
    { g: '', items: ['me'] }
  ];
  var NAME = {
    dashboard: '今日工作台', todos: '待办', notes: '随手记', projects: '项目看板',
    sitelogs: '现场速记', contacts: '通讯录', docs: '文档库', commission: '提成追踪',
    reports: '日报周报', me: '我的'
  };

  var cur = { view: 'dashboard', params: {} };

  function icon(k, cls) { return '<svg viewBox="0 0 24 24" class="ic ' + (cls || '') + '">' + (ICONS[k] || '') + '</svg>'; }

  function badgeOf(v) {
    if (v === 'todos') {
      var n = A.store.todosOn(A.today()).length;
      return n ? n : 0;
    }
    if (v === 'notes') return A.store.rawNotes().length;
    return 0;
  }

  /* ---------- 导航渲染 ---------- */
  function renderNav() {
    var nav = A.$('#sideNav');
    nav.innerHTML = NAV.map(function (g) {
      return (g.g ? '<div class="side-group-t">' + g.g + '</div>' : '') + g.items.map(function (v) {
        var b = badgeOf(v);
        return '<button class="nav-item' + (cur.view === v || (v === 'projects' && cur.view === 'project') ? ' active' : '') + '" data-nav="' + v + '">' +
          icon(v) + '<span>' + NAME[v] + '</span>' + (b ? '<span class="n-badge">' + b + '</span>' : '') + '</button>';
      }).join('');
    }).join('');

    var raw = A.store.rawNotes().length;
    var sum = A.store.cmSummary();
    A.$('#sideQuick').innerHTML =
      '<div class="sq-card" data-nav="notes"><div class="sq-ic" style="background:#f97316">' + icon('notes') + '</div>' +
      '<div><div class="sq-t">待整理</div><div class="sq-v">' + raw + ' 条随手记</div></div></div>' +
      '<div class="sq-card" data-nav="commission"><div class="sq-ic" style="background:#1e3a8a">' + icon('commission') + '</div>' +
      '<div><div class="sq-t">本月已到账</div><div class="sq-v">' + A.moneyShort(sum.monthGot) + '</div></div></div>';

    var tabs = ['dashboard', 'todos', '__add', 'projects', 'me'];
    A.$('#tabbar').innerHTML = tabs.map(function (v) {
      if (v === '__add') return '<button class="tab-item tab-fab" data-quicknote><span class="fabc"><svg viewBox="0 0 24 24" class="ic"><path d="M12 5v14M5 12h14"/></svg></span></button>';
      var b = badgeOf(v);
      return '<button class="tab-item' + (cur.view === v || (v === 'projects' && cur.view === 'project') ? ' active' : '') + '" data-nav="' + v + '">' +
        icon(v) + '<span>' + (v === 'dashboard' ? '首页' : NAME[v]) + '</span>' + (b ? '<span class="n-badge">' + b + '</span>' : '') + '</button>';
    }).join('');

    var al = A.store.alerts().length;
    var bb = A.$('#bellBadge');
    bb.textContent = al > 99 ? '99+' : al;
    bb.classList.toggle('hidden', !al);
  }

  /* ---------- 渲染当前视图 ---------- */
  A.render = function () {
    var v = A.views[cur.view] || A.views.dashboard;
    var page = A.$('#page');
    var sc = page.scrollTop || window.scrollY;
    page.innerHTML = v.render(cur.params) || '';
    A.$('#pageTitle').textContent = typeof v.title === 'function' ? v.title(cur.params) : v.title;
    A.$('#pageSub').textContent = typeof v.sub === 'function' ? v.sub(cur.params) : (v.sub || '');
    if (v.mount) v.mount(page, cur.params);
    renderNav();
    window.scrollTo(0, sc);
    document.title = (typeof v.title === 'function' ? v.title(cur.params) : v.title) + ' · 工作助手';
  };

  A.go = function (view, params) {
    if (!A.views[view]) return;
    cur = { view: view, params: params || {} };
    try { location.hash = '#' + view + (params && params.id ? '/' + params.id : ''); } catch (e) { }
    window.scrollTo(0, 0);
    A.render();
  };

  function fromHash() {
    var h = (location.hash || '').replace(/^#/, '');
    if (!h) return null;
    var p = h.split('/');
    if (!A.views[p[0]]) return null;
    return { view: p[0], params: p[1] ? { id: p[1] } : {} };
  }

  /* ---------- 快速新建菜单 ---------- */
  function quickAddMenu() {
    var items = [
      { k: 'todo', n: '新建待办', d: '3秒创建，只需内容+日期', i: '✅' },
      { k: 'note', n: '随手记', d: '先记下来，之后再整理', i: '📝' },
      { k: 'log', n: '现场速记', d: '勘察 / 进度 / 问题记录', i: '📷' },
      { k: 'project', n: '新建项目', d: '登记一个新项目', i: '🏗' },
      { k: 'contact', n: '新增联系人', d: '业主 / 施工 / 电网', i: '📇' },
      { k: 'doc', n: '上传文档', d: '合同 / 方案 / 报批材料', i: '📁' }
    ];
    A.modal({
      title: '新建',
      body: '<div class="grid g2" style="gap:10px">' + items.map(function (x) {
        return '<div class="card" style="padding:12px;display:flex;gap:10px;align-items:center;cursor:pointer" data-q="' + x.k + '">' +
          '<div class="avatar" style="background:#eef3ff;color:#2563eb;font-size:17px">' + x.i + '</div>' +
          '<div><div class="bold" style="font-size:13.5px">' + x.n + '</div><div class="small muted">' + x.d + '</div></div></div>';
      }).join('') + '</div>',
      footer: null,
      onMount: function (m, close) {
        A.on(m, 'click', '[data-q]', function (e, el) {
          var k = el.getAttribute('data-q'); close();
          setTimeout(function () {
            if (k === 'todo') A.todoForm(null, { due: A.today() });
            if (k === 'note') A.quickNote();
            if (k === 'log') A.sitelogForm(null, {});
            if (k === 'project') A.projectForm(null);
            if (k === 'contact') A.contactForm(null);
            if (k === 'doc') A.docForm(null, {});
          }, 120);
        });
      }
    });
  }

  /* ---------- 全局搜索 ---------- */
  function searchModal() {
    A.modal({
      title: '全局搜索',
      body: '<input class="inp" placeholder="搜索待办 / 随手记 / 项目 / 联系人 / 文档…" data-sq data-autofocus>' +
        '<div class="mt14" data-sr><div class="muted small">输入关键词开始搜索</div></div>',
      footer: null,
      onMount: function (m, close) {
        var inp = A.$('[data-sq]', m), box = A.$('[data-sr]', m);
        inp.addEventListener('input', A.debounce(function () {
          var rs = A.store.search(inp.value);
          if (!inp.value.trim()) { box.innerHTML = '<div class="muted small">输入关键词开始搜索</div>'; return; }
          box.innerHTML = rs.length ? rs.map(function (r) {
            return '<div class="lrow" style="cursor:pointer" data-r="' + r.view + '" data-id="' + r.id + '">' +
              '<span class="tag">' + r.k + '</span><div class="lrow-main"><div class="lrow-t" style="font-weight:500">' + A.esc(r.t) + '</div>' +
              '<div class="lrow-s">' + A.esc(r.s || '') + '</div></div></div>';
          }).join('') : '<div class="muted small">没有找到相关内容</div>';
        }, 200));
        A.on(m, 'click', '[data-r]', function (e, el) {
          var v = el.getAttribute('data-r');
          close();
          A.go(v, v === 'project' ? { id: el.getAttribute('data-id') } : {});
        });
      }
    });
  }

  /* ---------- 到期提醒（模拟推送） ---------- */
  function inDND() {
    var s = A.store.state().settings.dnd || {};
    if (!s.on) return false;
    var now = A.pad(new Date().getHours()) + ':' + A.pad(new Date().getMinutes());
    if (s.from <= s.to) return now >= s.from && now <= s.to;
    return now >= s.from || now <= s.to;
  }

  function pushReminders() {
    if (inDND()) return;
    var over = A.store.overdue();
    var todayList = A.store.todos().filter(function (t) {
      return t.status !== 'done' && t.status !== 'cancel' && t.due === A.today();
    });
    var bossToday = todayList.filter(function (t) { return t.source === 'boss'; });

    setTimeout(function () {
      if (over.length) A.toast('有 ' + over.length + ' 条待办已逾期，请尽快处理', 'warn');
    }, 900);
    setTimeout(function () {
      if (bossToday.length) A.toast('老板交代的 ' + bossToday.length + ' 项事项今天到期', 'warn');
      else if (todayList.length) A.toast('今天有 ' + todayList.length + ' 条待办到期', '');
    }, 2600);
  }

  /* ---------- 启动 ---------- */
  function boot() {
    A.store.load();

    var h = fromHash();
    if (h) cur = h;
    A.render();

    A.store.subscribe(function () { A.render(); });

    window.addEventListener('hashchange', function () {
      var x = fromHash();
      if (x && (x.view !== cur.view || x.params.id !== cur.params.id)) { cur = x; A.render(); }
    });

    // 导航
    document.addEventListener('click', function (e) {
      var n = e.target.closest('[data-nav]');
      if (n) { A.go(n.getAttribute('data-nav')); return; }
      if (e.target.closest('[data-quicknote]')) { A.quickNote(); return; }
    });

    A.$('#btnQuickAdd').onclick = quickAddMenu;
    A.$('#btnSearch').onclick = searchModal;
    A.$('#btnBell').onclick = function () { A.alertCenter(); };
    A.$('#btnSync').onclick = function () { A.sync && A.sync.panel(); };
    A.$('#btnMobileMenu').onclick = function () { A.go('me'); };

    // 快捷键
    document.addEventListener('keydown', function (e) {
      var typing = /INPUT|TEXTAREA|SELECT/.test((e.target.tagName || '')) || e.target.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') { e.preventDefault(); A.quickNote(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchModal(); return; }
      if (typing) return;
      if (e.key === 'n') { A.todoForm(null, { due: A.today() }); e.preventDefault(); }
      if (e.key >= '1' && e.key <= '9') {
        var order = ['dashboard', 'todos', 'notes', 'projects', 'sitelogs', 'contacts', 'docs', 'commission', 'reports'];
        var v = order[+e.key - 1]; if (v) A.go(v);
      }
    });

    // 全局拖拽图片 → 随手记
    var hint = A.$('#dropHint'), dragDepth = 0;
    window.addEventListener('dragenter', function (e) {
      if (!e.dataTransfer || Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') < 0) return;
      dragDepth++; hint.classList.add('on');
    });
    window.addEventListener('dragover', function (e) { e.preventDefault(); });
    window.addEventListener('dragleave', function () { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) hint.classList.remove('on'); });
    window.addEventListener('drop', function (e) {
      e.preventDefault(); dragDepth = 0; hint.classList.remove('on');
      var files = Array.prototype.slice.call((e.dataTransfer || {}).files || []).filter(function (f) { return /^image\//.test(f.type); });
      if (!files.length) return;
      if (cur.view === 'notes' && A.notesAddFiles) { A.notesAddFiles(files); return; }
      Promise.all(files.slice(0, 9).map(function (f) { return A.readImage(f); })).then(function (arr) {
        A.quickNote({ images: arr, source: 'wechat' });
      });
    });

    // 全局粘贴截图 → 随手记
    document.addEventListener('paste', function (e) {
      if (document.querySelector('.mask')) return;
      var t = e.target;
      if (/INPUT|TEXTAREA/.test((t.tagName || ''))) return;
      var items = (e.clipboardData || {}).items || [], files = [];
      for (var i = 0; i < items.length; i++) if (items[i].kind === 'file') files.push(items[i].getAsFile());
      if (!files.length) return;
      Promise.all(files.slice(0, 9).map(function (f) { return A.readImage(f); })).then(function (arr) {
        A.quickNote({ images: arr, source: 'wechat' });
      });
    });

    pushReminders();

    // 云同步
    if (A.sync) { try { A.sync.init(); } catch (e) { console.error(e); } }

    // PWA
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(function () { });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})(window.App);
