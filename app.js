
const video=document.getElementById('video');
const resultCanvas=document.getElementById('resultCanvas');
const rctx=resultCanvas.getContext('2d');
const placeholderReal=document.getElementById('placeholderReal');
const placeholderChap=document.getElementById('placeholderChap');
const realStatus=document.getElementById('realStatus');
const chapStatus=document.getElementById('chapStatus');
const btnStart=document.getElementById('btnStart');
const btnStop=document.getElementById('btnStop');
const targetFile=document.getElementById('targetFile');
const targetImg=document.getElementById('targetImg');
const targetVideo=document.getElementById('targetVideo');
const targetPreview=document.getElementById('targetPreview');
const targetStatus=document.getElementById('targetStatus');
const tabCamera=document.getElementById('tabCamera');
const tabVideo=document.getElementById('tabVideo');

let stream=null, isLive=false, faceMesh=null, targetFaceMesh=null;
let targetLandmarks=null, targetImage=null, targetType='image';
let sourceLandmarks=null;

function initMesh(){
  faceMesh=new FaceMesh({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`});
  faceMesh.setOptions({maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.6, minTrackingConfidence:0.6});
  faceMesh.onResults(onResults);
  targetFaceMesh=new FaceMesh({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`});
  targetFaceMesh.setOptions({maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.5});
  realStatus.textContent='IA prête';
}

function onResults(res){
  if(!isLive || !targetLandmarks) return;
  if(res.multiFaceLandmarks && res.multiFaceLandmarks.length>0){
    sourceLandmarks=res.multiFaceLandmarks[0];
    renderChapCam();
  }
}

function renderChapCam(){
  if(!sourceLandmarks || !targetImage) return;
  const zoom=parseFloat(document.getElementById('zoom').value);
  const feather=parseFloat(document.getElementById('feather').value);
  
  if(resultCanvas.width!==targetImage.naturalWidth && targetType==='image'){
    resultCanvas.width=targetImage.naturalWidth; resultCanvas.height=targetImage.naturalHeight;
  }
  if(targetType==='video' && resultCanvas.width!==targetVideo.videoWidth){
    resultCanvas.width=targetVideo.videoWidth; resultCanvas.height=targetVideo.videoHeight;
  }
  
  rctx.clearRect(0,0,resultCanvas.width,resultCanvas.height);
  if(targetType==='image') rctx.drawImage(targetImage,0,0,resultCanvas.width,resultCanvas.height);
  else rctx.drawImage(targetVideo,0,0,resultCanvas.width,resultCanvas.height);
  
  const srcLeft=sourceLandmarks[33], srcRight=sourceLandmarks[263], srcNose=sourceLandmarks[1];
  const tgtLeft=targetLandmarks[33], tgtRight=targetLandmarks[263], tgtNose=targetLandmarks[1];
  
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
  if(feather>0){ rctx.shadowBlur=feather; rctx.shadowColor='rgba(0,0,0,0.9)'; }
  rctx.clip();
  rctx.translate(dstCX, dstCY);
  rctx.rotate(rot);
  rctx.scale(scale, scale);
  rctx.translate(-srcCX, -srcCY);
  rctx.drawImage(video,0,0,video.videoWidth,video.videoHeight);
  rctx.restore();
  
  // blend
  rctx.globalCompositeOperation='soft-light'; rctx.globalAlpha=0.15;
  if(targetType==='image') rctx.drawImage(targetImage,0,0,resultCanvas.width,resultCanvas.height);
  else rctx.drawImage(targetVideo,0,0,resultCanvas.width,resultCanvas.height);
  rctx.globalCompositeOperation='source-over'; rctx.globalAlpha=1;
  
  // dots
  const mouthOpen=Math.hypot(sourceLandmarks[14].y-sourceLandmarks[13].y, sourceLandmarks[14].x-sourceLandmarks[13].x);
  document.getElementById('dotMouth').style.background= mouthOpen>0.03 ? 'rgba(0,230,118,0.4)' : 'rgba(0,0,0,0.6)';
  document.getElementById('dotEyes').style.background= Math.hypot(sourceLandmarks[145].y-sourceLandmarks[159].y)<0.01 ? 'rgba(0,230,118,0.4)' : 'rgba(0,0,0,0.6)';
}

