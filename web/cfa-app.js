/**
 * CFA Level II — case-based quiz + Mock (uses global D, SM, MK from cfa-data.js)
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'cfa_progress_v1';
  const MOCK_SECONDS = 132 * 60;

  let hooks = { toast: () => {}, setView: () => {} };
  let $ = () => null;

  const state = {
    screen: 'subjects', // subjects | cases | quiz | mock-home | mock-exam
    subject: null,
    level: 'basic',
    caseIdx: -1,
    qIdx: 0,
    mockIdx: null,
    mockQ: 0,
    mockTimer: MOCK_SECONDS,
    mockTimerId: null,
  };

  let progress = loadProgress();

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultProgress();
      const data = JSON.parse(raw);
      return {
        ...defaultProgress(),
        ...data,
        fav: new Set(data.fav || []),
      };
    } catch {
      return defaultProgress();
    }
  }

  function defaultProgress() {
    return { ans: {}, fav: new Set(), notes: {}, mkans: {}, wrong: [], starred: [] };
  }

  function saveProgress() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ans: progress.ans,
          fav: [...progress.fav],
          notes: progress.notes,
          mkans: progress.mkans,
          wrong: progress.wrong,
          starred: progress.starred,
        })
      );
    } catch (e) {
      console.warn('cfa save', e);
    }
  }

  function qKey(q) {
    return `q${q.i}`;
  }

  function slugSubject(s) {
    return s.replace(/\s+/g, '_');
  }

  function getSubs() {
    const subs = {};
    D.forEach((c) => {
      const s = c.s;
      if (!subs[s]) subs[s] = { basic: [], advanced: [], tq: 0, dn: 0, co: 0 };
      subs[s][c.level || 'basic'].push(c);
      const ql = (c.qs || []).length;
      subs[s].tq += ql;
      (c.qs || []).forEach((q) => {
        const k = qKey(q);
        if (progress.ans[k] !== undefined) {
          subs[s].dn++;
          if (progress.ans[k] === q.a) subs[s].co++;
        }
      });
    });
    return subs;
  }

  function getTotals() {
    let total = 0;
    let done = 0;
    let correct = 0;
    D.forEach((c) => {
      (c.qs || []).forEach((q) => {
        total++;
        const k = qKey(q);
        if (progress.ans[k] !== undefined) {
          done++;
          if (progress.ans[k] === q.a) correct++;
        }
      });
    });
    return { total, done, correct };
  }

  function allQuestionsFlat() {
    const list = [];
    D.forEach((c, ci) => {
      (c.qs || []).forEach((q) => {
        list.push({
          id: qKey(q),
          q,
          case: c,
          caseIdx: ci,
          subject: c.s,
          level: c.level || 'basic',
        });
      });
    });
    return list;
  }

  function fmtMaterial(text) {
    if (!text) return '';
    return text
      .split('\n\n')
      .filter((p) => p.trim())
      .map((p) => {
        let h = p.trim();
        h = h.replace(/(Statement\s+\d+)/g, '<span class="cfa-stmt">$1</span>');
        h = h.replace(/(Exhibit\s+\d+)/g, '<span class="cfa-exref">$1</span>');
        h = h.replace(/(Conclusion\s+\d+)/g, '<span class="cfa-stmt">$1</span>');
        return `<p>${h}</p>`;
      })
      .join('');
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function recordAnswer(q, letter) {
    const k = qKey(q);
    const ok = letter === q.a;
    progress.ans[k] = letter;
    if (!ok) {
      if (!progress.wrong.includes(q.i)) progress.wrong.push(q.i);
    } else {
      progress.wrong = progress.wrong.filter((id) => id !== q.i);
    }
    saveProgress();
    hooks.onProgress?.();
    return ok;
  }

  function toggleFav(qid) {
    if (progress.fav.has(qid)) {
      progress.fav.delete(qid);
      if (!progress.starred.includes(qid)) {
        /* keep starred list in sync */
      }
      progress.starred = progress.starred.filter((id) => id !== qid);
      hooks.toast('已取消收藏');
    } else {
      progress.fav.add(qid);
      if (!progress.starred.includes(qid)) progress.starred.push(qid);
      hooks.toast('已收藏');
    }
    saveProgress();
    hooks.onProgress?.();
  }

  function categories() {
    return Object.entries(SM).map(([id, m]) => ({
      id: slugSubject(id),
      subject: id,
      name: m.cn || id,
      color: m.c || '#3b82f6',
      icon: m.i || '📋',
    }));
  }

  function categoryCount(subject) {
    return D.filter((c) => c.s === subject).reduce((n, c) => n + (c.qs || []).length, 0);
  }

  function renderHomeStats() {
    const { total, done, correct } = getTotals();
    const acc = done ? Math.round((correct / done) * 100) : 0;
    return [
      { val: total, label: '题目总数' },
      { val: done, label: '已练习' },
      { val: `${acc}%`, label: '正确率' },
      { val: `${D.length} Cases`, label: '题组' },
    ];
  }

  function renderCategoryCards() {
    const subs = getSubs();
    return categories()
      .map((c) => {
        const info = subs[c.subject] || { tq: 0, dn: 0 };
        const pct = info.tq ? Math.round((info.dn / info.tq) * 100) : 0;
        return `
        <button class="cat-card" type="button" data-cfa-subject="${esc(c.subject)}">
          <div class="cat-card-bar" style="background:${c.color}"></div>
          <div>
            <h4>${c.icon} ${c.name}</h4>
            <p>${info.tq} 题 · ${pct}% 完成</p>
          </div>
        </button>`;
      })
      .join('');
  }

  function renderSideCats() {
    return categories()
      .map((c) => {
        const n = categoryCount(c.subject);
        return `
        <button class="cat-chip" type="button" data-cfa-subject="${esc(c.subject)}">
          <span class="cat-dot" style="background:${c.color}"></span>
          <span>${c.name}</span>
          <span class="count">${n}</span>
        </button>`;
      })
      .join('');
  }

  function openSubject(subject) {
    state.screen = 'cases';
    state.subject = subject;
    state.level = 'basic';
    state.caseIdx = -1;
    state.qIdx = 0;
    renderQuizPanel();
  }

  function openCase(caseIdx) {
    state.caseIdx = caseIdx;
    state.qIdx = 0;
    state.screen = 'quiz';
    renderQuizPanel();
  }

  function startWrong() {
    const ids = new Set(progress.wrong);
    const flat = allQuestionsFlat().filter((x) => ids.has(x.q.i));
    if (!flat.length) {
      hooks.toast('暂无错题');
      return;
    }
    openFlatQuestion(flat[0]);
  }

  function startStarred() {
    const ids = new Set([...progress.fav, ...progress.starred]);
    const flat = allQuestionsFlat().filter((x) => ids.has(x.q.i));
    if (!flat.length) {
      hooks.toast('暂无收藏');
      return;
    }
    openFlatQuestion(flat[0]);
  }

  function openFlatQuestion(item) {
    const subs = getSubs();
    const cases = subs[item.subject]?.[item.level] || [];
    const idx = cases.findIndex((c) => c.c === item.case.c);
    state.subject = item.subject;
    state.level = item.level;
    state.caseIdx = idx >= 0 ? idx : 0;
    state.qIdx = (cases[state.caseIdx]?.qs || []).findIndex((q) => q.i === item.q.i);
    if (state.qIdx < 0) state.qIdx = 0;
    state.screen = 'quiz';
    renderQuizPanel();
  }

  function getCaseContext() {
    const subs = getSubs();
    const info = subs[state.subject];
    if (!info) return null;
    const cases = info[state.level] || [];
    const c = cases[state.caseIdx];
    if (!c) return null;
    const q = (c.qs || [])[state.qIdx];
    return { subs, info, cases, c, q, meta: SM[state.subject] || { cn: state.subject } };
  }

  function renderQuizPanel() {
    const root = $('#cfaRoot');
    const empty = $('#quizEmpty');
    const card = $('#questionCard');
    if (!root) return;

    empty?.classList.add('hidden');
    card?.classList.add('hidden');
    root.classList.remove('hidden');

    if (state.screen === 'subjects') {
      root.innerHTML = renderSubjects();
      return;
    }
    if (state.screen === 'cases') {
      root.innerHTML = renderCaseList();
      return;
    }
    if (state.screen === 'quiz') {
      root.innerHTML = renderCaseQuiz();
      return;
    }
  }

  function renderSubjects() {
    let h = `<div class="cfa-browse"><h3 class="section-title">选择科目</h3><div class="cat-grid">${renderCategoryCards()}</div></div>`;
    return h;
  }

  function renderCaseList() {
    const subs = getSubs();
    const info = subs[state.subject];
    const m = SM[state.subject] || { cn: state.subject, i: '📋' };
    if (!info) return '<p>科目不存在</p>';
    const cases = info[state.level] || [];

    let h = `<div class="cfa-browse">
      <div class="cfa-list-head">
        <button class="secondary-btn" type="button" data-cfa-back="subjects">← 科目</button>
        <h3>${m.i} ${m.cn}</h3>
      </div>
      <div class="cfa-level-tabs">
        <button class="cfa-tab ${state.level === 'basic' ? 'on' : ''}" type="button" data-cfa-level="basic">📘 基础题 (${info.basic.length})</button>
        <button class="cfa-tab ${state.level === 'advanced' ? 'on' : ''}" type="button" data-cfa-level="advanced">📕 强化题 (${info.advanced.length})</button>
      </div>
      <div class="cfa-case-list">`;

    if (!cases.length) {
      h += '<p class="cfa-empty">暂无题目</p>';
    } else {
      cases.forEach((c, idx) => {
        const ql = (c.qs || []).length;
        let dn = 0;
        (c.qs || []).forEach((q) => {
          if (progress.ans[qKey(q)] !== undefined) dn++;
        });
        const stx = dn === ql ? '✓ 完成' : dn > 0 ? `${dn}/${ql}` : '';
        const kp = c.qs?.[0]?.k || '';
        const hasEx = (c.exhibit_files || []).length > 0;
        h += `<button class="cfa-case-item" type="button" data-cfa-case="${idx}">
          <span class="cfa-case-num">${idx + 1}</span>
          <span class="cfa-case-body">
            <strong>Case ${idx + 1}${kp ? ' · ' + esc(kp) : ''}${hasEx ? ' 📊' : ''}</strong>
            <small>${ql} 题${hasEx ? ' · 含图表' : ''}</small>
          </span>
          ${stx ? `<span class="cfa-case-st">${stx}</span>` : ''}
        </button>`;
      });
    }
    h += '</div></div>';
    return h;
  }

  function renderCaseQuiz() {
    const ctx = getCaseContext();
    if (!ctx || !ctx.q) {
      return '<p class="cfa-empty">题目加载失败</p>';
    }
    const { cases, c, q, meta } = ctx;
    const key = qKey(q);
    const ua = progress.ans[key];
    const locked = ua !== undefined;
    const fav = progress.fav.has(q.i);

    let matH = fmtMaterial(c.m || '') || '<p class="cfa-muted">本题无附加背景材料</p>';
    let exH = '';
    (c.exhibit_files || []).forEach((f) => {
      exH += `<figure class="cfa-exhibit">
        <img src="exhibits/${esc(f)}" alt="Exhibit" loading="lazy">
        <figcaption>📊 Exhibit · ${esc(f.replace('ex_p', '').replace('.jpg', ''))}</figcaption>
      </figure>`;
    });

    const qs = c.qs || [];
    let dots = '';
    qs.forEach((qq, i) => {
      const u = progress.ans[qKey(qq)];
      let cls = 'cfa-qdot';
      if (i === state.qIdx) cls += ' cur';
      if (u !== undefined) cls += u === qq.a ? ' ok' : ' wr';
      dots += `<button class="${cls}" type="button" data-cfa-qidx="${i}">${i + 1}</button>`;
    });

    let opts = '';
    for (const [letter, text] of Object.entries(q.o || {})) {
      let cls = 'cfa-opt';
      if (locked) {
        if (letter === q.a) cls += ' correct';
        else if (letter === ua) cls += ' wrong';
      } else if (ua === letter) cls += ' selected';
      opts += `<button class="${cls}" type="button" data-cfa-opt="${letter}" ${locked ? 'disabled' : ''}>
        <span class="cfa-opt-key">${letter}</span><span>${esc(text)}</span>
      </button>`;
    }

    let feedback = '';
    if (locked) {
      const ok = ua === q.a;
      feedback = `<div class="q-feedback ${ok ? 'ok' : 'bad'}">
        <div class="feedback-head">${ok ? '✓ 回答正确' : '✗ 回答错误'} · 正确答案 <strong>${q.a}</strong></div>
        ${q.e ? `<p class="feedback-text">${esc(q.e)}</p>` : ''}
        ${q.r ? `<p class="cfa-muted">全站正确率 ${q.r}%</p>` : ''}
      </div>`;
    }

    const doneInCase = qs.filter((qq) => progress.ans[qKey(qq)] !== undefined).length;

    return `<div class="cfa-quiz">
      <div class="cfa-quiz-head">
        <button class="secondary-btn" type="button" data-cfa-back="cases">← ${esc(meta.cn)}</button>
        <span class="cfa-muted">${state.level === 'basic' ? '基础题' : '强化题'} · Case ${state.caseIdx + 1}/${cases.length}</span>
        <button class="star-btn ${fav ? 'on' : ''}" type="button" data-cfa-fav="${q.i}">${fav ? '★' : '☆'}</button>
      </div>
      <div class="cfa-split">
        <section class="cfa-vignette">
          <div class="cfa-vignette-label">背景材料 · VIGNETTE</div>
          <div class="cfa-material">${matH}</div>
          ${exH}
          ${c.m && c.m.includes('Exhibit') && !(c.exhibit_files || []).length ? '<p class="cfa-warn">⚠️ 材料引用 Exhibit，请对照图表作答</p>' : ''}
        </section>
        <section class="cfa-question">
          <div class="cfa-qdots">${dots}</div>
          <div class="q-meta">
            <span class="q-tag">${esc(q.k || q.s)}</span>
            <span class="q-type">单选</span>
          </div>
          <p class="q-stem">${esc(q.q)}</p>
          <div class="cfa-opts">${opts}</div>
          ${feedback}
          <div class="cfa-qfoot">
            <span class="cfa-muted">${doneInCase}/${qs.length} 已完成</span>
            <div class="cfa-qnav">
              ${state.qIdx > 0 ? `<button class="secondary-btn" type="button" data-cfa-qidx="${state.qIdx - 1}">上一题</button>` : ''}
              ${state.qIdx < qs.length - 1 ? `<button class="primary-btn" type="button" data-cfa-qidx="${state.qIdx + 1}">下一题</button>` : ''}
            </div>
          </div>
        </section>
      </div>
    </div>`;
  }

  function renderMockHome(container) {
    let h = `<div class="cfa-mock-home">
      <h3>📝 Mock 模拟考试</h3>
      <p class="cfa-muted">CFA Level II · 每 Session 44 题 · 限时 132 分钟</p>
      <div class="cfa-mock-grid">`;
    MK.forEach((sess, i) => {
      const tq = sess.vignettes.reduce((s, v) => s + v.qs.length, 0);
      const mkKey = `mk${i}`;
      const done = Object.keys(progress.mkans).filter((k) => k.startsWith(mkKey)).length;
      h += `<button class="cfa-mock-card" type="button" data-cfa-mock="${i}">
        <h4>${esc(sess.name)}</h4>
        <p>${sess.vignettes.length} Item Sets · ${tq} 题</p>
        <p class="cfa-accent">${done ? `已做 ${done} 题` : '132 分钟'}</p>
      </button>`;
    });
    h += `</div><div class="stats-block">
      <h4>考试说明</h4>
      <ul class="cfa-mock-notes">
        <li>每 Session 含多个 Item Set，每 Set 若干道选择题</li>
        <li>限时 2 小时 12 分钟，可随时退出</li>
        <li>交卷后显示得分与解析</li>
      </ul>
    </div></div>`;
    container.innerHTML = h;
  }

  function startMock(idx) {
    state.mockIdx = idx;
    state.mockQ = 0;
    state.mockTimer = MOCK_SECONDS;
    clearInterval(state.mockTimerId);
    state.mockTimerId = setInterval(() => {
      state.mockTimer--;
      const el = document.getElementById('cfaMockTimer');
      if (el) {
        const m = Math.floor(state.mockTimer / 60);
        const s = state.mockTimer % 60;
        el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }
      if (state.mockTimer <= 0) {
        clearInterval(state.mockTimerId);
        hooks.toast('⏰ 时间到');
      }
    }, 1000);
    renderMockExam(document.getElementById('view-mock'));
  }

  function exitMock() {
    if (!confirm('确定退出 Mock 考试？')) return;
    clearInterval(state.mockTimerId);
    state.mockIdx = null;
    hooks.setView('mock');
  }

  function renderMockExam(container) {
    const sess = MK[state.mockIdx];
    const allQs = [];
    sess.vignettes.forEach((v, vi) => {
      v.qs.forEach((q) => allQs.push({ ...q, vi, topic: v.topic, material: v.material }));
    });
    const cur = allQs[state.mockQ];
    if (!cur) {
      container.innerHTML = '<p>无题目</p>';
      return;
    }
    const mkKey = `mk${state.mockIdx}_${state.mockQ}`;
    const ua = progress.mkans[mkKey];
    const locked = ua !== undefined;
    const mins = Math.floor(state.mockTimer / 60);
    const secs = state.mockTimer % 60;

    let opts = '';
    for (const [letter, text] of Object.entries(cur.o || {})) {
      let cls = 'cfa-opt';
      if (locked) {
        if (letter === cur.a) cls += ' correct';
        else if (letter === ua) cls += ' wrong';
      }
      opts += `<button class="${cls}" type="button" data-cfa-mopt="${letter}" ${locked ? 'disabled' : ''}>
        <span class="cfa-opt-key">${letter}</span><span>${esc(text)}</span>
      </button>`;
    }

    let feedback = '';
    if (locked) {
      const ok = ua === cur.a;
      feedback = `<div class="q-feedback ${ok ? 'ok' : 'bad'}">
        <div class="feedback-head">${ok ? '✓ 正确' : '✗ 错误'} · 答案 ${cur.a}</div>
        ${cur.e ? `<p class="feedback-text">${esc(cur.e)}</p>` : ''}
      </div>`;
    }

    container.innerHTML = `<div class="cfa-mock-exam">
      <div class="cfa-mock-bar">
        <button class="secondary-btn" type="button" data-cfa-mock-exit>✕ 退出</button>
        <strong>${esc(sess.name)}</strong>
        <span class="cfa-muted">Q${state.mockQ + 1}/${allQs.length}</span>
        <span class="cfa-timer" id="cfaMockTimer">${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}</span>
      </div>
      <div class="cfa-split mock">
        <section class="cfa-vignette">
          <div class="cfa-vignette-label">${esc(cur.topic || '')}</div>
          <div class="cfa-material">${fmtMaterial(cur.material || '')}</div>
        </section>
        <section class="cfa-question">
          <p class="q-stem">${esc(cur.q)}</p>
          <div class="cfa-opts">${opts}</div>
          ${feedback}
          <div class="cfa-qnav">
            ${state.mockQ > 0 ? `<button class="secondary-btn" type="button" data-cfa-mq="${state.mockQ - 1}">上一题</button>` : ''}
            ${state.mockQ < allQs.length - 1 ? `<button class="primary-btn" type="button" data-cfa-mq="${state.mockQ + 1}">下一题</button>` : `<button class="primary-btn" type="button" data-cfa-mock-finish>交卷</button>`}
          </div>
        </section>
      </div>
    </div>`;
  }

  function finishMock() {
    const sess = MK[state.mockIdx];
    const allQs = [];
    sess.vignettes.forEach((v) => v.qs.forEach((q) => allQs.push(q)));
    let correct = 0;
    let done = 0;
    allQs.forEach((q, i) => {
      const k = `mk${state.mockIdx}_${i}`;
      if (progress.mkans[k] !== undefined) {
        done++;
        if (progress.mkans[k] === q.a) correct++;
      }
    });
    clearInterval(state.mockTimerId);
    state.mockIdx = null;
    hooks.toast(`Mock 得分：${correct}/${done || allQs.length}`);
    hooks.setView('mock');
  }

  function getChromeCounts() {
    return {
      wrong: progress.wrong.length,
      starred: progress.starred.length || progress.fav.size,
      done: getTotals().done,
      total: getTotals().total,
    };
  }

  function getWrongListItems() {
    const ids = new Set(progress.wrong);
    return allQuestionsFlat()
      .filter((x) => ids.has(x.q.i))
      .map((x) => ({
        id: qKey(x.q),
        stem: x.q.q,
        category: SM[x.subject]?.cn || x.subject,
        type: '单选',
        item: x,
      }));
  }

  function getStarredListItems() {
    const ids = new Set([...progress.fav, ...progress.starred]);
    return allQuestionsFlat()
      .filter((x) => ids.has(x.q.i))
      .map((x) => ({
        id: qKey(x.q),
        stem: x.q.q,
        category: SM[x.subject]?.cn || x.subject,
        type: '单选',
        item: x,
      }));
  }

  function renderStatsPanel() {
    const { total, done, correct } = getTotals();
    const subs = getSubs();
    const byCat = categories().map((c) => {
      const info = subs[c.subject] || { tq: 0, dn: 0, co: 0 };
      const pct = info.tq ? Math.round((info.dn / info.tq) * 100) : 0;
      return { ...c, ...info, pct };
    });

    let mockRows = '';
    MK.forEach((sess, i) => {
      let t = 0;
      let co = 0;
      sess.vignettes.forEach((v) => {
        v.qs.forEach((q, qi) => {
          t++;
          const k = `mk${i}_${t - 1}`;
          if (progress.mkans[k] === q.a) co++;
        });
      });
      const doneMk = Object.keys(progress.mkans).filter((k) => k.startsWith(`mk${i}`)).length;
      mockRows += `<div class="bar-row"><span class="bar-label">${esc(sess.name)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${doneMk ? Math.round((co / doneMk) * 100) : 0}%"></div></div>
        <span class="bar-pct">${doneMk ? `${co}/${doneMk}` : '未做'}</span></div>`;
    });

    return `
      <div class="stats-block">
        <h3>CFA Level II 总览</h3>
        <div class="stat-grid" style="margin:0">
          <div class="stat-card"><div class="stat-val">${done}/${total}</div><div class="stat-label">完成进度</div></div>
          <div class="stat-card"><div class="stat-val">${done ? Math.round((correct / done) * 100) : 0}%</div><div class="stat-label">总正确率</div></div>
          <div class="stat-card"><div class="stat-val">${progress.wrong.length}</div><div class="stat-label">错题数</div></div>
          <div class="stat-card"><div class="stat-val">${MK.length}</div><div class="stat-label">Mock 卷</div></div>
        </div>
      </div>
      <div class="stats-block"><h3>各科进度</h3>
        ${byCat
          .map(
            (c) => `<div class="bar-row"><span class="bar-label">${c.name}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${c.pct}%;background:${c.color}"></div></div>
          <span class="bar-pct">${c.dn}/${c.tq}</span></div>`
          )
          .join('')}
      </div>
      <div class="stats-block"><h3>Mock 记录</h3>${mockRows}</div>`;
  }

  function bindQuizPanel() {
    const root = $('#cfaRoot');
    if (!root) return;
    root.addEventListener('click', (e) => {
      const sub = e.target.closest('[data-cfa-subject]');
      if (sub) {
        openSubject(sub.dataset.cfaSubject);
        return;
      }
      const back = e.target.closest('[data-cfa-back]');
      if (back) {
        const to = back.dataset.cfaBack;
        if (to === 'subjects') {
          state.screen = 'subjects';
          state.subject = null;
        } else if (to === 'cases') {
          state.screen = 'cases';
          state.caseIdx = -1;
        }
        renderQuizPanel();
        return;
      }
      const lvl = e.target.closest('[data-cfa-level]');
      if (lvl) {
        state.level = lvl.dataset.cfaLevel;
        renderQuizPanel();
        return;
      }
      const caseBtn = e.target.closest('[data-cfa-case]');
      if (caseBtn) {
        openCase(Number(caseBtn.dataset.cfaCase));
        return;
      }
      const qidx = e.target.closest('[data-cfa-qidx]');
      if (qidx) {
        state.qIdx = Number(qidx.dataset.cfaQidx);
        renderQuizPanel();
        return;
      }
      const opt = e.target.closest('[data-cfa-opt]');
      if (opt) {
        const ctx = getCaseContext();
        if (!ctx?.q) return;
        const letter = opt.dataset.cfaOpt;
        if (progress.ans[qKey(ctx.q)] !== undefined) return;
        const ok = recordAnswer(ctx.q, letter);
        hooks.toast(ok ? '✓ 正确' : '✗ 查看解析');
        renderQuizPanel();
        return;
      }
      const fav = e.target.closest('[data-cfa-fav]');
      if (fav) {
        toggleFav(Number(fav.dataset.cfaFav));
        renderQuizPanel();
      }
    });
  }

  function bindMockPanel() {
    const view = document.getElementById('view-mock');
    if (!view) return;
    view.addEventListener('click', (e) => {
      const start = e.target.closest('[data-cfa-mock]');
      if (start) {
        startMock(Number(start.dataset.cfaMock));
        return;
      }
      const exit = e.target.closest('[data-cfa-mock-exit]');
      if (exit) {
        exitMock();
        renderMockHome(view);
        return;
      }
      const mq = e.target.closest('[data-cfa-mq]');
      if (mq) {
        state.mockQ = Number(mq.dataset.cfaMq);
        renderMockExam(view);
        return;
      }
      const mopt = e.target.closest('[data-cfa-mopt]');
      if (mopt) {
        const sess = MK[state.mockIdx];
        const allQs = [];
        sess.vignettes.forEach((v) => v.qs.forEach((q) => allQs.push(q)));
        const q = allQs[state.mockQ];
        const k = `mk${state.mockIdx}_${state.mockQ}`;
        if (progress.mkans[k] !== undefined) return;
        progress.mkans[k] = mopt.dataset.cfaMopt;
        saveProgress();
        hooks.toast(progress.mkans[k] === q.a ? '✓ 正确' : '✗ 错误');
        renderMockExam(view);
        return;
      }
      const fin = e.target.closest('[data-cfa-mock-finish]');
      if (fin) finishMock();
    });
  }

  function enterQuizBrowse() {
    state.screen = 'subjects';
    state.subject = null;
    const root = $('#cfaRoot');
    const empty = $('#quizEmpty');
    const card = $('#questionCard');
    empty?.classList.add('hidden');
    card?.classList.add('hidden');
    root?.classList.remove('hidden');
    renderQuizPanel();
  }

  function init(h) {
    hooks = h;
    $ = h.$ || ((sel) => document.querySelector(sel));
    bindQuizPanel();
    bindMockPanel();
  }

  function renderMockView(container) {
    if (state.mockIdx !== null) renderMockExam(container);
    else renderMockHome(container);
  }

  global.CFA = {
    init,
    isActive: () => typeof D !== 'undefined' && typeof SM !== 'undefined',
    renderHomeStats,
    renderCategoryCards,
    renderSideCats,
    openSubject,
    enterQuizBrowse,
    startWrong,
    startStarred,
    openFlatQuestion,
    getChromeCounts,
    getWrongListItems,
    getStarredListItems,
    renderStatsPanel,
    renderMockHome,
    renderMockView,
    bankTitle: 'CFA Level II',
  };
})(typeof window !== 'undefined' ? window : globalThis);
