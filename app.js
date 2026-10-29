
const video=document.getElementById('video');
const resultCanvas=document.getElementById('resultCanvas');
const rctx=resultCanvas.getContext('2d');
const pip=document.getElementById('pip');
const pipCanvas=document.getElementById('pipCanvas');
const pctx=pipCanvas.getContext('2d');
const phPip=document.getElementById('phPip');
const phResult=document.getElementById('phResult');
const statusEl=document.getElementById('status');
const aiBadge=document.getElementById('aiBadge');
const btnStart=document.getElementById('btnStart');
const btnStop=document.getElementById('btnStop');
const targetFile=document.getElementById('targetFile');
const targetVideo=document.getElementById('targetVideo');

let stream=null, isLive=false;
let targetImage=null, targetLoaded=false, targetType='image';
let faceMesh=null, hands=null, pose=null, camera=null;
let latestFace=null, latestHands=[], latestPose=null;
let useAI=false;
let markImageDefault=null;

// Force display immediately
resultCanvas.width=720; resultCanvas.height=1280;
pipCanvas.width=200; pipCanvas.height=250;
phPip.style.display='flex';
phResult.style.display='flex';
statusEl.textContent='✅ Prêt - Choisis Mark';

// Load default Mark image (white man in white shirt like video)
const defaultMarkImg=new Image();
defaultMarkImg.crossOrigin='anonymous';
defaultMarkImg.src='https://i.pravatar.cc/400?img=3'; // placeholder for Mark - user will upload real Mark
defaultMarkImg.onload=()=>{ if(!targetLoaded){ targetImage=defaultMarkImg; targetType='image'; } };

