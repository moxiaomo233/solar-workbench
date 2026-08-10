/* 现场速记模块 */
(function (A) {
  'use strict';

  var st = { type: '', pid: '' };

  var TYPE_COLOR = { survey: '#2563eb', progress: '#f97316', issue: '#dc2626', accept: '#16a34a' };

  A.sitelogCardHTML = function (l) {
    var p = A.store.project(l.projectId);
    return '<div class="note-card" data-log="' + l.id + '" style="cursor:pointer">' +
      '<div class="note-head">' +
      '<span class="tag" style="background:' + TYPE_COLOR[l.type] + '18;color:' + TYPE_COLOR[l.type] + ';border-color:' + TYPE_COLOR[l.type] + '33">' + A.esc(A.LOGTYPE[l.type]) + '</span>' +
      (p ? '<span class="tag tag-proj">' + A.esc(p.short || p.name) + '</span>' : '') +
      (l.severity ? '<span class="tag ' + (l.severity === '严重' ? 'tag-danger' : l.severity === '一般' ? 'tag-warn' : '') + '">' + A.esc(l.severity) + '</span>' : '') +
      '<span style="flex:1"></span><span class="note-time">' + A.relTime(l.createdAt) + '</span></div>' +
      (l.text ? '<div class="note-text">' + A.esc(l.text) + '</div>' : '') +
      (l.survey ? '<div class="ai-box" style="background:#f2f7ff;border-color:#dbe6ff"><div class="ai-kv">' +
        '<span class="tag">面积 ' + A.esc(l.survey.area || '-') + '㎡</span>' +
        '<span class="tag">' + A.esc(l.survey.roofType || '') + '</span>' +
        '<span class="tag">朝向' + A.esc(l.survey.orient || '') + '</span>' +
        '<span class="tag">' + A.esc(l.survey.shade || '') + '</span>' +
        '<span class="tag ' + (l.survey.attitude === '积极' ? 'tag-ok' : l.survey.attitude === '拒绝' ? 'tag-danger' : 'tag-warn') + '">业主' + A.esc(l.survey.attitude || '') + '</span>' +
        '</div>' + (l.survey.assess ? '<div class="small" style="color:var(--ink2)">' + A.esc(l.survey.assess) + '</div>' : '') + '</div>' : '') +
      (l.images && l.images.length ? '<div class="note-imgs">' + l.images.map(function (s) { return '<img src="' + s + '" alt="">'; }).join('') + '</div>' : '') +
      (l.location ? '<div class="small muted mt6">📍 ' + A.esc(l.location) + '</div>' : '') +
      '</div>';
  };

  A.sitelogForm = function (log, defaults) {
    var isNew = !log;
    var l = log ? A.clone(log) : Object.assign({
      projectId: '', type: 'progress', images: [], voiceText: '', text: '', location: '', severity: '', survey: null
    }, defaults || {});
    var picker = A.ui.imagePicker(l.images || []);

    var body =
      A.f.field('关联项目', A.f.projectSelect('projectId', l.projectId, '请选择项目'), true) +
      A.f.field('记录类型', A.f.pills('type', A.LOGTYPE, l.type), true) +
      '<div data-survey class="' + (l.type === 'survey' ? '' : 'hidden') + '">' +
      '<div class="card" style="padding:12px;background:#f8fafd;margin-bottom:13px">' +
      '<div class="small bold mb8">勘察模板</div>' +
      '<div class="row2">' +
      A.f.field('屋顶面积(㎡)', A.f.input('area', (l.survey || {}).area, '', 'number')) +
      A.f.field('屋顶类型', A.f.select('roofType', { '平屋顶': '平屋顶', '斜屋顶': '斜屋顶', '其他': '其他' }, (l.survey || {}).roofType)) +
      '</div>' +
      '<div class="row2">' +
      A.f.field('朝向', A.f.select('orient', { '南': '南', '东南': '东南', '西南': '西南', '东': '东', '西': '西', '北': '北' }, (l.survey || {}).orient)) +
      A.f.field('遮挡情况', A.f.select('shade', { '无遮挡': '无遮挡', '轻微遮挡': '轻微遮挡', '严重遮挡': '严重遮挡' }, (l.survey || {}).shade)) +
      '</div>' +
      A.f.field('业主态度', A.f.pills('attitude', { '积极': '积极', '犹豫': '犹豫', '拒绝': '拒绝' }, (l.survey || {}).attitude || '积极')) +
      A.f.field('初步评估', A.f.textarea('assess', (l.survey || {}).assess, '初步判断和建议…', 2)) +
      '</div></div>' +
      '<div data-issue class="' + (l.type === 'issue' ? '' : 'hidden') + '">' +
      A.f.field('问题严重程度', A.f.pills('severity', { '轻微': '轻微', '一般': '一般', '严重': '严重' }, l.severity || '一般')) +
      (isNew ? '<label class="flex center gap6 small mb14"><input type="checkbox" name="toTodo" checked> 同步到待办（自动创建一条待处理事项）</label>' : '') +
      '</div>' +
      A.f.field('文字补充 / 语音转文字', A.f.textarea('text', l.text, '现场情况描述…', 3)) +
      A.f.field('照片（最多9张）', picker.html() +
        '<div class="mt6 flex gap6"><button class="btn btn-sm" data-pick type="button">📎 选择照片</button>' +
        '<button class="btn btn-sm" data-cam type="button">📷 拍照</button>' +
        '<button class="btn btn-sm" data-voice type="button">🎙 语音输入</button></div>') +
      A.f.field('定位', '<div class="flex gap6"><input class="inp" name="location" value="' + A.esc(l.location) + '" placeholder="现场位置">' +
        '<button class="btn" data-gps type="button" style="flex:0 0 auto">定位</button></div>') +
      '<input type="file" accept="image/*" multiple hidden data-file><input type="file" accept="image/*" capture="environment" hidden data-camfile>';

    A.modal({
      title: isNew ? '新建现场速记' : '编辑现场速记',
      wide: true,
      body: body,
      footer: '<button class="btn" data-close>取消</button><button class="btn btn-primary" data-save>保存</button>',
      onMount: function (m, close) {
        picker.bind(m); A.f.bindPills(m);
        var fi = A.$('[data-file]', m), cf = A.$('[data-camfile]', m);
        A.$('[data-pick]', m).onclick = function () { fi.click(); };
        A.$('[data-cam]', m).onclick = function () { cf.click(); };
        fi.onchange = function () { picker.add(fi.files); fi.value = ''; };
        cf.onchange = function () { picker.add(cf.files); cf.value = ''; };

        A.$('[data-pills=type]', m).addEventListener('click', function () {
          var v = A.$('[data-pills=type]', m).getAttribute('data-value');
          A.$('[data-survey]', m).classList.toggle('hidden', v !== 'survey');
          A.$('[data-issue]', m).classList.toggle('hidden', v !== 'issue');
        });

        A.$('[data-gps]', m).onclick = function () {
          if (!navigator.geolocation) { A.toast('当前环境不支持定位', 'warn'); return; }
          A.toast('定位中…');
          navigator.geolocation.getCurrentPosition(function (pos) {
            A.$('input[name=location]', m).value = '经度 ' + pos.coords.longitude.toFixed(5) + '，纬度 ' + pos.coords.latitude.toFixed(5);
            A.toast('已获取定位', 'ok');
          }, function () { A.toast('定位失败，请手动填写', 'warn'); }, { timeout: 8000 });
        };

        A.$('[data-voice]', m).onclick = function () {
          var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
          var ta = A.$('textarea[name=text]', m);
          if (!SR) { A.toast('当前浏览器不支持语音识别，请直接输入', 'warn'); ta.focus(); return; }
          var rec = new SR(); rec.lang = 'zh-CN'; rec.interimResults = false;
          A.toast('请说话…');
          rec.onresult = function (e) { ta.value += e.results[0][0].transcript; A.toast('已转为文字', 'ok'); };
          rec.onerror = function () { A.toast('识别失败', 'warn'); };
          rec.start();
        };

        A.$('[data-save]', m).onclick = function () {
          var v = A.f.read(m);
          if (!v.projectId) { A.toast('请选择关联项目', 'warn'); return; }
          l.projectId = v.projectId; l.type = v.type; l.text = v.text; l.location = v.location;
          l.images = picker.images();
          l.severity = v.type === 'issue' ? (v.severity || '一般') : '';
          l.survey = v.type === 'survey' ? {
            area: v.area, roofType: v.roofType, orient: v.orient, shade: v.shade,
            attitude: v.attitude, assess: v.assess
          } : null;
          var saved = A.store.saveSitelog(l);
          if (isNew && v.type === 'issue' && v.toTodo) {
            A.store.saveTodo({
              title: '处理现场问题：' + (v.text || '').slice(0, 24),
              source: 'self', priority: v.severity === '严重' ? 'P0' : 'P1',
              due: A.today(), dueTime: '', projectIds: [v.projectId], status: 'todo',
              remind: ['d0'], note: '来自现场速记 · ' + (v.severity || '')
            });
            A.toast('已同步创建待办', 'ok');
          }
          void saved;
          close(); A.toast(isNew ? '现场记录已保存' : '已更新', 'ok');
        };
      }
    });
  };

  A.sitelogDetail = function (id) {
    var l = A.store.sitelogs().filter(function (x) { return x.id === id; })[0];
    if (!l) return;
    A.modal({
      title: A.LOGTYPE[l.type] + ' · ' + A.store.projectName(l.projectId),
      body: A.sitelogCardHTML(l).replace('cursor:pointer', ''),
      footer: '<button class="btn btn-danger" data-del>删除</button><span style="flex:1"></span>' +
        '<button class="btn" data-close>关闭</button><button class="btn btn-primary" data-edit>编辑</button>',
      onMount: function (m, close) {
        A.$('[data-edit]', m).onclick = function () { close(); A.sitelogForm(l); };
        A.$('[data-del]', m).onclick = function () {
          close();
          A.confirm({ title: '删除记录', text: '确定删除这条现场记录？', okText: '删除', danger: true })
            .then(function (ok) { if (ok) { A.store.removeSitelog(id); A.toast('已删除'); } });
        };
        A.on(m, 'click', '.note-imgs img', function (e, el) { A.lightbox(el.getAttribute('src')); });
      }
    });
  };

  A.views = A.views || {};
  A.views.sitelogs = {
    title: '现场速记',
    sub: function () { return '共 ' + A.store.sitelogs().length + ' 条现场记录'; },
    render: function () {
      var list = A.store.sitelogs().filter(function (l) {
        if (st.type && l.type !== st.type) return false;
        if (st.pid && l.projectId !== st.pid) return false;
        return true;
      });
      var types = Object.assign({ '': '全部' }, A.LOGTYPE);
      var h = '<div class="filters"><div class="seg" data-tp>' + Object.keys(types).map(function (k) {
        return '<button data-v="' + k + '" class="' + (st.type === k ? 'on' : '') + '">' + types[k] + '</button>';
      }).join('') + '</div>' +
        A.f.projectSelect('pfilter', st.pid, '全部项目').replace('class="sel"', 'class="sel" style="width:auto"') +
        '<span style="flex:1"></span><button class="btn btn-sm btn-primary" data-new>+ 新建速记</button></div>';
      h += '<div class="grid g2" style="align-items:start">' + (list.length ? list.map(A.sitelogCardHTML).join('') : A.ui.empty('📷', '还没有现场记录')) + '</div>';
      return h;
    },
    mount: function (root) {
      A.on(root, 'click', '[data-tp] button', function (e, b) { st.type = b.getAttribute('data-v'); A.render(); });
      var sel = A.$('[name=pfilter]', root); if (sel) sel.onchange = function () { st.pid = sel.value; A.render(); };
      A.on(root, 'click', '[data-new]', function () { A.sitelogForm(null, { projectId: st.pid }); });
      A.on(root, 'click', '[data-log]', function (e, el) { A.sitelogDetail(el.getAttribute('data-log')); });
    }
  };

})(window.App);
