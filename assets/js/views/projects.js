/* 项目看板 + 项目详情 */
(function (A) {
  'use strict';

  var st = { view: 'board', mine: 'all', q: '' };
  var dtab = 'overview';

  A.projectCardHTML = function (p, inBoard) {
    var stale = ['grid', 'om'].indexOf(p.stage) < 0 && A.diffDays(A.today(), A.dkey(p.updatedAt)) > 7;
    var statusTag = p.status === 'risk' ? '<span class="tag tag-warn">有风险</span>'
      : p.status === 'stalled' ? '<span class="tag tag-danger">已停滞</span>'
        : '<span class="tag tag-ok">正常推进</span>';
    var todoN = A.store.todos().filter(function (t) {
      return t.status !== 'done' && t.status !== 'cancel' && (t.projectIds || []).indexOf(p.id) >= 0;
    }).length;

    return '<div class="proj-card' + (stale ? ' stale' : '') + '" data-proj="' + p.id + '"' + (inBoard ? ' draggable="true"' : '') + '>' +
      '<div class="pc-name">' + A.esc(p.name) + '</div>' +
      '<div class="pc-owner">' + A.esc(p.short || p.owner) + (p.capacity ? ' · ' + A.kw(p.capacity) : '') + '</div>' +
      '<div class="pc-row">' + (inBoard ? '' : A.ui.stageTag(p.stage)) + statusTag +
      (todoN ? '<span class="tag tag-info">' + todoN + ' 条待办</span>' : '') +
      (stale ? '<span class="tag tag-danger">' + A.diffDays(A.today(), A.dkey(p.updatedAt)) + '天未更新</span>' : '') +
      '</div>' +
      (p.next ? '<div class="pc-next"><b>下一步：</b>' + A.esc(p.next) + '</div>' : '') +
      (p.milestone && p.milestone.date ? '<div class="small muted mt6">🚩 ' + A.esc(p.milestone.text || '') + ' · ' + A.humanDate(p.milestone.date) + '</div>' : '') +
      '</div>';
  };

  /* ---------- 项目表单 ---------- */
  A.projectForm = function (proj) {
    var isNew = !proj;
    var p = proj ? A.clone(proj) : {
      name: '', short: '', owner: '', contactName: '', contactPhone: '', capacity: '',
      stage: 'dev', status: 'normal', next: '', commission: '', milestone: { text: '', date: '' }, shared: true
    };
    var stageDict = {}; A.STAGES.forEach(function (s) { stageDict[s.k] = s.n; });

    A.modal({
      title: isNew ? '新建项目' : '编辑项目',
      wide: true,
      body:
        '<div class="row2">' +
        A.f.field('项目名称', A.f.input('name', p.name, '如：张江物流园屋顶光伏'), true) +
        A.f.field('项目简称', A.f.input('short', p.short, '如：张江物流')) +
        '</div>' +
        A.f.field('业主方名称', A.f.input('owner', p.owner, '公司全称'), true) +
        '<div class="row3">' +
        A.f.field('业主联系人', A.f.input('contactName', p.contactName, ''), true) +
        A.f.field('联系电话', A.f.input('contactPhone', p.contactPhone, '', 'tel'), true) +
        A.f.field('装机容量(kW)', A.f.input('capacity', p.capacity, '', 'number')) +
        '</div>' +
        '<div class="row2">' +
        A.f.field('项目阶段', A.f.pills('stage', stageDict, p.stage), true) +
        A.f.field('项目状态', A.f.pills('status', { normal: '正常推进', risk: '有风险', stalled: '已停滞' }, p.status)) +
        '</div>' +
        A.f.field('下一步动作', A.f.input('next', p.next, '当前最需要推进的事项')) +
        '<div class="row2">' +
        A.f.field('关键节点内容', A.f.input('mtext', (p.milestone || {}).text, '最近一个 deadline 的内容')) +
        A.f.field('节点日期', '<input class="inp" type="date" name="mdate" value="' + A.esc((p.milestone || {}).date || '') + '">') +
        '</div>' +
        A.f.field('预计提成（仅自己可见）', A.f.input('commission', p.commission, '', 'number')) +
        '<label class="flex center gap6 small"><input type="checkbox" name="shared"' + (p.shared ? ' checked' : '') + '> 共享给团队（项目信息与文档）</label>',
      footer: (isNew ? '' : '<button class="btn btn-danger" data-del>删除项目</button>') +
        '<span style="flex:1"></span><button class="btn" data-close>取消</button><button class="btn btn-primary" data-save>保存</button>',
      onMount: function (m, close) {
        A.f.bindPills(m);
        A.$('[data-save]', m).onclick = function () {
          var v = A.f.read(m);
          if (!v.name.trim()) { A.toast('请填写项目名称', 'warn'); return; }
          if (!v.owner.trim()) { A.toast('请填写业主方名称', 'warn'); return; }
          Object.assign(p, {
            name: v.name.trim(), short: (v.short || v.name).trim(), owner: v.owner.trim(),
            contactName: v.contactName, contactPhone: v.contactPhone,
            capacity: Number(v.capacity || 0), stage: v.stage, status: v.status,
            next: v.next, commission: Number(v.commission || 0),
            milestone: { text: v.mtext, date: v.mdate }, shared: !!v.shared
          });
          var saved = A.store.saveProject(p);
          // 自动同步联系人
          if (p.contactName && p.contactPhone) {
            var exist = A.store.contacts().filter(function (c) { return c.phone === p.contactPhone; })[0];
            if (!exist) {
              A.store.saveContact({
                name: p.contactName, company: p.owner, role: 'owner', phone: p.contactPhone,
                wechat: '', projectIds: [saved.id], pref: '', lastContact: new Date().toISOString()
              });
            }
          }
          close(); A.toast(isNew ? '项目已创建' : '已保存', 'ok');
        };
        var del = A.$('[data-del]', m);
        if (del) del.onclick = function () {
          close();
          A.confirm({ title: '删除项目', text: '删除后该项目的关联信息将无法通过项目查看，确定删除？', okText: '删除', danger: true })
            .then(function (ok) { if (ok) { A.store.removeProject(p.id); A.go('projects'); A.toast('已删除'); } });
        };
      }
    });
  };

  /* ---------- 看板视图 ---------- */
  A.views = A.views || {};
  A.views.projects = {
    title: '项目看板',
    sub: function () {
      var s = A.store.staleProjects().length;
      return A.store.projects().length + ' 个项目' + (s ? ' · ' + s + ' 个超7天未更新' : '');
    },
    render: function () {
      var list = A.store.projects().filter(function (p) {
        if (st.mine === 'mine' && !p.shared) return true;
        if (st.mine === 'mine') return true;
        return true;
      });
      if (st.q) {
        var q = st.q.toLowerCase();
        list = list.filter(function (p) { return (p.name + p.owner + (p.next || '')).toLowerCase().indexOf(q) >= 0; });
      }

      var h = '<div class="filters">' +
        '<div class="seg" data-v><button data-x="board" class="' + (st.view === 'board' ? 'on' : '') + '">看板</button>' +
        '<button data-x="list" class="' + (st.view === 'list' ? 'on' : '') + '">列表</button></div>' +
        '<div class="searchbox"><svg viewBox="0 0 24 24" class="ic"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
        '<input placeholder="搜索项目 / 业主…" value="' + A.esc(st.q) + '" data-q></div>' +
        '<button class="btn btn-sm btn-primary" data-new>+ 新建项目</button></div>';

      if (st.view === 'board') {
        h += '<div class="small muted mb8">提示：拖动项目卡片可切换所处阶段</div><div class="board">';
        A.STAGES.forEach(function (s) {
          var col = list.filter(function (p) { return p.stage === s.k; });
          h += '<div class="board-col" data-stage="' + s.k + '">' +
            '<div class="bc-head"><span class="bc-dot" style="background:' + s.c + '"></span>' + s.n +
            '<span class="cnt">' + col.length + '</span></div>' +
            col.map(function (p) { return A.projectCardHTML(p, true); }).join('') +
            (col.length ? '' : '<div class="small muted" style="padding:8px 4px">暂无项目</div>') +
            '</div>';
        });
        h += '</div>';
      } else {
        h += '<div class="scroll-x"><table class="tbl"><thead><tr>' +
          '<th>项目名称</th><th>阶段</th><th>业主</th><th>容量</th><th>下一步</th><th>状态</th><th>更新</th></tr></thead><tbody>' +
          list.map(function (p) {
            var stale = A.diffDays(A.today(), A.dkey(p.updatedAt)) > 7;
            return '<tr data-proj="' + p.id + '" style="cursor:pointer">' +
              '<td><b>' + A.esc(p.name) + '</b></td>' +
              '<td>' + A.ui.stageTag(p.stage) + '</td>' +
              '<td>' + A.esc(p.short || p.owner) + '</td>' +
              '<td>' + A.kw(p.capacity) + '</td>' +
              '<td class="muted">' + A.esc((p.next || '').slice(0, 20)) + '</td>' +
              '<td>' + (p.status === 'risk' ? '<span class="tag tag-warn">有风险</span>' : p.status === 'stalled' ? '<span class="tag tag-danger">停滞</span>' : '<span class="tag tag-ok">正常</span>') + '</td>' +
              '<td class="' + (stale ? '' : 'muted') + '" style="' + (stale ? 'color:var(--danger)' : '') + '">' + A.humanDate(A.dkey(p.updatedAt)) + '</td>' +
              '</tr>';
          }).join('') + '</tbody></table></div>';
      }
      return h;
    },
    mount: function (root) {
      A.on(root, 'click', '[data-v] button', function (e, b) { st.view = b.getAttribute('data-x'); A.render(); });
      var q = A.$('[data-q]', root);
      if (q) q.addEventListener('input', A.debounce(function () { st.q = q.value; A.render(); var el = A.$('[data-q]'); if (el) el.focus(); }, 260));
      A.on(root, 'click', '[data-new]', function () { A.projectForm(null); });
      A.on(root, 'click', '[data-proj]', function (e, el) { A.go('project', { id: el.getAttribute('data-proj') }); });

      // 拖拽切换阶段
      var dragId = null;
      A.$$('[data-proj][draggable]', root).forEach(function (el) {
        el.addEventListener('dragstart', function (e) {
          dragId = el.getAttribute('data-proj'); el.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
          try { e.dataTransfer.setData('text/plain', dragId); } catch (err) { }
        });
        el.addEventListener('dragend', function () { el.classList.remove('dragging'); });
      });
      A.$$('.board-col', root).forEach(function (col) {
        col.addEventListener('dragover', function (e) { e.preventDefault(); col.classList.add('drag-over'); });
        col.addEventListener('dragleave', function () { col.classList.remove('drag-over'); });
        col.addEventListener('drop', function (e) {
          e.preventDefault(); col.classList.remove('drag-over');
          var id = dragId || e.dataTransfer.getData('text/plain');
          var p = A.store.project(id); if (!p) return;
          var stage = col.getAttribute('data-stage');
          if (p.stage === stage) return;
          p.stage = stage; A.store.saveProject(p);
          A.toast(p.short + ' → ' + A.stageName(stage), 'ok');
        });
      });
    }
  };

  /* ---------- 项目详情 ---------- */
  function timeline(pid) {
    var items = [];
    A.store.todos().forEach(function (t) {
      if ((t.projectIds || []).indexOf(pid) < 0) return;
      items.push({ at: t.createdAt, t: '创建待办：' + t.title });
      if (t.doneAt) items.push({ at: t.doneAt, t: '完成待办：' + t.title });
    });
    A.store.notes().forEach(function (n) { if (n.projectId === pid) items.push({ at: n.createdAt, t: '随手记：' + n.text.slice(0, 40) }); });
    A.store.sitelogs().forEach(function (l) { if (l.projectId === pid) items.push({ at: l.createdAt, t: (A.LOGTYPE[l.type] || '现场记录') + '：' + (l.text || '').slice(0, 40) }); });
    A.store.docs().forEach(function (d) { if (d.projectId === pid) items.push({ at: d.createdAt, t: '上传文档：' + d.name }); });
    A.store.commissions().forEach(function (c) {
      if (c.projectId !== pid) return;
      (c.received || []).forEach(function (r) { items.push({ at: A.parseDate(r.date).toISOString(), t: '提成到账 ' + A.money(r.amt) }); });
    });
    return items.sort(function (a, b) { return b.at < a.at ? -1 : 1; });
  }

  A.views.project = {
    title: function (params) { var p = A.store.project(params.id); return p ? p.name : '项目详情'; },
    sub: function (params) {
      var p = A.store.project(params.id); if (!p) return '';
      return A.stageName(p.stage) + ' · ' + p.owner + (p.capacity ? ' · ' + A.kw(p.capacity) : '');
    },
    render: function (params) {
      var p = A.store.project(params.id);
      if (!p) return A.ui.empty('🔍', '项目不存在或已删除');

      var tabs = { overview: '概览', todos: '关联待办', logs: '现场记录', docs: '文档', cm: '提成', tl: '时间线' };
      var h = '<div class="flex center gap6 mb14"><button class="btn btn-sm" data-back>← 返回看板</button>' +
        '<span style="flex:1"></span>' +
        '<button class="btn btn-sm" data-edit>编辑项目</button>' +
        '<button class="btn btn-sm btn-primary" data-add-todo>+ 加待办</button></div>';

      h += '<div class="tabs">' + Object.keys(tabs).map(function (k) {
        return '<button data-t="' + k + '" class="' + (dtab === k ? 'on' : '') + '">' + tabs[k] + '</button>';
      }).join('') + '</div>';

      if (dtab === 'overview') {
        var stale = A.diffDays(A.today(), A.dkey(p.updatedAt));
        h += '<div class="grid g2"><div class="card" style="padding:15px">' +
          '<div class="flex center gap6 mb14">' + A.ui.stageTag(p.stage) +
          (p.status === 'risk' ? '<span class="tag tag-warn">有风险</span>' : p.status === 'stalled' ? '<span class="tag tag-danger">已停滞</span>' : '<span class="tag tag-ok">正常推进</span>') +
          (stale > 7 ? '<span class="tag tag-danger">' + stale + '天未更新</span>' : '') + '</div>' +
          '<table class="tbl" style="border:none">' +
          row('业主方', p.owner) + row('联系人', p.contactName + ' · ' + p.contactPhone) +
          row('装机容量', A.kw(p.capacity) || '—') +
          row('关键节点', (p.milestone && p.milestone.text ? p.milestone.text + '（' + A.fmtDate(p.milestone.date, true) + '）' : '—')) +
          row('下一步动作', p.next || '—') +
          row('最后更新', A.relTime(p.updatedAt)) +
          '</table></div>' +
          '<div><div class="card" style="padding:15px" >' +
          '<div class="s-t muted small">阶段推进</div>' +
          '<div class="mt10">' + A.STAGES.map(function (s, i) {
            var cur = A.STAGES.findIndex(function (x) { return x.k === p.stage; });
            var done = i <= cur;
            return '<div class="flex center gap10" style="padding:5px 0;opacity:' + (done ? 1 : .45) + '">' +
              '<span style="width:11px;height:11px;border-radius:50%;background:' + (done ? s.c : '#cbd5e1') + '"></span>' +
              '<span style="font-size:13px;' + (i === cur ? 'font-weight:700' : '') + '">' + s.n + '</span>' +
              (i === cur ? '<span class="tag tag-info">当前</span>' : '') + '</div>';
          }).join('') + '</div>' +
          '<div class="mt10"><select class="sel" data-stage-sel>' + A.STAGES.map(function (s) {
            return '<option value="' + s.k + '"' + (p.stage === s.k ? ' selected' : '') + '>切换到：' + s.n + '</option>';
          }).join('') + '</select></div></div>' +
          '<div class="card mt14" style="padding:15px"><div class="s-t muted small">预计提成（仅自己可见）</div>' +
          '<div class="s-v" style="font-size:22px;font-weight:700">' + A.money(p.commission || 0) + '</div></div>' +
          '</div></div>';
      }

      if (dtab === 'todos') {
        var list = A.store.sortTodos(A.store.todos().filter(function (t) { return (t.projectIds || []).indexOf(p.id) >= 0; }));
        h += '<div class="todo-list" data-list>' + (list.length ? list.map(function (t) { return A.todoItemHTML(t); }).join('') : A.ui.empty('✅', '该项目暂无待办')) + '</div>';
      }

      if (dtab === 'logs') {
        var logs = A.store.sitelogs().filter(function (l) { return l.projectId === p.id; });
        h += '<div class="flex mb8"><span style="flex:1"></span><button class="btn btn-sm btn-primary" data-add-log>+ 现场速记</button></div>';
        h += '<div class="grid" style="gap:10px">' + (logs.length ? logs.map(A.sitelogCardHTML).join('') : A.ui.empty('📷', '暂无现场记录')) + '</div>';
      }

      if (dtab === 'docs') {
        var ds = A.store.docs().filter(function (d) { return d.projectId === p.id; });
        h += '<div class="flex mb8"><span style="flex:1"></span><button class="btn btn-sm btn-primary" data-add-doc>+ 上传文档</button></div>';
        h += '<div class="grid" style="gap:8px">' + (ds.length ? ds.map(A.docRowHTML).join('') : A.ui.empty('📁', '暂无文档')) + '</div>';
      }

      if (dtab === 'cm') {
        var cs = A.store.commissions().filter(function (c) { return c.projectId === p.id; });
        h += '<div class="flex mb8"><span style="flex:1"></span><button class="btn btn-sm btn-primary" data-add-cm>+ 提成记录</button></div>';
        h += '<div class="grid" style="gap:8px">' + (cs.length ? cs.map(A.cmRowHTML).join('') : A.ui.empty('💰', '暂无提成记录')) + '</div>';
      }

      if (dtab === 'tl') {
        var items = timeline(p.id);
        h += '<div class="card" style="padding:16px"><div class="tl">' +
          (items.length ? items.map(function (i) {
            return '<div class="tl-item"><div class="tl-time">' + A.fmtDateTime(i.at) + '</div><div class="tl-t">' + A.esc(i.t) + '</div></div>';
          }).join('') : '<div class="muted small">暂无记录</div>') + '</div></div>';
      }
      return h;

      function row(k, v) { return '<tr><td class="muted" style="width:96px">' + A.esc(k) + '</td><td>' + A.esc(v) + '</td></tr>'; }
    },
    mount: function (root, params) {
      var p = A.store.project(params.id);
      A.on(root, 'click', '[data-t]', function (e, b) { dtab = b.getAttribute('data-t'); A.render(); });
      A.on(root, 'click', '[data-back]', function () { A.go('projects'); });
      A.on(root, 'click', '[data-edit]', function () { A.projectForm(p); });
      A.on(root, 'click', '[data-add-todo]', function () { A.todoForm(null, { projectIds: [params.id], due: A.today() }); });
      A.on(root, 'click', '[data-add-log]', function () { A.sitelogForm(null, { projectId: params.id }); });
      A.on(root, 'click', '[data-add-doc]', function () { A.docForm(null, { projectId: params.id }); });
      A.on(root, 'click', '[data-add-cm]', function () { A.commissionForm(null, { projectId: params.id }); });
      var sel = A.$('[data-stage-sel]', root);
      if (sel) sel.onchange = function () { p.stage = sel.value; A.store.saveProject(p); A.toast('阶段已更新为 ' + A.stageName(p.stage), 'ok'); };
      var lst = A.$('[data-list]', root); if (lst) A.bindTodoList(lst, {});
      A.on(root, 'click', '[data-log]', function (e, el) { A.sitelogDetail(el.getAttribute('data-log')); });
      A.on(root, 'click', '[data-doc]', function (e, el) { A.docMenu(el.getAttribute('data-doc')); });
      A.on(root, 'click', '[data-cm]', function (e, el) { A.commissionForm(A.store.commissions().filter(function (c) { return c.id === el.getAttribute('data-cm'); })[0]); });
    }
  };

})(window.App);
