/* Pure packing rules. Shared by the HTML and local tests. */
const SuitcaseRules=(()=>{
  const ITEMS=Object.freeze([
    {id:'photo',name:'사진',w:2,h:2},
    {id:'bear',name:'곰 인형',w:1,h:2},
    {id:'clock',name:'시계',w:2,h:1},
    {id:'keys',name:'열쇠',w:1,h:1},
    {id:'cloth',name:'손수건',w:2,h:1},
    {id:'pills',name:'약 포장',w:1,h:2},
    {id:'book',name:'책',w:2,h:2},
    {id:'cassette',name:'카세트테이프',w:2,h:1},
    {id:'letter',name:'편지',w:1,h:1},
    {id:'pencil',name:'연필',w:1,h:1}
  ].map(Object.freeze));
  const TIMING=Object.freeze({close:1.05,memory:1.8,combination:2.3,departure:1.6,fade:.85});
  function arrange(ids){
    const items=ids.map(id=>ITEMS.find(x=>x.id===id));
    if(items.some(x=>!x)||new Set(ids).size!==ids.length||items.reduce((n,x)=>n+x.w*x.h,0)>6)return null;
    items.sort((a,b)=>b.w*b.h-a.w*a.h||a.id.localeCompare(b.id));
    function search(i,mask,placed){
      if(i===items.length)return placed;
      const a=items[i],sizes=a.w===a.h?[[a.w,a.h]]:[[a.w,a.h],[a.h,a.w]];
      for(const [w,h]of sizes)for(let y=0;y<=2-h;y++)for(let x=0;x<=3-w;x++){
        let bits=0;for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)bits|=1<<((y+yy)*3+x+xx);
        if(mask&bits)continue;
        const r=search(i+1,mask|bits,[...placed,{id:a.id,x,y,w,h,rotated:w!==a.w}]);if(r)return r;
      }
      return null;
    }
    return search(0,0,[]);
  }
  const signature=ids=>ITEMS.map(x=>ids.includes(x.id)?'1':'0').join('');
  function memories(ids){return ids.length?[...ids.map(id=>'memory-'+id),'combination-'+signature(ids),'departure']:['empty-case','combination-'+signature([]),'departure'];}
  function result(state,outcome){return {channel:'speedrun-midterm-v1',type:'suitcase-result',outcome,selected:[...state.selected],left:ITEMS.filter(x=>!state.selected.includes(x.id)).map(x=>x.id),signature:signature(state.selected),cutscenes:memories(state.selected),returns:state.returns,overflows:state.overflows,empty:state.selected.length===0,ms:Math.round(state.elapsed*1000)};}
  return {ITEMS,TIMING,arrange,signature,memories,result};
})();
if(typeof module!=='undefined')module.exports=SuitcaseRules;
