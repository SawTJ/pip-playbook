/* Stage 6 interaction polish: 200 ms flips and answer-to-slot travel. */
const FLIP_MS = 200;

let dingContext;
function prepareDing() {
  if (!data.sound) return;
  try {
    dingContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (dingContext.state === 'suspended') dingContext.resume();
  } catch (_) { /* No Web Audio support: gameplay remains usable. */ }
}
function playDing(baseFrequency = 880, volume = .11) {
  if (!data.sound) return;
  prepareDing();
  if (!dingContext || dingContext.state !== 'running') return;
  const start = dingContext.currentTime;
  [baseFrequency, baseFrequency * 1.5].forEach((frequency, i) => {
    const oscillator = dingContext.createOscillator();
    const gain = dingContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.0001, start + i * .045);
    gain.gain.exponentialRampToValueAtTime(volume, start + i * .045 + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, start + i * .045 + .22);
    oscillator.connect(gain).connect(dingContext.destination);
    oscillator.start(start + i * .045);
    oscillator.stop(start + i * .045 + .23);
  });
}
function playWrong() {
  if (!data.sound) return;
  prepareDing();
  if (!dingContext || dingContext.state !== 'running') return;
  const t = dingContext.currentTime;
  const oscillator = dingContext.createOscillator();
  const gain = dingContext.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(490, t);
  oscillator.frequency.exponentialRampToValueAtTime(290, t + .23);
  gain.gain.setValueAtTime(.0001, t);
  gain.gain.exponentialRampToValueAtTime(.13, t + .015);
  gain.gain.exponentialRampToValueAtTime(.0001, t + .27);
  oscillator.connect(gain).connect(dingContext.destination);
  oscillator.start(t);
  oscillator.stop(t + .28);
}
function playVictoryDings() {
  // Four clearly ascending chimes; finish before the Wonderful animation.
  [587, 784, 988, 1319].forEach((frequency, i) => {
    setTimeout(() => playDing(frequency, .17), i * 210);
  });
}

function animateTurn(card, nextFace, done) {
  if (!card) { done(); return; }
  const animation = card.animate([
    { transform: 'perspective(650px) rotateY(0deg)' },
    { transform: 'perspective(650px) rotateY(90deg)', offset: .5 },
    { transform: 'perspective(650px) rotateY(0deg)' }
  ], { duration: FLIP_MS, easing: 'ease-in-out' });
  setTimeout(() => { card.textContent = nextFace; }, FLIP_MS / 2);
  animation.finished.then(done).catch(done);
}

flip = function(i) {
  if (busy || !round || round.matched.includes(i) || round.open.includes(i) || round.open.length >= 2) return;
  prepareDing();
  busy = true;
  const cards = document.querySelectorAll('.memory-card');
  animateTurn(cards[i], round.faces[i], () => {
    round.open.push(i);
    busy = false;
    if (round.open.length < 2) { render(); return; }
    busy = true;
    round.turns++;
    const [a,b] = round.open;
    if (round.faces[a] === round.faces[b]) {
      playDing();
      round.matched.push(a,b);
      feedback = 'Lovely match!';
      round.open = [];
      busy = false;
      render();
      if (round.matched.length === round.faces.length) {
        setTimeout(() => complete(round.errors <= round.pairs && round.hints === 0), 350);
      }
    } else {
      playWrong();
      round.errors++;
      feedback = 'Have another look!';
      const incorrectCards = document.querySelectorAll('.memory-card');
      [a,b].forEach(index => incorrectCards[index]?.classList.add('wrong-feedback'));
      setTimeout(() => {
        const liveCards = document.querySelectorAll('.memory-card');
        let remaining = 2;
        [a,b].forEach(index => {
          liveCards[index]?.classList.remove('wrong-feedback');
          animateTurn(liveCards[index], '✿', () => {
          if (--remaining === 0) {
            round.open = [];
            busy = false;
            render();
          }
          });
        });
      }, 320);
    }
  });
};

