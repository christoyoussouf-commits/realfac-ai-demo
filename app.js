
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
const mouthInfo=document.getElementById('mouthInfo');
const eyeInfo=document.getElementById('eyeInfo');
const smileInfo=document.getElementById('smileInfo');
const resultInfo=document.getElementById('resultInfo');

let stream=null, targetImageLoaded=false, isLive=false;
let faceMesh=null;
let targetLandmarks=null;
let sourceLandmarks=null;
let targetBase=null;

// Init MediaPipe Face Mesh
function initFaceMesh(){
  faceMesh = new FaceMesh({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
  }});
  faceMesh.setOptions({
    maxNumFaces:1,
    refineLandmarks:true,
    minDetectionConfidence:0.5,
    minTrackingConfidence:0.5
  });
  faceMesh.onResults(onResults);
  camStatus.textContent='IA chargée • Mets une photo';
  camStatus.className='status active';
}

let lastResults=null;
function onResults(results){
  lastResults=results;
  if(!isLive) return;
  
  octx.clearRect(0,0,overlay.width,overlay.height);
  
  if(results.multiFaceLandmarks && results.multiFaceLandmarks.length>0){
    const landmarks=results.multiFaceLandmarks[0];
    sourceLandmarks=landmarks;
    
    // Draw landmarks on source
    drawConnectors(octx, landmarks, FACEMESH_TESSELATION, {color:'#7c5cff20', lineWidth:0.5});
    drawConnectors(octx, landmarks, FACEMESH_LIPS, {color:'#ff5cc8', lineWidth:1.5});
    drawConnectors(octx, landmarks, FACEMESH_LEFT_EYE, {color:'#4ef2ff', lineWidth:1});
    drawConnectors(octx, landmarks, FACEMESH_RIGHT_EYE, {color:'#4ef2ff', lineWidth:1});
    
    // Calculate gestures
    const mouthOpen = calcMouthOpen(landmarks);
    const eyeBlink = calcEyeBlink(landmarks);
    const smile = calcSmile(landmarks);
    const headPose = calcHeadPose(landmarks);
    
    mouthInfo.textContent=`Bouche: ${mouthOpen>0.05?'OUVERTE':'fermée'} ${mouthOpen.toFixed(2)}`;
    eyeInfo.textContent=`Yeux: ${eyeBlink<0.2?'FERMÉS':'ouverts'}`;
    smileInfo.textContent=`Sourire: ${smile>0.5?'OUI':'non'}`;
    
    // Animate target photo
    if(targetImageLoaded && targetLandmarks){
      animateTarget(mouthOpen, eyeBlink, smile, headPose, landmarks);
    }
  }
}

function calcMouthOpen(lm){
  // distance between upper lip (13) and lower lip (14)
  const upper=lm[13], lower=lm[14];
  return Math.hypot(lower.x-upper.x, lower.y-upper.y);
}
function calcEyeBlink(lm){
  // left eye: 159 upper, 145 lower
  const leftUpper=lm[159], leftLower=lm[145];
  const rightUpper=lm[386], rightLower=lm[374];
  const left=Math.hypot(leftLower.x-leftUpper.x, leftLower.y-leftUpper.y);
  const right=Math.hypot(rightLower.x-rightUpper.x, rightLower.y-rightUpper.y);
  return (left+right)/2;
}
function calcSmile(lm){
  const leftMouth=lm[61], rightMouth=lm[291], upperLip=lm[0];
  const mouthWidth=Math.hypot(rightMouth.x-leftMouth.x, rightMouth.y-leftMouth.y);
  return mouthWidth; // wider = more smile
}
function calcHeadPose(lm){
  const nose=lm[1];
  const leftEye=lm[33], rightEye=lm[263];
  const centerX=(leftEye.x+rightEye.x)/2;
  return {yaw: nose.x-centerX, pitch: nose.y-0.5, roll: Math.atan2(rightEye.y-leftEye.y, rightEye.x-leftEye.x)};
}

