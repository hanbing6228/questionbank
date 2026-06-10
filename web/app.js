(function () {
  'use strict';

  const STORAGE_KEY = 'questionbank_progress_v1';
  const EXAM_MINUTES = 15;

  const TYPE_LABELS = { single: '单选', multi: '多选', judge: '判断' };
  const VIEW_TITLES = {
    home: '首页',
    quiz: '刷题',
    wrong: '错题本',
    starred: '收藏',
    stats: '统计',
  };

  /** @type {ReturnType<typeof defaultProgress>} */
  let progress = loadProgress();

  let session = {
    mode: 'sequential',
    queue: [],
    index: 0,
    answers: {},
    submitted: {},
    examDeadline: 0,
    timerId: null,
    categoryFilter: null,
  };

  let selected = null; // number | number[] | boolean | null
  let revealed = false;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];

  function defaultProgress() {
    return {
      answered: {},
      wrong: [],
      starred: [],
      today: { date: todayKey(), count: 0 },
      examBest: 0,
    };
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultProgress();
      const data = JSON.parse(raw);
      if (data.today?.date !== todayKey()) {
        data.today = { date: todayKey(), count: 0 };
      }
      return { ...defaultProgress(), ...data };
    } catch {
      return defaultProgress();
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
      console.warn('saveProgress', e);
    }
  }

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function catById(id) {
    return QUESTION_BANK.categories.find((c) => c.id === id);
  }

  function qById(id) {
    return QUESTION_BANK.questions.find((q) => q.id === id);
  }

  function normalizeAnswer(ans) {
    if (typeof ans === 'boolean') return ans;
    if (Array.isArray(ans)) return [...ans].sort((a, b) => a - b);
    return ans;
  }

  function answersEqual(user, correct) {
    const u = normalizeAnswer(user);
    const c = normalizeAnswer(correct);
    if (Array.isArray(u) && Array.isArray(c)) {
      return u.length === c.length && u.every((v, i) => v === c[i]);
    }
    return u === c;
  }

  function buildQueue(mode, categoryFilter) {
    let list = [...QUESTION_BANK.questions];
    if (categoryFilter) list = list.filter((q) => q.category === categoryFilter);

    if (mode === 'wrong') {
      list = progress.wrong.map(qById).filter(Boolean);
    } else if (mode === 'starred') {
      list = progress.starred.map(qById).filter(Boolean);
    } else if (mode === 'random' || mode === 'exam') {
      list = shuffle(list);
    } else if (mode === 'sequential') {
      list.sort((a, b) => a.id.localeCompare(b.id));
    }

    return list;
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function startSession(mode, categoryFilter) {
    session = {
      mode,
      queue: buildQueue(mode, categoryFilter),
      index: 0,
      answers: {},
      submitted: {},
      examDeadline: mode === 'exam' ? Date.now() + EXAM_MINUTES * 60 * 1000 : 0,
      timerId: null,
      categoryFilter: categoryFilter || null,
    };
    selected = null;
    revealed = false;

    if (session.queue.length === 0) {
      toast(mode === 'wrong' ? '暂无错题' : mode === 'starred' ? '暂无收藏' : '没有题目');
      return;
    }

    if (session.mode === 'exam') startExamTimer();
    else stopExamTimer();

    setView('quiz');
    renderQuiz();
  }

  function startExamTimer() {
    stopExamTimer();
    $('#examTimerBlock').hidden = false;
    const tick = () => {
      const left = Math.max(0, session.examDeadline - Date.now());
      const m = Math.floor(left / 60000);
      const s = Math.floor((left % 60000) / 1000);
      $('#examTimer').textContent = `${m}:${String(s).padStart(2, '0')}`;
      if (left <= 0) {
        finishExam();
        return;
      }
      session.timerId = setTimeout(tick, 250);
    };
    tick();
  }

  function stopExamTimer() {
    if (session.timerId) clearTimeout(session.timerId);
    session.timerId = null;
    $('#examTimerBlock').hidden = true;
  }

  function finishExam() {
    stopExamTimer();
    let correct = 0;
    session.queue.forEach((q) => {
      const sub = session.submitted[q.id];
      if (sub && answersEqual(sub, q.answer)) correct++;
    });
    const pct = session.queue.length ? Math.round((correct / session.queue.length) * 100) : 0;
    if (pct > progress.examBest) progress.examBest = pct;
    saveProgress();
    toast(`测验结束：${correct}/${session.queue.length}（${pct}%）`);
    renderStats();
  }

  function currentQuestion() {
    return session.queue[session.index];
  }

  function recordAnswer(q, userAns, isCorrect) {
    progress.answered[q.id] = { correct: isCorrect, at: Date.now() };
    if (!isCorrect) {
      if (!progress.wrong.includes(q.id)) progress.wrong.push(q.id);
    } else {
      progress.wrong = progress.wrong.filter((id) => id !== q.id);
    }
    if (progress.today.date !== todayKey()) {
      progress.today = { date: todayKey(), count: 0 };
    }
    progress.today.count += 1;
    saveProgress();
    updateChrome();
  }

  function toggleStar(qid) {
    if (progress.starred.includes(qid)) {
      progress.starred = progress.starred.filter((id) => id !== qid);
      toast('已取消收藏');
    } else {
      progress.starred.push(qid);
      toast('已收藏');
    }
    saveProgress();
    updateChrome();
    if ($('#questionCard') && !$('#questionCard').classList.contains('hidden')) {
      updateStarBtn(qid);
    }
    renderLists();
  }

  function updateStarBtn(qid) {
    const btn = $('#starBtn');
    btn.textContent = progress.starred.includes(qid) ? '★' : '☆';
    btn.classList.toggle('on', progress.starred.includes(qid));
  }

  function setView(name) {
    $$('.view').forEach((v) => v.classList.remove('active'));
    $(`#view-${name}`)?.classList.add('active');

    $$('.side-link, .bnav').forEach((el) => {
      el.classList.toggle('active', el.dataset.view === name);
    });

    $('#pageTitle').textContent = VIEW_TITLES[name] || name;
    closeSidebar();

    if (name === 'wrong' || name === 'starred') renderLists();
    if (name === 'stats') renderStats();
    if (name === 'home') renderHome();
  }

  function openSidebar() {
    $('#sidebar').classList.add('open');
    $('#sidebarBackdrop').classList.add('show');
  }

  function closeSidebar() {
    $('#sidebar').classList.remove('open');
    $('#sidebarBackdrop').classList.remove('show');
  }

  function renderHome() {
    $('#bankTitle').textContent = QUESTION_BANK.title;
    const total = QUESTION_BANK.questions.length;
    const done = Object.keys(progress.answered).length;
    const correct = Object.values(progress.answered).filter((a) => a.correct).length;
    const acc = done ? Math.round((correct / done) * 100) : 0;

    $('#statGrid').innerHTML = [
      { val: total, label: '题目总数' },
      { val: done, label: '已练习' },
      { val: `${acc}%`, label: '正确率' },
      { val: progress.today.count, label: '今日刷题' },
    ]
      .map(
        (s) => `
      <div class="stat-card">
        <div class="stat-val">${s.val}</div>
        <div class="stat-label">${s.label}</div>
      </div>`
      )
      .join('');

    $('#catGrid').innerHTML = QUESTION_BANK.categories
      .map((c) => {
        const n = QUESTION_BANK.questions.filter((q) => q.category === c.id).length;
        return `
        <button class="cat-card" type="button" data-cat="${c.id}">
          <div class="cat-card-bar" style="background:${c.color}"></div>
          <div>
            <h4>${c.name}</h4>
            <p>${n} 题 · 点击分类练习</p>
          </div>
        </button>`;
      })
      .join('');

    renderSideCats();
    updateChrome();
  }

  function renderSideCats() {
    $('#sideCats').innerHTML = QUESTION_BANK.categories
      .map((c) => {
        const n = QUESTION_BANK.questions.filter((q) => q.category === c.id).length;
        return `
        <button class="cat-chip" type="button" data-cat="${c.id}">
          <span class="cat-dot" style="background:${c.color}"></span>
          <span>${c.name}</span>
          <span class="count">${n}</span>
        </button>`;
      })
      .join('');
  }

  function updateChrome() {
    const total = QUESTION_BANK.questions.length;
    const done = Object.keys(progress.answered).length;
    const pct = total ? Math.round((done / total) * 100) : 0;

    $('#ringFill').setAttribute('stroke-dasharray', `${pct}, 100`);
    $('#ringLabel').textContent = `${pct}%`;
    $('#todaySummary').textContent = `${progress.today.count} 题`;
    $('#wrongBadge').textContent = String(progress.wrong.length);
    $('#starBadge').textContent = String(progress.starred.length);
  }

  function renderQuiz() {
    const q = currentQuestion();
    const empty = $('#quizEmpty');
    const card = $('#questionCard');

    if (!q) {
      empty.classList.remove('hidden');
      card.classList.add('hidden');
      if (session.mode === 'exam') finishExam();
      else toast('本轮练习已完成');
      return;
    }

    empty.classList.add('hidden');
    card.classList.remove('hidden');

    const cat = catById(q.category);
    $('#qCategory').textContent = cat?.name || q.category;
    $('#qCategory').style.color = cat?.color || '';
    $('#qType').textContent = TYPE_LABELS[q.type] || q.type;
    $('#qDiff').textContent = '★'.repeat(q.difficulty || 1);
    $('#qStem').textContent = q.stem;

    const pct = ((session.index + 1) / session.queue.length) * 100;
    $('#qProgressBar').style.width = `${pct}%`;
    $('#sessionStat').textContent = `${session.index + 1} / ${session.queue.length}`;

    revealed = !!session.submitted[q.id];
    selected = session.answers[q.id] ?? null;

    renderOptions(q);
    renderDots();
    updateStarBtn(q.id);
    updateQuizActions(q);
    renderFeedback(q);
  }

  function renderOptions(q) {
    const optsEl = $('#qOptions');
    const judgeEl = $('#qJudge');

    if (q.type === 'judge') {
      optsEl.classList.add('hidden');
      judgeEl.classList.remove('hidden');
      judgeEl.querySelectorAll('.judge-btn').forEach((btn) => {
        const val = btn.dataset.val === 'true';
        btn.classList.remove('selected', 'correct', 'wrong');
        btn.disabled = revealed;
        if (selected === val) btn.classList.add('selected');
        if (revealed) {
          if (val === q.answer) btn.classList.add('correct');
          else if (selected === val) btn.classList.add('wrong');
        }
      });
      return;
    }

    judgeEl.classList.add('hidden');
    optsEl.classList.remove('hidden');
    const keys = 'ABCDEFGHIJ';

    optsEl.innerHTML = (q.options || [])
      .map((text, i) => {
        let cls = 'opt-btn';
        const isSel = q.type === 'multi'
          ? Array.isArray(selected) && selected.includes(i)
          : selected === i;
        if (isSel) cls += ' selected';
        if (revealed) {
          const correctSet = Array.isArray(q.answer) ? q.answer : [q.answer];
          if (correctSet.includes(i)) cls += ' correct';
          else if (isSel) cls += ' wrong';
        }
        return `
        <button class="${cls}" type="button" data-i="${i}" ${revealed ? 'disabled' : ''}>
          <span class="opt-key">${keys[i]}</span>
          <span>${text}</span>
        </button>`;
      })
      .join('');
  }

  function renderDots() {
    $('#qDots').innerHTML = session.queue
      .map((q, i) => {
        let cls = 'q-dot';
        if (i === session.index) cls += ' current';
        const sub = session.submitted[q.id];
        if (sub !== undefined) {
          cls += answersEqual(sub, q.answer) ? ' done' : ' wrong-dot';
        }
        return `<button class="${cls}" type="button" data-i="${i}">${i + 1}</button>`;
      })
      .join('');
  }

  function updateQuizActions(q) {
    $('#prevBtn').disabled = session.index === 0;
    $('#submitBtn').classList.toggle('hidden', revealed);
    $('#nextBtn').classList.toggle('hidden', !revealed);
    $('#submitBtn').disabled = selected === null || (q.type === 'multi' && (!Array.isArray(selected) || selected.length === 0));
  }

  function renderFeedback(q) {
    const box = $('#qFeedback');
    if (!revealed) {
      box.classList.add('hidden');
      return;
    }
    const ok = answersEqual(session.submitted[q.id], q.answer);
    box.classList.remove('hidden', 'ok', 'bad');
    box.classList.add(ok ? 'ok' : 'bad');
    $('#feedbackHead').textContent = ok ? '✓ 回答正确' : '✗ 回答错误';
    $('#feedbackText').textContent = q.explanation;
  }

  function submitCurrent() {
    const q = currentQuestion();
    if (!q || selected === null) return;

    session.answers[q.id] = q.type === 'multi' ? [...selected].sort() : selected;
    session.submitted[q.id] = session.answers[q.id];
    const ok = answersEqual(session.answers[q.id], q.answer);
    recordAnswer(q, session.answers[q.id], ok);
    revealed = true;
    renderQuiz();
  }

  function goIndex(i) {
    if (i < 0 || i >= session.queue.length) return;
    session.index = i;
    const q = currentQuestion();
    selected = q ? session.answers[q.id] ?? null : null;
    revealed = q ? !!session.submitted[q.id] : false;
    renderQuiz();
  }

  function renderLists() {
    renderList('#wrongList', progress.wrong, '暂无错题，继续保持！');
    renderList('#starList', progress.starred, '还没有收藏题目');
  }

  function renderList(sel, ids, emptyMsg) {
    const el = $(sel);
    if (!ids.length) {
      el.innerHTML = `<li class="empty-list">${emptyMsg}</li>`;
      return;
    }
    el.innerHTML = ids
      .map((id) => {
        const q = qById(id);
        if (!q) return '';
        const cat = catById(q.category);
        return `
        <li class="q-list-item" data-qid="${q.id}">
          <div class="q-list-meta">
            <span>${cat?.name || q.category}</span>
            <span>${TYPE_LABELS[q.type]}</span>
          </div>
          <p class="q-list-stem">${q.stem}</p>
        </li>`;
      })
      .join('');
  }

  function renderStats() {
    const total = QUESTION_BANK.questions.length;
    const done = Object.keys(progress.answered).length;
    const correct = Object.values(progress.answered).filter((a) => a.correct).length;

    const byCat = QUESTION_BANK.categories.map((c) => {
      const qs = QUESTION_BANK.questions.filter((q) => q.category === c.id);
      const answered = qs.filter((q) => progress.answered[q.id]).length;
      const pct = qs.length ? Math.round((answered / qs.length) * 100) : 0;
      return { ...c, answered, total: qs.length, pct };
    });

    $('#statsPanel').innerHTML = `
      <div class="stats-block">
        <h3>总览</h3>
        <div class="stat-grid" style="margin:0">
          <div class="stat-card"><div class="stat-val">${done}/${total}</div><div class="stat-label">完成进度</div></div>
          <div class="stat-card"><div class="stat-val">${done ? Math.round((correct / done) * 100) : 0}%</div><div class="stat-label">总正确率</div></div>
          <div class="stat-card"><div class="stat-val">${progress.examBest}%</div><div class="stat-label">测验最高分</div></div>
          <div class="stat-card"><div class="stat-val">${progress.wrong.length}</div><div class="stat-label">错题数</div></div>
        </div>
      </div>
      <div class="stats-block">
        <h3>分类进度</h3>
        ${byCat
          .map(
            (c) => `
          <div class="bar-row">
            <span class="bar-label">${c.name}</span>
            <div class="bar-track"><div class="bar-fill" style="width:${c.pct}%;background:${c.color}"></div></div>
            <span class="bar-pct">${c.answered}/${c.total}</span>
          </div>`
          )
          .join('')}
      </div>`;
  }

  function resetProgress() {
    if (!confirm('确定重置所有练习进度、错题与收藏？')) return;
    progress = defaultProgress();
    saveProgress();
    session.queue = [];
    renderHome();
    renderLists();
    renderStats();
    toast('已重置');
  }

  function bindEvents() {
    $$('.side-link, .bnav').forEach((btn) => {
      btn.addEventListener('click', () => setView(btn.dataset.view));
    });

    $('#menuBtn').addEventListener('click', openSidebar);
    $('#sidebarClose').addEventListener('click', closeSidebar);
    $('#sidebarBackdrop').addEventListener('click', closeSidebar);

    $$('.mode-card').forEach((card) => {
      card.addEventListener('click', () => startSession(card.dataset.mode));
    });

    document.body.addEventListener('click', (e) => {
      const catBtn = e.target.closest('[data-cat]');
      if (catBtn) startSession('sequential', catBtn.dataset.cat);

      const goto = e.target.closest('[data-goto]');
      if (goto) setView(goto.dataset.goto);

      const mode = e.target.closest('.mode-card');
      // handled above

      const dot = e.target.closest('.q-dot');
      if (dot) goIndex(Number(dot.dataset.i));

      const opt = e.target.closest('.opt-btn');
      if (opt && !revealed) {
        const q = currentQuestion();
        const i = Number(opt.dataset.i);
        if (q.type === 'multi') {
          const arr = Array.isArray(selected) ? [...selected] : [];
          const idx = arr.indexOf(i);
          if (idx >= 0) arr.splice(idx, 1);
          else arr.push(i);
          selected = arr.sort((a, b) => a - b);
        } else {
          selected = i;
        }
        renderOptions(q);
        updateQuizActions(q);
      }

      const judge = e.target.closest('.judge-btn');
      if (judge && !revealed) {
        selected = judge.dataset.val === 'true';
        renderOptions(currentQuestion());
        updateQuizActions(currentQuestion());
      }

      const listItem = e.target.closest('.q-list-item');
      if (listItem) {
        const qid = listItem.dataset.qid;
        session = {
          mode: 'review',
          queue: [qById(qid)].filter(Boolean),
          index: 0,
          answers: {},
          submitted: {},
          examDeadline: 0,
          timerId: null,
          categoryFilter: null,
        };
        selected = null;
        revealed = false;
        setView('quiz');
        renderQuiz();
      }
    });

    $('#submitBtn').addEventListener('click', submitCurrent);
    $('#nextBtn').addEventListener('click', () => {
      if (session.index < session.queue.length - 1) goIndex(session.index + 1);
      else {
        if (session.mode === 'exam') finishExam();
        else toast('已是最后一题');
      }
    });
    $('#prevBtn').addEventListener('click', () => goIndex(session.index - 1));
    $('#starBtn').addEventListener('click', () => {
      const q = currentQuestion();
      if (q) toggleStar(q.id);
    });

    $('#retryWrongBtn').addEventListener('click', () => startSession('wrong'));
    $('#retryStarBtn').addEventListener('click', () => startSession('starred'));
    $('#resetBtn').addEventListener('click', resetProgress);
    $('#shuffleBtn').addEventListener('click', () => {
      if (session.queue.length) {
        session.queue = shuffle(session.queue);
        session.index = 0;
        selected = null;
        revealed = false;
        renderQuiz();
        toast('已打乱题序');
      } else {
        startSession('random');
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 767) closeSidebar();
    });
  }

  function init() {
    bindEvents();
    renderHome();
    renderLists();
    updateChrome();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
