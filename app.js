
const video=document.getElementById('video');
const realCanvas=document.getElementById('realCanvas');
const resultCanvas=document.getElementById('resultCanvas');
const rctx=resultCanvas.getContext('2d');
const realCtx=realCanvas ? realCanvas.getContext('2d') : null;
const placeholderReal=document.getElementById('placeholderReal');
const placeholderChap=document.getElementById('placeholderChap');
const statusText=document.getElementById('statusText');
const btnStart=document.getElementById('btnStart');
const btnStop=document.getElementById('btnStop');
const btnReal=document.getElementById('btnReal');
const targetFile=document.getElementById('targetFile');
const targetImg=document.getElementById('targetImg');
const targetVideo=document.getElementById('targetVideo');
const avatarPreview=document.getElementById('avatarPreview');
const avatarSelected=document.getElementById('avatarSelected');

let stream=null, isLive=false;
let targetImage=null, targetType='image';
let targetLandmarks=null, sourceLandmarks=null;
let faceMesh=null, targetFaceMesh=null;

// ALWAYS SHOW UI - even if JS fails, UI is visible via CSS
document.addEventListener('DOMContentLoaded', ()=>{
  placeholderReal.style.display='flex';
  placeholderChap.style.display='flex';
  statusText.textContent='Prêt - Choisis un avatar et active ta caméra';
});

function initMesh(){
  try{
    faceMesh=new FaceMesh({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`});
    faceMesh.setOptions({maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.5, minTrackingConfidence:0.5});
    faceMesh.onResults(res=>{ if(isLive && res.multiFaceLandmarks && res.multiFaceLandmarks[0]){ sourceLandmarks=res.multiFaceLandmarks[0]; renderSwap(); } });
    
    targetFaceMesh=new FaceMesh({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`});
    targetFaceMesh.setOptions({maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.5});
    
    statusText.textContent='IA chargée - Choisis avatar';
  }catch(e){
    console.log('FaceMesh load failed, using simple mode', e);
    statusText.textContent='Mode simple activé - Choisis avatar';
  }
}

function renderSwap(){
  if(!targetImage) return;
  
  try{
    if(resultCanvas.width!==targetImage.naturalWidth && targetType==='image'){
      resultCanvas.width=targetImage.naturalWidth; resultCanvas.height=targetImage.naturalHeight;
    }
    if(targetType==='video' && targetVideo.videoWidth){
      resultCanvas.width=targetVideo.videoWidth; resultCanvas.height=targetVideo.videoHeight;
    }
    
    rctx.clearRect(0,0,resultCanvas.width,resultCanvas.height);
    if(targetType==='image') rctx.drawImage(targetImage,0,0,resultCanvas.width,resultCanvas.height);
    else if(targetVideo) rctx.drawImage(targetVideo,0,0,resultCanvas.width,resultCanvas.height);
    
    if(sourceLandmarks && targetLandmarks){
      const srcLeft=sourceLandmarks[33], srcRight=sourceLandmarks[263], srcNose=sourceLandmarks[1];
      const tgtLeft=targetLandmarks[33], tgtRight=targetLandmarks[263], tgtNose=targetLandmarks[1];
      const zoom=parseFloat(document.getElementById('zoom').value)||1.05;
      const feather=parseFloat(document.getElementById('feather').value)||12;
      
      const srcEyeDist=Math.hypot(srcRight.x-srcLeft.x, srcRight.y-srcLeft.y);
      const dstEyeDist=Math.hypot(tgtRight.x-tgtLeft.x, tgtRight.y-tgtLeft.y);
      const scale=(dstEyeDist/srcEyeDist)*zoom*resultCanvas.width/video.videoWidth;
      const srcAngle=Math.atan2(srcRight.y-srcLeft.y, srcRight.x-srcLeft.x);
      const dstAngle=Math.atan2(tgtRight.y-tgtLeft.y, tgtRight.x-tgtLeft.x);
      const rot=dstAngle-srcAngle;
      const dstCX=tgtNose.x*resultCanvas.width, dstCY=tgtNose.y*resultCanvas.height;
      const srcCX=srcNose.x*video.videoWidth, srcCY=srcNose.y*video.videoHeight;
      
      rctx.save();
      const outline=[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
      rctx.beginPath();
      for(let i=0;i<outline.length;i++){
        const p=targetLandmarks[outline[i]];
        const x=p.x*resultCanvas.width, y=p.y*resultCanvas.height;
        if(i===0) rctx.moveTo(x,y); else rctx.lineTo(x,y);
      }
      rctx.closePath();
      if(feather>0){ rctx.shadowBlur=feather; rctx.shadowColor='rgba(0,0,0,0.8)'; }
      rctx.clip();
      rctx.translate(dstCX, dstCY);
      rctx.rotate(rot);
      rctx.scale(scale, scale);
      rctx.translate(-srcCX, -srcCY);
      rctx.drawImage(video,0,0,video.videoWidth,video.videoHeight);
      rctx.restore();
      
      rctx.globalCompositeOperation='soft-light'; rctx.globalAlpha=0.15;
      if(targetType==='image') rctx.drawImage(targetImage,0,0,resultCanvas.width,resultCanvas.height);
      else rctx.drawImage(targetVideo,0,0,resultCanvas.width,resultCanvas.height);
      rctx.globalCompositeOperation='source-over'; rctx.globalAlpha=1;
    } else {
      // Simple mode: just show target with overlay of your video small
      rctx.globalAlpha=0.85;
      rctx.drawImage(video, resultCanvas.width*0.6, resultCanvas.height*0.05, resultCanvas.width*0.35, resultCanvas.height*0.3);
      rctx.globalAlpha=1;
    }
  }catch(e){ console.log(e); }
}

function handleTarget(file){
  const isVideo=file.type.startsWith('video');
  const url=URL.createObjectURL(file);
  avatarPreview.style.display='block';
  if(isVideo){
    targetType='video'; targetVideo.src=url; targetVideo.style.display='block'; targetImg.style.display='none';
    targetVideo.onloadeddata=async ()=>{
      resultCanvas.width=targetVideo.videoWidth; resultCanvas.height=targetVideo.videoHeight;
      rctx.drawImage(targetVideo,0,0,resultCanvas.width,resultCanvas.height);
      placeholderChap.style.display='none';
      targetImage=targetVideo;
      if(targetFaceMesh){
        const c=document.createElement('canvas'); c.width=targetVideo.videoWidth; c.height=targetVideo.videoHeight;
        c.getContext('2d').drawImage(targetVideo,0,0);
        targetFaceMesh.onResults(res=>{ if(res.multiFaceLandmarks && res.multiFaceLandmarks[0]){ targetLandmarks=res.multiFaceLandmarks[0]; statusText.textContent='✅ Avatar prêt - Je mange un garba avec mon avatar'; } });
        await targetFaceMesh.send({image:c});
      } else { statusText.textContent='✅ Avatar vidéo prêt'; }
      avatarSelected.style.display='flex';
      document.getElementById('selectedAvatarImg').src=url;
      document.getElementById('selAv').src=url;
    };
    targetVideo.play();
  } else {
    targetType='image'; targetImg.src=url; targetImg.style.display='block'; targetVideo.style.display='none';
    targetImg.onload=async ()=>{
      resultCanvas.width=targetImg.naturalWidth; resultCanvas.height=targetImg.naturalHeight;
      rctx.drawImage(targetImg,0,0,resultCanvas.width,resultCanvas.height);
      placeholderChap.style.display='none';
      targetImage=targetImg;
      if(targetFaceMesh){
        const c=document.createElement('canvas'); c.width=targetImg.naturalWidth; c.height=targetImg.naturalHeight;
        c.getContext('2d').drawImage(targetImg,0,0);
        targetFaceMesh.onResults(res=>{ if(res.multiFaceLandmarks && res.multiFaceLandmarks[0]){ targetLandmarks=res.multiFaceLandmarks[0]; statusText.textContent='✅ Avatar prêt - Mode garba'; } else statusText.textContent='✅ Avatar prêt (mode simple)'; } });
        await targetFaceMesh.send({image:c});
      } else { statusText.textContent='✅ Avatar prêt'; }
      avatarSelected.style.display='flex';
      document.getElementById('selectedAvatarImg').src=url;
      document.getElementById('selAv').src=url;
    };
  }
}

