/* 随手记智能解析引擎：从口语化文本中抽取 项目 / 截止时间 / 容量 / 优先级 / 负责人 / 动作 */
(function (A) {
  'use strict';

  var CN = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7, '天': 7, '两': 2, '十': 10 };

  function cnNum(s) {
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    if (CN[s]) return CN[s];
    var m = String(s).match(/^十([一二三四五六七八九])$/);
    if (m) return 10 + CN[m[1]];
    return 0;
  }

  // 计算本周/下周某个星期几的日期
  function weekdayDate(offsetWeek, wd) {
    var t = A.parseDate(A.today());
    var cur = t.getDay() === 0 ? 7 : t.getDay();
    var delta = (wd - cur) + offsetWeek * 7;
    return A.addDays(A.today(), delta);
  }

  function monthEnd() {
    var t = new Date();
    var d = new Date(t.getFullYear(), t.getMonth() + 1, 0);
    return A.dkey(d);
  }

  /* ---------- 时间解析 ---------- */
  A.parseDue = function (text) {
    var s = String(text || '');
    var hit = null;

    var rules = [
      [/(今天|今日|今晚|马上|立刻|立即|尽快)/, function () { return { date: A.today(), why: '今天' }; }],
      [/(明天|明日|明早)/, function () { return { date: A.addDays(A.today(), 1), why: '明天' }; }],
      [/大后天/, function () { return { date: A.addDays(A.today(), 3), why: '大后天' }; }],
      [/后天/, function () { return { date: A.addDays(A.today(), 2), why: '后天' }; }],
      [/下周([一二三四五六日天])/, function (m) { return { date: weekdayDate(1, cnNum(m[1])), why: '下周' + m[1] }; }],
      [/(这周|本周)([一二三四五六日天])/, function (m) { return { date: weekdayDate(0, cnNum(m[2])), why: '本周' + m[2] }; }],
      [/周([一二三四五六日天])/, function (m) {
        var d = weekdayDate(0, cnNum(m[1]));
        if (d < A.today()) d = weekdayDate(1, cnNum(m[1]));
        return { date: d, why: '周' + m[1] };
      }],
      [/下周(之前|前|以前)/, function () { return { date: weekdayDate(0, 7), why: '下周之前（本周日）' }; }],
      [/(本周|这周)(之前|内|以内|结束前)?/, function () { return { date: weekdayDate(0, 5), why: '本周内（周五）' }; }],
      [/下周/, function () { return { date: weekdayDate(1, 1), why: '下周（周一）' }; }],
      [/(月底|月末)/, function () { return { date: monthEnd(), why: '月底' }; }],
      [/(\d{1,2})月(\d{1,2})[日号]/, function (m) {
        var y = new Date().getFullYear();
        return { date: y + '-' + A.pad(+m[1]) + '-' + A.pad(+m[2]), why: m[1] + '月' + m[2] + '日' };
      }],
      [/([一二三四五六七八九十两\d]+)\s*(天|日)(内|后|之内)/, function (m) {
        var n = cnNum(m[1]); if (!n) return null;
        return { date: A.addDays(A.today(), n), why: n + '天内' };
      }],
      [/(\d{1,2})[日号](前|之前)/, function (m) {
        var t = new Date();
        return { date: t.getFullYear() + '-' + A.pad(t.getMonth() + 1) + '-' + A.pad(+m[1]), why: m[1] + '号前' };
      }]
    ];

    for (var i = 0; i < rules.length; i++) {
      var m = s.match(rules[i][0]);
      if (m) { var r = rules[i][1](m); if (r) { hit = r; break; } }
    }
    return hit;
  };

  /* ---------- 项目匹配 ---------- */
  A.matchProject = function (text) {
    var s = String(text || '');
    var best = null, bestLen = 0;
    A.store.projects().forEach(function (p) {
      var keys = [p.short, p.name, p.owner].filter(Boolean);
      // 拆出项目名中的地名/公司关键词
      var extra = [];
      (p.name || '').replace(/(上海|北京|深圳|广州|杭州|苏州|昆山|嘉兴|平湖|张江|南通|无锡|宁波|常州)/g, function (x) { extra.push(x); return x; });
      keys = keys.concat(extra);
      keys.forEach(function (k) {
        k = String(k).replace(/(有限公司|股份|公司|（.*?）|\(.*?\))/g, '');
        if (k.length < 2) return;
        if (s.indexOf(k) >= 0 && k.length > bestLen) { best = p; bestLen = k.length; }
      });
    });
    return best;
  };

  /* ---------- 容量 ---------- */
  A.matchCapacity = function (text) {
    var m = String(text || '').match(/(\d+(?:\.\d+)?)\s*(kw|KW|kW|Kw|千瓦)/);
    if (m) return Math.round(parseFloat(m[1]));
    m = String(text || '').match(/(\d+(?:\.\d+)?)\s*(mw|MW|兆瓦)/);
    if (m) return Math.round(parseFloat(m[1]) * 1000);
    return 0;
  };

  /* ---------- 动作 / 任务类型 ---------- */
  var ACTIONS = [
    { k: /建档|归档立项|立项/, n: '建档', verb: '建档' },
    { k: /接入方案|方案发|发方案|出方案|设计方案/, n: '技术方案', verb: '出具/发送方案' },
    { k: /备案|报批|批复|路条/, n: '备案报批', verb: '办理备案' },
    { k: /勘察|踏勘|测量|看现场/, n: '现场勘察', verb: '现场勘察' },
    { k: /并网|送电|验收/, n: '并网验收', verb: '推进并网验收' },
    { k: /合同|签约|盖章/, n: '合同', verb: '处理合同' },
    { k: /报价|询价|采购|订货/, n: '采购', verb: '处理报价采购' },
    { k: /发票|回款|付款|催款|结算/, n: '财务', verb: '跟进款项' },
    { k: /清洗|运维|巡检|发电量|报表/, n: '运维', verb: '运维事项' },
    { k: /会议|开会|例会/, n: '会议', verb: '安排会议' }
  ];
  A.matchAction = function (text) {
    var s = String(text || '');
    for (var i = 0; i < ACTIONS.length; i++) if (ACTIONS[i].k.test(s)) return ACTIONS[i];
    return null;
  };

  /* ---------- 优先级 ---------- */
  A.matchPriority = function (text, source) {
    var s = String(text || '');
    if (/(马上|立刻|立即|今天必须|加急|紧急|催了|尽快)/.test(s)) return 'P0';
    if (source === 'wechat' || source === 'oral') {
      if (/(老板|总|领导)/.test(s)) return 'P1';
    }
    if (/(重要|优先|别忘)/.test(s)) return 'P1';
    return 'P2';
  };

  /* ---------- 负责人 ---------- */
  A.matchOwner = function (text) {
    var m = String(text || '').match(/@([\u4e00-\u9fa5A-Za-z0-9_]{2,10})/);
    return m ? m[1] : '';
  };

  /* ---------- 生成建议标题 ---------- */
  function makeTitle(text, proj, cap, act) {
    var s = String(text || '')
      .replace(/^(老板|领导)?(微信|口头|电话|群里)?[:：]?\s*/, '')
      .replace(/@[\u4e00-\u9fa5A-Za-z0-9_]{2,10}\s*/g, '')
      .replace(/^(晨会|例会|会议)[:：]\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();

    // 短句直接用
    if (s.length <= 26 && !/[，,。；;]/.test(s)) {
      if (proj && s.indexOf(proj.short) < 0 && s.indexOf(proj.name) < 0) s = proj.short + s;
      return s;
    }
    // 结构化重组
    if (proj && act) {
      var t = (proj.short || proj.name) + '项目' + act.verb;
      if (cap) t += '（' + A.kw(cap) + '）';
      return t;
    }
    // 取第一个分句
    var first = s.split(/[，,。；;\n]/)[0];
    return first.slice(0, 40);
  }

  /* ---------- 主入口 ---------- */
  A.analyzeNote = function (note) {
    var text = note.text || '';
    var proj = note.projectId ? A.store.project(note.projectId) : A.matchProject(text);
    var due = A.parseDue(text);
    var cap = A.matchCapacity(text);
    var act = A.matchAction(text);
    var owner = A.matchOwner(text);
    var prio = A.matchPriority(text, note.source);

    var isTask = !!(act || due || /(要|需要|记得|安排|跟进|处理|发给|提交|准备|确认|催|问|回复|落实)/.test(text));

    return {
      isTask: isTask,
      title: makeTitle(text, proj, cap, act),
      project: proj || null,
      due: due,
      capacity: cap,
      action: act,
      owner: owner,
      priority: note.source === 'wechat' || note.source === 'oral' ? (prio === 'P2' ? 'P1' : prio) : prio,
      source: note.source === 'meeting' ? 'meeting' : (note.source === 'wechat' || note.source === 'oral' ? 'boss' : 'note')
    };
  };

})(window.App);
