(() => {
  const views = {
    home: document.getElementById('viewHome'),
    record: document.getElementById('viewRecord'),
    reply: document.getElementById('viewReply'),
    timeline: document.getElementById('viewTimeline'),
  };

  const openApp = document.getElementById('openApp');
  const openTimeline = document.getElementById('openTimeline');
  const backHome = document.getElementById('backHome');
  const backHomeFromTimeline = document.getElementById('backHomeFromTimeline');
  const backRecord = document.getElementById('backRecord');
  const micBtn = document.getElementById('micBtn');
  const recordTitle = document.getElementById('recordTitle');
  const recordHint = document.getElementById('recordHint');
  const timerEl = document.getElementById('timer');
  const replyBubble = document.getElementById('replyBubble');
  const askAgain = document.getElementById('askAgain');
  const statusTime = document.getElementById('statusTime');

  let recording = false;
  let timerId = null;
  let elapsed = 0;
  let replyTimerId = null;

  // Live status-bar clock
  const updateClock = () => {
    const d = new Date();
    statusTime.textContent =
      `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  updateClock();
  setInterval(updateClock, 30000);

  const switchTo = (name) => {
    Object.values(views).forEach(v => v.classList.remove('is-active'));
    views[name].classList.add('is-active');
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const ss = String(s % 60).padStart(2, '0');
    return `${m}:${ss}`;
  };

  const startRecording = () => {
    recording = true;
    document.body.classList.add('is-recording');
    recordTitle.textContent = '正在录音…';
    recordHint.textContent = '再次轻点发送给 ChatGPT';
    elapsed = 0;
    timerEl.textContent = '0:00';
    timerId = setInterval(() => {
      elapsed += 1;
      timerEl.textContent = formatTime(elapsed);
    }, 1000);
  };

  const stopAndSend = () => {
    recording = false;
    document.body.classList.remove('is-recording');
    clearInterval(timerId);
    timerId = null;
    switchTo('reply');
    showThinkingThenReply();
  };

  const resetRecordView = () => {
    recording = false;
    document.body.classList.remove('is-recording');
    clearInterval(timerId);
    timerId = null;
    elapsed = 0;
    timerEl.textContent = '0:00';
    recordTitle.textContent = '轻点开始说话';
    recordHint.textContent = '点击话筒开始录音';
  };

  const REPLIES = [
    '收到！这是我对你刚才那段语音的回复 👋',
    '好问题。简单来说:先做最重要的那件事,其余可以延后。',
    '我建议分三步:确认目标 → 拆解任务 → 立即开始第一步。',
    '没问题,我帮你记下了。还要我提醒你吗?',
    '嗯,让我想想…可以试试换个角度:从用户最痛的点切入。',
  ];

  const showThinkingThenReply = () => {
    replyBubble.innerHTML =
      '<span class="dots"><span></span><span></span><span></span></span>';
    clearTimeout(replyTimerId);
    replyTimerId = setTimeout(() => {
      const text = REPLIES[Math.floor(Math.random() * REPLIES.length)];
      replyBubble.textContent = text;
    }, 1400);
  };

  // Bindings
  openApp.addEventListener('click', () => {
    resetRecordView();
    switchTo('record');
  });

  micBtn.addEventListener('click', () => {
    if (!recording) startRecording();
    else stopAndSend();
  });

  backHome.addEventListener('click', () => {
    resetRecordView();
    switchTo('home');
  });

  backRecord.addEventListener('click', () => {
    resetRecordView();
    switchTo('record');
  });

  askAgain.addEventListener('click', () => {
    resetRecordView();
    switchTo('record');
  });

  openTimeline.addEventListener('click', () => {
    switchTo('timeline');
    if (window.TL && window.TL.enter) window.TL.enter();
  });

  backHomeFromTimeline.addEventListener('click', () => {
    if (window.TL && window.TL.leave) window.TL.leave();
    switchTo('home');
  });
})();
