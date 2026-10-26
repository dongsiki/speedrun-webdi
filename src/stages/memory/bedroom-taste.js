// 기억 스테이지 침실에 할아버지의 꾸미는 취향을 얹는다(2026-10-27 사용자: 시안 좋으니 스테이지에 바로).
// 그림은 전부 images/ 의 PNG(Codex 제작)이고, 코드로는 붙일 자리만 정한다.
// 시안 원본: src/dev-pages/bedroom-taste/. 이미지는 assets/images/bedroom-taste-*.png.
(function(root){
  'use strict';
  const images={quilt:'@@data:assets/images/bedroom-taste-quilt.png@@',pillow:'@@data:assets/images/bedroom-taste-pillow.png@@',uniform:'@@data:assets/images/bedroom-taste-uniform.png@@',vanity:'@@data:assets/images/bedroom-taste-vanity.png@@',poster:'@@data:assets/images/bedroom-taste-poster.png@@'};
  const DEBUG=/[?&]slots\b/.test(location.search);

  // 그림을 불러와 순수 흑/백 두 색으로 바꾼다(회색이 1비트 화면에서 점으로 뭉개지지 않게).
  // cutout이면 가장자리에서 이어지는 흰 배경만 투명하게 한다. 텍스처는 그림 크기가
  // 정해진 뒤에 만든다(WebGL은 처음 올린 크기를 바꾸지 못함).
  function loadInto(THREE,name,mat,{cutout=false,repeat=null,renderer=null}={}){
    const src=images[name];
    if(!src)return false;
    const img=new Image();
    img.onload=()=>{
      const w=img.naturalWidth,h=img.naturalHeight;
      const surface=document.createElement('canvas');surface.width=w;surface.height=h;
      const g=surface.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,w,h);g.drawImage(img,0,0);
      const data=g.getImageData(0,0,w,h),px=data.data;
      for(let i=0;i<px.length;i+=4){
        const v=(px[i]*.2126+px[i+1]*.7152+px[i+2]*.0722)>140?255:0;
        px[i]=px[i+1]=px[i+2]=v;px[i+3]=255;
      }
      if(cutout){
        const seen=new Uint8Array(w*h),stack=[];
        for(let x=0;x<w;x++)stack.push(x,(h-1)*w+x);
        for(let y=0;y<h;y++)stack.push(y*w,y*w+w-1);
        while(stack.length){
          const i=stack.pop();
          if(seen[i]||px[i*4]===0)continue;
          seen[i]=1;px[i*4+3]=0;
          const x=i%w;
          if(x>0)stack.push(i-1);if(x<w-1)stack.push(i+1);
          if(i>=w)stack.push(i-w);if(i<w*(h-1))stack.push(i+w);
        }
      }
      g.putImageData(data,0,0);
      const texture=new THREE.CanvasTexture(surface);
      texture.colorSpace=THREE.SRGBColorSpace;
      // 비스듬히 누운 이불에서도 선이 흐려지지 않게 비등방 필터를 최대로.
      if(renderer)texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
      if(repeat){texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(repeat[0],repeat[1]);}
      mat.map=texture;mat.opacity=1;mat.color.set(0xffffff);mat.needsUpdate=true;
    };
    img.src=src;
    return true;
  }

  // 이불·베개: 기존 침대 메시 위에 무늬를 위에서 내려 찍는다(새 모양 없음).
  function printPattern(ctx,partName,materialName,name,repeat){
    const {THREE}=ctx;
    for(const {piece,geometry,part} of ctx.bedParts){
      if(part.name!==partName||part.material!==materialName)continue;
      const p=geometry.attributes.position;
      geometry.computeBoundingBox();
      const b=geometry.boundingBox,w=b.max.x-b.min.x,d=b.max.z-b.min.z;
      const uv=[];
      for(let i=0;i<p.count;i++)uv.push((p.getX(i)-b.min.x)/w,(p.getZ(i)-b.min.z)/d);
      geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
      // 원래 음영은 끈다: 무늬가 디더 점에 묻히지 않게.
      const mat=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
      if(loadInto(THREE,name,mat,{repeat,renderer:ctx.renderer}))piece.material=mat;
    }
  }

  // 벽·협탁에 세우는 그림 한 장. 투명한 부분은 잘라낸다.
  function standee(ctx,name,w,h,x,y,z,ry=0,cutout=true){
    const {THREE}=ctx;
    // 그림이 들어오기 전엔 완전히 투명(alphaTest로 버림). 그림이 없으면 ?slots에서만 회색 자리 표시.
    const mat=new THREE.MeshBasicMaterial({color:0xffffff,opacity:0,alphaTest:.5,side:THREE.DoubleSide});
    if(!loadInto(THREE,name,mat,{cutout,renderer:ctx.renderer})){if(!DEBUG)return null;mat.color.set(0x888888);mat.opacity=1;}
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);
    plane.position.set(x,y,z);plane.rotation.set(0,ry,0);
    plane.userData.tasteCutout=true;
    ctx.group.add(plane);
    return plane;
  }

  const slots=[
    // 이름, 폭, 높이, 위치, 회전
    {name:'uniform', w:1.25,h:2.08, x:-1.65,y:1.25,z:-2.75, ry:0},      // 앞벽 문 왼쪽, 걸어 둔 교복
    {name:'vanity',  w:.62,h:.41,  x:-1.45,y:1.11,z:1.45, ry:.99},     // 협탁 위 화장품(누운 자리 쪽을 향함)
    {name:'poster',  w:1.25,h:1.25, x:1.72,y:1.50,z:-2.70, ry:0, cutout:false} // 앞벽 문 오른쪽 액자
  ];

  function decorate(ctx){
    printPattern(ctx,'cover','carpet','quilt',[1.2,-1.0]);
    printPattern(ctx,'pillow','carpetWhite','pillow',[1,1]);
    for(const s of slots)standee(ctx,s.name,s.w,s.h,s.x,s.y,s.z,s.ry,s.cutout!==false);
  }
  root.BedroomTaste={decorate,slots,images:Object.keys(images)};
})(window);
