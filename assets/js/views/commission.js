/* 提成追踪模块（可设置查看密码） */
(function (A) {
  'use strict';

  var st = { filter: '', pid: '' };
  var unlocked = false;

  var CMSTATUS = { none: '未到账', part: '部分到账', clear: '已结清' };

  A.cmRowHTML = function (c) {
    var got = A.store.cmReceived(c);
    var expect = Number(c.expect || 0);
    var pct = expect ? Math.min(100, got / expect * 100) : 0;
    var stt = A.store.cmStatus(c);
    return '<div class="lrow" data-cm="' + c.id + '" style="cursor:pointer;align-items:flex-start">' +
      '<div class="avatar" style="background:' + (stt === 'clear' ? '#16a34a' : stt === 'part' ? '#f97316' : '#94a3b8') + '">' +
      (stt === 'clear' ? '✓' : Math.round(pct) + '%') + '</div>' +
      '<div class="lrow-main"><div class="lrow-t">' + A.esc(A.store.projectName(c.projectId) || '未关联项目') +
      ' <span class="tag">' + A.esc(A.CMTYPE[c.type] || '') + '</span>' +
      ' <span class="tag ' + (stt === 'clear' ? 'tag-ok' : stt === 'part' ? 'tag-warn' : '') + '">' + CMSTATUS[stt] + '</span></div>' +
      '<div class="lrow-s">预计 ' + A.money(expect) + ' · 已到账 <b style="color:var(--ok)">' + A.money(got) + '</b>' +
      (expect - got > 0 ? ' · 待到账 <b style="color:var(--warn)">' + A.money(expect - got) + '</b>' : '') + '</div>' +
      '<div class="pbar mt6" style="max-width:340px"><i style="width:' + pct.toFixed(0) + '%"></i></div>' +
      ((c.received || []).length ? '<div class="lrow-s mt6">' + c.received.map(function (r) { return A.fmtDate(r.date) + ' 收 ' + A.money(r.amt); }).join('；') + '</div>' : '') +
      (c.note ? '<div class="lrow-s">备注：' + A.esc(c.note) + '</div>' : '') +
      '</div><div class="lrow-act"><button class="mini-btn" data-recv="' + c.id + '">记一笔到账</button></div></div>';
  };

  A.commissionForm = function (cm, defaults) {
    var isNew = !cm;
    var c = cm ? A.clone(cm) : Object.assign({ projectId: '', type: 'dev', expect: '', received: [], note: '' }, defaults || {});
    A.modal({
      title: isNew ? '新增提成记录' : '编辑提成记录',
      body: '<div class="row2">' + A.f.field('关联项目', A.f.projectSelect('projectId', c.projectId, '请选择项目'), true) +
        A.f.field('提成类型', A.f.select('type', A.CMTYPE, c.type), true) + '</div>' +
        A.f.field('预计金额（元）', A.f.input('expect', c.expect, '根据合同或约定', 'number'), true) +
        A.f.field('备注', A.f.input('note', c.note, '如：并网后结清尾款')) +
        ((c.received || []).length ? '<div class="field"><label>到账记录</label>' +
          c.received.map(function (r, i) {
            return '<div class="flex center gap6 mb8"><input class="inp" type="date" value="' + A.esc(r.date) + '" data-rd="' + i + '">' +
              '<input class="inp" type="number" value="' + A.esc(r.amt) + '" data-ra="' + i + '">' +
              '<button class="mini-btn danger" data-rdel="' + i + '">删</button></div>';
          }).join('') + '</div>' : ''),
      footer: (isNew ? '' : '<button class="btn btn-danger" data-del>删除</button>') +
        '<span style="flex:1"></span><button class="btn" data-close>取消</button><button class="btn btn-primary" data-save>保存</button>',
      onMount: function (m, close) {
        A.on(m, 'click', '[data-rdel]', function (e, el) {
          c.received.splice(+el.getAttribute('data-rdel'), 1);
          A.store.saveCommission(c); close(); A.commissionForm(A.store.commissions().filter(function (x) { return x.id === c.id; })[0]);
        });
        A.$('[data-save]', m).onclick = function () {
          var v = A.f.read(m);
          if (!v.projectId) { A.toast('请选择项目', 'warn'); return; }
          A.$$('[data-rd]', m).forEach(function (el) { c.received[+el.getAttribute('data-rd')].date = el.value; });
          A.$$('[data-ra]', m).forEach(function (el) { c.received[+el.getAttribute('data-ra')].amt = Number(el.value || 0); });
          Object.assign(c, { projectId: v.projectId, type: v.type, expect: Number(v.expect || 0), note: v.note });
          A.store.saveCommission(c); close(); A.toast('已保存', 'ok');
        };
        var del = A.$('[data-del]', m);
        if (del) del.onclick = function () {
          close();
          A.confirm({ title: '删除提成记录', text: '确定删除？', okText: '删除', danger: true })
            .then(function (ok) { if (ok) { A.store.removeCommission(c.id); A.toast('已删除'); } });
        };
      }
    });
  };

  function receiveForm(id) {
    var c = A.store.commissions().filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    var rest = Number(c.expect || 0) - A.store.cmReceived(c);
    A.modal({
      title: '记一笔到账 · ' + A.store.projectName(c.projectId),
      body: A.f.field('到账金额（元）', '<input class="inp" type="number" name="amt" value="' + (rest > 0 ? rest : '') + '" data-autofocus>', true) +
        A.f.field('到账日期', '<input class="inp" type="date" name="date" value="' + A.today() + '">', true) +
        '<div class="small muted">预计 ' + A.money(c.expect) + '，已到账 ' + A.money(A.store.cmReceived(c)) + '，剩余 ' + A.money(Math.max(0, rest)) + '</div>',
      footer: '<button class="btn" data-close>取消</button><button class="btn btn-primary" data-ok>确认到账</button>',
      onMount: function (m, close) {
        A.$('[data-ok]', m).onclick = function () {
          var v = A.f.read(m);
          if (!Number(v.amt)) { A.toast('请输入金额', 'warn'); return; }
          c.received = c.received || [];
          c.received.push({ amt: Number(v.amt), date: v.date || A.today() });
          A.store.saveCommission(c); close(); A.toast('已记录 ' + A.money(v.amt), 'ok');
        };
      }
    });
  }

  function lockScreen() {
    return '<div class="card" style="padding:40px 20px;text-align:center;max-width:420px;margin:30px auto">' +
      '<div style="font-size:34px">🔒</div>' +
      '<div class="bold mt10">提成数据已加密保护</div>' +
      '<div class="small muted mt6">请输入查看密码</div>' +
      '<input class="inp mt14" type="password" data-pw placeholder="查看密码" style="text-align:center;letter-spacing:4px">' +
      '<button class="btn btn-primary btn-block mt10" data-unlock>解锁查看</button></div>';
  }

  A.views = A.views || {};
  A.views.commission = {
    title: '提成追踪',
    sub: function () {
      var s = A.store.cmSummary();
      return '本月已到账 ' + A.moneyShort(s.monthGot) + ' · 待到账 ' + A.moneyShort(s.monthWait);
    },
    render: function () {
      var set = A.store.state().settings;
      if (set.lockOn && set.commissionLock && !unlocked) return lockScreen();

      var s = A.store.cmSummary();
      var target = Number(set.yearTarget || 0);
      var pct = target ? Math.min(100, s.yearGot / target * 100) : 0;

      var h = '<div class="grid g4 keep2 mb14">' +
        '<div class="stat money"><div class="s-t">本月已到账</div><div class="s-v">' + A.money(s.monthGot) + '</div><div class="s-x">' + (new Date().getMonth() + 1) + '月实收</div></div>' +
        '<div class="stat"><div class="s-t">本月待到账</div><div class="s-v" style="color:var(--warn)">' + A.money(s.monthWait) + '</div><div class="s-x">全部未结清金额</div></div>' +
        '<div class="stat"><div class="s-t">年度累计</div><div class="s-v">' + A.money(s.yearGot) + '</div><div class="s-x">' + new Date().getFullYear() + ' 年到账合计</div></div>' +
        '<div class="stat"><div class="s-t">年度目标完成</div><div class="s-v">' + pct.toFixed(0) + '%</div>' +
        '<div class="pbar mt6"><i style="width:' + pct.toFixed(0) + '%"></i></div>' +
        '<div class="s-x">目标 ' + A.moneyShort(target) + '</div></div>' +
        '</div>';

      var fs = Object.assign({ '': '全部' }, CMSTATUS);
      h += '<div class="filters"><div class="seg" data-f>' + Object.keys(fs).map(function (k) {
        return '<button data-v="' + k + '" class="' + (st.filter === k ? 'on' : '') + '">' + fs[k] + '</button>';
      }).join('') + '</div>' +
        A.f.projectSelect('pf', st.pid, '全部项目').replace('class="sel"', 'class="sel" style="width:auto"') +
        '<span style="flex:1"></span><button class="btn btn-sm btn-primary" data-new>+ 新增记录</button></div>';

      var list = A.store.commissions().filter(function (c) {
        if (st.filter && A.store.cmStatus(c) !== st.filter) return false;
        if (st.pid && c.projectId !== st.pid) return false;
        return true;
      });
      h += '<div>' + (list.length ? list.map(A.cmRowHTML).join('') : A.ui.empty('💰', '还没有提成记录')) + '</div>';
      return h;
    },
    mount: function (root) {
      var pw = A.$('[data-pw]', root);
      if (pw) {
        var tryUnlock = function () {
          if (pw.value === A.store.state().settings.commissionLock) { unlocked = true; A.render(); }
          else A.toast('密码不正确', 'warn');
        };
        A.$('[data-unlock]', root).onclick = tryUnlock;
        pw.addEventListener('keydown', function (e) { if (e.key === 'Enter') tryUnlock(); });
        return;
      }
      A.on(root, 'click', '[data-f] button', function (e, b) { st.filter = b.getAttribute('data-v'); A.render(); });
      var pf = A.$('[name=pf]', root); if (pf) pf.onchange = function () { st.pid = pf.value; A.render(); };
      A.on(root, 'click', '[data-new]', function () { A.commissionForm(null, { projectId: st.pid }); });
      A.on(root, 'click', '[data-recv]', function (e, el) { e.stopPropagation(); receiveForm(el.getAttribute('data-recv')); });
      A.on(root, 'click', '[data-cm]', function (e, el) {
        if (e.target.closest('button')) return;
        A.commissionForm(A.store.commissions().filter(function (c) { return c.id === el.getAttribute('data-cm'); })[0]);
      });
    }
  };

  A.lockCommission = function () { unlocked = false; };

})(window.App);