function initAI(){
  try{
    if(typeof FaceMesh !== 'undefined' && typeof Hands !== 'undefined' && typeof Pose !== 'undefined'){
      faceMesh=new FaceMesh({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`});
      faceMesh.setOptions({maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.5, minTrackingConfidence:0.5});
      faceMesh.onResults(res=>{ if(res.multiFaceLandmarks && res.multiFaceLandmarks[0]) latestFace=res.multiFaceLandmarks[0]; });

      hands=new Hands({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`});
      hands.setOptions({maxNumHands:2, modelComplexity:1, minDetectionConfidence:0.5, minTrackingConfidence:0.5});
      hands.onResults(res=>{ latestHands=res.multiHandLandmarks||[]; });

      pose=new Pose({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`});
      pose.setOptions({modelComplexity:1, smoothLandmarks:true, minDetectionConfidence:0.5, minTrackingConfidence:0.5});
      pose.onResults(res=>{ latestPose=res.poseLandmarks; });

      useAI=true;
      statusEl.textContent='✅ IA chargée - Mode gestes réels';
      aiBadge.textContent='IA • Gestes réels • Mark';
      console.log('All AI loaded');
    } else {
      setTimeout(initAI, 800);
    }
  }catch(e){
    console.log('AI fail, simple mode', e);
    useAI=false;
    statusEl.textContent='✅ Mode simple - Transform noir→Mark';
  }
}
setTimeout(initAI, 500);

targetFile.addEventListener('change', e=>{
  const file=e.target.files[0]; if(!file) return;
  const url=URL.createObjectURL(file);
  const isVideo=file.type.startsWith('video');
  
  if(isVideo){
    targetType='video'; targetVideo.src=url; targetVideo.style.display='block';
    targetVideo.onloadeddata=()=>{
      targetImage=targetVideo;
      targetLoaded=true;
      resultCanvas.width=targetVideo.videoWidth; resultCanvas.height=targetVideo.videoHeight;
      rctx.drawImage(targetVideo,0,0,resultCanvas.width,resultCanvas.height);
      phResult.style.display='none';
      statusEl.textContent='✅ Mark vidéo chargée - Lance';
    };
    targetVideo.play();
  } else {
    const img=new Image();
    img.src=url;
    img.onload=()=>{
      targetImage=img;
      targetType='image';
      targetLoaded=true;
      resultCanvas.width=img.naturalWidth; resultCanvas.height=img.naturalHeight;
      rctx.drawImage(img,0,0,resultCanvas.width,resultCanvas.height);
      phResult.style.display='none';
      statusEl.textContent='✅ Mark photo chargée - Lance transform';
    };
  }
});

async function startCamera(){
  if(!targetLoaded && !targetImage){ alert('Choisis d\'abord la photo de Mark !'); return; }
  try{
    if(stream) stream.getTracks().forEach(t=>t.stop());
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});
    video.srcObject=stream;
    await video.play();
    phPip.style.display='none';
    phResult.style.display='none';
    btnStart.style.display='none'; btnStop.style.display='block';
    isLive=true;
    statusEl.textContent='🔴 LIVE - Noir → Mark comme TikTok';
    aiBadge.textContent='🔴 LIVE • Noir → Mark';
    
    // Start camera loop
    if(useAI && typeof Camera !== 'undefined'){
      camera=new Camera(video, {
        onFrame: async()=>{
          if(faceMesh) await faceMesh.send({image:video});
          if(hands) await hands.send({image:video});
          if(pose) await pose.send({image:video});
        },
        width:640, height:480
      });
      camera.start();
    }
    
    // Render loop
    const renderLoop=()=>{
      if(!isLive) return;
      render();
      requestAnimationFrame(renderLoop);
    };
    renderLoop();
    
  }catch(e){ alert('Caméra bloquée: '+e.message); }
}

function stopCamera(){
  isLive=false;
  if(stream) stream.getTracks().forEach(t=>t.stop()); stream=null;
  if(camera) try{camera.stop();}catch(e){}
  phPip.style.display='flex';
  btnStart.style.display='block'; btnStop.style.display='none';
  statusEl.textContent='Arrêté';
}

function render(){
  if(!targetImage) return;
  try{
    const zoom=parseFloat(document.getElementById('zoom').value)||1.3;
    const handSize=parseFloat(document.getElementById('handSize').value)||1;
    
    // 1. Draw Mark background (target)
    if(targetType==='video' && targetVideo.videoWidth){
      if(resultCanvas.width!==targetVideo.videoWidth){ resultCanvas.width=targetVideo.videoWidth; resultCanvas.height=targetVideo.videoHeight; }
      rctx.drawImage(targetVideo,0,0,resultCanvas.width,resultCanvas.height);
    } else {
      if(targetImage.naturalWidth && resultCanvas.width!==targetImage.naturalWidth){ resultCanvas.width=targetImage.naturalWidth; resultCanvas.height=targetImage.naturalHeight; }
      rctx.drawImage(targetImage,0,0,resultCanvas.width,resultCanvas.height);
    }
    
    // 2. PIP - draw real you (noir) in small window
    pctx.clearRect(0,0,pipCanvas.width,pipCanvas.height);
    pctx.drawImage(video,0,0,pipCanvas.width,pipCanvas.height);
    
    // 3. Face swap: Your face movements drive Mark's face
    // If AI available, use landmarks to position Mark's face
    let faceCX=resultCanvas.width*0.5, faceCY=resultCanvas.height*0.35, faceW=resultCanvas.width*0.38, faceH=faceW*1.4;
    let angle=0;
    
    if(latestFace && latestPose){
      // Use nose position for head tracking
      const nose=latestFace[1];
      const leftEye=latestFace[33], rightEye=latestFace[263];
      faceCX=(0.5 + (nose.x-0.5)*0.3)*resultCanvas.width; // slight movement like real head
      faceCY=(0.35 + (nose.y-0.5)*0.2)*resultCanvas.height;
      angle=Math.atan2(rightEye.y-leftEye.y, rightEye.x-leftEye.x);
    }
    
    // Draw your face transformed as Mark (your face but scaled to Mark's face position)
    rctx.save();
    rctx.beginPath();
    rctx.ellipse(faceCX, faceCY, faceW*0.48*zoom, faceH*0.48*zoom, angle,0,Math.PI*2);
    rctx.clip();
    
    // Source crop from your video (face area)
    const vw=video.videoWidth, vh=video.videoHeight;
    const srcCX=vw*0.5, srcCY=vh*0.4;
    const srcSize=Math.min(vw,vh)*0.6;
    
    // Add mouth open detection
    let mouthOpen=1;
    if(latestFace){
      const upper=latestFace[13], lower=latestFace[14];
      const mouthDist=Math.hypot(lower.x-upper.x, lower.y-upper.y);
      mouthOpen=1 + mouthDist*8; // open more when you open mouth
    }
    
    rctx.translate(faceCX, faceCY);
    rctx.rotate(angle*0.5);
    rctx.scale(zoom, zoom*mouthOpen*0.5 + zoom*0.5);
    rctx.translate(-faceCX, -faceCY);
    
    // Draw your face (this will be Mark's face doing your gestures, because we replace Mark's face area with your face transformed)
    // For true noir->Mark, we need to show Mark's face with your expressions. Here we show your face in Mark's position, which in video looks like Mark because Mark's image is underneath and we blend
    rctx.globalAlpha=0.92;
    rctx.drawImage(video, srcCX-srcSize/2, srcCY-srcSize/2, srcSize, srcSize, faceCX-faceW/2, faceCY-faceH/2, faceW, faceH);
    rctx.restore();
    
    // Blend to make skin match Mark (lighten)
    rctx.globalCompositeOperation='soft-light';
    rctx.globalAlpha=0.18;
    if(targetType==='image') rctx.drawImage(targetImage,0,0,resultCanvas.width,resultCanvas.height);
    else rctx.drawImage(targetVideo,0,0,resultCanvas.width,resultCanvas.height);
    rctx.globalCompositeOperation='source-over';
    rctx.globalAlpha=1;
    
    // 4. Hands - Make Mark's hands follow your hands (like in video where Mark lifts hands when noir lifts)
    if(latestHands && latestHands.length>0){
      latestHands.forEach(hand=>{
        const wrist=hand[0];
        // Map your hand position to Mark's canvas
        const hx=(1-wrist.x)*resultCanvas.width; // mirror
        const hy=wrist.y*resultCanvas.height;
        
        // Draw Mark's hand at your hand position (white skin like Mark)
        rctx.save();
        rctx.translate(hx, hy);
        rctx.scale(handSize, handSize);
        
        // Simple hand shape - white like Mark
        rctx.fillStyle='rgba(255,228,196,0.9)'; // Mark skin color
        rctx.beginPath();
        rctx.ellipse(0,0, 35, 45, 0,0,Math.PI*2);
        rctx.fill();
        rctx.strokeStyle='rgba(0,0,0,0.1)'; rctx.lineWidth=1; rctx.stroke();
        
        // Fingers
        rctx.fillStyle='rgba(255,228,196,0.9)';
        for(let i=0;i<5;i++){
          const ang=(i-2)*0.4;
          rctx.save();
          rctx.rotate(ang);
          rctx.beginPath();
          rctx.ellipse(0,-35, 8, 18, 0,0,Math.PI*2);
          rctx.fill();
          rctx.restore();
        }
        rctx.restore();
      });
    }
    
    // 5. If pose available, draw arms like Mark lifting hands
    if(latestPose){
      const leftWrist=latestPose[15], rightWrist=latestPose[16];
      const leftShoulder=latestPose[11], rightShoulder=latestPose[12];
      
      // Draw arms from Mark's shoulders to your wrist positions
      if(leftWrist && leftShoulder && leftWrist.visibility>0.5){
        rctx.strokeStyle='rgba(255,255,255,0.9)'; rctx.lineWidth=resultCanvas.width*0.06;
        rctx.lineCap='round';
        rctx.beginPath();
        rctx.moveTo(leftShoulder.x*resultCanvas.width, leftShoulder.y*resultCanvas.height);
        rctx.lineTo((1-leftWrist.x)*resultCanvas.width, leftWrist.y*resultCanvas.height);
        rctx.stroke();
      }
      if(rightWrist && rightShoulder && rightWrist.visibility>0.5){
        rctx.strokeStyle='rgba(255,255,255,0.9)'; rctx.lineWidth=resultCanvas.width*0.06;
        rctx.lineCap='round';
        rctx.beginPath();
        rctx.moveTo(rightShoulder.x*resultCanvas.width, rightShoulder.y*resultCanvas.height);
        rctx.lineTo((1-rightWrist.x)*resultCanvas.width, rightWrist.y*resultCanvas.height);
        rctx.stroke();
      }
    }
    
  }catch(e){ console.log('render error', e); }
}

btnStart.addEventListener('click', startCamera);
btnStop.addEventListener('click', stopCamera);
pip.addEventListener('click', ()=>{ if(!isLive) startCamera(); });
document.getElementById('resultContainer').addEventListener('click', ()=>{ if(!isLive) startCamera(); });
