/* 数据种子：默认返回「无数据的空平台」，不预置任何演示项目/待办/联系人。
   按需求保持空壳；如日后需要演示数据，可在 buildSeed 内填充。 */
(function (A) {
  'use strict';

  A.buildSeed = function () {
    // 空平台：不写入任何示例数据
    return {
      version: 1,
      todos: [], notes: [], projects: [], contacts: [],
      sitelogs: [], docs: [], commissions: [], plans: {},
      settings: {
        userName: '我', yearTarget: 300000,
        dnd: { on: true, from: '22:00', to: '08:00' },
        commissionLock: '', lockOn: false, seeded: true
      }
    };
  };

})(window.App);
