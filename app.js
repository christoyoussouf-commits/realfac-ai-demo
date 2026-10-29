
const video=document.getElementById('video');
const resultCanvas=document.getElementById('resultCanvas');
const rctx=resultCanvas.getContext('2d');
const pipCanvas=document.getElementById('pipCanvas');
const pctx=pipCanvas.getContext('2d');
const placeholderMain=document.getElementById('placeholderMain');
const pipPlaceholder=document.getElementById('pipPlaceholder');
const targetFile=document.getElementById('targetFile');
const statusEl=document.getElementById('status');
const btnStart=document.getElementById('btnStart');
const btnStop=document.getElementById('btnStop');

let stream=null, isLive=false;
let faceMesh=null, handsMesh=null;
let targetLandmarks=null, targetImage=null, targetType='image', targetVideo=null;
let sourceLandmarks=null, sourceHands=null;
let progress=35;

function init(){
  faceMesh=new FaceMesh({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`});
  faceMesh.setOptions({maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.6, minTrackingConfidence:0.6});
  faceMesh.onResults(res=>{ if(isLive && res.multiFaceLandmarks && res.multiFaceLandmarks[0]){ sourceLandmarks=res.multiFaceLandmarks[0]; renderMarkSwap(); } });
  
  handsMesh=new Hands({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`});
  handsMesh.setOptions({maxNumHands:2, modelComplexity:1, minDetectionConfidence:0.5, minTrackingConfidence:0.5});
  handsMesh.onResults(res=>{ if(isLive) sourceHands=res.multiHandLandmarks; });
  
  statusEl.textContent='Prêt - Comme ta capture';
  
  // Animate progress bar like TikTok
  setInterval(()=>{ progress+=0.3; if(progress>100) progress=0; document.getElementById('progressFill').style.width=progress+'%'; document.getElementById('progressDot').style.left=progress+'%'; }, 100);
}