targetFile.addEventListener('change', e=>{ if(e.target.files[0]) handleTarget(e.target.files[0]); });

async function startCamera(){
  try{
    if(stream) stream.getTracks().forEach(t=>t.stop());
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});
    video.srcObject=stream;
    await video.play();
    placeholderReal.style.display='none';
    if(realCanvas){ realCanvas.width=video.videoWidth; realCanvas.height=video.videoHeight; }
    document.getElementById('realBox').querySelector('.cam-label').textContent='Live - Toi';
    statusText.textContent='🔴 LIVE - Comme sur ta capture : Je mange un garba avec mon avatar';
    btnStart.style.display='none'; btnStop.style.display='block';
    isLive=true;
    
    if(faceMesh){
      try{
        const {Camera} = await import('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
      }catch(e){}
      const camera = new (window.Camera || class{constructor(v,o){this.v=v;this.o=o} start(){ const loop=async()=>{ if(isLive){ await faceMesh.send({image:video}); requestAnimationFrame(loop); } }; loop(); }})(video, {
        onFrame: async () => { if(faceMesh) await faceMesh.send({image:video}); },
        width: 640,
        height: 480
      });
      camera.start();
    } else {
      // Simple mode without faceMesh - just show video in both places
      setInterval(()=>{ if(isLive) renderSwap(); }, 100);
    }
    
    // Also render real camera
    const renderReal=()=>{
      if(!isLive) return;
      if(realCanvas && realCtx){
        realCtx.clearRect(0,0,realCanvas.width,realCanvas.height);
        realCtx.drawImage(video,0,0,realCanvas.width,realCanvas.height);
      }
      requestAnimationFrame(renderReal);
    };
    renderReal();
    
  }catch(e){ alert('Caméra bloquée: '+e.message); }
}

function stopCamera(){
  isLive=false;
  if(stream) stream.getTracks().forEach(t=>t.stop()); stream=null;
  placeholderReal.style.display='flex';
  btnStart.style.display='block'; btnStop.style.display='none';
  statusText.textContent='Arrêté';
}

btnStart.addEventListener('click', startCamera);
btnStop.addEventListener('click', stopCamera);
if(btnReal) btnReal.addEventListener('click', startCamera);

initMesh();

// Force display even if JS errors
setTimeout(()=>{ 
  if(document.getElementById('placeholderReal').style.display==='none' && !stream){
    document.getElementById('placeholderReal').style.display='flex';
  }
}, 1000);
