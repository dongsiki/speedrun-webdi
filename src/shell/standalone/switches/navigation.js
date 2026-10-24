(()=>{'use strict';
document.addEventListener('click', event=>{
  const link=event.target.closest?.('a[href]');
  if(link?.getAttribute('href')==='00-index.html'){
    event.preventDefault();parent.postMessage({channel:'speedrun-offline-developer-v1',type:'menu'},'*');
  }
});
})();