const originalChoosePattern = choosePattern;
choosePattern = function(symbol) {
  if (busy || !round) return;
  prepareDing();
  const chosen = [...document.querySelectorAll('.choice')].find(x => x.textContent.trim() === symbol);
  const slot = document.querySelector('.tile.blank');
  if (!chosen || !slot) { originalChoosePattern(symbol); return; }
  busy = true;
  const from = chosen.getBoundingClientRect(), to = slot.getBoundingClientRect();
  const ghost = document.createElement('div');
  ghost.className = 'flying-answer';
  ghost.textContent = symbol;
  Object.assign(ghost.style, {
    position: 'fixed', left: from.left + 'px', top: from.top + 'px',
    width: from.width + 'px', height: from.height + 'px',
    display: 'grid', placeItems: 'center', fontSize: '45px',
    background: '#fffaf1', border: '3px solid #a76b72',
    borderRadius: '12px', zIndex: '20', pointerEvents: 'none'
  });
  document.body.appendChild(ghost);
  const dx = to.left + to.width / 2 - from.left - from.width / 2;
  const dy = to.top + to.height / 2 - from.top - from.height / 2;
  chosen.style.visibility = 'hidden';
  const flight = ghost.animate([
    { transform: 'translate(0,0) scale(1)' },
    { transform: `translate(${dx}px, ${dy}px) scale(.95)` }
  ], { duration: 200, easing: 'ease-in-out', fill: 'forwards' });
  flight.finished.then(() => {
    slot.textContent = symbol;
    if (symbol !== round.answer) {
      playWrong();
      ghost.style.background = '#d0d0d0';
      ghost.style.borderColor = '#898989';
      const atTarget = (offset = 0) => `translate(${dx + offset}px, ${dy}px) scale(.95)`;
      ghost.animate([
        { transform: atTarget() },
        { transform: atTarget(-7) },
        { transform: atTarget(7) },
        { transform: atTarget(-5) },
        { transform: atTarget(5) },
        { transform: atTarget() }
      ], { duration: 280, easing: 'ease-in-out' }).finished.then(() => ghost.animate([
        { transform: atTarget() },
        { transform: 'translate(0,0) scale(1)' }
      ], { duration: 200, easing: 'ease-in-out' }).finished).then(() => {
        ghost.remove();
        chosen.style.visibility = '';
        slot.textContent = '?';
        busy = false;
        originalChoosePattern(symbol);
      });
    } else {
      playDing();
      slot.classList.add('correct-answer');
      // Keep the chosen picture in the target slot; do not call the old
      // handler, which redraws the question mark before the celebration.
      ghost.remove();
      round.attempts++;
      feedback = 'You found the pattern!';
      const message = document.querySelector('.feedback');
      if (message) message.textContent = feedback;
      setTimeout(() => {
        busy = false;
        complete(round.attempts === 1 && round.hints === 0);
      }, 600);
    }
  }).catch(() => { ghost.remove(); busy = false; originalChoosePattern(symbol); });
};

// Celebrate without navigating away: children can still see the puzzle they solved.
complete = function(mastered) {
  const p = profile();
  p.rounds[game]++;
  p.streak[game] = mastered ? p.streak[game] + 1 : 0;
  if (p.streak[game] >= 3) {
    p.levels[game] = Math.min(5, p.levels[game] + 1);
    p.streak[game] = 0;
  }
  const token = game === 'memory' ? '🌷' : '🍓';
  if (p.rounds[game] % 2 === 0 && !p.stickers.includes(token)) p.stickers.push(token);
  save();
  busy = true;
  feedback = '';
  // Keep the solved board visible as the ascending chimes play first.
  const hintButton = document.querySelector('[aria-label="Get a hint"]');
  if (hintButton) hintButton.disabled = true;
  playVictoryDings();
  const finishedRound = round;
  const finishedGame = game;
  setTimeout(() => {
    if (screen !== finishedGame || game !== finishedGame || round !== finishedRound) return;
    render();
    const field = document.querySelector('.playfield');
    if (!field) return;
    field.classList.add('wonderful-stage');
    field.innerHTML = '<div class="wonderful-word" role="status">🌟 Wonderful! 🌟</div>';
    speak('Wonderful!');
    setTimeout(() => {
      if (screen === finishedGame && game === finishedGame && round === finishedRound) {
        busy = false;
        newRound();
      }
    }, 1000);
  }, 950);
};

