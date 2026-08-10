/* 云同步：以 GitHub 私有仓库为云端存储
 * 策略：记录级时间戳（_ua）+ 删除墓碑（_del）+ 三方合并，避免多端互相覆盖
 * 通道：api.github.com（国内可达，github.com 常被阻断，故不使用 git 协议）
 */
(function (A) {
  'use strict';

  var CFGKEY = 'pv_sync_cfg';       // 同步配置（含令牌），本机独有，不参与同步
  var API = 'https://api.github.com';
  var COLLS = ['projects', 'todos', 'notes', 'contacts', 'sitelogs', 'docs', 'commissions'];
  var TOMB_KEEP = 60 * 24 * 3600 * 1000;   // 墓碑保留 60 天
  var POLL = 12000;                         // 轮询间隔（带 ETag，命中 304 不消耗额度）
  var PUSH_DELAY = 2500;                    // 本地改动后延迟推送

  var Sync = A.sync = {};
  var cfg = null;
  var etag = '';
  var busy = false;
  var applying = false;     // 正在写入远端数据，避免触发回推死循环
  var dirty = false;
  var timer = null, pushTimer = null;
  var state = { s: 'off', msg: '未开启' };

  /* ---------------- 编解码 ---------------- */
  function b64enc(str) {
    var b = new TextEncoder().encode(str), s = '';
    for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s);
  }
  function b64dec(s) {
    var bin = atob(String(s || '').replace(/\s+/g, ''));
    var b = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(b);
  }
  // 令牌轻度混淆：防的是「被人瞄一眼」，不是真加密
  var OBK = 'pv-workbench-sync-2026';
  function ob(s) {
    var o = '';
    for (var i = 0; i < s.length; i++) o += String.fromCharCode(s.charCodeAt(i) ^ OBK.charCodeAt(i % OBK.length));
    return b64enc(o);
  }
  function deob(s) {
    try {
      var d = b64dec(s), o = '';
      for (var i = 0; i < d.length; i++) o += String.fromCharCode(d.charCodeAt(i) ^ OBK.charCodeAt(i % OBK.length));
      return o;
    } catch (e) { return ''; }
  }

  /* ---------------- 配置 ---------------- */
  function defCfg() {
    return {
      token: '', owner: '', repo: 'solar-workbench-data', path: 'data.json',
      branch: 'main', on: false, sha: '', last: 0,
      device: (navigator.userAgent.indexOf('Mobile') >= 0 ? '手机' : '电脑') + '-' + Math.random().toString(36).slice(2, 6)
    };
  }
  function loadCfg() {
    var d = defCfg();
    try {
      var raw = localStorage.getItem(CFGKEY);
      if (raw) {
        var o = JSON.parse(raw);
        Object.keys(d).forEach(function (k) { if (o[k] !== undefined) d[k] = o[k]; });
        d.token = o.tk ? deob(o.tk) : '';
      }
    } catch (e) { }
    cfg = d;
    return d;
  }
  function saveCfg() {
    var o = {};
    Object.keys(cfg).forEach(function (k) { if (k !== 'token') o[k] = cfg[k]; });
    o.tk = cfg.token ? ob(cfg.token) : '';
    try { localStorage.setItem(CFGKEY, JSON.stringify(o)); } catch (e) { }
  }
  Sync.cfg = function () { return cfg || loadCfg(); };

  /* ---------------- HTTP ---------------- */
  function api(path, opt) {
    opt = opt || {};
    var h = { 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (cfg && cfg.token) h['Authorization'] = 'Bearer ' + cfg.token;
    if (opt.body) h['Content-Type'] = 'application/json';
    if (opt.headers) Object.keys(opt.headers).forEach(function (k) { h[k] = opt.headers[k]; });
    return fetch(API + path, {
      method: opt.method || 'GET',
      headers: h,
      body: opt.body ? JSON.stringify(opt.body) : undefined,
      cache: 'no-store'
    }).then(function (res) {
      if (res.status === 304) return { status: 304, data: null, res: res };
      return res.text().then(function (t) {
        var d = null;
        try { d = t ? JSON.parse(t) : null; } catch (e) { }
        return { status: res.status, data: d, res: res };
      });
    });
  }
  function errOf(r) {
    if (r.status === 401) return '令牌无效或已过期';
    if (r.status === 403) return '权限不足或触发频率限制';
    if (r.status === 404) return '找不到仓库或文件';
    var m = r.data && r.data.message ? r.data.message : ('HTTP ' + r.status);
    return m;
  }
  function contentsURL() {
    return '/repos/' + cfg.owner + '/' + cfg.repo + '/contents/' + cfg.path;
  }

  /* ---------------- 时间戳与墓碑 ---------------- */
  function now() { return Date.now(); }
  function ua(o) {
    if (!o) return 0;
    if (o._ua) return o._ua;
    var t = o.updatedAt || o.doneAt || o.createdAt || o.lastContact;
    var n = t ? Date.parse(t) : 0;
    return isNaN(n) ? 0 : n;
  }
  function tomb(coll, id) {
    var S = A.store.state();
    if (!S._del) S._del = {};
    if (!S._del[coll]) S._del[coll] = {};
    S._del[coll][id] = now();
  }
  function prune(S) {
    if (!S._del) return;
    var cut = now() - TOMB_KEEP;
    Object.keys(S._del).forEach(function (c) {
      Object.keys(S._del[c]).forEach(function (id) {
        if (S._del[c][id] < cut) delete S._del[c][id];
      });
    });
  }

  // 包装数据层写操作，自动打时间戳 / 记墓碑（不改动 store.js 本身）
  var SAVERS = ['saveProject', 'saveTodo', 'saveNote', 'saveContact', 'saveSitelog', 'saveDoc', 'saveCommission'];
  var REMOVERS = {
    removeProject: 'projects', removeTodo: 'todos', removeNote: 'notes',
    removeContact: 'contacts', removeSitelog: 'sitelogs', removeDoc: 'docs', removeCommission: 'commissions'
  };

  function instrument() {
    SAVERS.forEach(function (fn) {
      var orig = A.store[fn];
      if (typeof orig !== 'function') return;
      A.store[fn] = function (o) {
        if (o && typeof o === 'object') o._ua = now();
        return orig.apply(A.store, arguments);
      };
    });
    Object.keys(REMOVERS).forEach(function (fn) {
      var orig = A.store[fn], coll = REMOVERS[fn];
      if (typeof orig !== 'function') return;
      A.store[fn] = function (id) { tomb(coll, id); return orig.apply(A.store, arguments); };
    });

    var sts = A.store.setTodoStatus;
    if (sts) A.store.setTodoStatus = function (id) {
      var t = A.store.todo(id);
      if (t) t._ua = now();
      var S = A.store.state();
      Object.keys(S.plans || {}).forEach(function (k) {
        var pl = S.plans[k];
        if (pl && (pl.items || []).some(function (it) { return it.todoId === id; })) pl._ua = now();
      });
      return sts.apply(A.store, arguments);
    };

    var tc = A.store.touchContact;
    if (tc) A.store.touchContact = function (id) {
      var c = A.store.contact(id);
      if (c) c._ua = now();
      return tc.apply(A.store, arguments);
    };

    var tp = A.store.touchProjects;
    if (tp) A.store.touchProjects = function (ids) {
      (ids || []).forEach(function (pid) { var p = A.store.project(pid); if (p) p._ua = now(); });
      return tp.apply(A.store, arguments);
    };

    var sp = A.store.savePlan;
    if (sp) A.store.savePlan = function (day, plan) {
      if (plan && typeof plan === 'object') plan._ua = now();
      return sp.apply(A.store, arguments);
    };
  }

  /* ---------------- 三方合并 ---------------- */
  function merge(local, remote) {
    var out = JSON.parse(JSON.stringify(local));

    // 墓碑取并集（时间取较晚者）
    var del = {};
    COLLS.forEach(function (c) {
      del[c] = {};
      var a = (local._del && local._del[c]) || {}, b = (remote._del && remote._del[c]) || {};
      Object.keys(a).forEach(function (k) { del[c][k] = a[k]; });
      Object.keys(b).forEach(function (k) { del[c][k] = Math.max(del[c][k] || 0, b[k]); });
    });
    out._del = del;

    // 每个集合按 id 做「后写入者胜」，删除时间晚于修改时间才算真删
    COLLS.forEach(function (c) {
      var L = local[c] || [], R = remote[c] || [];
      var map = {}, order = [];
      L.forEach(function (o) { if (o && o.id) { map[o.id] = o; order.push(o.id); } });
      R.forEach(function (o) {
        if (!o || !o.id) return;
        if (!map[o.id]) { map[o.id] = o; order.push(o.id); }
        else if (ua(o) > ua(map[o.id])) map[o.id] = o;
      });
      out[c] = order.filter(function (id) {
        var t = del[c][id] || 0;
        return !(t && t >= ua(map[id]));
      }).map(function (id) { return map[id]; });
    });

    // 每日计划：按天取较新
    var plans = {};
    Object.keys(local.plans || {}).forEach(function (k) { plans[k] = local.plans[k]; });
    Object.keys(remote.plans || {}).forEach(function (k) {
      var r = remote.plans[k];
      if (!plans[k] || (r._ua || 0) > (plans[k]._ua || 0)) plans[k] = r;
    });
    out.plans = plans;

    // 设置：整体取较新的一份
    var ls = local.settings || {}, rs = remote.settings || {};
    out.settings = (rs._ua || 0) > (ls._ua || 0) ? rs : ls;

    return out;
  }

  Sync._merge = merge;   // 供自检使用
  Sync._ua = ua;

  // 把数据写入 store（保持 S 的引用不变）
  function adopt(data) {
    applying = true;
    var S = A.store.state();
    Object.keys(S).forEach(function (k) { delete S[k]; });
    Object.keys(data).forEach(function (k) { S[k] = data[k]; });
    A.store.save();
    applying = false;
    try { A.render && A.render(); } catch (e) { }
  }

  // 本机是否还是「未被动过的示例数据」
  function pristine(S) {
    return COLLS.every(function (c) {
      return (S[c] || []).every(function (o) { return !o._ua; });
    });
  }

  /* ---------------- 拉取 / 推送 ---------------- */
  function pull() {
    var url = contentsURL() + '?ref=' + encodeURIComponent(cfg.branch);
    return api(url, { headers: etag ? { 'If-None-Match': etag } : {} }).then(function (r) {
      if (r.status === 304) return { unchanged: true };
      if (r.status === 404) return { missing: true };
      if (r.status !== 200) throw new Error(errOf(r));
      etag = r.res.headers.get('ETag') || '';
      var d = r.data;
      cfg.sha = d.sha;
      if (d.content) return { data: JSON.parse(b64dec(d.content)), sha: d.sha };
      // 文件超过 1MB 时 contents 接口不返回内容，改用 blob 接口
      return api('/repos/' + cfg.owner + '/' + cfg.repo + '/git/blobs/' + d.sha).then(function (b) {
        if (b.status !== 200) throw new Error(errOf(b));
        return { data: JSON.parse(b64dec(b.data.content)), sha: d.sha };
      });
    });
  }

  function push(retry) {
    var S = A.store.state();
    prune(S);
    var body = {
      message: '同步 · ' + cfg.device + ' · ' + new Date().toLocaleString('zh-CN'),
      content: b64enc(JSON.stringify(S)),
      branch: cfg.branch
    };
    if (cfg.sha) body.sha = cfg.sha;
    return api(contentsURL(), { method: 'PUT', body: body }).then(function (r) {
      if (r.status === 200 || r.status === 201) {
        cfg.sha = r.data && r.data.content ? r.data.content.sha : cfg.sha;
        etag = '';
        dirty = false;
        return true;
      }
      // 409/422：远端已被其它设备改过，重新拉取合并再推
      if ((r.status === 409 || r.status === 422) && !retry) {
        return pull().then(function (p) {
          if (p.data) {
            adopt(merge(A.store.state(), p.data));
            cfg.sha = p.sha;
          }
          return push(true);
        });
      }
      throw new Error(errOf(r));
    });
  }

  /* ---------------- 同步主流程 ---------------- */
  function setState(s, msg) {
    state = { s: s, msg: msg || '' };
    paint();
  }

  function doSync() {
    if (!cfg.on || !cfg.token || !cfg.owner) return Promise.resolve();
    if (busy) return Promise.resolve();
    busy = true;
    setState('sync', '同步中…');
    return pull().then(function (p) {
      if (p.missing) { cfg.sha = ''; return push(); }
      if (p.unchanged) { return dirty ? push() : true; }

      var local = A.store.state();
      var merged = merge(local, p.data);
      var ml = JSON.stringify(merged);
      if (ml !== JSON.stringify(local)) adopt(merged);
      if (ml !== JSON.stringify(p.data)) return push();
      dirty = false;
      return true;
    }).then(function () {
      cfg.last = now(); saveCfg();
      setState('ok', '已同步');
    }).catch(function (e) {
      setState('err', e.message || '同步失败');
    }).then(function () { busy = false; });
  }
  Sync.now = doSync;

  function schedulePush() {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () { doSync(); }, PUSH_DELAY);
  }

  function startTimer() {
    clearInterval(timer);
    if (!cfg.on) return;
    timer = setInterval(function () {
      if (!document.hidden) doSync();
    }, POLL);
  }

  /* ---------------- 状态指示 ---------------- */
  var LABEL = { off: '未开启', ok: '已同步', sync: '同步中', err: '同步异常' };
  function paint() {
    var el = document.getElementById('syncDot');
    if (el) {
      el.className = 'sync-dot s-' + state.s;
      el.title = '云同步：' + (state.msg || LABEL[state.s] || '');
    }
    var box = document.querySelector('[data-sync-status]');
    if (box) box.innerHTML = statusHTML();
  }
  function agoText(ts) {
    if (!ts) return '尚未同步';
    var d = Math.floor((now() - ts) / 1000);
    if (d < 60) return d + ' 秒前';
    if (d < 3600) return Math.floor(d / 60) + ' 分钟前';
    if (d < 86400) return Math.floor(d / 3600) + ' 小时前';
    return Math.floor(d / 86400) + ' 天前';
  }
  function statusHTML() {
    var c = cfg || loadCfg();
    if (!c.token || !c.owner) return '<span class="muted">未连接云端</span>';
    var color = state.s === 'err' ? 'var(--danger)' : (state.s === 'ok' ? 'var(--ok,#16a34a)' : 'var(--muted)');
    return '<span style="color:' + color + '">●</span> ' +
      A.esc(state.msg || LABEL[state.s]) +
      ' · 最近 ' + agoText(c.last) +
      ' · <span class="muted">' + A.esc(c.owner + '/' + c.repo) + '</span>';
  }
  Sync.statusHTML = statusHTML;

  /* ---------------- 连接向导 ---------------- */
  function connect(token, repo, onLog) {
    var log = onLog || function () { };
    cfg.token = String(token || '').trim();
    cfg.repo = String(repo || 'solar-workbench-data').trim() || 'solar-workbench-data';
    if (!cfg.token) return Promise.reject(new Error('请先填写访问令牌'));

    log('正在验证令牌…');
    return api('/user').then(function (r) {
      if (r.status !== 200) throw new Error(errOf(r));
      cfg.owner = r.data.login;
      log('令牌有效，账号：' + cfg.owner);
      return api('/repos/' + cfg.owner + '/' + cfg.repo);
    }).then(function (r) {
      if (r.status === 200) { log('已找到数据仓库 ' + cfg.repo); return true; }
      if (r.status !== 404) throw new Error(errOf(r));
      log('数据仓库不存在，正在创建私有仓库…');
      return api('/user/repos', {
        method: 'POST',
        body: {
          name: cfg.repo, private: true, auto_init: true,
          description: '光伏项目助理工作助手 · 云端数据（私有）'
        }
      }).then(function (c) {
        if (c.status !== 201) throw new Error(errOf(c));
        cfg.branch = c.data.default_branch || 'main';
        log('私有仓库已创建');
        return new Promise(function (res) { setTimeout(res, 1500); });
      });
    }).then(function () {
      log('正在读取云端数据…');
      cfg.sha = ''; etag = '';
      return pull();
    }).then(function (p) {
      var S = A.store.state();
      if (p.missing) {
        log('云端为空，正在上传本机数据…');
        return push();
      }
      if (pristine(S)) {
        log('本机还是示例数据，直接采用云端内容');
        adopt(p.data);
        return true;
      }
      log('云端已有数据，正在与本机合并…');
      var m = merge(S, p.data);
      adopt(m);
      if (JSON.stringify(m) !== JSON.stringify(p.data)) return push();
      return true;
    }).then(function () {
      cfg.on = true; cfg.last = now(); saveCfg();
      startTimer();
      setState('ok', '已同步');
      log('连接完成，云同步已开启');
      return true;
    }).catch(function (e) {
      setState('err', e.message || '连接失败');
      throw e;
    });
  }

  /* ---------------- 设置面板 ---------------- */
  Sync.panel = function () {
    var c = cfg || loadCfg();
    var linked = !!(c.token && c.owner);

    var body =
      '<div class="small muted mb14">把数据存到你 GitHub 账号下的<b>私有仓库</b>，电脑和手机填同一个令牌即可自动同步。' +
      '通道走 api.github.com，国内网络可直连。</div>' +
      '<div class="card" style="padding:12px;margin-bottom:14px" data-sync-status>' + statusHTML() + '</div>' +
      A.f.field('访问令牌 (Personal Access Token)',
        A.f.input('token', c.token, 'ghp_ 开头，需要 repo 权限', 'password')) +
      A.f.field('数据仓库名', A.f.input('repo', c.repo, 'solar-workbench-data')) +
      '<div class="small muted" style="margin:-6px 0 12px">仓库不存在时会自动创建为私有仓库；不要填你放网页的那个仓库。</div>' +
      '<div class="log-box small" data-log style="display:none;background:#0f172a;color:#cbd5e1;border-radius:8px;padding:10px;max-height:150px;overflow:auto;font-family:var(--font-mono,monospace);line-height:1.7"></div>';

    var footer = linked
      ? '<button class="btn btn-danger" data-off>断开并清除令牌</button>' +
        '<button class="btn" data-close>关闭</button>' +
        '<button class="btn btn-primary" data-ok>保存并同步</button>'
      : '<button class="btn" data-close>取消</button><button class="btn btn-primary" data-ok>连接并初始化</button>';

    A.modal({
      title: '云同步设置',
      body: body,
      footer: footer,
      onMount: function (m, close) {
        var logBox = A.$('[data-log]', m);
        function log(t) {
          logBox.style.display = 'block';
          logBox.innerHTML += A.esc(t) + '<br>';
          logBox.scrollTop = logBox.scrollHeight;
        }

        A.$('[data-ok]', m).onclick = function () {
          var v = A.f.read(m);
          var btn = A.$('[data-ok]', m);
          btn.disabled = true; btn.textContent = '连接中…';
          logBox.innerHTML = '';
          connect(v.token, v.repo, log).then(function () {
            A.toast('云同步已开启', 'ok');
            btn.disabled = false; btn.textContent = '保存并同步';
            A.$('[data-sync-status]', m).innerHTML = statusHTML();
            setTimeout(close, 900);
          }).catch(function (e) {
            log('✗ ' + (e.message || '连接失败'));
            A.toast(e.message || '连接失败', 'warn');
            btn.disabled = false; btn.textContent = linked ? '保存并同步' : '连接并初始化';
          });
        };

        var off = A.$('[data-off]', m);
        if (off) off.onclick = function () {
          A.confirm({
            title: '断开云同步',
            text: '将清除本机保存的令牌并停止同步。云端数据不会被删除，本机数据也会保留。',
            okText: '断开', danger: true
          }).then(function (ok) {
            if (!ok) return;
            cfg.token = ''; cfg.on = false; cfg.sha = ''; etag = '';
            saveCfg(); clearInterval(timer);
            setState('off', '未开启');
            A.toast('已断开云同步');
            close();
          });
        };
      }
    });
  };

  // 应急：强制单向覆盖
  Sync.forcePull = function () {
    return A.confirm({
      title: '用云端覆盖本机',
      text: '本机当前数据将被云端数据完全替换，不可撤销。建议先导出备份。',
      okText: '确认覆盖本机', danger: true
    }).then(function (ok) {
      if (!ok) return;
      etag = ''; cfg.sha = '';
      return pull().then(function (p) {
        if (p.data) { adopt(p.data); A.toast('已用云端数据覆盖本机', 'ok'); }
        else A.toast('云端还没有数据', 'warn');
      }).catch(function (e) { A.toast(e.message || '拉取失败', 'warn'); });
    });
  };
  Sync.forcePush = function () {
    return A.confirm({
      title: '用本机覆盖云端',
      text: '云端数据将被本机数据完全替换，其它设备下次同步会拿到这份数据。',
      okText: '确认覆盖云端', danger: true
    }).then(function (ok) {
      if (!ok) return;
      etag = '';
      return pull().then(function (p) { cfg.sha = p.sha || ''; })
        .catch(function () { cfg.sha = ''; })
        .then(function () { return push(true); })
        .then(function () { saveCfg(); A.toast('已用本机数据覆盖云端', 'ok'); setState('ok', '已同步'); })
        .catch(function (e) { A.toast(e.message || '推送失败', 'warn'); });
    });
  };

  /* ---------------- 启动 ---------------- */
  Sync.init = function () {
    loadCfg();
    instrument();

    A.store.subscribe(function () {
      if (applying) return;
      dirty = true;
      if (cfg.on && cfg.token) schedulePush();
    });

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && cfg.on) doSync();
    });
    window.addEventListener('online', function () { if (cfg.on) doSync(); });

    if (cfg.on && cfg.token && cfg.owner) {
      setState('sync', '同步中…');
      startTimer();
      setTimeout(doSync, 600);
    } else {
      setState('off', '未开启');
    }
  };

})(window.App);
