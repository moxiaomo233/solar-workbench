/* 数据层：localStorage 持久化 + 跨标签页/多端实时同步 + 业务查询 */
(function (A) {
  'use strict';

  var KEY = 'pv_workbench_v1';
  var subs = [];
  var S = emptyState(); // 安全默认值：load() 之前也不会因 null 报错

  var Store = A.store = {};

  /* ---------- 基础 ---------- */
  function emptyState() {
    return {
      version: 1, todos: [], notes: [], projects: [], contacts: [],
      sitelogs: [], docs: [], commissions: [], plans: {},
      settings: { userName: '我', yearTarget: 300000, dnd: { on: true, from: '22:00', to: '08:00' }, commissionLock: '', lockOn: false, seeded: false }
    };
  }

  Store.load = function () {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { }
    if (raw) {
      try { S = JSON.parse(raw); } catch (e) { S = null; }
    } else {
      S = null; // 没有存储数据 → 走种子逻辑
    }
    if (!S || !S.projects) {
      S = A.buildSeed ? A.buildSeed() : emptyState();
      Store.save(true);
    }
    // 兼容字段
    var d = emptyState();
    Object.keys(d).forEach(function (k) { if (S[k] === undefined) S[k] = d[k]; });
    return S;
  };

  Store.state = function () { return S || Store.load(); };

  Store.save = function (silent) {
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
    } catch (e) {
      A.toast && A.toast('本地存储空间不足，请清理部分图片附件', 'warn');
    }
    if (!silent) notify();
  };

  function notify() { subs.forEach(function (f) { try { f(S); } catch (e) { console.error(e); } }); }
  Store.subscribe = function (fn) { subs.push(fn); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; };
  Store.commit = function (fn) { fn(S); Store.save(); };

  // 多端/多标签页同步
  window.addEventListener('storage', function (e) {
    if (e.key === KEY && e.newValue) {
      try { S = JSON.parse(e.newValue); notify(); A.toast && A.toast('已同步其他设备的更新'); } catch (err) { }
    }
  });

  Store.reset = function () {
    S = A.buildSeed(); Store.save();
  };
  Store.clearAll = function () {
    S = emptyState(); S.settings.seeded = true; Store.save();
  };
  Store.exportJSON = function () { return JSON.stringify(S, null, 2); };
  Store.importJSON = function (txt) {
    var o = JSON.parse(txt);
    if (!o || typeof o !== 'object') throw new Error('格式错误');
    S = o; Store.save(); return true;
  };

  /* ---------- 项目 ---------- */
  Store.projects = function () { return S.projects; };
  Store.project = function (id) { return S.projects.filter(function (p) { return p.id === id; })[0]; };
  Store.projectName = function (id) { var p = Store.project(id); return p ? (p.short || p.name) : ''; };
  Store.saveProject = function (p) {
    p.updatedAt = new Date().toISOString();
    var i = S.projects.findIndex(function (x) { return x.id === p.id; });
    if (i < 0) { p.id = p.id || A.uid('prj'); p.createdAt = p.createdAt || p.updatedAt; S.projects.unshift(p); }
    else S.projects[i] = p;
    Store.save(); return p;
  };
  Store.removeProject = function (id) {
    S.projects = S.projects.filter(function (p) { return p.id !== id; });
    Store.save();
  };
  Store.staleProjects = function () {
    return S.projects.filter(function (p) {
      return ['grid', 'om'].indexOf(p.stage) < 0 && A.diffDays(A.today(), A.dkey(p.updatedAt)) > 7;
    });
  };

  /* ---------- 待办 ---------- */
  Store.todos = function () { return S.todos; };
  Store.todo = function (id) { return S.todos.filter(function (t) { return t.id === id; })[0]; };
  Store.saveTodo = function (t) {
    var i = S.todos.findIndex(function (x) { return x.id === t.id; });
    if (i < 0) {
      t.id = t.id || A.uid('td');
      t.createdAt = t.createdAt || new Date().toISOString();
      t.order = S.todos.length + 1;
      t.status = t.status || 'todo';
      S.todos.push(t);
    } else S.todos[i] = t;
    touchProjects(t.projectIds);
    Store.save(); return t;
  };
  Store.setTodoStatus = function (id, st) {
    var t = Store.todo(id); if (!t) return;
    t.status = st;
    t.doneAt = st === 'done' ? new Date().toISOString() : '';
    // 同步今日计划勾选
    Object.keys(S.plans).forEach(function (k) {
      (S.plans[k].items || []).forEach(function (it) { if (it.todoId === id) it.done = (st === 'done'); });
    });
    touchProjects(t.projectIds);
    Store.save();
  };
  Store.removeTodo = function (id) { S.todos = S.todos.filter(function (t) { return t.id !== id; }); Store.save(); };

  function touchProjects(ids) {
    (ids || []).forEach(function (pid) {
      var p = Store.project(pid); if (p) p.updatedAt = new Date().toISOString();
    });
  }
  Store.touchProjects = touchProjects;

  // 优先级权重 × 紧迫度 综合排序
  var PW = { P0: 100, P1: 60, P2: 30 };
  Store.todoScore = function (t) {
    var days = A.diffDays(t.due, A.today());
    var urg = days < 0 ? 120 + Math.min(-days, 30) * 3 : (days === 0 ? 90 : Math.max(0, 70 - days * 8));
    var boss = t.source === 'boss' ? 25 : 0;
    return (PW[t.priority] || 30) + urg + boss;
  };
  Store.sortTodos = function (list) {
    return list.slice().sort(function (a, b) {
      var d = Store.todoScore(b) - Store.todoScore(a);
      if (d !== 0) return d;
      return (a.order || 0) - (b.order || 0);
    });
  };
  // 某天应显示的待办：截止日 <= 该日 且 未完成/未取消（到期后一直显示）
  Store.todosOn = function (day) {
    return S.todos.filter(function (t) {
      if (t.status === 'done' || t.status === 'cancel') return false;
      return t.due <= day;
    });
  };
  Store.overdue = function () {
    var T = A.today();
    return S.todos.filter(function (t) {
      return t.status !== 'done' && t.status !== 'cancel' && t.due < T;
    });
  };
  Store.doneOn = function (day) {
    return S.todos.filter(function (t) { return t.status === 'done' && t.doneAt && A.dkey(t.doneAt) === day; });
  };

  /* ---------- 随手记 ---------- */
  Store.notes = function () { return S.notes.slice().sort(function (a, b) { return b.createdAt < a.createdAt ? -1 : 1; }); };
  Store.note = function (id) { return S.notes.filter(function (n) { return n.id === id; })[0]; };
  Store.saveNote = function (n) {
    var i = S.notes.findIndex(function (x) { return x.id === n.id; });
    if (i < 0) {
      n.id = n.id || A.uid('nt');
      n.createdAt = n.createdAt || new Date().toISOString();
      n.status = n.status || 'raw';
      S.notes.unshift(n);
    } else S.notes[i] = n;
    Store.save(); return n;
  };
  Store.removeNote = function (id) { S.notes = S.notes.filter(function (n) { return n.id !== id; }); Store.save(); };
  Store.rawNotes = function () { return Store.notes().filter(function (n) { return n.status === 'raw'; }); };

  /* ---------- 联系人 ---------- */
  Store.contacts = function () { return S.contacts; };
  Store.contact = function (id) { return S.contacts.filter(function (c) { return c.id === id; })[0]; };
  Store.saveContact = function (c) {
    var i = S.contacts.findIndex(function (x) { return x.id === c.id; });
    if (i < 0) { c.id = c.id || A.uid('ct'); c.lastContact = c.lastContact || new Date().toISOString(); S.contacts.unshift(c); }
    else S.contacts[i] = c;
    Store.save(); return c;
  };
  Store.removeContact = function (id) { S.contacts = S.contacts.filter(function (c) { return c.id !== id; }); Store.save(); };
  Store.touchContact = function (id) {
    var c = Store.contact(id); if (c) { c.lastContact = new Date().toISOString(); Store.save(); }
  };
  Store.coldOwners = function () {
    return S.contacts.filter(function (c) {
      return c.role === 'owner' && A.diffDays(A.today(), A.dkey(c.lastContact)) > 30;
    });
  };

  /* ---------- 现场速记 ---------- */
  Store.sitelogs = function () { return S.sitelogs.slice().sort(function (a, b) { return b.createdAt < a.createdAt ? -1 : 1; }); };
  Store.saveSitelog = function (l) {
    var i = S.sitelogs.findIndex(function (x) { return x.id === l.id; });
    if (i < 0) { l.id = l.id || A.uid('sl'); l.createdAt = l.createdAt || new Date().toISOString(); S.sitelogs.unshift(l); }
    else S.sitelogs[i] = l;
    touchProjects([l.projectId]);
    Store.save(); return l;
  };
  Store.removeSitelog = function (id) { S.sitelogs = S.sitelogs.filter(function (l) { return l.id !== id; }); Store.save(); };

  /* ---------- 文档 ---------- */
  Store.docs = function () { return S.docs; };
  Store.saveDoc = function (d) {
    var i = S.docs.findIndex(function (x) { return x.id === d.id; });
    if (i < 0) { d.id = d.id || A.uid('dc'); d.createdAt = d.createdAt || new Date().toISOString(); S.docs.unshift(d); }
    else S.docs[i] = d;
    touchProjects([d.projectId]);
    Store.save(); return d;
  };
  Store.removeDoc = function (id) { S.docs = S.docs.filter(function (d) { return d.id !== id; }); Store.save(); };
  Store.expiringDocs = function () {
    var T = A.today();
    return S.docs.filter(function (d) {
      if (!d.expireDate) return false;
      var n = A.diffDays(d.expireDate, T);
      return n <= 30;
    }).sort(function (a, b) { return a.expireDate < b.expireDate ? -1 : 1; });
  };

  /* ---------- 提成 ---------- */
  Store.commissions = function () { return S.commissions; };
  Store.cmReceived = function (c) { return (c.received || []).reduce(function (s, r) { return s + Number(r.amt || 0); }, 0); };
  Store.cmStatus = function (c) {
    var got = Store.cmReceived(c);
    if (got <= 0) return 'none';
    if (got >= Number(c.expect || 0)) return 'clear';
    return 'part';
  };
  Store.saveCommission = function (c) {
    c.status = Store.cmStatus(c);
    var i = S.commissions.findIndex(function (x) { return x.id === c.id; });
    if (i < 0) { c.id = c.id || A.uid('cm'); S.commissions.unshift(c); } else S.commissions[i] = c;
    Store.save(); return c;
  };
  Store.removeCommission = function (id) { S.commissions = S.commissions.filter(function (c) { return c.id !== id; }); Store.save(); };
  Store.cmSummary = function () {
    var now = new Date(), ym = now.getFullYear() + '-' + A.pad(now.getMonth() + 1), yy = '' + now.getFullYear();
    var monthGot = 0, monthWait = 0, yearGot = 0, totalExpect = 0;
    S.commissions.forEach(function (c) {
      totalExpect += Number(c.expect || 0);
      var got = 0;
      (c.received || []).forEach(function (r) {
        got += Number(r.amt || 0);
        if (String(r.date || '').indexOf(ym) === 0) monthGot += Number(r.amt || 0);
        if (String(r.date || '').indexOf(yy) === 0) yearGot += Number(r.amt || 0);
      });
      var rest = Number(c.expect || 0) - got;
      if (rest > 0) monthWait += rest;
    });
    return { monthGot: monthGot, monthWait: monthWait, yearGot: yearGot, totalExpect: totalExpect };
  };

  /* ---------- 今日计划 ---------- */
  Store.plan = function (day) {
    day = day || A.today();
    if (!S.plans[day]) S.plans[day] = { items: [] };
    return S.plans[day];
  };
  Store.savePlan = function (day, plan) { S.plans[day] = plan; Store.save(); };

  /* ---------- 提醒中心 ---------- */
  Store.alerts = function () {
    var T = A.today(), out = [];
    Store.overdue().forEach(function (t) {
      out.push({
        type: 'overdue', level: 'danger', title: t.title,
        sub: '已逾期 ' + (-A.diffDays(t.due, T)) + ' 天' + (t.source === 'boss' ? ' · 老板交办的事项' : ''),
        go: { view: 'todos' }, id: t.id
      });
    });
    S.todos.forEach(function (t) {
      if (t.status === 'done' || t.status === 'cancel') return;
      var n = A.diffDays(t.due, T);
      if (n >= 0 && n <= 1) {
        out.push({
          type: 'due', level: n === 0 ? 'warn' : 'info', title: t.title,
          sub: (t.source === 'boss' ? '老板交代的事项' : (t.status === 'todo' ? '还未开始，请尽快处理' : '正在进行')) + ' · ' + (n === 0 ? '今天到期' : '明天到期'),
          go: { view: 'todos' }, id: t.id
        });
      }
    });
    Store.expiringDocs().forEach(function (d) {
      var n = A.diffDays(d.expireDate, T);
      out.push({
        type: 'doc', level: n <= 7 ? 'warn' : 'info', title: d.name,
        sub: (n < 0 ? '已过期 ' + (-n) + ' 天' : n + ' 天后到期') + ' · ' + (A.DOCTYPE[d.type] || ''),
        go: { view: 'docs' }, id: d.id
      });
    });
    Store.coldOwners().forEach(function (c) {
      out.push({
        type: 'cold', level: 'info', title: c.name + '（' + c.company + '）',
        sub: c.name + ' 已 ' + A.diffDays(T, A.dkey(c.lastContact)) + ' 天未联系，建议维护关系',
        go: { view: 'contacts' }, id: c.id
      });
    });
    Store.staleProjects().forEach(function (p) {
      out.push({
        type: 'stale', level: 'warn', title: p.name,
        sub: '项目已 ' + A.diffDays(T, A.dkey(p.updatedAt)) + ' 天未更新，注意推进',
        go: { view: 'projects' }, id: p.id
      });
    });
    var rank = { danger: 0, warn: 1, info: 2 };
    return out.sort(function (a, b) { return rank[a.level] - rank[b.level]; });
  };

  /* ---------- 全局搜索 ---------- */
  Store.search = function (q) {
    q = String(q || '').trim().toLowerCase();
    if (!q) return [];
    var r = [];
    var hit = function (s) { return String(s || '').toLowerCase().indexOf(q) >= 0; };
    S.todos.forEach(function (t) { if (hit(t.title) || hit(t.note)) r.push({ k: '待办', t: t.title, s: A.humanDate(t.due), view: 'todos', id: t.id }); });
    S.notes.forEach(function (n) { if (hit(n.text)) r.push({ k: '随手记', t: n.text.slice(0, 40), s: A.relTime(n.createdAt), view: 'notes', id: n.id }); });
    S.projects.forEach(function (p) { if (hit(p.name) || hit(p.owner) || hit(p.next)) r.push({ k: '项目', t: p.name, s: A.stageName(p.stage), view: 'project', id: p.id }); });
    S.contacts.forEach(function (c) { if (hit(c.name) || hit(c.company) || hit(c.phone)) r.push({ k: '联系人', t: c.name + ' · ' + c.company, s: c.phone, view: 'contacts', id: c.id }); });
    S.docs.forEach(function (d) { if (hit(d.name) || hit(d.fileName)) r.push({ k: '文档', t: d.name, s: Store.projectName(d.projectId), view: 'docs', id: d.id }); });
    S.sitelogs.forEach(function (l) { if (hit(l.text)) r.push({ k: '现场记录', t: l.text.slice(0, 40), s: Store.projectName(l.projectId), view: 'sitelogs', id: l.id }); });
    return r.slice(0, 40);
  };

})(window.App);