// Wait for an available female English voice instead of speaking with a
// device's default (which can sound male when the voice list loads late).
let voiceRequest = 0;
let wrongPromptState = 'ready';
let wrongMistakesAfterPrompt = 0;
speak = function(message) {
  if (!data.sound || !('speechSynthesis' in window)) return;
  const instructions = {
    'Hello little explorer! Choose a game to play!': `Hi, ${profile().name}! What shall we play today?`,
    "Let's find two pictures that match!": "Let's find two matching pictures!",
    'Tap two cards to find matching pictures.': "Let's find two matching pictures!",
    'Look carefully! What comes next?': 'What comes next?',
    'Look at the pictures. What comes next?': 'What comes next?',
    'Let us have another look.': "Let's have another look."
  };
  message = instructions[message] || message;
  const isWrongPrompt = message === "Let's have another look.";
  if (isWrongPrompt) {
    // First mistake speaks. After it ends, two mistakes are silent;
    // the third subsequent mistake speaks again.
    if (wrongPromptState === 'speaking') return;
    if (wrongPromptState === 'cooldown') {
      wrongMistakesAfterPrompt++;
      if (wrongMistakesAfterPrompt <= 2) return;
    }
    wrongPromptState = 'speaking';
  } else if (wrongPromptState === 'speaking') {
    // A new instruction can interrupt the previous prompt.
    wrongPromptState = 'cooldown';
    wrongMistakesAfterPrompt = 0;
  }
  if (screen === 'memory' || screen === 'pattern') {
    const bubble = document.querySelector('.playfield .pip-bubble');
    if (bubble) bubble.textContent = message;
  }
  const engine = window.speechSynthesis;
  const request = ++voiceRequest;
  engine.cancel();
  const trySpeak = (attempt = 0) => {
    if (request !== voiceRequest || !data.sound) return;
    const english = engine.getVoices().filter(v => /^en([-_]|$)/i.test(v.lang));
    const preferred = english.find(v => /samantha|victoria|karen|moira|tessa|zira|aria|jenny|female|susan|ava|allison|nicky|serena|google us english/i.test(v.name));
    if (!preferred) {
      // Never silently substitute an unidentified potentially male voice.
      if (attempt < 12) setTimeout(() => trySpeak(attempt + 1), 200);
      else if (isWrongPrompt) wrongPromptState = 'ready';
      return;
    }
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.voice = preferred;
    utterance.lang = preferred.lang;
    utterance.rate = .88;
    utterance.pitch = 1.08;
    if (isWrongPrompt) {
      const finished = () => {
        if (request === voiceRequest) {
          wrongPromptState = 'cooldown';
          wrongMistakesAfterPrompt = 0;
        }
      };
      utterance.onend = finished;
      utterance.onerror = finished;
    }
    engine.speak(utterance);
  };
  trySpeak();
};

