/* 通讯录模块（仅自己可见） */
(function (A) {
  'use strict';

  var st = { role: '', q: '', pid: '' };

  A.contactForm = function (ct, defaults) {
    var isNew = !ct;
    var c = ct ? A.clone(ct) : Object.assign({
      name: '', company: '', role: 'owner', phone: '', wechat: '', projectIds: [], pref: '', lastContact: new Date().toISOString()
    }, defaults || {});
    var projDict = {}; A.store.projects().forEach(function (p) { projDict[p.id] = p.short || p.name; });

    A.modal({
      title: isNew ? '新增联系人' : '编辑联系人',
      body: '<div class="row2">' + A.f.field('姓名', A.f.input('name', c.name, ''), true) +
        A.f.field('公司/单位', A.f.input('company', c.company, ''), true) + '</div>' +
        A.f.field('角色类型', A.f.pills('role', A.ROLES, c.role), true) +
        '<div class="row2">' + A.f.field('电话', A.f.input('phone', c.phone, '', 'tel'), true) +
        A.f.field('微信', A.f.input('wechat', c.wechat, '')) + '</div>' +
        A.f.field('关联项目', Object.keys(projDict).length ? A.f.multiPills('projectIds', projDict, c.projectIds || []) : '<span class="muted small">暂无项目</span>') +
        A.f.field('沟通偏好备注', A.f.textarea('pref', c.pref, '如：只认微信、周末别打、找他要先找XX', 2)),
      footer: (isNew ? '' : '<button class="btn btn-danger" data-del>删除</button>') +
        '<span style="flex:1"></span><button class="btn" data-close>取消</button><button class="btn btn-primary" data-save>保存</button>',
      onMount: function (m, close) {
        A.f.bindPills(m);
        A.$('[data-save]', m).onclick = function () {
          var v = A.f.read(m);
          if (!v.name.trim() || !v.phone.trim()) { A.toast('姓名和电话必填', 'warn'); return; }
          Object.assign(c, {
            name: v.name.trim(), company: v.company.trim(), role: v.role,
            phone: v.phone.trim(), wechat: v.wechat, projectIds: v.projectIds || [], pref: v.pref
          });
          A.store.saveContact(c); close(); A.toast('已保存', 'ok');
        };
        var del = A.$('[data-del]', m);
        if (del) del.onclick = function () {
          close();
          A.confirm({ title: '删除联系人', text: '确定删除 ' + c.name + '？', okText: '删除', danger: true })
            .then(function (ok) { if (ok) { A.store.removeContact(c.id); A.toast('已删除'); } });
        };
      }
    });
  };

  A.views = A.views || {};
  A.views.contacts = {
    title: '通讯录',
    sub: function () {
      var cold = A.store.coldOwners().length;
      return A.store.contacts().length + ' 位联系人' + (cold ? ' · ' + cold + ' 位业主超30天未联系' : '');
    },
    render: function () {
      var list = A.store.contacts().filter(function (c) {
        if (st.role && c.role !== st.role) return false;
        if (st.pid && (c.projectIds || []).indexOf(st.pid) < 0) return false;
        if (st.q) {
          var q = st.q.toLowerCase();
          return (c.name + c.company + c.phone + (c.wechat || '')).toLowerCase().indexOf(q) >= 0;
        }
        return true;
      }).sort(function (a, b) { return b.lastContact < a.lastContact ? -1 : 1; });

      var roles = Object.assign({ '': '全部' }, A.ROLES);
      var h = '<div class="filters">' +
        '<div class="searchbox"><svg viewBox="0 0 24 24" class="ic"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
        '<input placeholder="搜索姓名 / 公司 / 电话…" value="' + A.esc(st.q) + '" data-q></div>' +
        A.f.projectSelect('pf', st.pid, '全部项目').replace('class="sel"', 'class="sel" style="width:auto"') +
        '<button class="btn btn-sm btn-primary" data-new>+ 新增</button></div>' +
        '<div class="filters"><div class="seg" data-role>' + Object.keys(roles).map(function (k) {
          return '<button data-v="' + k + '" class="' + (st.role === k ? 'on' : '') + '">' + roles[k] + '</button>';
        }).join('') + '</div></div>';

      h += '<div>' + (list.length ? list.map(function (c) {
        var days = A.diffDays(A.today(), A.dkey(c.lastContact));
        var cold = c.role === 'owner' && days > 30;
        return '<div class="lrow" data-ct="' + c.id + '">' + A.ui.avatar(c.name) +
          '<div class="lrow-main"><div class="lrow-t">' + A.esc(c.name) +
          ' <span class="tag">' + A.esc(A.ROLES[c.role]) + '</span>' +
          (cold ? ' <span class="tag tag-warn">' + days + '天未联系</span>' : '') + '</div>' +
          '<div class="lrow-s">' + A.esc(c.company) + ' · ' + A.esc(c.phone) +
          ((c.projectIds || []).length ? ' · ' + c.projectIds.map(function (p) { return A.store.projectName(p); }).filter(Boolean).join('/') : '') + '</div>' +
          (c.pref ? '<div class="lrow-s" style="color:var(--warn)">💬 ' + A.esc(c.pref) + '</div>' : '') +
          '</div>' +
          '<div class="lrow-act">' +
          '<button class="mini-btn" data-call="' + A.esc(c.phone) + '" data-id="' + c.id + '">📞 拨号</button>' +
          (c.wechat ? '<button class="mini-btn" data-wx="' + A.esc(c.wechat) + '">复制微信</button>' : '') +
          '<button class="mini-btn" data-edit="' + c.id + '">编辑</button>' +
          '</div></div>';
      }).join('') : A.ui.empty('📇', '还没有联系人')) + '</div>';
      return h;
    },
    mount: function (root) {
      var q = A.$('[data-q]', root);
      if (q) q.addEventListener('input', A.debounce(function () { st.q = q.value; A.render(); var el = A.$('[data-q]'); if (el) el.focus(); }, 260));
      A.on(root, 'click', '[data-role] button', function (e, b) { st.role = b.getAttribute('data-v'); A.render(); });
      var pf = A.$('[name=pf]', root); if (pf) pf.onchange = function () { st.pid = pf.value; A.render(); };
      A.on(root, 'click', '[data-new]', function () { A.contactForm(null); });
      A.on(root, 'click', '[data-edit]', function (e, el) {
        e.stopPropagation(); A.contactForm(A.store.contact(el.getAttribute('data-edit')));
      });
      A.on(root, 'click', '[data-call]', function (e, el) {
        e.stopPropagation();
        A.store.touchContact(el.getAttribute('data-id'));
        window.location.href = 'tel:' + el.getAttribute('data-call');
      });
      A.on(root, 'click', '[data-wx]', function (e, el) {
        e.stopPropagation();
        A.copy(el.getAttribute('data-wx')).then(function () { A.toast('微信号已复制', 'ok'); });
      });
      A.on(root, 'click', '[data-ct]', function (e, el) {
        if (e.target.closest('button')) return;
        A.contactForm(A.store.contact(el.getAttribute('data-ct')));
      });
    }
  };

})(window.App);
