(()=>{const stores=/* @json assets/data/clear-screen-game-stores-04d0515e6d.json */ null;const KEY='speedrun-rebellion-dev-preview',SKEY='speedrun-rebellion-dev-preview-state';
let state='all';try{state=sessionStorage.getItem(SKEY)||'all';localStorage.setItem(KEY,JSON.stringify(stores[state]));}catch(_){}
for(const b of document.querySelectorAll('#preview-bar button')){b.setAttribute('aria-pressed',String(b.dataset.state===state));b.addEventListener('click',()=>{try{sessionStorage.setItem(SKEY,b.dataset.state);}catch(_){}location.reload();});}
const hint=t=>{document.getElementById('preview-hint').textContent=t;};
// 본편과 같은 흐름: 클리어 → RE? → 처음 손가락 AI 스위치 화면 → AI 끄기 → 땅파기 화면 오른쪽 아래 도전과제·반항 기록 버튼
window.RebellionRestart=()=>{document.body.dataset.completed='';document.body.dataset.stage='intro';RebellionLog.resetFinale();hint('② 처음 화면 → AI 스위치 누르기');};
document.getElementById('fake-switch').addEventListener('click',()=>{const s=document.getElementById('ai-switch');s.setAttribute('aria-checked','false');document.body.dataset.stage='digging';s.click();hint('③ 땅파기 화면 → 오른쪽 아래 도전과제 / 반항 기록');});})();