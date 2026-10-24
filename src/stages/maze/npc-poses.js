

/* Maze-only poses. All bends use the model's own bind-pose joints and weights. */
const MazeNPCPoses = (() => {
  const names = { caregiver:'folded-arms', neighbor:'seated-rest', child:'hand-on-wall' };
  function create(T,data,role) {
    const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
    const pivot=i=>V().setFromMatrixPosition(new T.Matrix4().set(...data.bindPoses[i]).invert());
    const around=(v,m)=>new T.Matrix4().makeTranslation(v.x,v.y,v.z).multiply(m)
      .multiply(new T.Matrix4().makeTranslation(-v.x,-v.y,-v.z));
    const rotation=(x=0,y=0,z=0)=>new T.Matrix4().makeRotationFromEuler(new T.Euler(x,y,z,'XYZ'));
    const bones=Array.from({length:data.bindPoses.length},()=>new T.Matrix4());
    const assign=(from,to,m)=>{for(let i=from;i<=to;i++)bones[i]=m.clone();};
    function arm(side,{down,forward=0,fold=0,cross=0,turn=0}) {
      const shoulder=side==='left'?9:38,elbow=side==='left'?10:39,last=side==='left'?33:62;
      const sign=side==='left'?1:-1;
      const upper=around(pivot(shoulder),rotation(forward,turn,sign*down));
      // In the original T pose the forearm runs along X; Y bends it forward.
      const lower=upper.clone().multiply(around(pivot(elbow),rotation(0,sign*fold,sign*cross)));
      bones[shoulder]=upper;assign(elbow,last,lower);
    }
    if(role==='caregiver') {
      arm('left',{down:1.40,forward:-.70,fold:-.45,cross:2.20,turn:-.24});
      arm('right',{down:1.45,forward:-.65,fold:-.42,cross:1.67,turn:.22});
    } else if(role==='neighbor') {
      for(const [hip,knee,last] of [[1,2,4],[63,64,66]]) {
        const thigh=around(pivot(hip),rotation(-1.48));
        const shin=thigh.clone().multiply(around(pivot(knee),rotation(1.48)));
        bones[hip]=thigh;assign(knee,last,shin);
      }
      arm('left',{down:1.48,forward:-.27,fold:.76});
      arm('right',{down:1.48,forward:-.27,fold:.76});
      const stoop=around(pivot(5),rotation(.20));
      for(let i=5;i<=62;i++)bones[i].premultiply(stoop);
    } else if(role==='child') {
      arm('left',{down:.30,forward:-.12,fold:.20});
      arm('right',{down:1.38,forward:.42,fold:-.42});
      const head=around(pivot(34),rotation(.06,-.20,-.12));
      assign(34,36,head);
    }
    return {name:names[role],bones};
  }
  return {names,create};
})();
if(typeof module!=='undefined')module.exports={MazeNPCPoses};