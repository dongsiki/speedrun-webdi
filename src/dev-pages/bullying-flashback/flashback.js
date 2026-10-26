// 학창 시절 회상 컷 재생기. 컷 내용은 cuts.js에서만 바꿉니다.
(function () {
  var cuts = window.FLASHBACK_CUTS || [];
  var $ = function (id) { return document.getElementById(id); };
  var start = $('start'), scene = $('scene'), end = $('end');
  var img = $('cut'), ph = $('placeholder'), line = $('line');
  var voice = $('voice'), glitch = $('glitch');
  var i = -1, timer = 0, busy = false;

  function show(el) { [start, scene, end].forEach(function (s) { s.hidden = s !== el; }); }

  function tear(then) {
    glitch.hidden = false;
    glitch.classList.remove('on');
    void glitch.offsetWidth;
    glitch.classList.add('on');
    setTimeout(function () { then(); }, 210);
    setTimeout(function () { glitch.hidden = true; glitch.classList.remove('on'); }, 430);
  }

  function render(c) {
    clearTimeout(timer);
    if (c.img) {
      img.hidden = false; ph.hidden = true;
      img.style.animation = 'none'; void img.offsetWidth; img.style.animation = '';
      img.src = c.img;
    } else {
      img.hidden = true; ph.hidden = false;
      ph.textContent = c.placeholder || '그림 자리';
    }
    line.textContent = c.text || '';
    voice.pause();
    if (c.audio) {
      voice.src = c.audio;
      voice.currentTime = 0;
      voice.play().catch(function () { timer = setTimeout(next, c.ms || 3500); });
    }
    // 음성이 없으면 정해진 시간 뒤 자동으로 넘어갑니다.
    if (!c.audio) timer = setTimeout(next, c.ms || 3200);
  }

  voice.addEventListener('ended', function () {
    var c = cuts[i];
    if (c) timer = setTimeout(next, c.hold || 900);
  });

  function next() {
    if (busy) return;
    i += 1;
    if (i >= cuts.length) { finish(); return; }
    var c = cuts[i];
    if (c.cut === 'tear') { busy = true; tear(function () { render(c); busy = false; }); }
    else render(c);
  }

  function finish() {
    clearTimeout(timer); voice.pause();
    busy = true;
    tear(function () { show(end); busy = false; });
  }

  function play() {
    i = -1;
    preload();
    tear(function () { show(scene); next(); });
  }

  function preload() { cuts.forEach(function (c) { if (c.img) { var p = new Image(); p.src = c.img; } }); }

  $('play').addEventListener('click', play);
  $('again').addEventListener('click', play);
  scene.addEventListener('click', function () { next(); });
  document.addEventListener('keydown', function (e) {
    if (scene.hidden) return;
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); next(); }
    if (e.key === 'Escape') finish();
  });
})();
