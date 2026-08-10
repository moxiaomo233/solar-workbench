/* 工具函数集合 —— 全局命名空间 App */
window.App = window.App || {};

(function (A) {
  'use strict';

  /* ---------- DOM ---------- */
  A.$ = function (sel, root) { return (root || document).querySelector(sel); };
  A.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  A.on = function (root, evt, sel, fn) {
    root.addEventListener(evt, function (e) {
      var t = e.target.closest(sel);
      if (t && root.contains(t)) fn.call(t, e, t);
    });
  };

  /* ---------- 通用 ---------- */
  A.uid = function (p) {
    return (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  };

  A.esc = function (s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  };

  A.debounce = function (fn, ms) {
    var t; return function () {
      var a = arguments, self = this;
      clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, ms || 200);
    };
  };

  A.clone = function (o) { return JSON.parse(JSON.stringify(o)); };

  /* ---------- 日期 ---------- */
  A.pad = function (n) { return n < 10 ? '0' + n : '' + n; };

  A.dkey = function (d) {
    d = d ? new Date(d) : new Date();
    return d.getFullYear() + '-' + A.pad(d.getMonth() + 1) + '-' + A.pad(d.getDate());
  };

  A.today = function () { return A.dkey(new Date()); };

  A.addDays = function (dateStr, n) {
    var d = A.parseDate(dateStr); d.setDate(d.getDate() + n); return A.dkey(d);
  };

  A.parseDate = function (s) {
    if (!s) return new Date();
    if (s instanceof Date) return new Date(s.getTime());
    var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    return new Date(s);
  };

  A.diffDays = function (a, b) { // a - b，单位天
    var d1 = A.parseDate(a), d2 = A.parseDate(b || A.today());
    return Math.round((d1 - d2) / 86400000);
  };

  A.WEEK = ['日', '一', '二', '三', '四', '五', '六'];

  A.weekDay = function (s) { return '周' + A.WEEK[A.parseDate(s).getDay()]; };

  A.fmtDate = function (s, withWeek) {
    if (!s) return '';
    var d = A.parseDate(s);
    var t = (d.getMonth() + 1) + '月' + d.getDate() + '日';
    return withWeek ? t + ' ' + A.weekDay(s) : t;
  };

  // 人性化日期：今天/明天/昨天/逾期X天
  A.humanDate = function (s) {
    var n = A.diffDays(s, A.today());
    if (n === 0) return '今天';
    if (n === 1) return '明天';
    if (n === 2) return '后天';
    if (n === -1) return '昨天';
    if (n < 0) return '逾期' + (-n) + '天';
    if (n <= 7) return n + '天后';
    return A.fmtDate(s);
  };

  A.fmtTime = function (iso) {
    var d = new Date(iso);
    return A.pad(d.getHours()) + ':' + A.pad(d.getMinutes());
  };

  A.fmtDateTime = function (iso) {
    var d = new Date(iso);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + A.pad(d.getHours()) + ':' + A.pad(d.getMinutes());
  };

  A.relTime = function (iso) {
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return '刚刚';
    if (s < 3600) return Math.floor(s / 60) + '分钟前';
    if (s < 86400 && new Date(iso).getDate() === new Date().getDate()) return '今天 ' + A.fmtTime(iso);
    if (s < 172800) return '昨天 ' + A.fmtTime(iso);
    return A.fmtDateTime(iso);
  };

  // 本周（周一起）
  A.weekRange = function (base) {
    var d = A.parseDate(base || A.today());
    var day = d.getDay() === 0 ? 7 : d.getDay();
    var mon = new Date(d); mon.setDate(d.getDate() - day + 1);
    var sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return { start: A.dkey(mon), end: A.dkey(sun) };
  };

  A.inRange = function (s, a, b) { return s >= a && s <= b; };

  /* ---------- 数字/金额 ---------- */
  A.money = function (n) {
    n = Number(n || 0);
    return '¥' + n.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
  };

  A.moneyShort = function (n) {
    n = Number(n || 0);
    if (Math.abs(n) >= 10000) return '¥' + (n / 10000).toFixed(n % 10000 === 0 ? 0 : 1) + '万';
    return A.money(n);
  };

  A.kw = function (n) {
    n = Number(n || 0);
    if (!n) return '';
    return n >= 1000 ? (n / 1000).toFixed(n % 1000 === 0 ? 0 : 2) + 'MW' : n + 'kW';
  };

  /* ---------- 剪贴板 ---------- */
  A.copy = function (text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }).catch(fallback);
    }
    return Promise.resolve(fallback());
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { }
      document.body.removeChild(ta); return ok;
    }
  };

  /* ---------- 图片压缩（避免撑爆本地存储） ---------- */
  A.readImage = function (file, maxW, quality) {
    maxW = maxW || 1000; quality = quality || 0.72;
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type)) return reject(new Error('非图片文件'));
      var fr = new FileReader();
      fr.onload = function () {
        var img = new Image();
        img.onload = function () {
          var scale = Math.min(1, maxW / img.width);
          var w = Math.round(img.width * scale), h = Math.round(img.height * scale);
          var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          cv.getContext('2d').drawImage(img, 0, 0, w, h);
          try { resolve(cv.toDataURL('image/jpeg', quality)); }
          catch (e) { resolve(fr.result); }
        };
        img.onerror = function () { resolve(fr.result); };
        img.src = fr.result;
      };
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  };

  A.fileSize = function (n) {
    if (n < 1024) return n + 'B';
    if (n < 1048576) return (n / 1024).toFixed(0) + 'KB';
    return (n / 1048576).toFixed(1) + 'MB';
  };

  /* ---------- 颜色 ---------- */
  var PALETTE = ['#2563eb', '#0d9488', '#7c3aed', '#f97316', '#dc2626', '#0891b2', '#4f46e5', '#ca8a04'];
  A.colorOf = function (str) {
    var s = String(str || ''), h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
  };

  /* ---------- 常量字典 ---------- */
  A.SRC = { boss: '老板交办', note: '随手记转入', self: '自拟', meeting: '会议产出', mate: '同事请求' };
  A.PRIO = { P0: 'P0紧急', P1: 'P1重要', P2: 'P2普通' };
  A.STATUS = { todo: '未开始', doing: '进行中', done: '已完成', cancel: '已取消' };
  A.STAGES = [
    { k: 'dev', n: '开发中', c: '#2563eb' },
    { k: 'filing', n: '备案中', c: '#7c3aed' },
    { k: 'build', n: '施工中', c: '#f97316' },
    { k: 'grid', n: '已并网', c: '#16a34a' },
    { k: 'om', n: '运维中', c: '#0d9488' }
  ];
  A.stageName = function (k) { var s = A.STAGES.filter(function (x) { return x.k === k; })[0]; return s ? s.n : k; };
  A.stageColor = function (k) { var s = A.STAGES.filter(function (x) { return x.k === k; })[0]; return s ? s.c : '#94a3b8'; };
  A.ROLES = { owner: '屋顶业主', epc: 'EPC施工方', supplier: '设备供应商', grid: '电网对接人', gov: '政府部门', other: '其他' };
  A.LOGTYPE = { survey: '现场勘察', progress: '施工进度', issue: '问题记录', accept: '验收检查' };
  A.DOCTYPE = { contract: '合同', filing: '报批材料', tech: '技术方案', build: '施工文件', meeting: '会议纪要', other: '其他' };
  A.CMTYPE = { dev: '开发提成', build: '施工跟进', om: '运维分成', other: '其他' };
  A.NOTESRC = { wechat: '微信截图', oral: '口头交代', meeting: '会议记录', mail: '邮件', other: '其他' };

  A.svgCheck = '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>';

})(window.App);