// Shared compact top-left game controls. Keep the global library UI unchanged.
const baseRender = render;
let lastRenderedScreen = screen;
let outgoingPageOverlay = null;
render = function() {
  const pageChanged = screen !== lastRenderedScreen;
  const goingBack =
    (screen === 'library' && ['memory','pattern','collection','parent'].includes(lastRenderedScreen)) ||
    (screen === 'profiles' && lastRenderedScreen === 'library');
  const enterFrom = goingBack ? '-105vw' : '105vw';
  const exitTo = goingBack ? '105vw' : '-105vw';
  const previousPage = pageChanged ? document.querySelector('#app > .shell') : null;
  const shouldSwipe = previousPage && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let oldPageCopy = null;
  if (shouldSwipe) oldPageCopy = previousPage.cloneNode(true);
  baseRender();
  lastRenderedScreen = screen;
  if (pageChanged) {
    window.scrollTo(0, 0);
    outgoingPageOverlay?.remove();
    outgoingPageOverlay = null;
    if (oldPageCopy) {
      const overlay = document.createElement('div');
      overlay.className = 'page-swipe-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.appendChild(oldPageCopy);
      document.body.appendChild(overlay);
      outgoingPageOverlay = overlay;
      const nextPage = document.querySelector('#app > .shell');
      document.body.classList.add('page-swiping');
      nextPage?.animate([
        { transform: `translateX(${enterFrom})` }, { transform: 'translateX(0)' }
      ], { duration: 420, easing: 'cubic-bezier(.25,.8,.25,1)' });
      overlay.animate([
        { transform: 'translateX(0)' }, { transform: `translateX(${exitTo})` }
      ], { duration: 420, easing: 'cubic-bezier(.25,.8,.25,1)', fill: 'forwards' })
        .finished.then(() => {
          overlay.remove();
          document.body.classList.remove('page-swiping');
          if (outgoingPageOverlay === overlay) outgoingPageOverlay = null;
        }, () => {
          overlay.remove();
          document.body.classList.remove('page-swiping');
        });
    }
  }
  const homeButton = document.querySelector('.top .nav-actions button[onclick="goHome()"]');
  if (homeButton) {
    homeButton.innerHTML = '<svg width="27" height="27" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11L12 3L21 11V21H15V14H9V21H3Z" fill="#fff8e9" stroke="#793448" stroke-width="2" stroke-linejoin="round"/></svg>';
    homeButton.setAttribute('aria-label', 'Home');
    homeButton.title = 'Home';
  }
  if (screen === 'profiles') {
    const greeting = document.querySelector('.panel .mascot-line');
    if (greeting) {
      greeting.classList.add('pip-tip');
      const label = greeting.querySelector('span');
      if (label) label.classList.add('pip-bubble');
    }
  }
  if (screen === 'library') {
    const welcome = document.querySelector('.hero > div');
    if (welcome) welcome.classList.add('pip-bubble');
    if (data.devMode) {
      const grid = document.querySelector('.game-grid');
      if (grid) {
        const bar = document.createElement('section');
        bar.className = 'dev-test-bar pixel';
        bar.innerHTML = `<strong>🛠 DEV MODE</strong>
          <label>Memory <select id="dev-memory-level" aria-label="Memory Garden test level">${devLevelOptions(profile().levels.memory)}</select></label>
          <label>Pattern <select id="dev-pattern-level" aria-label="Pattern Parade test level">${devLevelOptions(profile().levels.pattern)}</select></label>`;
        grid.insertAdjacentElement('beforebegin', bar);
        bar.querySelector('#dev-memory-level').onchange = e => setDevLevel('memory', e.target.value);
        bar.querySelector('#dev-pattern-level').onchange = e => setDevLevel('pattern', e.target.value);
      }
    }
  }
  if (screen === 'parent') {
    const panel = document.querySelector('.panel');
    if (panel) {
      const dev = document.createElement('section');
      dev.className = 'dev-settings';
      dev.innerHTML = `<h2>🛠 Developer Testing</h2>
        <p>Enable quick level selectors on the game library for layout testing.</p>
        <button class="btn ${data.devMode?'pink':'yellow'}" id="dev-mode-toggle">${data.devMode?'Disable Dev Mode':'Enable Dev Mode'}</button>`;
      panel.appendChild(dev);
      dev.querySelector('button').onclick = () => toggleDevMode();
    }
  }
  const inGame = screen === 'memory' || screen === 'pattern';
  document.body.classList.toggle('active-mini-game', inGame);
  if (!inGame) return;
  if (screen === 'memory') {
    document.querySelector('.panel > .progress')?.remove();
    sizeMemoryAnimals();
  }

  const field = document.querySelector('.playfield');
  if (field && screen === 'memory') {
    field.insertAdjacentHTML('afterbegin', `<div class="pip-tip">${pip()}<div class="pip-bubble">Let's find two matching pictures!</div></div>`);
  } else if (field && screen === 'pattern') {
    const line = field.querySelector('.mascot-line');
    if (line) {
      line.classList.add('pip-tip');
      const message = line.querySelector('span');
      if (message) {
        // A block element keeps the bubble border and tail intact on wraps.
        const bubble = document.createElement('div');
        bubble.className = 'pip-bubble';
        bubble.textContent = 'What comes next?';
        message.replaceWith(bubble);
      }
    }
  }

  const navigation = document.querySelector('.top .nav-actions');
  if (!navigation) return;
  // The game uses Repeat Voice instead of the library's audio-toggle control.
  navigation.querySelector('button:last-child')?.remove();
  const hintButton = document.createElement('button');
  hintButton.className = 'iconbtn';
  hintButton.textContent = '💡';
  hintButton.title = 'Hint';
  hintButton.setAttribute('aria-label', 'Get a hint');
  hintButton.disabled = busy;
  hintButton.onclick = () => hint();
  const voiceButton = document.createElement('button');
  voiceButton.className = 'iconbtn';
  voiceButton.textContent = '🔊';
  voiceButton.title = 'Repeat voice instruction';
  voiceButton.setAttribute('aria-label', 'Repeat voice instruction');
  voiceButton.onclick = () => speak(game === 'memory'
    ? 'Tap two cards to find matching pictures.'
    : 'Look at the pictures. What comes next?');
  navigation.append(hintButton, voiceButton);
  document.querySelector('.panel > .bottom')?.remove();
};

