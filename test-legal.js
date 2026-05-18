/* 自动化测试：把 legal.js 的纯数据 + 逻辑跑一遍真实案例，
   验证决策树的结论、关键要点、法律依据、程序动作是否符合预期。
   不依赖浏览器，纯 Node 即可运行：  node test-legal.js
*/

// 1) 注入浏览器全局存根：legal.js 末尾会调用 document.getElementById；
//    我们只用其中的数据结构和 buildStrategy/sev，因此用最小存根即可。
function makeEl() {
  const el = {
    classList: { add(){}, remove(){}, toggle(){} },
    addEventListener(){}, appendChild(){}, removeChild(){},
    querySelector(){ return makeEl(); },
    querySelectorAll(){ return []; },
    innerHTML:'', textContent:'', className:'', disabled:false, value:'',
  };
  return el;
}
global.document = {
  getElementById: () => makeEl(),
  createElement: () => makeEl(),
  querySelectorAll: () => [],
};

// 2) 加载源代码（评估而非 require，以拿到顶层常量与函数）
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/legal.js', 'utf8');
// 暴露需要测试的符号
const mod = {};
const wrapped =
  '(function(module){' + src +
  ';module.exports={EVIDENCE_TYPES,LAW,QUESTIONS,COMMON_RISKS,buildStrategy,sev,state};})';
const exposed = eval(wrapped);
exposed(mod);
const { QUESTIONS, buildStrategy, state } = mod.exports;

// 3) 帮手：按"选项 label 关键词"模拟用户点选
function answer(qid, labelKeyword) {
  // 在所有证据类型中找到这道题
  let found;
  for (const evid of Object.keys(QUESTIONS)) {
    const q = QUESTIONS[evid].find(x => x.id === qid);
    if (q) { found = { evid, q }; break; }
  }
  if (!found) throw new Error('题目未找到: ' + qid);
  const opt = found.q.options.find(o => o.label.includes(labelKeyword));
  if (!opt) throw new Error(`选项 [${labelKeyword}] 未在 ${qid} 中找到`);
  state.history.push({
    qid, optIndex: found.q.options.indexOf(opt),
    impact: {
      dim: opt.dim, weight: opt.weight, fatal: !!opt.fatal,
      tag: opt.tag, detail: opt.detail,
      basis: opt.basis || found.q.basis || [],
      moves: opt.moves || []
    }
  });
}

function reset(evidence, caseType = 'civil', party = 'opp') {
  state.evidence = evidence;
  state.history = [];
  state.qIndex = 0;
  state.caseType = caseType;
  state.party = party;
}

let fail = 0;
function check(name, cond, hint = '') {
  if (cond) console.log('  PASS  ' + name);
  else { console.log('  FAIL  ' + name + (hint ? '  · ' + hint : '')); fail++; }
}

// ============================================================
// 场景 1：书证 — 对方拿来一份复印件，原件下落不明
//   预期：致命瑕疵 → 不予认可 + 列入"原件不明"要点 + 援引第90条
// ============================================================
console.log('\n[场景1] 对方书证复印件、原件下落不明');
reset('doc');
answer('doc-orig',   '原件下落不明');         // fatal
answer('doc-form',   '完整');
answer('doc-sig',    '无异议');
answer('doc-source', '合法取得');
answer('doc-foreign','非境外形成');
answer('doc-rel',    '直接证明待证事实');

let s = buildStrategy();
check('结论=不予认可', s.verdict.startsWith('不予认可'), s.verdict);
check('含"原件不明"要点', s.points.some(p => p.text.includes('原件不明')));
check('援引《民诉证据规定》第90条', s.basis.some(b => b.includes('第90条')));
check('含"非法证据排除/不予采纳"建议',
  s.moves.some(m => m.includes('不予采纳') || m.includes('排除')));

// ============================================================
// 场景 2：证人证言 — 证人无故未出庭
//   预期：致命瑕疵 → 不予采纳；援引民诉法 75；建议申请证人出庭
// ============================================================
console.log('\n[场景2] 证人无故未出庭');
reset('wit');
answer('wit-court',  '未出庭，无法定理由');   // fatal
answer('wit-cap',    '具备完全作证能力');
answer('wit-source', '亲身经历');
answer('wit-bias',   '无利害关系');
answer('wit-cons',   '前后一致');
answer('wit-legal',  '合法获取');

s = buildStrategy();
check('结论=不予认可', s.verdict.startsWith('不予认可'));
check('含"未出庭"要点', s.points.some(p => p.text.includes('未出庭')));
check('援引《民事诉讼法》第75条', s.basis.some(b => b.includes('第75条')));
check('含"申请证人出庭"建议', s.moves.some(m => m.includes('申请证人出庭')));

// ============================================================
// 场景 3：电子数据 — 区块链存证、能锁定本人、关联性强
//   预期：认可
// ============================================================
console.log('\n[场景3] 电子数据 + 区块链存证，无瑕疵');
reset('ed');
answer('ed-form',      '区块链');
answer('ed-integrity', '有哈希校验');
answer('ed-identity',  '账号实名');
answer('ed-legal',     '己方持有');
answer('ed-rel',       '直接表达意思表示');

s = buildStrategy();
check('结论=认可', s.verdict.startsWith('认可'), s.verdict);
check('援引区块链电子证据相关规则',
  s.basis.some(b => b.includes('区块链') || b.includes('在线诉讼')));

// ============================================================
// 场景 4：鉴定意见 — 机构有资质但鉴定人未出庭
//   预期：致命（未出庭）→ 不予认可
// ============================================================
console.log('\n[场景4] 鉴定意见 · 鉴定人经通知未出庭');
reset('expert');
answer('exp-org',    '有资质');
answer('exp-person', '执业资格齐全');
answer('exp-mat',    '材料来源清楚');
answer('exp-method', '方法科学');
answer('exp-proc',   '程序合法');
answer('exp-court',  '经通知未出庭');  // fatal
answer('exp-rel',    '直接证明待证事实');

s = buildStrategy();
check('结论=不予认可', s.verdict.startsWith('不予认可'));
check('含"鉴定人未到庭"要点', s.points.some(p => p.text.includes('鉴定人未到庭')));
check('援引民诉法第81条', s.basis.some(b => b.includes('第81条')));

// ============================================================
// 场景 5：视听资料 — 公开场合、内容连贯、可识别
//   预期：认可
// ============================================================
console.log('\n[场景5] 视听资料 · 自己作为对话一方录制');
reset('av');
answer('av-orig',     '原始载体');
answer('av-edit',     '内容连贯');
answer('av-identify', '声音、人物');
answer('av-legal',    '公开场合');
answer('av-rel',      '直接体现待证事实');

s = buildStrategy();
check('结论=认可', s.verdict.startsWith('认可'), s.verdict);

// ============================================================
console.log('\n========================================');
console.log(fail === 0 ? '✓ 全部场景通过' : `✗ ${fail} 个断言失败`);
process.exit(fail === 0 ? 0 : 1);
