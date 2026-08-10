/* 待办模块 + 全局复用的待办条目组件 */
(function (A) {
  'use strict';

  /* ============ 待办条目 ============ */
  A.todoItemHTML = function (t, opt) {
    opt = opt || {};
    var S = A.store;
    var over = t.status !== 'done' && t.status !== 'cancel' && t.due < A.today();
    var overN = over ? -A.diffDays(t.due, A.today()) : 0;
    var cls = ['todo', 'p-' + t.priority];
    if (t.source === 'boss') cls.push('src-boss');
    if (over) cls.push('overdue');
    if (t.status === 'done' || t.status === 'cancel') cls.push('done');

    var tags = [];
    tags.push(A.ui.tagPrio(t.priority));
    if (over) tags.push('<span class="tag tag-danger">已逾期' + overN + '天</span>');
    else tags.push('<span class="tag ' + (t.due === A.today() ? 'tag-warn' : '') + '">' + A.humanDate(t.due) + (t.dueTime ? ' ' + t.dueTime : '') + '</span>');
    if (t.status === 'doing') tags.push('<span class="tag tag-info">进行中</span>');
    else if (t.status === 'todo') tags.push('<span class="tag">未开始</span>');
    else if (t.status === 'cancel') tags.push('<span class="tag">已取消</span>');
    if (t.source === 'boss') tags.push('<span class="tag tag-boss">老板交办</span>');
    else if (opt.showSource !== false) tags.push('<span class="tag">' + A.esc(A.SRC[t.source] || '') + '</span>');
    (t.projectIds || []).forEach(function (pid) {
      var n = S.projectName(pid); if (n) tags.push('<span class="tag tag-proj">' + A.esc(n) + '</span>');
    });
    if (t.remind && t.remind.length) tags.push('<span class="tag">🔔</span>');

    var acts = '';
    if (t.status === 'todo') acts += '<button class="mini-btn" data-act="start">开始</button>';
    if (t.status !== 'done') acts += '<button class="mini-btn" data-act="done">已办理</button>';
    acts += '<button class="mini-btn" data-act="menu">···</button>';

    return '<div class="' + cls.join(' ') + '" data-todo="' + t.id + '"' + (opt.draggable ? ' draggable="true"' : '') + '>' +
      (opt.bulk
        ? '<div class="chk' + (opt.checked ? ' on' : '') + '" data-act="check">' + A.svgCheck + '</div>'
        : '<div class="tick' + (t.status === 'done' ? ' on' : '') + '" data-act="toggle">' + A.svgCheck + '</div>') +
      '<div class="t-body"><div class="t-title">' + A.esc(t.title) + '</div>' +
      (t.note ? '<div class="small muted" style="margin-top:3px">' + A.esc(t.note) + '</div>' : '') +
      '<div class="t-meta">' + tags.join('') + '</div></div>' +
      (opt.bulk ? '' : '<div class="t-actions">' + acts + '</div>') +
      '</div>';
  };

  /* 绑定列表交互：点击 / 长按 / 左滑 */
  A.bindTodoList = function (root, opt) {
    opt = opt || {};
    A.on(root, 'click', '[data-todo]', function (e, el) {
      var id = el.getAttribute('data-todo');
      var act = e.target.closest('[data-act]');
      var a = act ? act.getAttribute('data-act') : '';
      if (a === 'check') { opt.onCheck && opt.onCheck(id); return; }
      if (opt.bulk) { opt.onCheck && opt.onCheck(id); return; }
      if (a === 'toggle' || a === 'done') {
        var t = A.store.todo(id);
        A.store.setTodoStatus(id, t && t.status === 'done' ? 'todo' : 'done');
        if (t && t.status !== 'done') A.toast('已办理 ✓', 'ok');
        return;
      }
      if (a === 'start') { A.store.setTodoStatus(id, 'doing'); A.toast('已开始'); return; }
      if (a === 'menu') { A.todoMenu(id); return; }
      A.todoForm(A.store.todo(id));
    });

    // 长按快速改状态
    var timer = null;
    root.addEventListener('touchstart', function (e) {
      var el = e.target.closest('[data-todo]'); if (!el) return;
      timer = setTimeout(function () { A.todoMenu(el.getAttribute('data-todo')); }, 600);
    }, { passive: true });
    ['touchend', 'touchmove', 'touchcancel'].forEach(function (ev) {
      root.addEventListener(ev, function () { clearTimeout(timer); }, { passive: true });
    });

    // 左滑完成
    var sx = 0, sy = 0, cur = null, moved = false;
    root.addEventListener('touchstart', function (e) {
      cur = e.target.closest('[data-todo]');
      if (!cur) return;
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; moved = false;
    }, { passive: true });
    root.addEventListener('touchmove', function (e) {
      if (!cur) return;
      var dx = e.touches[0].clientX - sx, dy = e.touches[0].clientY - sy;
      if (Math.abs(dy) > Math.abs(dx)) { cur = null; return; }
      if (dx < 0) { moved = true; cur.style.transform = 'translateX(' + Math.max(dx, -110) + 'px)'; cur.style.transition = 'none'; }
    }, { passive: true });
    root.addEventListener('touchend', function () {
      if (!cur) return;
      var m = /translateX\((-?\d+(?:\.\d+)?)px\)/.exec(cur.style.transform || '');
      var dx = m ? parseFloat(m[1]) : 0;
      cur.style.transition = '.2s'; cur.style.transform = '';
      if (moved && dx < -70) {
        var id = cur.getAttribute('data-todo');
        A.store.setTodoStatus(id, 'done'); A.toast('已办理 ✓', 'ok');
      }
      cur = null;
    }, { passive: true });
  };

  /* ============ 更多菜单 ============ */
  A.todoMenu = function (id) {
    var t = A.store.todo(id); if (!t) return;
    var body = '<div class="pills" style="flex-direction:column;align-items:stretch;gap:8px">' +
      ['todo', 'doing', 'done', 'cancel'].map(function (s) {
        return '<button class="btn' + (t.status === s ? ' btn-primary' : '') + ' btn-block" data-st="' + s + '">' +
          (s === 'cancel' ? '作废（已取消）' : (s === 'done' ? '已办理（已完成）' : A.STATUS[s])) + '</button>';
      }).join('') +
      '</div><div class="divider"></div>' +
      '<div class="row2"><button class="btn" data-post="1">推迟到明天</button><button class="btn" data-post="7">推迟一周</button></div>' +
      '<div class="mt10"><button class="btn btn-block" data-edit>编辑详情</button></div>' +
      '<div class="mt10"><button class="btn btn-danger btn-block" data-del>删除待办</button></div>';

    A.modal({
      title: t.title, body: body, footer: '<button class="btn" data-close>关闭</button>',
      onMount: function (m, close) {
        A.$$('[data-st]', m).forEach(function (b) {
          b.onclick = function () { A.store.setTodoStatus(id, b.getAttribute('data-st')); close(); A.toast('状态已更新'); };
        });
        A.$$('[data-post]', m).forEach(function (b) {
          b.onclick = function () {
            var t2 = A.store.todo(id);
            t2.due = A.addDays(A.today(), +b.getAttribute('data-post'));
            A.store.saveTodo(t2); close(); A.toast('已改期至 ' + A.fmtDate(t2.due, true));
          };
        });
        A.$('[data-edit]', m).onclick = function () { close(); A.todoForm(A.store.todo(id)); };
        A.$('[data-del]', m).onclick = function () {
          close();
          A.confirm({ title: '删除待办', text: '删除后不可恢复，确定删除？', okText: '删除', danger: true }).then(function (ok) {
            if (ok) { A.store.removeTodo(id); A.toast('已删除'); }
          });
        };
      }
    });
  };

  /* ============ 新建/编辑表单 ============ */
  A.todoForm = function (todo, defaults, onSaved) {
    var isNew = !todo;
    var t = todo ? A.clone(todo) : Object.assign({
      title: '', source: 'self', projectIds: [], priority: 'P1', due: A.today(), dueTime: '',
      status: 'todo', remind: ['d0'], note: ''
    }, defaults || {});

    var projDict = {}; A.store.projects().forEach(function (p) { projDict[p.id] = p.short || p.name; });

    var body =
      A.f.field('事项内容', '<textarea class="ta" name="title" rows="2" placeholder="例如：把平湖项目接入方案发给业主确认" data-autofocus>' + A.esc(t.title) + '</textarea>', true) +
      '<div class="row2">' +
      A.f.field('优先级', A.f.pills('priority', A.PRIO, t.priority), true) +
      A.f.field('来源', A.f.select('source', A.SRC, t.source), true) +
      '</div>' +
      A.f.field('截止日期', '<div class="row2"><input class="inp" type="date" name="due" value="' + A.esc(t.due) + '">' +
        '<input class="inp" type="time" name="dueTime" value="' + A.esc(t.dueTime || '') + '"></div>' +
        '<div class="pills mt6"><span class="pill" data-quick="0">今天</span><span class="pill" data-quick="1">明天</span>' +
        '<span class="pill" data-quick="2">后天</span><span class="pill" data-quick="7">下周</span></div>', true) +
      A.f.field('关联项目（可多选）', Object.keys(projDict).length ? A.f.multiPills('projectIds', projDict, t.projectIds || []) : '<div class="muted small">暂无项目</div>') +
      A.f.field('提醒设置', A.f.multiPills('remind', { d0: '到期当天', d1: '提前1天', d3: '提前3天' }, t.remind || [])) +
      A.f.field('备注', A.f.textarea('note', t.note, '补充说明…', 2)) +
      (isNew ? '' : A.f.field('状态', A.f.pills('status', A.STATUS, t.status)));

    A.modal({
      title: isNew ? '新建待办' : '编辑待办',
      body: body,
      footer: '<button class="btn" data-close>取消</button><button class="btn btn-primary" data-save>保存</button>',
      onMount: function (m, close) {
        A.f.bindPills(m);
        A.$$('[data-quick]', m).forEach(function (b) {
          b.onclick = function () {
            A.$('input[name=due]', m).value = A.addDays(A.today(), +b.getAttribute('data-quick'));
            A.$$('[data-quick]', m).forEach(function (x) { x.classList.remove('on'); });
            b.classList.add('on');
          };
        });
        A.$('[data-save]', m).onclick = function () {
          var v = A.f.read(m);
          if (!String(v.title || '').trim()) { A.toast('请填写事项内容', 'warn'); return; }
          if (!v.due) { A.toast('请选择截止日期', 'warn'); return; }
          Object.assign(t, {
            title: v.title.trim(), priority: v.priority || 'P1', source: v.source,
            due: v.due, dueTime: v.dueTime || '', projectIds: v.projectIds || [],
            remind: v.remind || [], note: v.note || ''
          });
          if (!isNew && v.status) { 
            if (v.status !== t.status) { t.status = v.status; t.doneAt = v.status === 'done' ? new Date().toISOString() : ''; }
          }
          A.store.saveTodo(t);
          if (onSaved) onSaved(t);
          close(); A.toast(isNew ? '待办已创建' : '已保存', 'ok');
        };
      }
    });
  };

  /* ============ 视图 ============ */
  var st = { scope: 'day', day: A.today(), status: '', source: '', q: '', manual: false, bulk: false, sel: {} };

  function filtered() {
    var all = A.store.todos();
    var list;
    if (st.scope === 'day') {
      list = all.filter(function (t) {
        if (t.status === 'done' || t.status === 'cancel') return false;
        return t.due <= st.day;
      });
    } else if (st.scope === 'week') {
      var w = A.weekRange(A.today());
      list = all.filter(function (t) { return t.status !== 'done' && t.status !== 'cancel' && t.due <= w.end; });
    } else if (st.scope === 'overdue') {
      list = A.store.overdue();
    } else if (st.scope === 'done') {
      list = all.filter(function (t) { return t.status === 'done' || t.status === 'cancel'; });
    } else {
      list = all.filter(function (t) { return t.status !== 'done' && t.status !== 'cancel'; });
    }
    if (st.status) list = list.filter(function (t) { return t.status === st.status; });
    if (st.source) list = list.filter(function (t) { return t.source === st.source; });
    if (st.q) {
      var q = st.q.toLowerCase();
      list = list.filter(function (t) { return (t.title + ' ' + (t.note || '')).toLowerCase().indexOf(q) >= 0; });
    }
    return st.manual
      ? list.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); })
      : A.store.sortTodos(list);
  }

  function dateStrip() {
    var h = '<div class="datestrip">';
    for (var i = -2; i <= 8; i++) {
      var d = A.addDays(A.today(), i);
      var n = A.store.todosOn(d).filter(function (t) { return t.due === d; }).length;
      h += '<div class="dchip' + (d === st.day ? ' on' : '') + (d === A.today() ? ' today' : '') + '" data-day="' + d + '">' +
        '<div class="dw">' + (i === 0 ? '今天' : A.weekDay(d)) + '</div>' +
        '<div class="dd">' + A.parseDate(d).getDate() + '</div>' +
        '<div class="dn">' + (n ? '·' + n : '') + '</div></div>';
    }
    return h + '</div>';
  }

  A.views = A.views || {};
  A.views.todos = {
    title: '待办',
    sub: function () {
      var o = A.store.overdue().length;
      return '共 ' + A.store.todos().filter(function (t) { return t.status !== 'done' && t.status !== 'cancel'; }).length + ' 条未完成' + (o ? ' · ' + o + ' 条已逾期' : '');
    },
    render: function () {
      var list = filtered();
      var scopes = { day: '按日期', week: '本周', all: '全部', overdue: '已逾期', done: '已完成' };
      var h = '';

      h += '<div class="filters">' +
        '<div class="seg" data-scope>' + Object.keys(scopes).map(function (k) {
          return '<button data-v="' + k + '" class="' + (st.scope === k ? 'on' : '') + '">' + scopes[k] + '</button>';
        }).join('') + '</div>' +
        '<div class="searchbox"><svg viewBox="0 0 24 24" class="ic"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
        '<input placeholder="搜索待办…" value="' + A.esc(st.q) + '" data-q></div>' +
        '<select class="sel" data-status style="width:auto"><option value="">全部状态</option>' +
        Object.keys(A.STATUS).map(function (k) { return '<option value="' + k + '"' + (st.status === k ? ' selected' : '') + '>' + A.STATUS[k] + '</option>'; }).join('') + '</select>' +
        '<select class="sel" data-source style="width:auto"><option value="">全部来源</option>' +
        Object.keys(A.SRC).map(function (k) { return '<option value="' + k + '"' + (st.source === k ? ' selected' : '') + '>' + A.SRC[k] + '</option>'; }).join('') + '</select>' +
        '<button class="btn btn-sm" data-sort>' + (st.manual ? '↕ 手动排序中' : '⇅ 智能排序') + '</button>' +
        '<button class="btn btn-sm' + (st.bulk ? ' btn-primary' : '') + '" data-bulk>批量</button>' +
        '<button class="btn btn-sm btn-primary" data-new>+ 新建</button>' +
        '</div>';

      if (st.scope === 'day') h += '<div class="mb14">' + dateStrip() + '</div>';

      if (st.manual) h += '<div class="small muted mb8">提示：拖动条目可调整顺序（电脑端）</div>';

      h += '<div class="todo-list" data-list>' +
        (list.length ? list.map(function (t) {
          return A.todoItemHTML(t, { bulk: st.bulk, checked: !!st.sel[t.id], draggable: st.manual });
        }).join('') : A.ui.empty('☕', st.scope === 'done' ? '还没有已完成的记录' : '这里空空如也，享受一下'))
        + '</div>';

      if (st.bulk) {
        var n = Object.keys(st.sel).filter(function (k) { return st.sel[k]; }).length;
        h += '<div class="bulkbar"><span class="bb-n">已选 ' + n + ' 项</span>' +
          '<button class="btn" data-b="done">标记已办</button>' +
          '<button class="btn" data-b="today">改期今天</button>' +
          '<button class="btn" data-b="tomorrow">改期明天</button>' +
          '<button class="btn" data-b="p0">设为P0</button>' +
          '<button class="btn" data-b="cancel">作废</button>' +
          '<button class="btn" data-b="del">删除</button></div>';
      }
      return h;
    },
    mount: function (root) {
      A.on(root, 'click', '[data-scope] button', function (e, b) { st.scope = b.getAttribute('data-v'); A.render(); });
      A.on(root, 'click', '[data-day]', function (e, b) { st.day = b.getAttribute('data-day'); A.render(); });
      var q = A.$('[data-q]', root);
      if (q) q.addEventListener('input', A.debounce(function () { st.q = q.value; A.render(); var el = A.$('[data-q]'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 260));
      var ss = A.$('[data-status]', root); if (ss) ss.onchange = function () { st.status = ss.value; A.render(); };
      var sc = A.$('[data-source]', root); if (sc) sc.onchange = function () { st.source = sc.value; A.render(); };
      var so = A.$('[data-sort]', root); if (so) so.onclick = function () { st.manual = !st.manual; A.render(); };
      var bk = A.$('[data-bulk]', root); if (bk) bk.onclick = function () { st.bulk = !st.bulk; st.sel = {}; A.render(); };
      var nb = A.$('[data-new]', root); if (nb) nb.onclick = function () { A.todoForm(null, { due: st.scope === 'day' ? st.day : A.today() }); };

      A.bindTodoList(A.$('[data-list]', root), {
        bulk: st.bulk,
        onCheck: function (id) { st.sel[id] = !st.sel[id]; A.render(); }
      });

      // 批量操作
      A.on(root, 'click', '[data-b]', function (e, b) {
        var ids = Object.keys(st.sel).filter(function (k) { return st.sel[k]; });
        if (!ids.length) { A.toast('请先选择待办', 'warn'); return; }
        var act = b.getAttribute('data-b');
        if (act === 'del') {
          A.confirm({ title: '批量删除', text: '将删除 ' + ids.length + ' 条待办，确定？', okText: '删除', danger: true }).then(function (ok) {
            if (!ok) return;
            ids.forEach(function (id) { A.store.removeTodo(id); });
            st.sel = {}; A.toast('已删除'); A.render();
          });
          return;
        }
        ids.forEach(function (id) {
          var t = A.store.todo(id); if (!t) return;
          if (act === 'done') { A.store.setTodoStatus(id, 'done'); return; }
          if (act === 'cancel') { A.store.setTodoStatus(id, 'cancel'); return; }
          if (act === 'today') t.due = A.today();
          if (act === 'tomorrow') t.due = A.addDays(A.today(), 1);
          if (act === 'p0') t.priority = 'P0';
          A.store.saveTodo(t);
        });
        st.sel = {}; A.toast('批量操作完成', 'ok'); A.render();
      });

      // 拖拽排序
      if (st.manual) {
        var listEl = A.$('[data-list]', root), dragEl = null;
        A.$$('[data-todo]', listEl).forEach(function (el) {
          el.addEventListener('dragstart', function () { dragEl = el; el.classList.add('dragging'); });
          el.addEventListener('dragend', function () {
            el.classList.remove('dragging');
            A.$$('[data-todo]', listEl).forEach(function (x, i) {
              var t = A.store.todo(x.getAttribute('data-todo')); if (t) t.order = i + 1;
            });
            A.store.save();
          });
          el.addEventListener('dragover', function (e) {
            e.preventDefault();
            if (!dragEl || dragEl === el) return;
            var r = el.getBoundingClientRect();
            var after = (e.clientY - r.top) > r.height / 2;
            listEl.insertBefore(dragEl, after ? el.nextSibling : el);
          });
        });
      }
    }
  };

})(window.App);
