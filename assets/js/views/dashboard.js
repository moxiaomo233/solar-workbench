/* 首页仪表盘 */
(function (A) {
  'use strict';

  function greet() {
    var h = new Date().getHours();
    if (h < 6) return '夜深了';
    if (h < 11) return '早上好';
    if (h < 14) return '中午好';
    if (h < 18) return '下午好';
    return '晚上好';
  }

  function planBlock() {
    var day = A.today();
    var plan = A.store.plan(day);
    var items = plan.items || [];
    var doneN = items.filter(function (i) { return i.done; }).length;
    var pct = items.length ? doneN / items.length * 100 : 0;

    var h = '<div class="card" style="padding:14px">' +
      '<div class="flex between center mb14"><h2 style="font-size:15px;font-weight:700">今日计划</h2>' +
      '<button class="btn btn-sm" data-plan-add>+ 选择事项</button></div>' +
      '<div class="ring-wrap"><div>' + A.ui.ring(pct, doneN + '/' + items.length, '完成率', pct >= 100 ? '#16a34a' : '#2563eb') + '</div>' +
      '<div style="flex:1;min-width:0">';

    if (!items.length) {
      h += '<div class="muted small">还没定今天的计划。点击「选择事项」从待办里挑几件今天要推进的事。</div>';
    } else {
      h += '<ul>' + items.map(function (i) {
        return '<li class="flex center gap10" style="padding:5px 0">' +
          '<span class="chk' + (i.done ? ' on' : '') + '" data-plan-toggle="' + i.id + '">' + A.svgCheck + '</span>' +
          '<span style="flex:1;font-size:13.5px;' + (i.done ? 'color:var(--ink3);text-decoration:line-through' : '') + '">' + A.esc(i.text) + '</span>' +
          '<button class="mini-btn" data-plan-del="' + i.id + '">×</button></li>';
      }).join('') + '</ul>';
    }
    h += '<div class="flex gap6 mt10"><input class="inp" placeholder="临时加一条计划，回车确认" data-plan-input style="height:32px"></div>';
    h += '</div></div></div>';
    return h;
  }

  function quickEntries() {
    var raw = A.store.rawNotes();
    var running = A.store.projects().filter(function (p) { return ['dev', 'filing', 'build'].indexOf(p.stage) >= 0; }).length;
    var w = A.weekRange(A.today());
    var wDone = A.store.todos().filter(function (t) { return t.status === 'done' && t.doneAt && A.inRange(A.dkey(t.doneAt), w.start, w.end); }).length;
    var wAll = A.store.todos().filter(function (t) { return A.inRange(t.due, w.start, w.end) || (t.status === 'done' && t.doneAt && A.inRange(A.dkey(t.doneAt), w.start, w.end)); }).length;

    return '<div class="grid g3 keep2">' +
      '<div class="card" style="padding:13px;cursor:pointer" data-go="notes">' +
      '<div class="flex between center"><div class="s-t muted small">随手记 · 待整理</div><span class="tag tag-warn">' + raw.length + '</span></div>' +
      '<div style="margin-top:7px;font-size:12.5px;color:var(--ink2);line-height:1.5;min-height:34px">' +
      (raw.length ? raw.slice(0, 3).map(function (n) { return '· ' + A.esc(n.text.slice(0, 18)) + (n.text.length > 18 ? '…' : ''); }).join('<br>') : '<span class="muted">全部整理完毕 👍</span>') +
      '</div></div>' +

      '<div class="card" style="padding:13px;cursor:pointer" data-go="projects">' +
      '<div class="s-t muted small">项目看板 · 进行中</div>' +
      '<div class="s-v" style="font-size:22px;font-weight:700;margin-top:4px">' + running + '<span class="small muted" style="font-weight:400"> / ' + A.store.projects().length + ' 个</span></div>' +
      '<div class="small muted mt6">' + (A.store.staleProjects().length ? '<span style="color:var(--danger)">' + A.store.staleProjects().length + ' 个超7天未更新</span>' : '全部按节奏推进中') + '</div>' +
      '</div>' +

      '<div class="card" style="padding:13px;cursor:pointer" data-go="reports">' +
      '<div class="s-t muted small">本周完成</div>' +
      '<div class="s-v" style="font-size:22px;font-weight:700;margin-top:4px">' + wDone + '<span class="small muted" style="font-weight:400"> / ' + wAll + ' 条</span></div>' +
      '<div class="pbar mt6"><i style="width:' + (wAll ? Math.round(wDone / wAll * 100) : 0) + '%"></i></div>' +
      '</div></div>';
  }

  function commissionBlock() {
    var s = A.store.cmSummary();
    var target = Number(A.store.state().settings.yearTarget || 0);
    var pct = target ? Math.min(100, s.yearGot / target * 100) : 0;
    return '<div class="card" style="padding:0;overflow:hidden">' +
      '<div class="money" style="padding:15px 16px">' +
      '<div class="flex between center"><span class="s-t">本月已到账</span><span class="s-t">' + (new Date().getMonth() + 1) + '月</span></div>' +
      '<div class="s-v" style="font-size:26px;margin-top:2px">' + A.money(s.monthGot) + '</div>' +
      '<div class="flex gap10 mt10" style="font-size:12px">' +
      '<div>待到账 <b>' + A.moneyShort(s.monthWait) + '</b></div>' +
      '<div>年度累计 <b>' + A.moneyShort(s.yearGot) + '</b></div>' +
      '</div>' +
      '<div class="pbar mt10" style="background:rgba(255,255,255,.22)"><i style="width:' + pct.toFixed(0) + '%;background:#fbbf24"></i></div>' +
      '<div class="s-x" style="margin-top:5px">年度目标 ' + A.moneyShort(target) + ' · 已完成 ' + pct.toFixed(0) + '%</div>' +
      '</div>' +
      '<div style="padding:10px 14px"><button class="btn btn-sm btn-block" data-go="commission">查看提成明细 →</button></div>' +
      '</div>';
  }

  function alertBlock() {
    var al = A.store.alerts();
    var color = { danger: ['#fdecec', '#dc2626'], warn: ['#fff3e9', '#f97316'], info: ['#eef3ff', '#2563eb'] };
    return '<div class="card" style="padding:14px">' +
      '<div class="flex between center mb14"><h2 style="font-size:15px;font-weight:700">提醒中心 ' +
      (al.length ? '<span class="tag tag-danger">' + al.length + '</span>' : '') + '</h2>' +
      (al.length > 4 ? '<span class="sec-more" data-alert-all>全部</span>' : '') + '</div>' +
      (al.length ? al.slice(0, 4).map(function (a) {
        var c = color[a.level] || color.info;
        return '<div class="alert-row" data-alert-go="' + a.go.view + '">' +
          '<div class="alert-ic" style="background:' + c[0] + ';color:' + c[1] + '">' +
          '<svg viewBox="0 0 24 24" class="ic ic-sm"><path d="M12 8v5M12 16.5v.5"/><circle cx="12" cy="12" r="9"/></svg></div>' +
          '<div style="flex:1;min-width:0"><div class="alert-t">' + A.esc(a.title) + '</div><div class="alert-s">' + A.esc(a.sub) + '</div></div>' +
          '</div>';
      }).join('') : '<div class="muted small">暂无提醒，一切尽在掌握 ✓</div>') +
      '</div>';
  }

  A.alertCenter = function () {
    var al = A.store.alerts();
    var color = { danger: ['#fdecec', '#dc2626'], warn: ['#fff3e9', '#f97316'], info: ['#eef3ff', '#2563eb'] };
    A.modal({
      title: '提醒中心（' + al.length + '）',
      body: al.length ? al.map(function (a) {
        var c = color[a.level] || color.info;
        return '<div class="alert-row" data-go2="' + a.go.view + '">' +
          '<div class="alert-ic" style="background:' + c[0] + ';color:' + c[1] + '">!</div>' +
          '<div style="flex:1;min-width:0"><div class="alert-t">' + A.esc(a.title) + '</div><div class="alert-s">' + A.esc(a.sub) + '</div></div></div>';
      }).join('') : A.ui.empty('🎉', '没有需要处理的提醒'),
      onMount: function (m, close) {
        A.on(m, 'click', '[data-go2]', function (e, el) { close(); A.go(el.getAttribute('data-go2')); });
      }
    });
  };

  A.views = A.views || {};
  A.views.dashboard = {
    title: '今日工作台',
    sub: function () {
      var s = A.store.state().settings;
      var d = new Date();
      return greet() + '，' + (s.userName || '你') + ' · ' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + A.weekDay(A.today());
    },
    render: function () {
      var today = A.today();
      var list = A.store.sortTodos(A.store.todosOn(today));
      var overdueN = list.filter(function (t) { return t.due < today; }).length;

      var left = '';
      left += '<div class="sec"><div class="sec-head"><span class="sec-bar"></span><h2>今日待办</h2>' +
        '<span class="sec-count">' + list.length + ' 条' + (overdueN ? ' · <span style="color:var(--danger)">' + overdueN + ' 条逾期</span>' : '') + '</span>' +
        '<span class="spacer"></span><button class="btn btn-sm btn-primary" data-add-todo>+ 新增</button></div>' +
        '<div class="todo-list" data-list>' +
        (list.length ? list.map(function (t) { return A.todoItemHTML(t); }).join('')
          : A.ui.empty('☕', '今天没有待办，享受一下')) +
        '</div>' +
        (list.length > 0 ? '<div class="small muted mt10">未标记「已办理」或「作废」的事项会一直显示，逾期自动标红。</div>' : '') +
        '</div>';

      left += '<div class="sec">' + planBlock() + '</div>';

      var projs = A.store.projects().slice().sort(function (a, b) { return b.updatedAt < a.updatedAt ? -1 : 1; });
      left += '<div class="sec"><div class="sec-head"><span class="sec-bar"></span><h2>项目概览</h2>' +
        '<span class="sec-count">' + projs.length + ' 个</span><span class="spacer"></span>' +
        '<span class="sec-more" data-go="projects">进入看板 →</span></div>' +
        '<div class="hscroll snap">' + projs.map(function (p) { return A.projectCardHTML(p); }).join('') + '</div></div>';

      var right = '<div class="sec">' + quickEntries() + '</div>' +
        '<div class="sec">' + commissionBlock() + '</div>' +
        '<div class="sec">' + alertBlock() + '</div>';

      return '<div class="dash-grid"><div>' + left + '</div><div>' + right + '</div></div>';
    },
    mount: function (root) {
      A.bindTodoList(A.$('[data-list]', root), {});
      A.on(root, 'click', '[data-add-todo]', function () { A.todoForm(null, { due: A.today() }); });
      A.on(root, 'click', '[data-go]', function (e, el) { A.go(el.getAttribute('data-go')); });
      A.on(root, 'click', '[data-alert-go]', function (e, el) { A.go(el.getAttribute('data-alert-go')); });
      A.on(root, 'click', '[data-alert-all]', function () { A.alertCenter(); });
      A.on(root, 'click', '[data-proj]', function (e, el) { A.go('project', { id: el.getAttribute('data-proj') }); });

      // 今日计划
      var day = A.today();
      A.on(root, 'click', '[data-plan-toggle]', function (e, el) {
        var id = el.getAttribute('data-plan-toggle');
        var plan = A.store.plan(day);
        plan.items.forEach(function (i) {
          if (i.id === id) {
            i.done = !i.done;
            if (i.todoId) A.store.setTodoStatus(i.todoId, i.done ? 'done' : 'todo');
          }
        });
        A.store.savePlan(day, plan);
      });
      A.on(root, 'click', '[data-plan-del]', function (e, el) {
        var id = el.getAttribute('data-plan-del');
        var plan = A.store.plan(day);
        plan.items = plan.items.filter(function (i) { return i.id !== id; });
        A.store.savePlan(day, plan);
      });
      var pi = A.$('[data-plan-input]', root);
      if (pi) pi.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' || !pi.value.trim()) return;
        var plan = A.store.plan(day);
        plan.items.push({ id: A.uid('pl'), text: pi.value.trim(), todoId: '', done: false });
        A.store.savePlan(day, plan);
      });
      A.on(root, 'click', '[data-plan-add]', function () { pickPlanItems(day); });
    }
  };

  function pickPlanItems(day) {
    var plan = A.store.plan(day);
    var exist = plan.items.map(function (i) { return i.todoId; });
    var list = A.store.sortTodos(A.store.todosOn(A.addDays(day, 3)));
    A.modal({
      title: '选择今天要推进的事项',
      body: list.length ? '<div class="todo-list">' + list.map(function (t) {
        return '<label class="lrow" style="cursor:pointer"><span class="chk' + (exist.indexOf(t.id) >= 0 ? ' on' : '') + '" data-pk="' + t.id + '">' + A.svgCheck + '</span>' +
          '<span class="lrow-main"><span class="lrow-t">' + A.esc(t.title) + '</span>' +
          '<span class="lrow-s">' + A.humanDate(t.due) + ' · ' + A.PRIO[t.priority] + '</span></span></label>';
      }).join('') + '</div>' : A.ui.empty('📭', '暂无可选待办'),
      footer: '<button class="btn" data-close>取消</button><button class="btn btn-primary" data-ok>加入今日计划</button>',
      onMount: function (m, close) {
        A.on(m, 'click', '[data-pk]', function (e, el) { e.preventDefault(); el.classList.toggle('on'); });
        A.$('[data-ok]', m).onclick = function () {
          var picked = A.$$('[data-pk].on', m).map(function (el) { return el.getAttribute('data-pk'); });
          var p = A.store.plan(day);
          // 保留手动添加的项，重建来自待办的项
          p.items = p.items.filter(function (i) { return !i.todoId; });
          picked.forEach(function (id) {
            var t = A.store.todo(id);
            if (t) p.items.push({ id: A.uid('pl'), text: t.title, todoId: id, done: t.status === 'done' });
          });
          A.store.savePlan(day, p);
          close(); A.toast('今日计划已更新', 'ok');
        };
      }
    });
  }

})(window.App);
