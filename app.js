
const video=document.getElementById('video');
const resultCanvas=document.getElementById('resultCanvas');
const rctx=resultCanvas.getContext('2d');
const miniCanvas=document.getElementById('miniCanvas');
const mctx=miniCanvas.getContext('2d');
const targetMini=document.getElementById('targetMini');
const tminiCtx=targetMini.getContext('2d');
const placeholder=document.getElementById('placeholder');
const camStatus=document.getElementById('camStatus');
const btnFront=document.getElementById('btnFront');
const btnStop=document.getElementById('btnStop');
const targetFile=document.getElementById('targetFile');
const videoFile=document.getElementById('videoFile');
const targetImg=document.getElementById('targetImg');
const targetVideo=document.getElementById('targetVideo');
const targetPreview=document.getElementById('targetPreview');
const targetStatus=document.getElementById('targetStatus');
const mouthStatus=document.getElementById('mouthStatus');
const eyeStatus=document.getElementById('eyeStatus');
const smileStatus=document.getElementById('smileStatus');

let stream=null, isLive=false, faceMesh=null, targetFaceMesh=null;
let targetLandmarks=null, targetImage=null, targetType='image';
let sourceLandmarks=null;
let recordedChunks=[], mediaRecorder=null;

function initMesh(){
  faceMesh=new FaceMesh({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`});
  faceMesh.setOptions({maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.6, minTrackingConfidence:0.6});
  faceMesh.onResults(onResults);
  targetFaceMesh=new FaceMesh({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`});
  targetFaceMesh.setOptions({maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.6});
  camStatus.textContent='Prêt - Comme ChapCam Pro';
}

function onResults(res){
  if(!isLive || !targetLandmarks) return;
  if(res.multiFaceLandmarks && res.multiFaceLandmarks.length>0){
    sourceLandmarks=res.multiFaceLandmarks[0];
    renderChapCamSwap();
  }
}

function getMouthMetrics(lm){
  const upper=lm[13], lower=lm[14], left=lm[61], right=lm[291];
  const open=Math.hypot(lower.x-upper.x, lower.y-upper.y);
  const width=Math.hypot(right.x-left.x, right.y-left.y);
  return {open, width, upper, lower, left, right};
}
function getEyeMetrics(lm){
  const lUp=lm[159], lLow=lm[145], rUp=lm[386], rLow=lm[374];
  const lOpen=Math.hypot(lLow.x-lUp.x, lLow.y-lUp.y);
  const rOpen=Math.hypot(rLow.x-rUp.x, rLow.y-rUp.y);
  return {blink:(lOpen+rOpen)/2, left:lOpen, right:rOpen};
}

