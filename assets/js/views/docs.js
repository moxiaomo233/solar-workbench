/* 文档库模块 */
(function (A) {
  'use strict';

  var st = { q: '', type: '', pid: '' };

  var ICON = { contract: '📄', filing: '🗂', tech: '📐', build: '🔧', meeting: '📝', other: '📎' };

  A.docRowHTML = function (d) {
    var exp = '';
    if (d.expireDate) {
      var n = A.diffDays(d.expireDate, A.today());
      exp = n < 0 ? '<span class="tag tag-danger">已过期' + (-n) + '天</span>'
        : n <= 30 ? '<span class="tag ' + (n <= 7 ? 'tag-danger' : 'tag-warn') + '">' + n + '天后到期</span>'
          : '<span class="tag">到期 ' + A.fmtDate(d.expireDate) + '</span>';
    }
    return '<div class="lrow" data-doc="' + d.id + '" style="cursor:pointer">' +
      '<div class="avatar" style="background:#eef3ff;color:#2563eb;font-size:17px">' + (ICON[d.type] || '📎') + '</div>' +
      '<div class="lrow-main"><div class="lrow-t">' + A.esc(d.name) + (d.version ? ' <span class="tag">' + A.esc(d.version) + '</span>' : '') + ' ' + exp + '</div>' +
      '<div class="lrow-s">' + A.esc(A.DOCTYPE[d.type] || '') + ' · ' + A.esc(A.store.projectName(d.projectId) || '未关联') +
      ' · ' + A.fileSize(d.size || 0) + ' · ' + A.relTime(d.createdAt) + '</div></div>' +
      '<div class="lrow-act">' + (d.dataUrl ? '<button class="mini-btn" data-dl="' + d.id + '">下载</button>' : '') +
      '<button class="mini-btn" data-dedit="' + d.id + '">编辑</button></div></div>';
  };

  A.docForm = function (doc, defaults) {
    var isNew = !doc;
    var d = doc ? A.clone(doc) : Object.assign({
      name: '', projectId: '', type: 'contract', version: '', fileName: '', size: 0, dataUrl: '', expireDate: ''
    }, defaults || {});
    var picked = null;

    A.modal({
      title: isNew ? '上传文档' : '编辑文档',
      body: A.f.field('文档名称', A.f.input('name', d.name, '如：平湖项目EPC总承包合同'), true) +
        '<div class="row2">' + A.f.field('所属项目', A.f.projectSelect('projectId', d.projectId, '请选择项目'), true) +
        A.f.field('文档类型', A.f.select('type', A.DOCTYPE, d.type), true) + '</div>' +
        '<div class="row2">' + A.f.field('版本号', A.f.input('version', d.version, '如 V1.0')) +
        A.f.field('到期提醒日（合同类）', '<input class="inp" type="date" name="expireDate" value="' + A.esc(d.expireDate || '') + '">') + '</div>' +
        A.f.field('文件', '<div class="flex gap6 center"><button class="btn btn-sm" data-pick type="button">选择文件</button>' +
          '<span class="small muted" data-fname>' + A.esc(d.fileName || '未选择（支持 PDF / 图片 / Word / Excel）') + '</span></div>' +
          '<div class="small muted mt6">提示：本地演示模式下，小于 500KB 的文件会保存内容以便下载，大文件仅登记信息。</div>') +
        '<input type="file" hidden data-file>',
      footer: (isNew ? '' : '<button class="btn btn-danger" data-del>删除</button>') +
        '<span style="flex:1"></span><button class="btn" data-close>取消</button><button class="btn btn-primary" data-save>保存</button>',
      onMount: function (m, close) {
        var fi = A.$('[data-file]', m);
        A.$('[data-pick]', m).onclick = function () { fi.click(); };
        fi.onchange = function () {
          var f = fi.files[0]; if (!f) return;
          picked = f;
          A.$('[data-fname]', m).textContent = f.name + ' (' + A.fileSize(f.size) + ')';
          if (!A.$('input[name=name]', m).value) A.$('input[name=name]', m).value = f.name.replace(/\.[^.]+$/, '');
        };
        A.$('[data-save]', m).onclick = function () {
          var v = A.f.read(m);
          if (!v.name.trim()) { A.toast('请填写文档名称', 'warn'); return; }
          if (!v.projectId) { A.toast('请选择所属项目', 'warn'); return; }
          Object.assign(d, {
            name: v.name.trim(), projectId: v.projectId, type: v.type,
            version: v.version, expireDate: v.expireDate || ''
          });
          function finish() { A.store.saveDoc(d); close(); A.toast('已保存', 'ok'); }
          if (picked) {
            d.fileName = picked.name; d.size = picked.size;
            if (picked.size <= 512000) {
              var fr = new FileReader();
              fr.onload = function () { d.dataUrl = fr.result; finish(); };
              fr.onerror = function () { d.dataUrl = ''; finish(); };
              fr.readAsDataURL(picked);
              return;
            }
            d.dataUrl = '';
          }
          finish();
        };
        var del = A.$('[data-del]', m);
        if (del) del.onclick = function () {
          close();
          A.confirm({ title: '删除文档', text: '确定删除「' + d.name + '」？', okText: '删除', danger: true })
            .then(function (ok) { if (ok) { A.store.removeDoc(d.id); A.toast('已删除'); } });
        };
      }
    });
  };

  A.docMenu = function (id) {
    var d = A.store.docs().filter(function (x) { return x.id === id; })[0];
    if (d) A.docForm(d);
  };

  function download(d) {
    if (!d.dataUrl) { A.toast('该文件仅登记了信息，未保存内容', 'warn'); return; }
    var a = document.createElement('a');
    a.href = d.dataUrl; a.download = d.fileName || d.name;
    document.body.appendChild(a); a.click(); a.remove();
  }

  A.views = A.views || {};
  A.views.docs = {
    title: '文档库',
    sub: function () {
      var e = A.store.expiringDocs().length;
      return A.store.docs().length + ' 份文档' + (e ? ' · ' + e + ' 份临近到期' : '');
    },
    render: function () {
      var list = A.store.docs().filter(function (d) {
        if (st.type && d.type !== st.type) return false;
        if (st.pid && d.projectId !== st.pid) return false;
        if (st.q) {
          var q = st.q.toLowerCase();
          return (d.name + (d.fileName || '')).toLowerCase().indexOf(q) >= 0;
        }
        return true;
      });

      var exp = A.store.expiringDocs();
      var h = '<div class="filters">' +
        '<div class="searchbox"><svg viewBox="0 0 24 24" class="ic"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
        '<input placeholder="搜索文档名称…" value="' + A.esc(st.q) + '" data-q></div>' +
        A.f.select('tf', Object.assign({ '': '全部类型' }, A.DOCTYPE), st.type).replace('class="sel"', 'class="sel" style="width:auto"') +
        A.f.projectSelect('pf', st.pid, '全部项目').replace('class="sel"', 'class="sel" style="width:auto"') +
        '<button class="btn btn-sm btn-primary" data-new>+ 上传文档</button></div>';

      if (exp.length) {
        h += '<div class="card mb14" style="padding:12px;border-color:#fbdcc4;background:var(--warn-soft)">' +
          '<div class="bold small" style="color:#c2410c;margin-bottom:6px">⏰ 到期提醒</div>' +
          exp.map(function (d) {
            var n = A.diffDays(d.expireDate, A.today());
            return '<div class="small" style="padding:2px 0">· ' + A.esc(d.name) + ' —— ' + (n < 0 ? '已过期 ' + (-n) + ' 天' : n + ' 天后到期') + '（' + A.fmtDate(d.expireDate) + '）</div>';
          }).join('') + '</div>';
      }

      // 按项目分组
      var groups = {};
      list.forEach(function (d) { (groups[d.projectId] = groups[d.projectId] || []).push(d); });
      var keys = Object.keys(groups);
      h += keys.length ? keys.map(function (pid) {
        var byType = {};
        groups[pid].forEach(function (d) { (byType[d.type] = byType[d.type] || []).push(d); });
        return '<div class="sec"><div class="sec-head"><span class="sec-bar"></span><h2>' +
          A.esc(A.store.projectName(pid) || '未关联项目') + '</h2><span class="sec-count">' + groups[pid].length + ' 份</span></div>' +
          Object.keys(byType).map(function (t) {
            return '<div class="small muted mb8" style="margin-top:8px">' + A.esc(A.DOCTYPE[t]) + '</div>' +
              byType[t].map(A.docRowHTML).join('');
          }).join('') + '</div>';
      }).join('') : A.ui.empty('📁', '还没有文档');
      return h;
    },
    mount: function (root) {
      var q = A.$('[data-q]', root);
      if (q) q.addEventListener('input', A.debounce(function () { st.q = q.value; A.render(); var el = A.$('[data-q]'); if (el) el.focus(); }, 260));
      var tf = A.$('[name=tf]', root); if (tf) tf.onchange = function () { st.type = tf.value; A.render(); };
      var pf = A.$('[name=pf]', root); if (pf) pf.onchange = function () { st.pid = pf.value; A.render(); };
      A.on(root, 'click', '[data-new]', function () { A.docForm(null, { projectId: st.pid }); });
      A.on(root, 'click', '[data-dedit]', function (e, el) { e.stopPropagation(); A.docForm(A.store.docs().filter(function (d) { return d.id === el.getAttribute('data-dedit'); })[0]); });
      A.on(root, 'click', '[data-dl]', function (e, el) {
        e.stopPropagation();
        download(A.store.docs().filter(function (d) { return d.id === el.getAttribute('data-dl'); })[0]);
      });
      A.on(root, 'click', '[data-doc]', function (e, el) {
        if (e.target.closest('button')) return;
        A.docForm(A.store.docs().filter(function (d) { return d.id === el.getAttribute('data-doc'); })[0]);
      });
    }
  };

})(window.App);