function handleTarget(file){
  const isVideo=file.type.startsWith('video');
  const url=URL.createObjectURL(file);
  targetPreview.style.display='block';
  if(isVideo){
    targetType='video'; targetVideo.src=url; targetVideo.style.display='block'; targetImg.style.display='none';
    targetVideo.onloadeddata=async ()=>{
      resultCanvas.width=targetVideo.videoWidth; resultCanvas.height=targetVideo.videoHeight;
      rctx.drawImage(targetVideo,0,0,resultCanvas.width,resultCanvas.height);
      placeholderChap.style.display='none';
      targetStatus.textContent='Analyse visage cible...';
      const c=document.createElement('canvas'); c.width=targetVideo.videoWidth; c.height=targetVideo.videoHeight;
      c.getContext('2d').drawImage(targetVideo,0,0);
      targetFaceMesh.onResults(res=>{ if(res.multiFaceLandmarks && res.multiFaceLandmarks[0]){ targetLandmarks=res.multiFaceLandmarks[0]; targetImage=targetVideo; targetStatus.textContent='✅ Prêt - Lance le swap'; chapStatus.textContent='CIBLE PRÊTE'; } });
      await targetFaceMesh.send({image:c});
    };
    targetVideo.play();
  } else {
    targetType='image'; targetImg.src=url; targetImg.style.display='block'; targetVideo.style.display='none';
    targetImg.onload=async ()=>{
      resultCanvas.width=targetImg.naturalWidth; resultCanvas.height=targetImg.naturalHeight;
      rctx.drawImage(targetImg,0,0,resultCanvas.width,resultCanvas.height);
      placeholderChap.style.display='none';
      targetStatus.textContent='Analyse visage...';
      const c=document.createElement('canvas'); c.width=targetImg.naturalWidth; c.height=targetImg.naturalHeight;
      c.getContext('2d').drawImage(targetImg,0,0);
      targetFaceMesh.onResults(res=>{ if(res.multiFaceLandmarks && res.multiFaceLandmarks[0]){ targetLandmarks=res.multiFaceLandmarks[0]; targetImage=targetImg; targetStatus.textContent='✅ Visage trouvé !'; chapStatus.textContent='CIBLE PRÊTE'; realStatus.textContent='PRÊT'; } else targetStatus.textContent='Pas de visage'; });
      await targetFaceMesh.send({image:c});
    };
  }
}

targetFile.addEventListener('change', e=>{ if(e.target.files[0]) handleTarget(e.target.files[0]); });

tabCamera.addEventListener('click', ()=>{ tabCamera.classList.add('active'); tabVideo.classList.remove('active'); });
tabVideo.addEventListener('click', ()=>{ tabVideo.classList.add('active'); tabCamera.classList.remove('active'); document.getElementById('sourceVideoLabel').style.display='block'; });

async function start(){
  if(!targetLandmarks){ alert('Choisis d\'abord la cible (qui tu veux devenir)'); return; }
  try{
    if(stream) stream.getTracks().forEach(t=>t.stop());
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});
    video.srcObject=stream; await video.play();
    placeholderReal.style.display='none';
    realStatus.textContent='LIVE'; realStatus.style.background='rgba(0,230,118,0.2)'; realStatus.style.color='#00e676';
    chapStatus.textContent='LIVE SWAP'; 
    btnStart.style.display='none'; btnStop.style.display='block';
    isLive=true;
    const camera=new Camera(video,{onFrame:async()=>{await faceMesh.send({image:video});},width:640,height:480});
    camera.start();
  }catch(e){ alert('Caméra: '+e.message); }
}
function stop(){ isLive=false; if(stream) stream.getTracks().forEach(t=>t.stop()); stream=null; btnStart.style.display='block'; btnStop.style.display='none'; placeholderReal.style.display='flex'; realStatus.textContent='INACTIF'; }

btnStart.addEventListener('click', start);
btnStop.addEventListener('click', stop);
initMesh();