function renderChapCamSwap(){
  if(!sourceLandmarks || !targetImage) return;
  
  const zoom=parseFloat(document.getElementById('zoom').value);
  const feather=parseFloat(document.getElementById('feather').value);
  const brightness=parseFloat(document.getElementById('brightness').value);
  
  if(resultCanvas.width!==targetImage.naturalWidth && targetType==='image'){
    resultCanvas.width=targetImage.naturalWidth; resultCanvas.height=targetImage.naturalHeight;
  }
  if(targetType==='video' && resultCanvas.width!==targetVideo.videoWidth){
    resultCanvas.width=targetVideo.videoWidth; resultCanvas.height=targetVideo.videoHeight;
  }
  if(miniCanvas.width!==video.videoWidth){ miniCanvas.width=video.videoWidth; miniCanvas.height=video.videoHeight; }
  if(targetMini.width!==resultCanvas.width){ targetMini.width=160; targetMini.height=120; }
  
  // Mini cams
  mctx.clearRect(0,0,miniCanvas.width,miniCanvas.height); mctx.drawImage(video,0,0,miniCanvas.width,miniCanvas.height);
  tminiCtx.clearRect(0,0,targetMini.width,targetMini.height); 
  if(targetType==='image') tminiCtx.drawImage(targetImage,0,0,targetMini.width,targetMini.height);
  else if(targetType==='video') tminiCtx.drawImage(targetVideo,0,0,targetMini.width,targetMini.height);
  
  // Main render
  rctx.clearRect(0,0,resultCanvas.width,resultCanvas.height);
  if(targetType==='image') rctx.drawImage(targetImage,0,0,resultCanvas.width,resultCanvas.height);
  else rctx.drawImage(targetVideo,0,0,resultCanvas.width,resultCanvas.height);
  
  const srcMouth=getMouthMetrics(sourceLandmarks);
  const srcEye=getEyeMetrics(sourceLandmarks);
  const tgtLeftEye=targetLandmarks[33], tgtRightEye=targetLandmarks[263], tgtNose=targetLandmarks[1];
  const tgtMouthLeft=targetLandmarks[61], tgtMouthRight=targetLandmarks[291];
  const tgtChin=targetLandmarks[152], tgtForehead=targetLandmarks[10];
  
  const srcLeftEye=sourceLandmarks[33], srcRightEye=sourceLandmarks[263], srcNose=sourceLandmarks[1];
  
  // Update UI
  mouthStatus.textContent= srcMouth.open>0.04 ? '👄 Parle' : '👄 Bouche';
  mouthStatus.style.background= srcMouth.open>0.04 ? 'rgba(124,92,255,0.4)' : 'rgba(0,0,0,0.6)';
  eyeStatus.textContent= srcEye.blink<0.015 ? '👁️ Cligne' : '👁️ Yeux';
  smileStatus.textContent= srcMouth.width>0.12 ? '😊 Sourit' : '😊 Neutre';
  
  // Calculate transform
  const srcEyeDist=Math.hypot(srcRightEye.x-srcLeftEye.x, srcRightEye.y-srcLeftEye.y);
  const dstEyeDist=Math.hypot(tgtRightEye.x-tgtLeftEye.x, tgtRightEye.y-tgtLeftEye.y);
  const scale=(dstEyeDist/srcEyeDist)*zoom;
  const srcAngle=Math.atan2(srcRightEye.y-srcLeftEye.y, srcRightEye.x-srcLeftEye.x);
  const dstAngle=Math.atan2(tgtRightEye.y-tgtLeftEye.y, tgtRightEye.x-tgtLeftEye.x);
  const rot=dstAngle-srcAngle;
  
  const dstCX=tgtNose.x*resultCanvas.width, dstCY=tgtNose.y*resultCanvas.height;
  const srcCX=srcNose.x*video.videoWidth, srcCY=srcNose.y*video.videoHeight;
  
  rctx.save();
  
  // Create precise face mask using landmarks outline
  const faceOutline=[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
  rctx.beginPath();
  for(let i=0;i<faceOutline.length;i++){
    const idx=faceOutline[i];
    const p=targetLandmarks[idx];
    const x=p.x*resultCanvas.width, y=p.y*resultCanvas.height;
    if(i===0) rctx.moveTo(x,y); else rctx.lineTo(x,y);
  }
  rctx.closePath();
  
  // Feather blur effect
  if(feather>0){
    rctx.shadowColor='rgba(0,0,0,0.8)';
    rctx.shadowBlur=feather;
  }
  rctx.clip();
  
  // Transform and draw your face onto target
  rctx.translate(dstCX, dstCY);
  rctx.rotate(rot);
  rctx.scale(scale, scale);
  rctx.translate(-srcCX, -srcCY);
  
  // Brightness match
  rctx.filter=`brightness(${brightness}) contrast(1.05) saturate(1.08)`;
  
  // Crop source face and draw
  const cropX=srcCX - video.videoWidth*0.35, cropY=srcCY - video.videoHeight*0.45;
  const cropW=video.videoWidth*0.7, cropH=video.videoHeight*0.75;
  
  rctx.drawImage(video, cropX, cropY, cropW, cropH, cropX, cropY, cropW, cropH);
  
  rctx.filter='none';
  rctx.restore();
  
  // Blend with original skin tone for ChapCam Pro look
  rctx.globalCompositeOperation='soft-light';
  rctx.globalAlpha=0.18;
  if(targetType==='image') rctx.drawImage(targetImage,0,0,resultCanvas.width,resultCanvas.height);
  else rctx.drawImage(targetVideo,0,0,resultCanvas.width,resultCanvas.height);
  rctx.globalAlpha=1;
  rctx.globalCompositeOperation='source-over';
  
  // Add subtle mouth highlight when speaking
  if(srcMouth.open>0.05){
    const mx=tgtNose.x*resultCanvas.width + (tgtMouthLeft.x+tgtMouthRight.x)/2*0 - tgtNose.x*resultCanvas.width*0 + (tgtMouthLeft.x*resultCanvas.width + tgtMouthRight.x*resultCanvas.width)/2 - tgtNose.x*resultCanvas.width;
    // Actually use target mouth center
    const tMouthCX=(tgtMouthLeft.x+tgtMouthRight.x)/2*resultCanvas.width;
    const tMouthCY=(targetLandmarks[13].y+targetLandmarks[14].y)/2*resultCanvas.height;
    rctx.fillStyle='rgba(0,0,0,0.25)';
    rctx.beginPath();
    rctx.ellipse(tMouthCX, tMouthCY+srcMouth.open*resultCanvas.height*2, srcMouth.width*resultCanvas.width*0.4, srcMouth.open*resultCanvas.height*2.2, 0,0,Math.PI*2);
    rctx.fill();
  }
}

// Target handling
function handleTarget(file, isVideo){
  const url=URL.createObjectURL(file);
  targetPreview.style.display='block';
  if(isVideo){
    targetType='video';
    targetVideo.src=url; targetVideo.style.display='block'; targetImg.style.display='none';
    targetVideo.onloadeddata=async ()=>{
      resultCanvas.width=targetVideo.videoWidth; resultCanvas.height=targetVideo.videoHeight;
      rctx.drawImage(targetVideo,0,0,resultCanvas.width,resultCanvas.height);
      placeholder.style.display='none';
      targetStatus.textContent='Vidéo chargée - analyse...';
      // Detect on first frame
      const c=document.createElement('canvas'); c.width=targetVideo.videoWidth; c.height=targetVideo.videoHeight;
      c.getContext('2d').drawImage(targetVideo,0,0);
      targetFaceMesh.onResults(res=>{
        if(res.multiFaceLandmarks && res.multiFaceLandmarks.length>0){
          targetLandmarks=res.multiFaceLandmarks[0]; targetImage=targetVideo;
          targetStatus.textContent='✅ Prêt ! Lance le swap';
          camStatus.textContent='Vidéo cible prête';
        }
      });
      await targetFaceMesh.send({image:c});
    };
    targetVideo.play();
  } else {
    targetType='image';
    targetImg.src=url; targetImg.style.display='block'; targetVideo.style.display='none';
    targetImg.onload=async ()=>{
      resultCanvas.width=targetImg.naturalWidth; resultCanvas.height=targetImg.naturalHeight;
      rctx.drawImage(targetImg,0,0,resultCanvas.width,resultCanvas.height);
      placeholder.style.display='none';
      targetStatus.textContent='Analyse visage...';
      const c=document.createElement('canvas'); c.width=targetImg.naturalWidth; c.height=targetImg.naturalHeight;
      c.getContext('2d').drawImage(targetImg,0,0);
      targetFaceMesh.onResults(res=>{
        if(res.multiFaceLandmarks && res.multiFaceLandmarks.length>0){
          targetLandmarks=res.multiFaceLandmarks[0]; targetImage=targetImg;
          targetStatus.textContent=`✅ Visage trouvé ! Comme ChapCam Pro`;
          camStatus.textContent='Photo prête • Lance SWAP';
          camStatus.className='status active';
        } else targetStatus.textContent='Pas de visage trouvé';
      });
      await targetFaceMesh.send({image:c});
    };
  }
}

targetFile.addEventListener('change', e=>{ if(e.target.files[0]) handleTarget(e.target.files[0], false); });
videoFile.addEventListener('change', e=>{ if(e.target.files[0]) handleTarget(e.target.files[0], true); });

async function startCamera(){
  if(!targetLandmarks){ alert('Choisis d\'abord une photo ou vidéo à devenir !'); return; }
  try{
    if(stream) stream.getTracks().forEach(t=>t.stop());
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});
    video.srcObject=stream; await video.play();
    camStatus.textContent='∞ LIVE SWAP ACTIF - Tu es dans la photo !';
    camStatus.className='status active';
    btnStop.style.display='inline-block'; btnFront.style.display='none';
    isLive=true;
    const camera=new Camera(video,{onFrame:async()=>{await faceMesh.send({image:video});},width:640,height:480});
    camera.start();
  }catch(e){ alert('Caméra: '+e.message); }
}
function stopCamera(){ isLive=false; if(stream) stream.getTracks().forEach(t=>t.stop()); stream=null; btnStop.style.display='none'; btnFront.style.display='inline-block'; camStatus.textContent='Arrêté'; }

btnFront.addEventListener('click', startCamera);
btnStop.addEventListener('click', stopCamera);

initMesh();
