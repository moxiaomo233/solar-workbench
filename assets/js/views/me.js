/* 我的：个人信息 / 模块入口 / 设置 / 数据安全 */
(function (A) {
  'use strict';

  var ENTRIES = [
    { v: 'sitelogs', n: '现场速记', d: '勘察·进度·问题', i: '📷', c: '#2563eb' },
    { v: 'contacts', n: '通讯录', d: '业主·施工·电网', i: '📇', c: '#0d9488' },
    { v: 'docs', n: '文档库', d: '合同·报批·方案', i: '📁', c: '#7c3aed' },
    { v: 'commission', n: '提成追踪', d: '到账·待收·目标', i: '💰', c: '#f97316' },
    { v: 'reports', n: '日报周报', d: '一键汇总', i: '🧾', c: '#0891b2' },
    { v: 'projects', n: '项目看板', d: '全部项目', i: '🏗', c: '#4f46e5' }
  ];

  A.views = A.views || {};
  A.views.me = {
    title: '我的',
    sub: function () { var s = A.store.state().settings; return (s.company || '') + ' · ' + (s.role || '项目助理'); },
    render: function () {
      var S = A.store, set = S.state().settings;
      var sum = S.cmSummary();
      var doneAll = S.todos().filter(function (t) { return t.status === 'done'; }).length;

      var h = '<div class="card mb14" style="padding:16px;display:flex;gap:14px;align-items:center">' +
        '<div class="avatar" style="width:52px;height:52px;flex:0 0 52px;font-size:18px;background:linear-gradient(140deg,#2563eb,#1e3a8a)">' +
        A.esc((set.userName || '我').slice(-2)) + '</div>' +
        '<div style="flex:1"><div style="font-size:17px;font-weight:700">' + A.esc(set.userName || '我') + '</div>' +
        '<div class="small muted">' + A.esc(set.company || '') + ' · ' + A.esc(set.role || '项目助理') + '</div></div>' +
        '<button class="btn btn-sm" data-editme>编辑资料</button></div>';

      h += '<div class="grid g4 keep2 mb14">' +
        '<div class="stat"><div class="s-t">跟进项目</div><div class="s-v">' + S.projects().length + '</div></div>' +
        '<div class="stat"><div class="s-t">累计完成待办</div><div class="s-v">' + doneAll + '</div></div>' +
        '<div class="stat"><div class="s-t">现场记录</div><div class="s-v">' + S.sitelogs().length + '</div></div>' +
        '<div class="stat"><div class="s-t">年度提成</div><div class="s-v">' + A.moneyShort(sum.yearGot) + '</div></div>' +
        '</div>';

      h += '<div class="sec"><div class="sec-head"><span class="sec-bar"></span><h2>全部模块</h2></div>' +
        '<div class="grid g3 keep2">' + ENTRIES.map(function (e) {
          return '<div class="card" style="padding:13px;display:flex;gap:11px;align-items:center;cursor:pointer" data-go="' + e.v + '">' +
            '<div class="avatar" style="background:' + e.c + '1a;color:' + e.c + ';font-size:18px">' + e.i + '</div>' +
            '<div><div class="bold" style="font-size:14px">' + e.n + '</div><div class="small muted">' + e.d + '</div></div></div>';
        }).join('') + '</div></div>';

      h += '<div class="sec"><div class="sec-head"><span class="sec-bar"></span><h2>设置</h2></div>' +
        '<div class="card" style="padding:15px">' +
        '<div class="row2">' +
        A.f.field('年度提成目标（元）', A.f.input('yearTarget', set.yearTarget, '', 'number')) +
        A.f.field('免打扰时段', '<div class="flex gap6 center"><input class="inp" type="time" name="dndFrom" value="' + A.esc(set.dnd.from) + '">' +
          '<span class="muted">至</span><input class="inp" type="time" name="dndTo" value="' + A.esc(set.dnd.to) + '"></div>') +
        '</div>' +
        '<label class="flex center gap6 small mb14"><input type="checkbox" name="dndOn"' + (set.dnd.on ? ' checked' : '') + '> 启用免打扰（该时段不推送提醒）</label>' +
        '<div class="divider"></div>' +
        '<div class="row2">' +
        A.f.field('提成查看密码', A.f.input('commissionLock', set.commissionLock, '留空表示不设密码', 'password')) +
        A.f.field('&nbsp;', '<label class="flex center gap6 small" style="height:38px"><input type="checkbox" name="lockOn"' + (set.lockOn ? ' checked' : '') + '> 打开提成模块时需要输入密码</label>') +
        '</div>' +
        '<button class="btn btn-primary" data-save-set>保存设置</button>' +
        '</div></div>';

      h += '<div class="sec"><div class="sec-head"><span class="sec-bar"></span><h2>数据与安全</h2></div>' +
        '<div class="card" style="padding:15px">' +
        '<div class="small muted mb14">数据保存在本机浏览器中（通讯录与提成数据不上传）。同一浏览器多个标签页会实时同步；建议定期导出备份。</div>' +
        '<div class="flex gap6" style="flex-wrap:wrap">' +
        '<button class="btn" data-export>导出备份（JSON）</button>' +
        '<button class="btn" data-import>导入备份</button>' +
        '<button class="btn" data-demo>恢复示例数据</button>' +
        '<button class="btn btn-danger" data-clear>清空全部数据</button>' +
        '</div><input type="file" accept="application/json" hidden data-impfile></div></div>';

      h += '<div class="small muted" style="text-align:center;padding:10px 0 20px">工作助手 · 光伏项目助理 v1.0 · 待办不漏 · 项目不乱 · 提成不错</div>';
      return h;
    },
    mount: function (root) {
      A.on(root, 'click', '[data-go]', function (e, el) { A.go(el.getAttribute('data-go')); });

      A.on(root, 'click', '[data-editme]', function () {
        var set = A.store.state().settings;
        A.modal({
          title: '编辑资料',
          body: A.f.field('姓名', A.f.input('userName', set.userName, '')) +
            '<div class="row2">' + A.f.field('公司', A.f.input('company', set.company, '')) +
            A.f.field('岗位', A.f.input('role', set.role, '')) + '</div>',
          footer: '<button class="btn" data-close>取消</button><button class="btn btn-primary" data-ok>保存</button>',
          onMount: function (m, close) {
            A.$('[data-ok]', m).onclick = function () {
              var v = A.f.read(m);
              Object.assign(A.store.state().settings, { userName: v.userName, company: v.company, role: v.role });
              A.store.save(); close(); A.toast('已保存', 'ok');
            };
          }
        });
      });

      A.on(root, 'click', '[data-save-set]', function () {
        var v = A.f.read(root);
        var set = A.store.state().settings;
        set.yearTarget = Number(v.yearTarget || 0);
        set.dnd = { on: !!v.dndOn, from: v.dndFrom, to: v.dndTo };
        set.commissionLock = v.commissionLock || '';
        set.lockOn = !!v.lockOn && !!set.commissionLock;
        A.store.save();
        A.lockCommission && A.lockCommission();
        A.toast('设置已保存', 'ok');
      });

      A.on(root, 'click', '[data-export]', function () {
        var blob = new Blob([A.store.exportJSON()], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = '工作助手备份_' + A.today() + '.json';
        document.body.appendChild(a); a.click(); a.remove();
        A.toast('备份已导出', 'ok');
      });

      var imp = A.$('[data-impfile]', root);
      A.on(root, 'click', '[data-import]', function () { imp.click(); });
      imp.onchange = function () {
        var f = imp.files[0]; if (!f) return;
        var fr = new FileReader();
        fr.onload = function () {
          try { A.store.importJSON(fr.result); A.toast('导入成功', 'ok'); A.render(); }
          catch (e) { A.toast('文件格式不正确', 'warn'); }
        };
        fr.readAsText(f); imp.value = '';
      };

      A.on(root, 'click', '[data-demo]', function () {
        A.confirm({ title: '恢复示例数据', text: '将用示例数据覆盖当前全部内容，确定？', okText: '恢复', danger: true })
          .then(function (ok) { if (ok) { A.store.reset(); A.toast('已恢复示例数据', 'ok'); } });
      });

      A.on(root, 'click', '[data-clear]', function () {
        A.confirm({
          title: '清空全部数据',
          html: '<b style="color:var(--danger)">此操作不可恢复！</b><br>将清空所有待办、随手记、项目、通讯录、文档与提成记录。<br>建议先导出备份。',
          okText: '我确认清空', danger: true
        }).then(function (ok) {
          if (!ok) return;
          A.confirm({ title: '再次确认', text: '真的要清空吗？', okText: '确认清空', danger: true }).then(function (ok2) {
            if (ok2) { A.store.clearAll(); A.toast('已清空'); }
          });
        });
      });
    }
  };

})(window.App);
