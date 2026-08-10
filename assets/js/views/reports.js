/* 日报 / 周报生成 */
(function (A) {
  'use strict';

  var st = { mode: 'day', day: A.today(), text: '', dirty: false };

  function dailyText(day) {
    var S = A.store;
    var done = S.doneOn(day);
    var logs = S.sitelogs().filter(function (l) { return A.dkey(l.createdAt) === day; });
    var notes = S.notes().filter(function (n) { return A.dkey(n.createdAt) === day; });
    var docs = S.docs().filter(function (d) { return A.dkey(d.createdAt) === day; });
    var tomorrow = S.sortTodos(S.todos().filter(function (t) {
      return t.status !== 'done' && t.status !== 'cancel' && t.due <= A.addDays(day, 1);
    })).slice(0, 6);
    var meeting = notes.filter(function (n) { return n.source === 'meeting'; });

    var L = [];
    L.push('【工作日报】' + A.fmtDate(day, true));
    L.push('汇报人：' + (S.state().settings.userName || ''));
    L.push('');
    L.push('一、今日完成（' + done.length + ' 项）');
    if (done.length) done.forEach(function (t, i) {
      L.push((i + 1) + '. ' + t.title + ((t.projectIds || []).length ? '【' + t.projectIds.map(function (p) { return S.projectName(p); }).join('/') + '】' : ''));
    });
    else L.push('（无）');

    L.push('');
    L.push('二、现场情况（' + logs.length + ' 条）');
    if (logs.length) logs.forEach(function (l, i) {
      L.push((i + 1) + '. [' + A.LOGTYPE[l.type] + '] ' + S.projectName(l.projectId) + '：' + (l.text || '').slice(0, 60));
    });
    else L.push('（无）');

    if (meeting.length) {
      L.push('');
      L.push('三、会议与交办');
      meeting.forEach(function (n, i) { L.push((i + 1) + '. ' + n.text.slice(0, 80)); });
    }

    if (docs.length) {
      L.push('');
      L.push('四、文档归档');
      docs.forEach(function (d, i) { L.push((i + 1) + '. ' + d.name + '（' + S.projectName(d.projectId) + '）'); });
    }

    L.push('');
    L.push('五、明日计划');
    if (tomorrow.length) tomorrow.forEach(function (t, i) {
      L.push((i + 1) + '. ' + t.title + '（' + A.PRIO[t.priority] + '，' + A.humanDate(t.due) + '到期）');
    });
    else L.push('（暂无）');

    var over = S.overdue();
    if (over.length) {
      L.push('');
      L.push('六、需要协调/风险');
      over.slice(0, 5).forEach(function (t, i) {
        L.push((i + 1) + '. ' + t.title + ' —— 已逾期 ' + (-A.diffDays(t.due, A.today())) + ' 天');
      });
    }
    return L.join('\n');
  }

  function weeklyText(day) {
    var S = A.store, w = A.weekRange(day);
    var done = S.todos().filter(function (t) { return t.status === 'done' && t.doneAt && A.inRange(A.dkey(t.doneAt), w.start, w.end); });
    var logs = S.sitelogs().filter(function (l) { return A.inRange(A.dkey(l.createdAt), w.start, w.end); });
    var surveys = logs.filter(function (l) { return l.type === 'survey'; });
    var issues = logs.filter(function (l) { return l.type === 'issue'; });
    var cmGot = 0;
    S.commissions().forEach(function (c) {
      (c.received || []).forEach(function (r) { if (A.inRange(r.date, w.start, w.end)) cmGot += Number(r.amt || 0); });
    });

    var L = [];
    L.push('【工作周报】' + A.fmtDate(w.start) + ' - ' + A.fmtDate(w.end));
    L.push('汇报人：' + (S.state().settings.userName || ''));
    L.push('');
    L.push('一、本周数据');
    L.push('· 完成待办：' + done.length + ' 项');
    L.push('· 现场记录：' + logs.length + ' 条（其中勘察 ' + surveys.length + ' 次，问题 ' + issues.length + ' 条）');
    L.push('· 提成到账：' + A.money(cmGot));
    L.push('');
    L.push('二、项目进展');
    S.projects().forEach(function (p) {
      var pd = done.filter(function (t) { return (t.projectIds || []).indexOf(p.id) >= 0; });
      var pl = logs.filter(function (l) { return l.projectId === p.id; });
      if (!pd.length && !pl.length) return;
      L.push('▍' + p.name + '（' + A.stageName(p.stage) + '）');
      pd.forEach(function (t) { L.push('  - 已完成：' + t.title); });
      pl.forEach(function (l) { L.push('  - ' + A.LOGTYPE[l.type] + '：' + (l.text || '').slice(0, 50)); });
      if (p.next) L.push('  - 下一步：' + p.next);
    });
    L.push('');
    L.push('三、下周重点');
    var next = S.sortTodos(S.todos().filter(function (t) {
      return t.status !== 'done' && t.status !== 'cancel' && t.due <= A.addDays(w.end, 7);
    })).slice(0, 8);
    next.forEach(function (t, i) {
      L.push((i + 1) + '. ' + t.title + '（' + A.PRIO[t.priority] + '，' + A.fmtDate(t.due) + '前）');
    });
    var risk = S.projects().filter(function (p) { return p.status !== 'normal'; });
    if (risk.length) {
      L.push('');
      L.push('四、风险与协调');
      risk.forEach(function (p) { L.push('· ' + p.name + '：' + (p.status === 'risk' ? '有风险' : '已停滞') + (p.next ? '，' + p.next : '')); });
    }
    return L.join('\n');
  }

  function gen() { return st.mode === 'day' ? dailyText(st.day) : weeklyText(st.day); }

  A.views = A.views || {};
  A.views.reports = {
    title: '日报 / 周报',
    sub: function () { return '一键汇总工作内容，复制发给老板'; },
    render: function () {
      if (!st.dirty) st.text = gen();
      var w = A.weekRange(st.day);
      return '<div class="filters">' +
        '<div class="seg" data-m><button data-v="day" class="' + (st.mode === 'day' ? 'on' : '') + '">日报</button>' +
        '<button data-v="week" class="' + (st.mode === 'week' ? 'on' : '') + '">周报</button></div>' +
        '<input class="inp" type="date" value="' + st.day + '" data-day style="width:auto">' +
        '<span class="small muted">' + (st.mode === 'day' ? A.fmtDate(st.day, true) : A.fmtDate(w.start) + ' 至 ' + A.fmtDate(w.end)) + '</span>' +
        '<span style="flex:1"></span>' +
        '<button class="btn btn-sm" data-regen>重新生成</button>' +
        '<button class="btn btn-sm btn-primary" data-copy>复制内容</button></div>' +
        '<div class="card" style="padding:14px">' +
        '<textarea class="ta" data-text style="min-height:460px;font-size:13.5px;line-height:1.85;border:none;padding:0">' + A.esc(st.text) + '</textarea>' +
        '</div>' +
        '<div class="small muted mt10">内容可直接编辑后复制，粘贴到微信 / 邮件发送。</div>';
    },
    mount: function (root) {
      A.on(root, 'click', '[data-m] button', function (e, b) { st.mode = b.getAttribute('data-v'); st.dirty = false; A.render(); });
      var dd = A.$('[data-day]', root);
      if (dd) dd.onchange = function () { st.day = dd.value; st.dirty = false; A.render(); };
      var ta = A.$('[data-text]', root);
      ta.addEventListener('input', function () { st.text = ta.value; st.dirty = true; });
      A.$('[data-regen]', root).onclick = function () { st.dirty = false; A.render(); A.toast('已重新生成'); };
      A.$('[data-copy]', root).onclick = function () {
        A.copy(ta.value).then(function (ok) { A.toast(ok ? '已复制到剪贴板' : '复制失败，请手动选择', ok ? 'ok' : 'warn'); });
      };
    }
  };

})(window.App);