function devLevelOptions(selected) {
  return [1,2,3,4,5].map(n => `<option value="${n}" ${n===selected?'selected':''}>Level ${n}</option>`).join('');
}
function setDevLevel(which, value) {
  const next = Math.max(1,Math.min(5,Number(value)||1));
  const p = profile();
  p.levels[which] = next;
  p.streak[which] = 0;
  save();
  render();
}
function toggleDevMode() {
  data.devMode = !data.devMode;
  save();
  render();
}

// One-time test reset: preserve profiles, stickers and round history, but reset
// both games' adaptive challenge levels and mastery streaks to their start.
if (!data.difficultyResetV7) {
  data.profiles.forEach(p => {
    p.levels = { ...p.levels, memory: 1, pattern: 1 };
    p.streak = { ...p.streak, memory: 0, pattern: 0 };
  });
  data.difficultyResetV7 = true;
  save();
}

// Temporary layout-testing boost: existing child profiles begin at least at
// Tier 4 so larger card and pattern arrangements can be inspected quickly.
// Never lower a profile already above that tier.
if (!data.layoutTestTierV18) {
  data.profiles.forEach(p => {
    p.levels = {
      ...p.levels,
      memory: Math.max(4, p.levels?.memory || 1),
      pattern: Math.max(4, p.levels?.pattern || 1)
    };
    p.streak = { ...p.streak, memory: 0, pattern: 0 };
  });
  data.layoutTestTierV18 = true;
  save();
}

// One-time maximum-level test setting for existing child profiles.
if (!data.maxLevelTestV19) {
  data.profiles.forEach(p => {
    p.levels = { ...p.levels, memory: 5, pattern: 5 };
    p.streak = { ...p.streak, memory: 0, pattern: 0 };
  });
  data.maxLevelTestV19 = true;
  save();
}

// Refresh once so the new controls also appear on the current screen.
render();

const wrongStyle = document.createElement('style');
wrongStyle.textContent = `
  .memory-card.wrong-feedback { background:#d1d1d1!important; border-color:#858585!important;
    animation:wrong-card-shake .28s ease-in-out!important; }
  @keyframes wrong-card-shake {
    0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)}
    40%{transform:translateX(6px)} 60%{transform:translateX(-4px)}
    80%{transform:translateX(4px)}
  }
`;
document.head.appendChild(wrongStyle);

