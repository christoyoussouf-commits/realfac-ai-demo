
let model=null;
const video=document.getElementById('video');
const overlay=document.getElementById('overlay');
const octx=overlay.getContext('2d');
const resultCanvas=document.getElementById('resultCanvas');
const rctx=resultCanvas.getContext('2d');
const placeholder=document.getElementById('placeholder');
const resultPlaceholder=document.getElementById('resultPlaceholder');
const camStatus=document.getElementById('camStatus');
const btnFront=document.getElementById('btnFront');
const btnStop=document.getElementById('btnStop');
const targetFile=document.getElementById('targetFile');
const targetImg=document.getElementById('targetImg');
const targetPreview=document.getElementById('targetPreview');
const targetStatus=document.getElementById('targetStatus');
const sensitivity=document.getElementById('sensitivity');
const mirror=document.getElementById('mirror');

let stream=null;
let targetLandmarks=null;
let targetImage=null;
let animationId=null;
let isModelReady=false;

async function loadModel(){
  camStatus.textContent='Chargement IA visage (468 points)...';
  try{
    await tf.setBackend('webgl');
    await tf.ready();
    model = await faceLandmarksDetection.load(
      faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
      {maxFaces:1, shouldLoadIrisModel:true}
    );
    isModelReady=true;
    camStatus.textContent='IA prête • Importe une photo';
    camStatus.className='status active';
  }catch(e){
    camStatus.textContent='Erreur chargement IA: '+e.message;
  }
}

targetFile.addEventListener('change', async (e)=>{
  const file=e.target.files[0];
  if(!file) return;
  const url=URL.createObjectURL(file);
  targetImg.src=url;
  targetPreview.style.display='block';
  targetStatus.textContent='Analyse du visage cible...';
  resultPlaceholder.style.display='none';
  
  targetImg.onload=async ()=>{
    if(!isModelReady){ targetStatus.textContent='IA pas encore prête, attends...'; return; }
    try{
      const faces=await model.estimateFaces({input: targetImg});
      if(faces.length===0){ targetStatus.textContent='Aucun visage trouvé. Prends une photo de face, claire.'; return; }
      targetLandmarks=faces[0].scaledMesh;
      targetImage=targetImg;
      // Prepare result canvas
      resultCanvas.width=targetImg.naturalWidth;
      resultCanvas.height=targetImg.naturalHeight;
      targetStatus.textContent='Visage détecté ! '+targetLandmarks.length+' points. Active ta caméra maintenant.';
      camStatus.textContent='Photo prête • Active ta caméra pour animer';
      // Draw initial
      rctx.drawImage(targetImg,0,0,resultCanvas.width,resultCanvas.height);
    }catch(err){
      targetStatus.textContent='Erreur: '+err.message;
    }
  };
});

async function startCamera(){
  if(!isModelReady){ alert('IA en cours de chargement, attends 5s'); return; }
  if(!targetLandmarks){ alert('Importe d\'abord une photo cible à animer !'); return; }
  try{
    if(stream) stream.getTracks().forEach(t=>t.stop());
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});
    video.srcObject=stream;
    await video.play();
    placeholder.style.display='none';
    video.style.display='block';
    overlay.width=video.videoWidth; overlay.height=video.videoHeight;
    resultCanvas.width=targetImage.naturalWidth; resultCanvas.height=targetImage.naturalHeight;
    camStatus.textContent='LIVE • Bouge ta tête, souris, parle !';
    camStatus.className='status active';
    btnStop.style.display='inline-block';
    btnFront.style.display='none';
    loop();
  }catch(e){ alert('Caméra: '+e.message); }
}

function stopCamera(){
  if(stream) stream.getTracks().forEach(t=>t.stop()); stream=null;
  if(animationId) cancelAnimationFrame(animationId);
  video.style.display='none'; placeholder.style.display='block';
  camStatus.textContent='Caméra arrêtée'; btnStop.style.display='none'; btnFront.style.display='inline-block';
}

