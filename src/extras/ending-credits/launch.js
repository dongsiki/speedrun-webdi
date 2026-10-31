/* 엔딩 크레딧 진입점(본편에 연결할 때 이 파일을 @inline 한다).
 *   EndingCredits.play().then(({found}) => { ...크레딧이 끝난 뒤... });
 * 크레딧 화면(index.template.html)을 전체 화면 iframe(srcdoc)으로 띄우고, 끝나면 닫은 뒤 Promise를 푼다.
 * found = 이스터에그(할아버지 춤)를 발견했는지. */
const EndingCredits=(()=>{
  'use strict';
  const DOC=/* @standalone src/extras/ending-credits/document.json */ {};
  let open=null;
  function play({container=document.body}={}){
    if(open)return open;
    open=new Promise(resolve=>{
      const frame=document.createElement('iframe');
      frame.className='ending-credits-frame';frame.title='엔딩 크레딧';frame.allow='autoplay';
      frame.style.cssText='position:fixed;inset:0;width:100%;height:100%;border:0;margin:0;z-index:2147483000;background:#fff';
      frame.srcdoc=DOC.html;
      function onMessage(e){
        const data=e.data;
        if(e.source!==frame.contentWindow||!data||data.channel!=='speedrun-ending-credits-v1'||data.type!=='done')return;
        removeEventListener('message',onMessage);frame.remove();open=null;resolve({found:!!data.found});
      }
      addEventListener('message',onMessage);container.append(frame);frame.focus();
    });
    return open;
  }
  return {play};
})();
