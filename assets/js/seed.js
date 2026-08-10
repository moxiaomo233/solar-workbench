/* 示例数据（首次打开时写入本地，可在「我的」中一键清空） */
(function (A) {
  'use strict';

  A.buildSeed = function () {
    var T = A.today();
    var d = function (n) { return A.addDays(T, n); };
    var iso = function (n, h, m) {
      var x = A.parseDate(A.addDays(T, n)); x.setHours(h || 10, m || 0, 0, 0); return x.toISOString();
    };

    var P1 = 'prj_pft', P2 = 'prj_ph', P3 = 'prj_zj', P4 = 'prj_jx', P5 = 'prj_ks', P6 = 'prj_nt';

    var projects = [
      { id: P1, name: '上海帕菲特屋顶光伏', owner: '帕菲特搬运机械（上海）有限公司', short: '帕菲特', contactName: '陈厂长', contactPhone: '13801729856', capacity: 240, stage: 'dev', milestone: { text: '完成项目建档并出具初步方案', date: d(1) }, next: '按240kW建档，出具屋顶排布初稿', status: 'normal', commission: 28000, createdAt: iso(-9, 9), updatedAt: iso(0, 9, 20), shared: true },
      { id: P2, name: '平湖工业园分布式光伏', owner: '平湖新材料科技有限公司', short: '平湖', contactName: '王总', contactPhone: '13957302188', capacity: 1250, stage: 'filing', milestone: { text: '接入方案报送国网平湖供电公司', date: d(3) }, next: '下周之前把接入方案发给业主确认', status: 'risk', commission: 96000, createdAt: iso(-42, 9), updatedAt: iso(-2, 15), shared: true },
      { id: P3, name: '张江物流园屋顶光伏', owner: '张江现代物流发展有限公司', short: '张江物流', contactName: '刘经理', contactPhone: '13611258740', capacity: 860, stage: 'build', milestone: { text: '组件进场安装完成60%', date: d(6) }, next: '本周五现场进度检查 + 拍照留档', status: 'normal', commission: 72000, createdAt: iso(-88, 9), updatedAt: iso(-1, 17, 40), shared: true },
      { id: P4, name: '嘉兴纺织厂屋顶光伏', owner: '嘉兴恒昌纺织有限公司', short: '嘉兴恒昌', contactName: '周主任', contactPhone: '13906734512', capacity: 620, stage: 'grid', milestone: { text: '并网验收资料归档', date: d(-2) }, next: '补交并网验收资料，催开发票', status: 'normal', commission: 51000, createdAt: iso(-140, 9), updatedAt: iso(-9, 11), shared: true },
      { id: P5, name: '昆山电子厂车棚光伏', owner: '昆山泰恒电子科技有限公司', short: '昆山泰恒', contactName: '孙工', contactPhone: '13915678023', capacity: 180, stage: 'dev', milestone: { text: '屋顶勘察与初步评估', date: d(2) }, next: '周三上午现场勘察，测量车棚可用面积', status: 'normal', commission: 15000, createdAt: iso(-15, 9), updatedAt: iso(-8, 16), shared: false },
      { id: P6, name: '南通仓储基地光伏运维', owner: '南通新港仓储物流有限公司', short: '南通新港', contactName: '钱经理', contactPhone: '13962988177', capacity: 1500, stage: 'om', milestone: { text: '季度清洗与发电量报表', date: d(12) }, next: '整理Q3发电量报表发业主', status: 'normal', commission: 24000, createdAt: iso(-320, 9), updatedAt: iso(-3, 10), shared: true }
    ];

    var todos = [
      { id: A.uid('td'), title: '为上海帕菲特项目建档，装机容量按240kW', source: 'boss', projectIds: [P1], priority: 'P0', due: T, dueTime: '18:00', status: 'doing', remind: ['d0'], note: '老板微信里@我说的，今天必须建完', createdAt: iso(0, 8, 40), doneAt: '', order: 1 },
      { id: A.uid('td'), title: '平湖项目接入方案发给业主确认', source: 'boss', projectIds: [P2], priority: 'P0', due: T, dueTime: '17:30', status: 'todo', remind: ['d0', 'd1'], note: '王总催了两次了', createdAt: iso(-2, 14), doneAt: '', order: 2 },
      { id: A.uid('td'), title: '催嘉兴恒昌项目并网验收资料（缺竣工图）', source: 'self', projectIds: [P4], priority: 'P1', due: A.addDays(T, -1), dueTime: '', status: 'todo', remind: ['d0'], note: '', createdAt: iso(-5, 10), doneAt: '', order: 3 },
      { id: A.uid('td'), title: '张江物流园现场进度检查并拍照留档', source: 'self', projectIds: [P3], priority: 'P1', due: T, dueTime: '', status: 'todo', remind: ['d0'], note: '顺便看下支架防腐', createdAt: iso(-1, 9), doneAt: '', order: 4 },
      { id: A.uid('td'), title: '整理上周项目周报发给老板', source: 'boss', projectIds: [], priority: 'P2', due: T, dueTime: '', status: 'todo', remind: [], note: '', createdAt: iso(-1, 18), doneAt: '', order: 5 },
      { id: A.uid('td'), title: '昆山泰恒车棚现场勘察（带测距仪）', source: 'meeting', projectIds: [P5], priority: 'P1', due: d(2), dueTime: '09:30', status: 'todo', remind: ['d1'], note: '孙工只有上午有空', createdAt: iso(-3, 11), doneAt: '', order: 6 },
      { id: A.uid('td'), title: '南通新港Q3发电量报表整理', source: 'self', projectIds: [P6], priority: 'P2', due: d(4), dueTime: '', status: 'todo', remind: [], note: '', createdAt: iso(-3, 10), doneAt: '', order: 7 },
      { id: A.uid('td'), title: '对接国网平湖供电公司预约踏勘时间', source: 'mate', projectIds: [P2], priority: 'P1', due: d(1), dueTime: '', status: 'todo', remind: ['d0'], note: '找李工，电话见通讯录', createdAt: iso(-1, 16), doneAt: '', order: 8 },
      { id: A.uid('td'), title: '采购部报价单核对（组件+逆变器）', source: 'mate', projectIds: [P3], priority: 'P2', due: d(5), dueTime: '', status: 'todo', remind: [], note: '', createdAt: iso(-2, 15), doneAt: '', order: 9 },
      { id: A.uid('td'), title: '提交嘉兴项目备案变更材料', source: 'boss', projectIds: [P4], priority: 'P1', due: A.addDays(T, -3), dueTime: '', status: 'done', remind: [], note: '', createdAt: iso(-8, 9), doneAt: iso(-3, 16), order: 10 },
      { id: A.uid('td'), title: '给张江物流刘经理寄送合同原件', source: 'self', projectIds: [P3], priority: 'P2', due: A.addDays(T, -1), dueTime: '', status: 'done', remind: [], note: '顺丰单号 SF1234567890', createdAt: iso(-4, 9), doneAt: iso(-1, 14), order: 11 }
    ];

    var notes = [
      {
        id: A.uid('nt'), text: '老板微信：@汪美灵 上海，帕菲特的，按240KW，建档', images: [], source: 'wechat',
        projectId: P1, createdAt: iso(0, 8, 35), status: 'converted', todoId: todos[0].id
      },
      {
        id: A.uid('nt'), text: '晨会：下周之前把平湖项目的接入方案发给业主，另外让我催一下电网踏勘时间', images: [], source: 'meeting',
        projectId: P2, createdAt: iso(0, 9, 12), status: 'raw', todoId: ''
      },
      {
        id: A.uid('nt'), text: '张江现场：3号屋面有两处女儿墙渗水痕迹，施工队说下周处理，需要跟进', images: [], source: 'oral',
        projectId: P3, createdAt: iso(-1, 15, 40), status: 'raw', todoId: ''
      },
      {
        id: A.uid('nt'), text: '钱经理电话：南通那边希望9月中旬安排一次组件清洗，问报价', images: [], source: 'oral',
        projectId: P6, createdAt: iso(-2, 11, 5), status: 'raw', todoId: ''
      },
      {
        id: A.uid('nt'), text: '供应商说逆变器交期要4周，比原计划晚10天，影响张江并网节点', images: [], source: 'other',
        projectId: P3, createdAt: iso(-3, 17, 20), status: 'archived', todoId: ''
      }
    ];

    var contacts = [
      { id: A.uid('ct'), name: '陈厂长', company: '帕菲特搬运机械（上海）', role: 'owner', phone: '13801729856', wechat: 'pft_chen', projectIds: [P1], pref: '只认微信，电话常不接；下午3点后回复快', lastContact: iso(0, 8) },
      { id: A.uid('ct'), name: '王总', company: '平湖新材料科技', role: 'owner', phone: '13957302188', wechat: 'wanghp88', projectIds: [P2], pref: '性子急，回复要快；周末别打', lastContact: iso(-2, 15) },
      { id: A.uid('ct'), name: '刘经理', company: '张江现代物流发展', role: 'owner', phone: '13611258740', wechat: '', projectIds: [P3], pref: '找他先找他助理小徐', lastContact: iso(-1, 17) },
      { id: A.uid('ct'), name: '周主任', company: '嘉兴恒昌纺织', role: 'owner', phone: '13906734512', wechat: 'zhouzr', projectIds: [P4], pref: '', lastContact: iso(-38, 10) },
      { id: A.uid('ct'), name: '李工', company: '国网平湖市供电公司', role: 'grid', phone: '057385231166', wechat: '', projectIds: [P2], pref: '工作日9-11点最好联系', lastContact: iso(-6, 10) },
      { id: A.uid('ct'), name: '赵队', company: '中建八局新能源分公司', role: 'epc', phone: '13818007765', wechat: 'zhaodui_8j', projectIds: [P3, P4], pref: '现场问题直接发照片给他', lastContact: iso(-1, 16) },
      { id: A.uid('ct'), name: '孙工', company: '昆山泰恒电子科技', role: 'owner', phone: '13915678023', wechat: '', projectIds: [P5], pref: '只有上午有空', lastContact: iso(-8, 9) },
      { id: A.uid('ct'), name: '马经理', company: '晶科能源华东大区', role: 'supplier', phone: '13701983344', wechat: 'jinko_ma', projectIds: [P3, P2], pref: '组件价格月初调整，月底问最划算', lastContact: iso(-4, 14) },
      { id: A.uid('ct'), name: '吴科长', company: '平湖市发改局能源科', role: 'gov', phone: '057385010023', wechat: '', projectIds: [P2], pref: '备案材料要纸质件盖章', lastContact: iso(-12, 10) }
    ];

    var sitelogs = [
      {
        id: A.uid('sl'), projectId: P3, type: 'progress', images: [], voiceText: '', text: '组件安装到第3排，支架已全部完成，逆变器基础浇筑完成。3号屋面女儿墙有渗水痕迹，已拍照通知赵队。',
        location: '上海市浦东新区张江高科技园区', createdAt: iso(-1, 15, 30), severity: '', survey: null
      },
      {
        id: A.uid('sl'), projectId: P5, type: 'survey', images: [], voiceText: '', text: '车棚为钢结构，跨度较大，需核算承重。业主希望不影响停车。',
        location: '江苏省昆山市开发区前进东路', createdAt: iso(-8, 10, 20), severity: '',
        survey: { area: 2100, roofType: '其他', orient: '南', shade: '轻微遮挡', attitude: '积极', assess: '可用面积约1800㎡，估算装机180kW左右，建议采用双玻组件做车棚顶。' }
      },
      {
        id: A.uid('sl'), projectId: P3, type: 'issue', images: [], voiceText: '', text: '3号屋面女儿墙渗水，需在铺设组件前完成防水修补，否则影响后续验收。',
        location: '上海市浦东新区张江', createdAt: iso(-1, 15, 50), severity: '一般', survey: null
      }
    ];

    var docs = [
      { id: A.uid('dc'), name: '平湖项目EPC总承包合同', projectId: P2, type: 'contract', version: 'V2.1', fileName: '平湖EPC合同V2.1.pdf', size: 2411520, dataUrl: '', expireDate: A.addDays(T, 26), createdAt: iso(-30, 10) },
      { id: A.uid('dc'), name: '帕菲特屋顶结构图', projectId: P1, type: 'tech', version: 'V1.0', fileName: '帕菲特屋顶结构图.pdf', size: 5872025, dataUrl: '', expireDate: '', createdAt: iso(-7, 15) },
      { id: A.uid('dc'), name: '张江物流园并网接入方案', projectId: P3, type: 'tech', version: 'V1.2', fileName: '张江接入方案V1.2.docx', size: 1258291, dataUrl: '', expireDate: '', createdAt: iso(-20, 11) },
      { id: A.uid('dc'), name: '嘉兴项目备案批复', projectId: P4, type: 'filing', version: '', fileName: '嘉兴备案批复.pdf', size: 860160, dataUrl: '', expireDate: '', createdAt: iso(-60, 9) },
      { id: A.uid('dc'), name: '张江项目周例会纪要（第8周）', projectId: P3, type: 'meeting', version: '', fileName: '周例会纪要W8.docx', size: 45056, dataUrl: '', expireDate: '', createdAt: iso(-3, 17) },
      { id: A.uid('dc'), name: '南通运维服务合同', projectId: P6, type: 'contract', version: 'V1.0', fileName: '南通运维合同.pdf', size: 1887436, dataUrl: '', expireDate: A.addDays(T, 5), createdAt: iso(-300, 10) }
    ];

    var commissions = [
      { id: A.uid('cm'), projectId: P4, type: 'dev', expect: 51000, received: [{ amt: 30000, date: A.addDays(T, -25) }, { amt: 12000, date: A.addDays(T, -4) }], status: 'part', note: '并网后结清尾款' },
      { id: A.uid('cm'), projectId: P3, type: 'build', expect: 72000, received: [{ amt: 20000, date: A.addDays(T, -12) }], status: 'part', note: '按施工进度分3次' },
      { id: A.uid('cm'), projectId: P2, type: 'dev', expect: 96000, received: [], status: 'none', note: '备案通过后付30%' },
      { id: A.uid('cm'), projectId: P6, type: 'om', expect: 24000, received: [{ amt: 24000, date: A.addDays(T, -70) }], status: 'clear', note: '年度一次性' },
      { id: A.uid('cm'), projectId: P1, type: 'dev', expect: 28000, received: [], status: 'none', note: '' }
    ];

    var plans = {};
    plans[T] = {
      items: [
        { id: A.uid('pl'), text: todos[0].title, todoId: todos[0].id, done: false },
        { id: A.uid('pl'), text: todos[1].title, todoId: todos[1].id, done: false },
        { id: A.uid('pl'), text: '下午给王总回电话说明进度', todoId: '', done: true }
      ]
    };

    return {
      version: 1,
      todos: todos, notes: notes, projects: projects, contacts: contacts,
      sitelogs: sitelogs, docs: docs, commissions: commissions, plans: plans,
      settings: {
        userName: '汪美灵', role: '项目助理', company: '晟阳新能源',
        yearTarget: 300000, dnd: { on: true, from: '22:00', to: '08:00' },
        commissionLock: '', lockOn: false, seeded: true
      }
    };
  };

})(window.App);