function renderMarkSwap(){
  if(!sourceLandmarks || !targetImage) return;
  
  if(resultCanvas.width!==targetImage.naturalWidth && targetType==='image'){
    resultCanvas.width=targetImage.naturalWidth; resultCanvas.height=targetImage.naturalHeight;
  }
  if(targetType==='video' && targetVideo){
    resultCanvas.width=targetVideo.videoWidth; resultCanvas.height=targetVideo.videoHeight;
  }
  if(pipCanvas.width!==video.videoWidth){ pipCanvas.width=video.videoWidth; pipCanvas.height=video.videoHeight; }
  
  // PIP - TOI en haut à gauche (comme sur capture)
  pctx.clearRect(0,0,pipCanvas.width,pipCanvas.height);
  pctx.drawImage(video,0,0,pipCanvas.width,pipCanvas.height);
  pipPlaceholder.style.display='none';
  
  // MAIN - MARK qui fait tes gestes (grand en bas)
  rctx.clearRect(0,0,resultCanvas.width,resultCanvas.height);
  if(targetType==='image') rctx.drawImage(targetImage,0,0,resultCanvas.width,resultCanvas.height);
  else if(targetVideo) rctx.drawImage(targetVideo,0,0,resultCanvas.width,resultCanvas.height);
  
  const srcLeft=sourceLandmarks[33], srcRight=sourceLandmarks[263], srcNose=sourceLandmarks[1];
  const tgtLeft=targetLandmarks[33], tgtRight=targetLandmarks[263], tgtNose=targetLandmarks[1];
  
  const srcEyeDist=Math.hypot(srcRight.x-srcLeft.x, srcRight.y-srcLeft.y);
  const dstEyeDist=Math.hypot(tgtRight.x-tgtLeft.x, tgtRight.y-tgtLeft.y);
  const scale=(dstEyeDist/srcEyeDist)*1.05*resultCanvas.width/video.videoWidth;
  const srcAngle=Math.atan2(srcRight.y-srcLeft.y, srcRight.x-srcLeft.x);
  const dstAngle=Math.atan2(tgtRight.y-tgtLeft.y, tgtRight.x-tgtLeft.x);
  const rot=dstAngle-srcAngle;
  
  const dstCX=tgtNose.x*resultCanvas.width, dstCY=tgtNose.y*resultCanvas.height;
  const srcCX=srcNose.x*video.videoWidth, srcCY=srcNose.y*video.videoHeight;
  
  // Face swap
  rctx.save();
  const outline=[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
  rctx.beginPath();
  for(let i=0;i<outline.length;i++){
    const p=targetLandmarks[outline[i]];
    const x=p.x*resultCanvas.width, y=p.y*resultCanvas.height;
    if(i===0) rctx.moveTo(x,y); else rctx.lineTo(x,y);
  }
  rctx.closePath();
  rctx.clip();
  rctx.translate(dstCX, dstCY);
  rctx.rotate(rot);
  rctx.scale(scale, scale);
  rctx.translate(-srcCX, -srcCY);
  rctx.drawImage(video,0,0,video.videoWidth,video.videoHeight);
  rctx.restore();
  
  rctx.globalCompositeOperation='soft-light'; rctx.globalAlpha=0.12;
  if(targetType==='image') rctx.drawImage(targetImage,0,0,resultCanvas.width,resultCanvas.height);
  else rctx.drawImage(targetVideo,0,0,resultCanvas.width,resultCanvas.height);
  rctx.globalCompositeOperation='source-over'; rctx.globalAlpha=1;
  
  // Hand gesture - if you raise hand, Mark raises hand (simulate by drawing hand overlay)
  if(sourceHands && sourceHands.length>0){
    const hand=sourceHands[0];
    // If hand is raised (y < 0.5), show hand in result
    const handY=hand[0].y;
    if(handY<0.6){
      // Draw a hand-like shape following your hand
      rctx.save();
      rctx.globalAlpha=0.95;
      // Simple hand representation that follows your hand
      const hx=hand[0].x*resultCanvas.width;
      const hy=hand[0].y*resultCanvas.height;
      rctx.fillStyle='#e8c4a0';
      rctx.beginPath();
      rctx.ellipse(hx, hy, 40, 60, 0,0,Math.PI*2);
      rctx.fill();
      rctx.restore();
    }
  }
}

function handleTarget(file){
  const isVideo=file.type.startsWith('video');
  const url=URL.createObjectURL(file);
  placeholderMain.style.display='none';
  if(isVideo){
    targetType='video'; targetVideo=document.createElement('video'); targetVideo.src=url; targetVideo.loop=true; targetVideo.muted=true;
    targetVideo.onloadeddata=async ()=>{
      resultCanvas.width=targetVideo.videoWidth; resultCanvas.height=targetVideo.videoHeight;
      rctx.drawImage(targetVideo,0,0,resultCanvas.width,resultCanvas.height);
      status.textContent='Vidéo Mark chargée';
      const c=document.createElement('canvas'); c.width=targetVideo.videoWidth; c.height=targetVideo.videoHeight;
      c.getContext('2d').drawImage(targetVideo,0,0);
      const tempMesh=new FaceMesh({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`});
      tempMesh.setOptions({maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.5});
      tempMesh.onResults(res=>{ if(res.multiFaceLandmarks && res.multiFaceLandmarks[0]){ targetLandmarks=res.multiFaceLandmarks[0]; targetImage=targetVideo; statusEl.textContent='✅ Mark prêt !'; } });
      await tempMesh.send({image:c});
    };
    targetVideo.play();
  } else {
    targetType='image'; const img=new Image(); img.src=url;
    img.onload=async ()=>{
      targetImage=img; resultCanvas.width=img.naturalWidth; resultCanvas.height=img.naturalHeight;
      rctx.drawImage(img,0,0,resultCanvas.width,resultCanvas.height);
      placeholderMain.style.display='none';
      statusEl.textContent='Analyse Mark...';
      const c=document.createElement('canvas'); c.width=img.naturalWidth; c.height=img.naturalHeight;
      c.getContext('2d').drawImage(img,0,0);
      const tempMesh=new FaceMesh({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`});
      tempMesh.setOptions({maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.5});
      tempMesh.onResults(res=>{ if(res.multiFaceLandmarks && res.multiFaceLandmarks[0]){ targetLandmarks=res.multiFaceLandmarks[0]; statusEl.textContent='✅ Mark prêt ! Lance le swap'; } else statusEl.textContent='Pas de visage'; } });
      await tempMesh.send({image:c});
    };
  }
}

targetFile.addEventListener('change', e=>{ if(e.target.files[0]) handleTarget(e.target.files[0]); });

async function start(){
  if(!targetLandmarks){ alert('Choisis d\'abord qui tu veux devenir (ex: photo de Mark)'); return; }
  try{
    if(stream) stream.getTracks().forEach(t=>t.stop());
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});
    video.srcObject=stream; await video.play();
    btnStart.style.display='none'; btnStop.style.display='block';
    statusEl.textContent='∞ LIVE - Toi en haut, Mark en bas qui fait tes gestes';
    isLive=true;
    pipPlaceholder.style.display='none';
    const camera=new Camera(video,{onFrame:async()=>{ await faceMesh.send({image:video}); await handsMesh.send({image:video}); },width:640,height:480});
    camera.start();
  }catch(e){ alert('Caméra: '+e.message); }
}
function stop(){ isLive=false; if(stream) stream.getTracks().forEach(t=>t.stop()); stream=null; btnStart.style.display='block'; btnStop.style.display='none'; statusEl.textContent='Arrêté'; }

btnStart.addEventListener('click', start);
btnStop.addEventListener('click', stop);
document.getElementById('btnClose').addEventListener('click', ()=>{ if(confirm('Fermer ?')) stop(); });

init();
