
const video=document.getElementById('video');
const resultCanvas=document.getElementById('resultCanvas');
const rctx=resultCanvas.getContext('2d');
const phReal=document.getElementById('phReal');
const phChap=document.getElementById('phChap');
const fpsEl=document.getElementById('fps');
const chapLabel=document.getElementById('chapLabel');
const btnStart=document.getElementById('btnStart');
const btnStop=document.getElementById('btnStop');
const targetFile=document.getElementById('targetFile');
const targetImg=document.getElementById('targetImg');
const targetVideo=document.getElementById('targetVideo');
const avatarPreview=document.getElementById('avatarPreview');
const avatarSelected=document.getElementById('avatarSelected');

let stream=null, isLive=false;
let targetImage=null, targetType='image', targetLoaded=false;
let faceMesh=null, camera=null;
let sourceLandmarks=null, targetLandmarks=null;
let useAIMode=false;

// IMMEDIATE DISPLAY - Never block UI
phReal.style.display='flex';
phChap.style.display='flex';
resultCanvas.width=640; resultCanvas.height=800;

// Try to load FaceMesh in background - if fails, use simple mode
function initAI(){
  try{
    if(typeof FaceMesh !== 'undefined'){
      faceMesh=new FaceMesh({locateFile: (f)=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`});
      faceMesh.setOptions({maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.5, minTrackingConfidence:0.5});
      faceMesh.onResults(onResults);
      useAIMode=true;
      fpsEl.textContent='IA chargée • 30 FPS';
      console.log('FaceMesh OK - mode gestes réels activé');
    } else {
      setTimeout(initAI, 1000);
    }
  }catch(e){
    console.log('IA non dispo, mode simple', e);
    useAIMode=false;
    fpsEl.textContent='Mode simple • Prêt';
  }
}
setTimeout(initAI, 500);

function onResults(res){
  if(!isLive) return;
  if(res.multiFaceLandmarks && res.multiFaceLandmarks[0]){
    sourceLandmarks=res.multiFaceLandmarks[0];
    render();
  }
}

targetFile.addEventListener('change', e=>{
  const file=e.target.files[0]; if(!file) return;
  const url=URL.createObjectURL(file);
  const isVideo=file.type.startsWith('video');
  avatarPreview.style.display='block';
  
  if(isVideo){
    targetType='video'; targetVideo.src=url; targetVideo.style.display='block'; targetImg.style.display='none';
    targetVideo.onloadeddata=()=>{
      targetImage=targetVideo;
      targetLoaded=true;
      resultCanvas.width=targetVideo.videoWidth; resultCanvas.height=targetVideo.videoHeight;
      rctx.drawImage(targetVideo,0,0,resultCanvas.width,resultCanvas.height);
      phChap.style.display='none';
      avatarSelected.style.display='flex';
      document.getElementById('selImg').src=url;
      document.getElementById('avSelImg').src=url;
      document.getElementById('avName').textContent=file.name;
      document.getElementById('avSelName').innerHTML=file.name.substring(0,10)+'<br><small>Actif</small>';
      chapLabel.textContent='Avatar vidéo prêt - Mange un garba';
      if(useAIMode) detectTarget(targetVideo);
    };
    targetVideo.play();
  } else {
    targetType='image'; targetImg.src=url; targetImg.style.display='block'; targetVideo.style.display='none';
    targetImg.onload=()=>{
      targetImage=targetImg;
      targetLoaded=true;
      resultCanvas.width=targetImg.naturalWidth; resultCanvas.height=targetImg.naturalHeight;
      rctx.drawImage(targetImg,0,0,resultCanvas.width,resultCanvas.height);
      phChap.style.display='none';
      avatarSelected.style.display='flex';
      document.getElementById('selImg').src=url;
      document.getElementById('avSelImg').src=url;
      document.getElementById('avName').textContent=file.name;
      document.getElementById('avSelName').innerHTML=file.name.substring(0,10)+'<br><small>Actif</small>';
      chapLabel.textContent='Avatar prêt - Prêt pour garba';
      if(useAIMode) detectTarget(targetImg);
    };
  }
});

async function detectTarget(img){
  try{
    const tm=new FaceMesh({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`});
    tm.setOptions({maxNumFaces:1, refineLandmarks:true});
    tm.onResults(res=>{ if(res.multiFaceLandmarks && res.multiFaceLandmarks[0]){ targetLandmarks=res.multiFaceLandmarks[0]; }});
    const c=document.createElement('canvas'); c.width=img.naturalWidth||img.videoWidth; c.height=img.naturalHeight||img.videoHeight;
    c.getContext('2d').drawImage(img,0,0);
    await tm.send({image:c});
  }catch(e){ console.log('target detect fail', e); }
}

async function startCamera(){
  if(!targetLoaded){ alert('Choisis d\'abord ton avatar qui mange un garba ! (photo ou vidéo)'); return; }
  try{
    if(stream) stream.getTracks().forEach(t=>t.stop());
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});
    video.srcObject=stream;
    await video.play();
    phReal.style.display='none';
    phChap.style.display='none';
    btnStart.style.display='none'; btnStop.style.display='block';
    isLive=true;
    fpsEl.textContent='🔴 LIVE • 30 FPS • Je mange un garba avec mon avatar';
    chapLabel.textContent='🔴 LIVE - Ton avatar fait tes gestes comme sur ta capture';
    
    if(useAIMode && typeof Camera !== 'undefined'){
      camera=new Camera(video, {
        onFrame: async()=>{ await faceMesh.send({image:video}); },
        width:640, height:480
      });
      camera.start();
    } else {
      // Simple loop without AI
      const simpleLoop=()=>{
        if(!isLive) return;
        render();
        requestAnimationFrame(simpleLoop);
      };
      simpleLoop();
    }
  }catch(e){
    alert('Caméra bloquée: '+e.message+'\nAutorise dans les réglages du navigateur');
  }
}

