/* 随手记模块：极速记录 + 截图粘贴/拖拽 + AI 智能整理 */
(function (A) {
  'use strict';

  var st = { filter: 'all', sel: {}, bulk: false };
  var draftImgs = [];

  /* ---------- 创建随手记 ---------- */
  A.addNote = function (data) {
    var n = Object.assign({
      text: '', images: [], source: 'other', projectId: '', status: 'raw', todoId: ''
    }, data || {});
    if (!n.projectId) {
      var p = A.matchProject(n.text);
      if (p) n.projectId = p.id;
    }
    return A.store.saveNote(n);
  };

  /* 快速录入弹窗（供全局 + 快捷键使用） */
  A.quickNote = function (preset) {
    var picker = A.ui.imagePicker((preset && preset.images) || []);
    var body =
      '<textarea class="ta" name="text" rows="4" data-autofocus placeholder="老板刚说了什么？先记下来，之后再整理…&#10;支持 Ctrl+V 直接粘贴微信截图">' + A.esc((preset && preset.text) || '') + '</textarea>' +
      '<div class="row2 mt10">' + A.f.select('source', A.NOTESRC, (preset && preset.source) || 'oral') + A.f.projectSelect('projectId', (preset && preset.projectId) || '') + '</div>' +
      '<div class="mt10">' + picker.html() + '</div>' +
      '<div class="mt10 flex gap6"><button class="btn btn-sm" data-pick>📎 添加图片</button>' +
      '<span class="small muted" style="align-self:center">可直接 Ctrl+V 粘贴截图</span></div>' +
      '<input type="file" accept="image/*" multiple hidden data-file>';

    A.modal({
      title: '随手记',
      body: body,
      footer: '<button class="btn" data-close>取消</button><button class="btn btn-primary" data-save>存下来</button>',
      onMount: function (m, close) {
        picker.bind(m);
        var fi = A.$('[data-file]', m);
        A.$('[data-pick]', m).onclick = function () { fi.click(); };
        fi.onchange = function () { picker.add(fi.files); fi.value = ''; };
        m.addEventListener('paste', function (e) {
          var items = (e.clipboardData || {}).items || [];
          var files = [];
          for (var i = 0; i < items.length; i++) if (items[i].kind === 'file') files.push(items[i].getAsFile());
          if (files.length) { picker.add(files); A.toast('截图已添加'); }
        });
        A.$('[data-save]', m).onclick = function () {
          var v = A.f.read(m);
          if (!String(v.text || '').trim() && !picker.images().length) { A.toast('写点什么，或者贴张图', 'warn'); return; }
          var n = A.addNote({ text: (v.text || '').trim(), source: v.source, projectId: v.projectId, images: picker.images() });
          close();
          A.toast('已存入随手记', 'ok');
          setTimeout(function () { suggest(n.id); }, 260);
        };
      }
    });
  };

  /* AI 建议弹窗 */
  function suggest(noteId) {
    var n = A.store.note(noteId); if (!n) return;
    var r = A.analyzeNote(n);
    if (!r.isTask) return;
    A.modal({
      title: '智能整理建议',
      body: '<div class="ai-box" style="margin-top:0">' +
        '<div class="ai-title">✨ 这条看起来像一条待办</div>' +
        '<div class="ai-kv">' +
        '<span class="tag tag-purple">建议标题：' + A.esc(r.title) + '</span>' +
        (r.project ? '<span class="tag tag-proj">项目：' + A.esc(r.project.short || r.project.name) + '</span>' : '<span class="tag">未识别到项目</span>') +
        (r.due ? '<span class="tag tag-warn">截止：' + A.esc(r.due.why) + '（' + A.fmtDate(r.due.date, true) + '）</span>' : '<span class="tag">未识别到时间</span>') +
        (r.capacity ? '<span class="tag">容量：' + A.kw(r.capacity) + '</span>' : '') +
        (r.owner ? '<span class="tag">负责人：' + A.esc(r.owner) + '</span>' : '') +
        '<span class="tag tag-p1">建议优先级：' + A.esc(A.PRIO[r.priority]) + '</span>' +
        '</div>' +
        (r.due ? '' : '<div class="small muted">没有明确截止时间，默认设为今天，可在下一步修改。</div>') +
        '</div>',
      footer: '<button class="btn" data-close>先不用</button><button class="btn btn-primary" data-ok>转为待办</button>',
      onMount: function (m, close) {
        A.$('[data-ok]', m).onclick = function () { close(); A.noteToTodo(noteId); };
      }
    });
  }
  A.noteSuggest = suggest;

  /* 随手记 → 待办 */
  A.noteToTodo = function (noteId) {
    var n = A.store.note(noteId); if (!n) return;
    var r = A.analyzeNote(n);
    A.todoForm(null, {
      title: r.title,
      source: r.source,
      priority: r.priority,
      due: r.due ? r.due.date : A.today(),
      projectIds: r.project ? [r.project.id] : (n.projectId ? [n.projectId] : []),
      note: '来自随手记：' + n.text.slice(0, 60)
    }, function (t) {
      var nn = A.store.note(noteId);
      if (nn) {
        nn.status = 'converted'; nn.todoId = t.id;
        if (!nn.projectId && r.project) nn.projectId = r.project.id;
        A.store.save(true);
      }
    });
  };

  /* ---------- 视图 ---------- */
  function noteCard(n) {
    var r = A.analyzeNote(n);
    var t = n.todoId ? A.store.todo(n.todoId) : null;
    var h = '<div class="note-card ' + (n.status === 'raw' ? 'raw' : '') + '" data-note="' + n.id + '">' +
      '<div class="note-head">' +
      (n.status === 'raw' ? '<span class="tag tag-warn"><span class="tag-dot"></span>未整理</span>' : '') +
      (n.status === 'converted' ? '<span class="tag tag-ok">已转待办' + (t ? ' · ' + A.STATUS[t.status] : '') + '</span>' : '') +
      (n.status === 'archived' ? '<span class="tag">已归档</span>' : '') +
      '<span class="tag">' + A.esc(A.NOTESRC[n.source] || '其他') + '</span>' +
      (n.projectId ? '<span class="tag tag-proj">' + A.esc(A.store.projectName(n.projectId)) + '</span>' : '') +
      '<span class="spacer" style="flex:1"></span><span class="note-time">' + A.relTime(n.createdAt) + '</span>' +
      '</div>' +
      (n.text ? '<div class="note-text">' + A.esc(n.text) + '</div>' : '') +
      (n.images && n.images.length ? '<div class="note-imgs">' + n.images.map(function (s) { return '<img src="' + s + '" data-img="' + s + '" alt="">'; }).join('') + '</div>' : '');

    if (n.status === 'raw' && r.isTask) {
      h += '<div class="ai-box"><div class="ai-title">✨ 智能识别</div><div class="ai-kv">' +
        '<span class="tag tag-purple">' + A.esc(r.title) + '</span>' +
        (r.project ? '<span class="tag tag-proj">' + A.esc(r.project.short || r.project.name) + '</span>' : '') +
        (r.due ? '<span class="tag tag-warn">' + A.esc(r.due.why) + '</span>' : '<span class="tag">无截止时间</span>') +
        (r.capacity ? '<span class="tag">' + A.kw(r.capacity) + '</span>' : '') +
        '</div><div class="ai-actions">' +
        '<button class="btn btn-sm btn-primary" data-act="toTodo">转为待办</button>' +
        (r.project && !n.projectId ? '<button class="btn btn-sm" data-act="link" data-pid="' + r.project.id + '">关联到' + A.esc(r.project.short) + '</button>' : '') +
        '<button class="btn btn-sm" data-act="archive">归档</button>' +
        '</div></div>';
    } else {
      h += '<div class="ai-actions mt10">' +
        (n.status !== 'converted' ? '<button class="btn btn-sm" data-act="toTodo">转为待办</button>' : '<button class="btn btn-sm" data-act="openTodo">查看待办</button>') +
        (n.status !== 'archived' ? '<button class="btn btn-sm" data-act="archive">归档</button>' : '') +
        '<button class="btn btn-sm" data-act="edit">编辑</button>' +
        '<button class="btn btn-sm" data-act="del">删除</button></div>';
    }
    h += '</div>';
    return h;
  }

  A.views = A.views || {};
  A.views.notes = {
    title: '随手记',
    sub: function () { return '共 ' + A.store.notes().length + ' 条 · ' + A.store.rawNotes().length + ' 条待整理'; },
    render: function () {
      var all = A.store.notes();
      var w = A.weekRange(A.today());
      var list = all.filter(function (n) {
        if (st.filter === 'raw') return n.status === 'raw';
        if (st.filter === 'converted') return n.status === 'converted';
        if (st.filter === 'week') return A.inRange(A.dkey(n.createdAt), w.start, w.end);
        return n.status !== 'deleted';
      });

      var h = '';
      // 快速输入
      h += '<div class="quick-note" data-quick>' +
        '<textarea data-qtext placeholder="3秒记一笔：老板说什么、现场发现什么、突然想到什么…（Ctrl+Enter 保存）"></textarea>' +
        '<div class="note-imgs" data-qimgs></div>' +
        '<div class="qn-bar">' +
        A.f.select('qsource', A.NOTESRC, 'oral') +
        A.f.projectSelect('qproject', '') +
        '<button class="btn btn-sm" data-qpick>📎 图片</button>' +
        '<span class="small muted only-desktop-inline" style="margin-left:auto">支持拖拽 / Ctrl+V 粘贴截图</span>' +
        '<button class="btn btn-sm btn-primary" data-qsave>记下来</button>' +
        '</div><input type="file" accept="image/*" multiple hidden data-qfile></div>';

      var fs = { all: '全部', raw: '未整理', converted: '已转待办', week: '本周' };
      h += '<div class="filters"><div class="seg" data-f>' + Object.keys(fs).map(function (k) {
        return '<button data-v="' + k + '" class="' + (st.filter === k ? 'on' : '') + '">' + fs[k] + (k === 'raw' && A.store.rawNotes().length ? ' ' + A.store.rawNotes().length : '') + '</button>';
      }).join('') + '</div>' +
        '<span class="spacer" style="flex:1"></span>' +
        '<button class="btn btn-sm' + (st.bulk ? ' btn-primary' : '') + '" data-bulk>批量整理</button></div>';

      if (st.bulk) {
        h += '<div class="small muted mb8">勾选多条随手记后可批量转为待办或归档</div>';
        h += '<div class="grid" style="gap:10px">' + list.map(function (n) {
          return '<label class="lrow" style="align-items:flex-start;cursor:pointer">' +
            '<span class="chk' + (st.sel[n.id] ? ' on' : '') + '" data-pick="' + n.id + '">' + A.svgCheck + '</span>' +
            '<span class="lrow-main"><span class="lrow-t" style="font-weight:400;white-space:normal">' + A.esc(n.text.slice(0, 80)) + '</span>' +
            '<span class="lrow-s">' + A.relTime(n.createdAt) + ' · ' + (A.NOTESRC[n.source] || '') + '</span></span></label>';
        }).join('') + '</div>';
        var cnt = Object.keys(st.sel).filter(function (k) { return st.sel[k]; }).length;
        h += '<div class="bulkbar"><span class="bb-n">已选 ' + cnt + ' 条</span>' +
          '<button class="btn" data-bb="todo">批量转待办</button>' +
          '<button class="btn" data-bb="archive">批量归档</button>' +
          '<button class="btn" data-bb="del">删除</button></div>';
      } else {
        h += '<div class="grid" style="gap:11px">' +
          (list.length ? list.map(noteCard).join('') : A.ui.empty('📝', '还没有随手记，想到什么先记下来')) + '</div>';
      }
      return h;
    },
    mount: function (root) {
      var picker = A.ui.imagePicker(draftImgs);
      // 用现有容器渲染缩略图
      var box = A.$('[data-qimgs]', root);
      function refreshThumbs() {
        box.innerHTML = draftImgs.map(function (src, i) {
          return '<div class="thumb"><img src="' + src + '"><button class="del" data-di="' + i + '" type="button">×</button></div>';
        }).join('');
      }
      refreshThumbs();
      box.addEventListener('click', function (e) {
        var b = e.target.closest('.del'); if (!b) return;
        draftImgs.splice(+b.getAttribute('data-di'), 1); refreshThumbs();
      });
      function addFiles(files) {
        var list = Array.prototype.slice.call(files).filter(function (f) { return /^image\//.test(f.type); });
        if (!list.length) return;
        var room = Math.max(0, 9 - draftImgs.length);
        Promise.all(list.slice(0, room).map(function (f) { return A.readImage(f); })).then(function (arr) {
          draftImgs = draftImgs.concat(arr); refreshThumbs(); A.toast('已添加 ' + arr.length + ' 张图片');
        });
      }
      A.notesAddFiles = addFiles;
      void picker;

      var ta = A.$('[data-qtext]', root), fi = A.$('[data-qfile]', root);
      A.$('[data-qpick]', root).onclick = function () { fi.click(); };
      fi.onchange = function () { addFiles(fi.files); fi.value = ''; };

      function save() {
        var text = ta.value.trim();
        if (!text && !draftImgs.length) { A.toast('写点什么，或者贴张图', 'warn'); return; }
        var n = A.addNote({
          text: text,
          source: A.$('[name=qsource]', root).value,
          projectId: A.$('[name=qproject]', root).value,
          images: draftImgs.slice()
        });
        draftImgs = [];
        A.toast('已存入随手记', 'ok');
        setTimeout(function () { suggest(n.id); }, 200);
      }
      A.$('[data-qsave]', root).onclick = save;
      ta.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') save(); });
      ta.addEventListener('paste', function (e) {
        var items = (e.clipboardData || {}).items || [], files = [];
        for (var i = 0; i < items.length; i++) if (items[i].kind === 'file') files.push(items[i].getAsFile());
        if (files.length) { e.preventDefault(); addFiles(files); }
      });

      A.on(root, 'click', '[data-f] button', function (e, b) { st.filter = b.getAttribute('data-v'); A.render(); });
      A.on(root, 'click', '[data-bulk]', function () { st.bulk = !st.bulk; st.sel = {}; A.render(); });
      A.on(root, 'click', '[data-pick]', function (e, el) { e.preventDefault(); st.sel[el.getAttribute('data-pick')] = !st.sel[el.getAttribute('data-pick')]; A.render(); });
      A.on(root, 'click', '[data-img]', function (e, el) { A.lightbox(el.getAttribute('data-img')); });

      A.on(root, 'click', '[data-bb]', function (e, b) {
        var ids = Object.keys(st.sel).filter(function (k) { return st.sel[k]; });
        if (!ids.length) { A.toast('请先勾选', 'warn'); return; }
        var act = b.getAttribute('data-bb');
        if (act === 'todo') {
          var made = 0;
          ids.forEach(function (id) {
            var n = A.store.note(id); if (!n || n.status === 'converted') return;
            var r = A.analyzeNote(n);
            var t = A.store.saveTodo({
              title: r.title, source: r.source, priority: r.priority,
              due: r.due ? r.due.date : A.today(), dueTime: '',
              projectIds: r.project ? [r.project.id] : (n.projectId ? [n.projectId] : []),
              status: 'todo', remind: ['d0'], note: '来自随手记'
            });
            n.status = 'converted'; n.todoId = t.id;
            if (!n.projectId && r.project) n.projectId = r.project.id;
            made++;
          });
          A.store.save(); st.sel = {}; A.toast('已生成 ' + made + ' 条待办', 'ok'); A.render();
          return;
        }
        if (act === 'archive') {
          ids.forEach(function (id) { var n = A.store.note(id); if (n) n.status = 'archived'; });
          A.store.save(); st.sel = {}; A.toast('已归档'); A.render(); return;
        }
        A.confirm({ title: '删除随手记', text: '将删除 ' + ids.length + ' 条，确定？', okText: '删除', danger: true }).then(function (ok) {
          if (!ok) return;
          ids.forEach(function (id) { A.store.removeNote(id); });
          st.sel = {}; A.toast('已删除'); A.render();
        });
      });

      A.on(root, 'click', '[data-note] [data-act]', function (e, b) {
        var card = b.closest('[data-note]'), id = card.getAttribute('data-note');
        var act = b.getAttribute('data-act'), n = A.store.note(id);
        if (!n) return;
        if (act === 'toTodo') return A.noteToTodo(id);
        if (act === 'openTodo') { A.go('todos'); return; }
        if (act === 'link') { n.projectId = b.getAttribute('data-pid'); A.store.save(); A.toast('已关联项目', 'ok'); return; }
        if (act === 'archive') { n.status = 'archived'; A.store.save(); A.toast('已归档'); return; }
        if (act === 'edit') return editNote(id);
        if (act === 'del') {
          A.confirm({ title: '删除随手记', text: '确定删除这条随手记？', okText: '删除', danger: true }).then(function (ok) {
            if (ok) { A.store.removeNote(id); A.toast('已删除'); }
          });
        }
      });
    }
  };

  function editNote(id) {
    var n = A.store.note(id); if (!n) return;
    var picker = A.ui.imagePicker(n.images || []);
    A.modal({
      title: '编辑随手记',
      body: A.f.textarea('text', n.text, '', 4) +
        '<div class="row2 mt10">' + A.f.select('source', A.NOTESRC, n.source) + A.f.projectSelect('projectId', n.projectId) + '</div>' +
        '<div class="mt10">' + picker.html() + '</div>' +
        A.f.field('状态', A.f.pills('status', { raw: '未整理', converted: '已转待办', archived: '已归档' }, n.status)),
      footer: '<button class="btn" data-close>取消</button><button class="btn btn-primary" data-save>保存</button>',
      onMount: function (m, close) {
        picker.bind(m); A.f.bindPills(m);
        A.$('[data-save]', m).onclick = function () {
          var v = A.f.read(m);
          n.text = v.text; n.source = v.source; n.projectId = v.projectId; n.status = v.status || n.status;
          n.images = picker.images();
          A.store.save(); close(); A.toast('已保存', 'ok');
        };
      }
    });
  }

})(window.App);
