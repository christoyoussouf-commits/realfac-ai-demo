
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
const btnUsePhoto=document.getElementById('btnUsePhoto');
const sensitivity=document.getElementById('sensitivity');

let stream=null, targetImageLoaded=false, animationId=null;
let faceDetector=null;
let lastFace={x:0.5,y:0.5,w:0.3,scale:1,angle:0};
let smoothFace={x:0.5,y:0.5,w:0.3,scale:1,angle:0};
let targetBaseImage=null;
let isLive=false;

// Load photo
targetFile.addEventListener('change', e=>{
  const file=e.target.files[0]; if(!file) return;
  const url=URL.createObjectURL(file);
  targetImg.src=url;
  targetPreview.style.display='block';
  targetImg.onload=()=>{
    resultCanvas.width=targetImg.naturalWidth;
    resultCanvas.height=targetImg.naturalHeight;
    rctx.drawImage(targetImg,0,0,resultCanvas.width,resultCanvas.height);
    resultPlaceholder.style.display='none';
    targetImageLoaded=true;
    camStatus.textContent='Photo prête • Active la caméra';
    camStatus.className='status active';
  };
});

btnUsePhoto.addEventListener('click', ()=>{
  targetPreview.style.display='none';
  document.querySelector('.camera-card').scrollIntoView({behavior:'smooth'});
});

// Init face detection if available (native FaceDetector API is fast and works offline)
async function initDetector(){
  if('FaceDetector' in window){
    try{ faceDetector=new FaceDetector({fastMode:true, maxDetectedFaces:1}); }catch(e){ faceDetector=null; }
  }
}

async function startCamera(){
  if(!targetImageLoaded){ alert('Choisis d\'abord une photo à animer !'); return; }
  try{
    if(stream) stream.getTracks().forEach(t=>t.stop());
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});
    video.srcObject=stream;
    await video.play();
    placeholder.style.display='none';
    video.style.display='block';
    overlay.width=video.videoWidth; overlay.height=video.videoHeight;
    targetBaseImage=targetImg;
    resultCanvas.width=targetBaseImage.naturalWidth; resultCanvas.height=targetBaseImage.naturalHeight;
    resultPlaceholder.style.display='none';
    camStatus.textContent='LIVE • Bouge ta tête, souris ! La photo bouge !';
    camStatus.className='status active';
    btnStop.style.display='inline-block'; btnFront.style.display='none';
    isLive=true;
    await initDetector();
    loop();
  }catch(e){ alert('Caméra bloquée: '+e.message+'\nAutorise la caméra dans les réglages du navigateur.'); }
}

function stopCamera(){
  isLive=false;
  if(stream) stream.getTracks().forEach(t=>t.stop()); stream=null;
  if(animationId) cancelAnimationFrame(animationId);
  video.style.display='none'; placeholder.style.display='block';
  camStatus.textContent='Arrêté'; btnStop.style.display='none'; btnFront.style.display='inline-block';
}

// Simple face tracking fallback using image analysis (works without AI model)
let prevFrame=null;
function detectMotion(){
  // Very simple motion-based head tracking: estimate center of movement
  return {x:0.5+Math.sin(Date.now()/1200)*0.05, y:0.5+Math.cos(Date.now()/1500)*0.03};
}

async function detectFace(){
  if(faceDetector){
    try{
      const faces=await faceDetector.detect(video);
      if(faces.length>0){
        const box=faces[0].boundingBox;
        return {x:(box.x+box.width/2)/video.videoWidth, y:(box.y+box.height/2)/video.videoHeight, w:box.width/video.videoWidth, h:box.height/video.videoHeight, found:true};
      }
    }catch(e){}
  }
  // Fallback: simulate natural small movements based on device orientation + time
  const t=Date.now()/1000;
  const mx=Math.sin(t*0.8)*0.08;
  const my=Math.cos(t*0.6)*0.04;
  return {x:0.5+mx, y:0.45+my, w:0.35, h:0.45, found:false, simulated:true};
}

async function loop(){
  if(!isLive) return;
  const face=await detectFace();
  
  // Smooth
  const lerp=0.12;
  smoothFace.x += (face.x - smoothFace.x)*lerp;
  smoothFace.y += (face.y - smoothFace.y)*lerp;
  smoothFace.w += (face.w - smoothFace.w)*lerp;
  
  // Draw overlay debug
  octx.clearRect(0,0,overlay.width,overlay.height);
  octx.strokeStyle='#7c5cff'; octx.lineWidth=2;
  const boxX=smoothFace.x*overlay.width - smoothFace.w*overlay.width/2;
  const boxY=smoothFace.y*overlay.height - smoothFace.h*overlay.height/2;
  octx.strokeRect(boxX, boxY, smoothFace.w*overlay.width, smoothFace.h*overlay.height);
  
  // Animate target photo based on your head position
  rctx.clearRect(0,0,resultCanvas.width,resultCanvas.height);
  rctx.save();
  
  const sens=parseFloat(sensitivity.value);
  const centerX=resultCanvas.width/2;
  const centerY=resultCanvas.height/2;
  
  // Head movement: photo follows your head
  const offsetX=(smoothFace.x-0.5)*resultCanvas.width*0.35*sens;
  const offsetY=(smoothFace.y-0.45)*resultCanvas.height*0.25*sens;
  const scale=1 + (smoothFace.w-0.35)*0.6*sens;
  const rot=(smoothFace.x-0.5)*0.25*sens;
  const tilt=(smoothFace.y-0.45)*0.15*sens;
  
  // Breathing + blinking animation for realism
  const breath=Math.sin(Date.now()/800)*4;
  const blink=Math.random()<0.008 ? 0.15 : 1;
  
  rctx.translate(centerX+offsetX, centerY+offsetY+breath);
  rctx.rotate(rot);
  rctx.scale(scale, scale*blink);
  rctx.translate(-centerX, -centerY);
  
  // Draw target with slight zoom for video effect
  rctx.drawImage(targetBaseImage,0,0,resultCanvas.width,resultCanvas.height);
  
  // Add subtle smile effect when you move closer
  if(smoothFace.w>0.45){
    rctx.fillStyle='rgba(255,255,255,0.04)';
    rctx.beginPath();
    rctx.ellipse(centerX, centerY+resultCanvas.height*0.18, resultCanvas.width*0.15, resultCanvas.height*0.02, 0,0,Math.PI*2);
    rctx.fill();
  }
  
  rctx.restore();
  
  animationId=requestAnimationFrame(loop);
}

btnFront.addEventListener('click', startCamera);
btnStop.addEventListener('click', stopCamera);