function stopCamera(){
  isLive=false;
  if(stream) stream.getTracks().forEach(t=>t.stop()); stream=null;
  if(camera) try{camera.stop();}catch(e){}
  phReal.style.display='flex';
  btnStart.style.display='block'; btnStop.style.display='none';
  fpsEl.textContent='Prêt';
}

function render(){
  if(!targetImage || !targetLoaded) return;
  try{
    if(targetType==='video' && targetVideo.videoWidth){
      if(resultCanvas.width!==targetVideo.videoWidth){ resultCanvas.width=targetVideo.videoWidth; resultCanvas.height=targetVideo.videoHeight; }
      rctx.drawImage(targetVideo,0,0,resultCanvas.width,resultCanvas.height);
    } else {
      if(resultCanvas.width!==targetImage.naturalWidth){ resultCanvas.width=targetImage.naturalWidth; resultCanvas.height=targetImage.naturalHeight; }
      rctx.drawImage(targetImage,0,0,resultCanvas.width,resultCanvas.height);
    }
    
    // Real face swap with landmarks or simple fallback
    let faceCX=resultCanvas.width*0.5, faceCY=resultCanvas.height*0.38, faceW=resultCanvas.width*0.35, faceH=faceW*1.35;
    let angle=0, scale=1;
    
    if(useAIMode && sourceLandmarks && targetLandmarks){
      const srcLeft=sourceLandmarks[33], srcRight=sourceLandmarks[263], srcNose=sourceLandmarks[1];
      const tgtLeft=targetLandmarks[33], tgtRight=targetLandmarks[263], tgtNose=targetLandmarks[1];
      faceCX=tgtNose.x*resultCanvas.width; faceCY=tgtNose.y*resultCanvas.height;
      const srcEyeDist=Math.hypot(srcRight.x-srcLeft.x, srcRight.y-srcLeft.y);
      const dstEyeDist=Math.hypot(tgtRight.x-tgtLeft.x, tgtRight.y-tgtLeft.y);
      scale=(dstEyeDist/srcEyeDist)*(resultCanvas.width/video.videoWidth)*1.1;
      const srcAngle=Math.atan2(srcRight.y-srcLeft.y, srcRight.x-srcLeft.x);
      const dstAngle=Math.atan2(tgtRight.y-tgtLeft.y, tgtRight.x-tgtLeft.x);
      angle=dstAngle-srcAngle;
      faceW=resultCanvas.width*0.4; faceH=faceW*1.4;
    }
    
    rctx.save();
    rctx.beginPath();
    rctx.ellipse(faceCX, faceCY, faceW*0.5, faceH*0.5, 0,0,Math.PI*2);
    rctx.clip();
    
    if(sourceLandmarks && targetLandmarks && useAIMode){
      const srcNose=sourceLandmarks[1];
      const srcCX=srcNose.x*video.videoWidth, srcCY=srcNose.y*video.videoHeight;
      rctx.translate(faceCX, faceCY);
      rctx.rotate(angle);
      rctx.scale(scale, scale);
      rctx.translate(-srcCX, -srcCY);
      rctx.drawImage(video,0,0,video.videoWidth,video.videoHeight);
    } else {
      // Simple mode: center crop of your video
      const vw=video.videoWidth, vh=video.videoHeight;
      const crop=Math.min(vw,vh)*0.7;
      const cx=(vw-crop)/2, cy=(vh-crop)/2*0.8;
      rctx.drawImage(video, cx,cy,crop,crop, faceCX-faceW/2, faceCY-faceH/2, faceW, faceH);
    }
    rctx.restore();
    
    // Blend
    rctx.globalCompositeOperation='soft-light'; rctx.globalAlpha=0.1;
    if(targetType==='image') rctx.drawImage(targetImage,0,0,resultCanvas.width,resultCanvas.height);
    else rctx.drawImage(targetVideo,0,0,resultCanvas.width,resultCanvas.height);
    rctx.globalCompositeOperation='source-over'; rctx.globalAlpha=1;
    
  }catch(e){ console.log(e); }
}

btnStart.addEventListener('click', startCamera);
btnStop.addEventListener('click', stopCamera);
document.getElementById('btnReal').addEventListener('click', startCamera);
document.getElementById('realBox').addEventListener('click', ()=>{ if(!isLive) startCamera(); });
