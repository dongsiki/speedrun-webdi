(() => {
  'use strict';
  const menu = document.getElementById('portable-menu');
  const channel = 'speedrun-offline-developer-v1';
  let frame = null, selected = null;
  function stopFrame() {
    if (!frame) return;
    // Stop media before removing the entire document, including nested stages.
    function stop(win) {
      try {
        win.dispatchEvent(new Event('pagehide'));
        win.document.querySelectorAll('audio,video').forEach(media => { media.pause(); media.currentTime=0; });
        win.document.querySelectorAll('iframe').forEach(child => stop(child.contentWindow));
      } catch (_) { /* A loading or already-disposed child can be inaccessible. */ }
    }
    stop(frame.contentWindow);
    frame.remove(); frame = null;
  }
  function showMenu() {
    stopFrame();
    document.body.removeAttribute('data-playing');
    menu.hidden = false;
    document.title = '스피드런 · 개발용 게임모음';
    menu.querySelector(`a[href="${selected}"]`)?.focus({preventScroll:true});
  }
  function openGame(id) {
    const game = PortableGames[id];
    if (!game) return;
    stopFrame(); selected=id;
    menu.hidden=true; document.body.dataset.playing=id;
    document.title=game.title+' · 개발용';
    frame=document.createElement('iframe');
    frame.id='portable-stage';frame.className='portable-stage';frame.title=game.title;
    frame.setAttribute('allow','autoplay; fullscreen');
    frame.addEventListener('load',()=>frame?.contentWindow?.focus(),{once:true});
    frame.srcdoc=game.html; document.body.appendChild(frame);
  }
  menu.addEventListener('click',event=>{
    const link=event.target.closest?.('a[href]');
    if(!link || !PortableGames[link.getAttribute('href')])return;
    event.preventDefault();openGame(link.getAttribute('href'));
  });
  window.addEventListener('message',event=>{
    if(!frame || event.source!==frame.contentWindow || event.data?.channel!==channel)return;
    if(event.data.type==='menu')showMenu();
  });
  window.addEventListener('pagehide',stopFrame);
  window.addEventListener('pageshow',event=>{if(event.persisted)showMenu();});
})();