function sizeMemoryAnimals() {
  document.querySelectorAll('.memory-card').forEach(card => {
    const side = Math.min(card.getBoundingClientRect().width, card.getBoundingClientRect().height);
    if (side > 0) card.style.fontSize = `${Math.round(side * .50)}px`;
  });
}
window.addEventListener('resize', () => {
  if (screen === 'memory') sizeMemoryAnimals();
});

const bubbleFix = document.createElement('style');
bubbleFix.textContent = `
  .playfield .pip-tip { display:flex; flex-wrap:nowrap; align-items:center;
    justify-content:center; width:min(100%,430px); gap:12px; }
  .playfield .pip-tip .pip { flex-shrink:0; }
  .playfield .pip-bubble { display:block; min-width:0; max-width:330px;
    flex:0 1 auto; overflow-wrap:break-word; white-space:normal; }
  @media (orientation:portrait) and (max-width:600px) {
    .playfield .pip-tip { gap:13px; width:100%; padding:0 4px; }
    .playfield .pip-bubble { flex:0 1 auto; max-width:calc(100% - 70px);
      padding:11px 13px; border-radius:13px; line-height:1.3; }
    .playfield .pip-bubble::before {
      content:''; position:absolute; left:-18px; top:50%;
      width:19px; height:26px; transform:translateY(-50%);
      background:#793448; border:0;
      clip-path:polygon(100% 0,0 50%,100% 100%);
    }
    .playfield .pip-bubble::after {
      content:''; position:absolute; left:-12px; top:50%;
      width:14px; height:18px; transform:translateY(-50%);
      background:#fffaf2;
      clip-path:polygon(100% 0,0 50%,100% 100%);
    }
  }
`;
document.head.appendChild(bubbleFix);

const devStyles = document.createElement('style');
devStyles.textContent = `
  .dev-test-bar { display:flex; align-items:center; justify-content:center;
    gap:12px; flex-wrap:wrap; padding:12px; background:#fff3cc; }
  .dev-test-bar strong { color:#793448; white-space:nowrap; }
  .dev-test-bar label { display:flex; align-items:center; gap:6px; font-weight:800; }
  .dev-test-bar select { border:2px solid #793448; border-radius:8px;
    background:#fffaf1; color:#793448; font-size:16px; font-weight:800;
    padding:8px; min-height:44px; }
  .dev-settings { border:2px dashed #ae8b75; border-radius:12px;
    padding:14px; background:#fff2d8; }
  .dev-settings h2 { margin:0 0 5px; color:#793448; }
  @media (orientation:portrait) and (max-width:600px) {
    .hero { gap:13px; padding:11px; }
    .hero .pip { width:77px; height:77px; flex:0 0 77px; }
    .hero .pip-bubble { display:block; min-width:0; flex:1 1 auto;
      max-width:calc(100% - 91px); padding:10px 12px; border-radius:13px; }
    .hero .pip-bubble h1 { font-size:clamp(17px,5vw,23px); line-height:1.15; }
    .hero .pip-bubble p { font-size:clamp(12px,3.5vw,15px); line-height:1.25; }
    .hero .pip-bubble::before {
      content:''; position:absolute; left:-18px; top:50%; width:19px; height:26px;
      transform:translateY(-50%); background:#793448; border:0;
      clip-path:polygon(100% 0,0 50%,100% 100%);
    }
    .hero .pip-bubble::after {
      content:''; position:absolute; left:-12px; top:50%; width:14px; height:18px;
      transform:translateY(-50%); background:#fffaf2;
      clip-path:polygon(100% 0,0 50%,100% 100%);
    }
  }
`;
document.head.appendChild(devStyles);

const transitionsStyle = document.createElement('style');
transitionsStyle.textContent = `
  body.page-swiping { overflow-x:hidden; }
  .page-swipe-overlay { position:fixed; inset:0; z-index:50;
    pointer-events:none; overflow:hidden; display:flex; justify-content:center;
    background:transparent; }
  .page-swipe-overlay > .shell { width:min(100%,1080px); }
`;
document.head.appendChild(transitionsStyle);