async function loop(){
  if(!video.srcObject || video.paused || !model || !targetLandmarks) { animationId=requestAnimationFrame(loop); return; }
  try{
    const faces=await model.estimateFaces({input: video, flipHorizontal: mirror.checked});
    octx.clearRect(0,0,overlay.width,overlay.height);
    rctx.clearRect(0,0,resultCanvas.width,resultCanvas.height);
    
    // Always draw target as base
    rctx.drawImage(targetImage,0,0,resultCanvas.width,resultCanvas.height);
    
    if(faces.length>0){
      const sourceMesh=faces[0].scaledMesh;
      const sourceBox=faces[0].boundingBox;
      
      // Draw debug landmarks on source
      octx.fillStyle='#7c5cff';
      for(let i=0;i<Math.min(sourceMesh.length, 100);i+=10){
        const [x,y]=sourceMesh[i];
        octx.beginPath(); octx.arc(x,y,1.5,0,Math.PI*2); octx.fill();
      }
      
      // Calculate head pose from source
      const noseTip=sourceMesh[1]; // nose tip
      const leftEye=sourceMesh[33], rightEye=sourceMesh[263];
      const mouthUpper=sourceMesh[13], mouthLower=sourceMesh[14];
      const mouthLeft=sourceMesh[61], mouthRight=sourceMesh[291];
      
      // Target landmarks reference points
      const tNose=targetLandmarks[1];
      const tLeftEye=targetLandmarks[33], tRightEye=targetLandmarks[263];
      const tMouthUpper=targetLandmarks[13], tMouthLower=targetLandmarks[14];
      
      // Calculate transformations
      const srcEyeDist=Math.hypot(rightEye[0]-leftEye[0], rightEye[1]-leftEye[1]);
      const tgtEyeDist=Math.hypot(tRightEye[0]-tLeftEye[0], tRightEye[1]-tLeftEye[1]);
      const scale=(tgtEyeDist/srcEyeDist)*parseFloat(sensitivity.value);
      
      const srcCenterX=(leftEye[0]+rightEye[0])/2;
      const srcCenterY=(leftEye[1]+rightEye[1])/2;
      const tgtCenterX=(tLeftEye[0]+tRightEye[0])/2;
      const tgtCenterY=(tLeftEye[1]+tRightEye[1])/2;
      
      const angle=Math.atan2(rightEye[1]-leftEye[1], rightEye[0]-leftEye[0]) - Math.atan2(tRightEye[1]-tLeftEye[1], tRightEye[0]-tLeftEye[0]);
      
      // Mouth open detection
      const srcMouthOpen=Math.hypot(mouthLower[0]-mouthUpper[0], mouthLower[1]-mouthUpper[1]);
      const tgtMouthOpen=Math.hypot(tMouthLower[0]-tMouthUpper[0], tMouthLower[1]-tMouthUpper[1]);
      const mouthRatio=srcMouthOpen / (tgtMouthOpen || 1);
      
      // Smile detection
      const mouthWidth=Math.hypot(mouthRight[0]-mouthLeft[0], mouthWidthY=mouthRight[1]-mouthLeft[1]);
      
      // Apply transformation to result canvas: warp target based on source head movement
      // Simple but effective: translate, rotate, scale based on head, plus mouth stretch
      const tx = (srcCenterX - video.videoWidth/2)*0.3;
      const ty = (srcCenterY - video.videoHeight/2)*0.3;
      
      rctx.save();
      rctx.translate(resultCanvas.width/2, resultCanvas.height/2);
      rctx.rotate(angle*0.5);
      rctx.translate(-resultCanvas.width/2 + tx, -resultCanvas.height/2 + ty);
      rctx.scale(scale, scale);
      rctx.translate(-tgtCenterX* (1/scale) + resultCanvas.width/2/scale - resultCanvas.width/2, -tgtCenterY* (1/scale) + resultCanvas.height/2/scale - resultCanvas.height/2);
      
      // Redraw target with head transform
      rctx.drawImage(targetImage,0,0,resultCanvas.width,resultCanvas.height);
      rctx.restore();
      
      // Mouth animation overlay - stretch mouth region if open
      if(mouthRatio>1.3){
        const mouthX=tMouthUpper[0], mouthY=tMouthUpper[1];
        const mouthW=Math.abs(targetLandmarks[61][0]-targetLandmarks[291][0]);
        const mouthH=Math.abs(tMouthLower[1]-tMouthUpper[1]) * mouthRatio;
        // Cut mouth region from original and stretch
        rctx.save();
        rctx.beginPath();
        rctx.ellipse(mouthX, mouthY+mouthH/2, mouthW*0.6, mouthH*0.6, 0,0,Math.PI*2);
        rctx.clip();
        // Darken inside mouth to simulate open mouth
        rctx.fillStyle='rgba(20,0,10,0.8)';
        rctx.fillRect(mouthX-mouthW/2, mouthY, mouthW, mouthH);
        rctx.restore();
      }
      
      // Blink detection - if eyes closed, close target eyes
      const leftEyeOpen=Math.hypot(sourceMesh[159][1]-sourceMesh[145][1]);
      const rightEyeOpen=Math.hypot(sourceMesh[386][1]-sourceMesh[374][1]);
      if(leftEyeOpen<3 || rightEyeOpen<3){
        rctx.fillStyle='#e0c0a0';
        rctx.beginPath();
        rctx.ellipse(tLeftEye[0], tLeftEye[1], 15, 3, 0,0,Math.PI*2); rctx.fill();
        rctx.beginPath();
        rctx.ellipse(tRightEye[0], tRightEye[1], 15, 3, 0,0,Math.PI*2); rctx.fill();
      }
    }
  }catch(err){ console.log(err); }
  animationId=requestAnimationFrame(loop);
}

btnFront.addEventListener('click', startCamera);
btnStop.addEventListener('click', stopCamera);

loadModel();