function animateTarget(mouthOpen, eyeBlink, smile, headPose, srcLm){
  if(!targetBase) return;
  rctx.clearRect(0,0,resultCanvas.width,resultCanvas.height);
  rctx.save();
  
  const cx=resultCanvas.width/2, cy=resultCanvas.height/2;
  
  // Head movement - follow your head
  const offsetX=headPose.yaw*resultCanvas.width*1.8;
  const offsetY=headPose.pitch*resultCanvas.height*1.2;
  const rot=headPose.roll*0.8;
  const scale=1 + headPose.yaw*0.2;
  
  rctx.translate(cx+offsetX, cy+offsetY);
  rctx.rotate(rot);
  rctx.scale(scale, scale);
  rctx.translate(-cx, -cy);
  
  // Draw base target image
  rctx.drawImage(targetBase,0,0,resultCanvas.width,resultCanvas.height);
  
  // If we have target landmarks, warp mouth and eyes
  if(targetLandmarks){
    // MOUTH ANIMATION - open mouth on target when you open yours
    const tUpper=targetLandmarks[13], tLower=targetLandmarks[14];
    const tLeft=targetLandmarks[61], tRight=targetLandmarks[291];
    
    const mouthCX=(tLeft.x+tRight.x)/2*resultCanvas.width;
    const mouthCY=(tUpper.y+tLower.y)/2*resultCanvas.height;
    const mouthW=Math.abs(tRight.x-tLeft.x)*resultCanvas.width;
    const baseMouthH=Math.abs(tLower.y-tUpper.y)*resultCanvas.height;
    const newMouthH=baseMouthH + mouthOpen*resultCanvas.height*3;
    
    if(mouthOpen>0.04){
      // Draw open mouth effect on target
      rctx.fillStyle='#1a0a12';
      rctx.beginPath();
      rctx.ellipse(mouthCX, mouthCY, mouthW*0.45, newMouthH*0.7, 0,0,Math.PI*2);
      rctx.fill();
      
      // Teeth / tongue simulation
      if(mouthOpen>0.06){
        rctx.fillStyle='#f5e6d0';
        rctx.beginPath();
        rctx.ellipse(mouthCX, mouthCY-newMouthH*0.15, mouthW*0.3, newMouthH*0.18, 0,0,Math.PI*2);
        rctx.fill();
      }
      
      resultInfo.textContent=`BOUCHE OUVERTE détectée ! Photo ouvre la bouche`;
    } else {
      resultInfo.textContent=`Photo copie: tête ${headPose.yaw>0?'droite':'gauche'}, sourire ${smile>0.12?'OUI':''}`;
    }
    
    // EYE BLINK - close eyes on target when you close yours
    if(eyeBlink<0.015){
      const tLeftEye=targetLandmarks[33], tRightEye=targetLandmarks[263];
      rctx.fillStyle='#c8a882';
      // left eye closed
      rctx.fillRect(tLeftEye.x*resultCanvas.width-18, tLeftEye.y*resultCanvas.height-2, 36,4);
      rctx.fillRect(tRightEye.x*resultCanvas.width-18, tRightEye.y*resultCanvas.height-2, 36,4);
      resultInfo.textContent='YEUX FERMÉS - Photo cligne !';
    }
    
    // SMILE - widen mouth on target when you smile
    if(smile>0.12){
      // Draw smile highlight
      rctx.strokeStyle='rgba(255,100,150,0.3)';
      rctx.lineWidth=2;
      rctx.beginPath();
      rctx.arc(mouthCX, mouthCY+8, mouthW*0.5, 0.2, Math.PI-0.2);
      rctx.stroke();
    }
  }
  
  rctx.restore();
}

// Target photo handling
targetFile.addEventListener('change', async e=>{
  const file=e.target.files[0]; if(!file) return;
  const url=URL.createObjectURL(file);
  targetImg.src=url;
  targetPreview.style.display='block';
  targetStatus.textContent='Analyse du visage cible...';
  targetImg.onload=async ()=>{
    resultCanvas.width=targetImg.naturalWidth;
    resultCanvas.height=targetImg.naturalHeight;
    rctx.drawImage(targetImg,0,0,resultCanvas.width,resultCanvas.height);
    resultPlaceholder.style.display='none';
    
    // Detect landmarks on target photo
    const canvas=document.createElement('canvas');
    canvas.width=targetImg.naturalWidth; canvas.height=targetImg.naturalHeight;
    const ctx=canvas.getContext('2d');
    ctx.drawImage(targetImg,0,0);
    
    // Use faceMesh to detect target
    const tempMesh = new FaceMesh({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`});
    tempMesh.setOptions({maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.5});
    tempMesh.onResults((res)=>{
      if(res.multiFaceLandmarks && res.multiFaceLandmarks.length>0){
        targetLandmarks=res.multiFaceLandmarks[0];
        targetStatus.textContent=`✅ Visage trouvé ! ${targetLandmarks.length} points. Lance l'animation !`;
        targetBase=targetImg;
        targetImageLoaded=true;
        camStatus.textContent='Photo prête • Lance l\'animation';
      } else {
        targetStatus.textContent='⚠️ Pas de visage trouvé. Prends une photo de face, bien éclairée.';
        targetBase=targetImg;
        targetImageLoaded=true;
      }
      tempMesh.close();
    });
    await tempMesh.send({image: canvas});
  };
});

async function startCamera(){
  if(!targetImageLoaded){ alert('Choisis d\'abord une photo à animer !'); return; }
  try{
    if(stream) stream.getTracks().forEach(t=>t.stop());
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});
    video.srcObject=stream;
    await video.play();
    placeholder.style.display='none';
    overlay.width=video.videoWidth; overlay.height=video.videoHeight;
    camStatus.textContent='LIVE • Fais des gestes !';
    camStatus.className='status active';
    btnStop.style.display='inline-block'; btnFront.style.display='none';
    isLive=true;
    
    // Start camera loop for faceMesh
    const camera = new Camera(video, {
      onFrame: async () => {
        await faceMesh.send({image: video});
      },
      width: 640,
      height: 480
    });
    camera.start();
    
  }catch(e){ alert('Caméra: '+e.message); }
}

function stopCamera(){
  isLive=false;
  if(stream) stream.getTracks().forEach(t=>t.stop()); stream=null;
  video.style.display='none'; placeholder.style.display='block';
  camStatus.textContent='Arrêté'; btnStop.style.display='none'; btnFront.style.display='inline-block';
}

btnFront.addEventListener('click', startCamera);
btnStop.addEventListener('click', stopCamera);

initFaceMesh();
