
const video=document.getElementById('video');
const resultCanvas=document.getElementById('resultCanvas');
const rctx=resultCanvas.getContext('2d');
const placeholderReal=document.getElementById('placeholderReal');
const placeholderChap=document.getElementById('placeholderChap');
const statusEl=document.getElementById('status');
const btnStart=document.getElementById('btnStart');
const btnStop=document.getElementById('btnStop');
const targetFile=document.getElementById('targetFile');
const targetImg=document.getElementById('targetImg');
const targetPreview=document.getElementById('targetPreview');

let stream=null, isLive=false, targetImage=null, targetLoaded=false;
let animationId=null;

// Force display immediately - no blocking
document.addEventListener('DOMContentLoaded', ()=>{
  statusEl.textContent='✅ Interface affichée - Choisis une photo';
  placeholderReal.style.display='flex';
  placeholderChap.style.display='flex';
  resultCanvas.width=640; resultCanvas.height=800;
});

targetFile.addEventListener('change', e=>{
  const file=e.target.files[0]; if(!file) return;
  const url=URL.createObjectURL(file);
  targetImg.src=url;
  targetPreview.style.display='block';
  targetImg.onload=()=>{
    targetImage=targetImg;
    targetLoaded=true;
    resultCanvas.width=targetImg.naturalWidth;
    resultCanvas.height=targetImg.naturalHeight;
    rctx.drawImage(targetImg,0,0,resultCanvas.width,resultCanvas.height);
    placeholderChap.style.display='none';
    statusEl.textContent='✅ Photo cible chargée - Lance le swap';
    document.getElementById('targetInfo').textContent='✅ Prête - Lance le swap Mark';
  };
  targetImg.onerror=()=>{ alert('Erreur photo'); };
});

async function startCamera(){
  if(!targetLoaded){ alert('Choisis d\'abord une photo cible (ex: Mark) !'); return; }
  try{
    if(stream) stream.getTracks().forEach(t=>t.stop());
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});
    video.srcObject=stream;
    await video.play();
    placeholderReal.style.display='none';
    placeholderChap.style.display='none';
    statusEl.textContent='🔴 LIVE - Comme ta capture Mark';
    btnStart.style.display='none'; btnStop.style.display='block';
    isLive=true;
    loop();
  }catch(e){
    alert('Caméra bloquée: '+e.message+'\n\nSur iPhone: Réglages > Safari > Caméra > Autoriser\nSur Android: Autorise la caméra dans Chrome');
    statusEl.textContent='❌ Caméra bloquée - Autorise';
  }
}

function stopCamera(){
  isLive=false;
  if(stream) stream.getTracks().forEach(t=>t.stop()); stream=null;
  if(animationId) cancelAnimationFrame(animationId);
  placeholderReal.style.display='flex';
  btnStart.style.display='block'; btnStop.style.display='none';
  statusEl.textContent='Arrêté';
}

function loop(){
  if(!isLive) return;
  
  const zoom=parseFloat(document.getElementById('zoom').value)||1.1;
  const size=parseFloat(document.getElementById('size').value)||35;
  
  // Clear and draw target background
  rctx.clearRect(0,0,resultCanvas.width,resultCanvas.height);
  rctx.drawImage(targetImage,0,0,resultCanvas.width,resultCanvas.height);
  
  // Simple face swap - your face replaces target face at center
  // Face position: center of image, slightly upper (like Mark in your capture)
  const faceCX=resultCanvas.width*0.5;
  const faceCY=resultCanvas.height*0.38;
  const faceW=resultCanvas.width*(size/100);
  const faceH=faceW*1.35;
  
  // Save and clip to oval face shape
  rctx.save();
  rctx.beginPath();
  rctx.ellipse(faceCX, faceCY, faceW*0.5, faceH*0.5, 0,0,Math.PI*2);
  rctx.clip();
  
  // Draw your video scaled to face
  // Estimate face area from video - use center crop
  const vw=video.videoWidth, vh=video.videoHeight;
  const cropSize=Math.min(vw, vh)*0.7;
  const cropX=(vw-cropSize)/2, cropY=(vh-cropSize)/2*0.8;
  
  // Apply zoom and slight rotation based on time for live effect
  const breath=Math.sin(Date.now()/800)*2;
  
  rctx.translate(faceCX, faceCY+breath);
  rctx.scale(zoom, zoom);
  rctx.translate(-faceCX, -faceCY);
  
  // Draw your face
  rctx.drawImage(video, cropX, cropY, cropSize, cropSize, faceCX-faceW/2, faceCY-faceH/2, faceW, faceH);
  
  rctx.restore();
  
  // Blend edges for natural look
  rctx.globalCompositeOperation='soft-light';
  rctx.globalAlpha=0.12;
  rctx.drawImage(targetImage,0,0,resultCanvas.width,resultCanvas.height);
  rctx.globalCompositeOperation='source-over';
  rctx.globalAlpha=1;
  
  // Add subtle border
  rctx.strokeStyle='rgba(0,230,118,0.15)';
  rctx.lineWidth=2;
  rctx.beginPath();
  rctx.ellipse(faceCX, faceCY, faceW*0.5, faceH*0.5, 0,0,Math.PI*2);
  rctx.stroke();
  
  animationId=requestAnimationFrame(loop);
}

btnStart.addEventListener('click', startCamera);
btnStop.addEventListener('click', stopCamera);

// Also allow tap on real box to start
document.getElementById('realBox').addEventListener('click', ()=>{ if(!isLive) startCamera(); });
document.getElementById('chapBox').addEventListener('click', ()=>{ if(!isLive) startCamera(); });

// Force show after 1s even if JS slow
setTimeout(()=>{ 
  if(placeholderReal.style.display==='none' && !stream){
    placeholderReal.style.display='flex';
  }
  statusEl.textContent='✅ Prêt - Choisis photo Mark et lance';
}, 1500);
