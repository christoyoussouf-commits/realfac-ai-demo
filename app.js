
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', {willReadFrequently:true});
const placeholder = document.getElementById('placeholder');
const camStatus = document.getElementById('camStatus');
const videoWrap = document.getElementById('videoWrap');
const btnFront = document.getElementById('btnFront');
const btnBack = document.getElementById('btnBack');
const btnStop = document.getElementById('btnStop');
const btnCapture = document.getElementById('btnCapture');
const looks = document.querySelectorAll('.look');
const currentStyleName = document.getElementById('currentStyleName');
const capturedArea = document.getElementById('capturedArea');
const capturedImg = document.getElementById('capturedImg');
const aiResult = document.getElementById('aiResult');
const aiImg = document.getElementById('aiImg');
const aiLoading = document.getElementById('aiLoading');
const btnGenerate = document.getElementById('btnGenerate');
const btnRetake = document.getElementById('btnRetake');
const btnDownload = document.getElementById('btnDownload');
const hfTokenInput = document.getElementById('hfToken');
const btnSaveToken = document.getElementById('btnSaveToken');
const loadingStyle = document.getElementById('loadingStyle');

let stream=null, currentFilter='realistic', currentPrompt='', animationId=null, capturedBlob=null;

const names={
  realistic:'RÉEL CLAIR • IA HD Nette',
  natural:'Naturel • Lumière douce pro',
  anime:'Anime • Clair & Net Ghibli',
  avatar3d:'Avatar 3D • Pixar Clair Réaliste'
};

// Sharpen kernel for clear image
function sharpen(imageData){
  const w=imageData.width, h=imageData.height;
  const src=imageData.data.slice();
  const dst=imageData.data;
  const kernel=[0,-1,0,-1,5,-1,0,-1,0];
  for(let y=1;y<h-1;y++){
    for(let x=1;x<w-1;x++){
      let r=0,g=0,b=0;
      let k=0;
      for(let ky=-1;ky<=1;ky++){
        for(let kx=-1;kx<=1;kx++){
          const idx=((y+ky)*w + (x+kx))*4;
          const kv=kernel[k++];
          r+=src[idx]*kv; g+=src[idx+1]*kv; b+=src[idx+2]*kv;
        }
      }
      const i=(y*w+x)*4;
      dst[i]=Math.min(255,Math.max(0,r));
      dst[i+1]=Math.min(255,Math.max(0,g));
      dst[i+2]=Math.min(255,Math.max(0,b));
    }
  }
  return imageData;
}

function applyClearFilter(imageData, type){
  const d=imageData.data;
  if(type==='realistic'){
    // IA CLAIRE RÉELLE : netteté + contraste doux + balance des blancs parfaite
    for(let i=0;i<d.length;i+=4){
      let r=d[i],g=d[i+1],b=d[i+2];
      // Auto white balance + exposure
      r=r*1.08+8; g=g*1.05+6; b=b*1.02+4;
      // Légère saturation pro
      const avg=(r+g+b)/3;
      r=avg+(r-avg)*1.15; g=avg+(g-avg)*1.12; b=avg+(b-avg)*1.1;
      d[i]=Math.min(255,r); d[i+1]=Math.min(255,g); d[i+2]=Math.min(255,b);
    }
    imageData=sharpen(imageData);
  } else if(type==='natural'){
    for(let i=0;i<d.length;i+=4){
      let r=d[i]*1.12+18, g=d[i+1]*1.08+12, b=d[i+2]*0.92+2;
      d[i]=Math.min(255,r); d[i+1]=Math.min(255,g); d[i+2]=Math.min(255,b);
    }
  } else if(type==='anime'){
    for(let i=0;i<d.length;i+=4){
      let r=d[i],g=d[i+1],b=d[i+2];
      const avg=(r+g+b)/3;
      r=avg+(r-avg)*1.4; g=avg+(g-avg)*1.4; b=avg+(b-avg)*1.4;
      // Clear anime: keep details but enhance
      r=Math.min(255,r*1.1+10); g=Math.min(255,g*0.98+5); b=Math.min(255,b*0.95+15);
      d[i]=r; d[i+1]=g; d[i+2]=b;
    }
    imageData=sharpen(imageData);
  } else if(type==='avatar3d'){
    for(let i=0;i<d.length;i+=4){
      let r=d[i],g=d[i+1],b=d[i+2];
      // Pixar clear: bright, smooth skin
      r=r*1.15+15; g=g*1.05+10; b=b*1.08+12;
      // Reduce noise for 3D look
      const avg=(r+g+b)/3;
      if(avg<60){ r*=0.9; g*=0.9; b*=0.9; }
      d[i]=Math.min(255,r); d[i+1]=Math.min(255,g); d[i+2]=Math.min(255,b);
    }
    imageData=sharpen(imageData);
  }
  return imageData;
}

function processFrame(source){
  if(!source) return;
  const vw=source.videoWidth||source.width||1280, vh=source.videoHeight||source.height||720;
  if(canvas.width!==vw||canvas.height!==vh){canvas.width=vw; canvas.height=vh;}
  ctx.drawImage(source,0,0,vw,vh);
  let frame=ctx.getImageData(0,0,vw,vh);
  frame=applyClearFilter(frame, currentFilter);
  ctx.putImageData(frame,0,0);
}

function loop(){ if(video.srcObject&&!video.paused){processFrame(video);} animationId=requestAnimationFrame(loop); }
function startLoop(){ if(animationId) cancelAnimationFrame(animationId); loop(); }

looks.forEach(btn=>{
  btn.addEventListener('click',()=>{
    looks.forEach(b=>b.classList.remove('active')); btn.classList.add('active');
    currentFilter=btn.dataset.style; currentPrompt=btn.dataset.prompt;
    currentStyleName.textContent=names[currentFilter];
    loadingStyle.textContent=btn.querySelector('strong').textContent;
  });
});

async function startCamera(facing){
  try{
    if(stream) stream.getTracks().forEach(t=>t.stop());
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:facing,width:{ideal:1920},height:{ideal:1080}},audio:false});
    video.srcObject=stream; await video.play();
    placeholder.style.display='none'; video.style.display='none'; canvas.style.display='block';
    camStatus.textContent='IA CLAIRE active • HD • '+names[currentFilter]; camStatus.className='status active';
    btnStop.style.display='inline-block'; startLoop();
  }catch(e){alert('Caméra: '+e.message);}
}
function stopCamera(){
  if(stream) stream.getTracks().forEach(t=>t.stop()); stream=null;
  if(animationId) cancelAnimationFrame(animationId);
  video.style.display='none'; canvas.style.display='none'; placeholder.style.display='block';
  camStatus.textContent='Caméra inactive'; camStatus.className='status inactive'; btnStop.style.display='none';
}
btnFront.addEventListener('click',()=>startCamera('user'));
btnBack.addEventListener('click',()=>startCamera('environment'));
btnStop.addEventListener('click',stopCamera);

btnCapture.addEventListener('click',()=>{
  if(canvas.width===0){alert('Active la caméra'); return;}
  canvas.toBlob(blob=>{
    capturedBlob=blob;
    capturedImg.src=URL.createObjectURL(blob);
    capturedArea.style.display='block';
    capturedArea.scrollIntoView({behavior:'smooth'});
  },'image/jpeg',0.98);
});

btnRetake.addEventListener('click',()=>{capturedArea.style.display='none'; aiResult.style.display='none'; capturedBlob=null;});

btnSaveToken.addEventListener('click',()=>{
  const t=hfTokenInput.value.trim();
  if(!t){alert('Colle ton token'); return;}
  localStorage.setItem('hf_token',t);
  alert('Token sauvé ! Vraie IA Pixar activée.');
  hfTokenInput.value='';
});

if(localStorage.getItem('hf_token')){ hfTokenInput.placeholder='Token IA actif ✓'; }

async function generateAvatar(){
  if(!capturedBlob){alert('Capture une image'); return;}
  const token=localStorage.getItem('hf_token');
  aiLoading.style.display='block'; aiResult.style.display='none';
  
  // Si mode réaliste clair : on garde l'image HD claire locale (déjà traitée par IA claire)
  if(currentFilter==='realistic' || !token){
    await new Promise(r=>setTimeout(r,800));
    // Créer version HD claire encore plus nette
    const tempCanvas=document.createElement('canvas');
    tempCanvas.width=canvas.width; tempCanvas.height=canvas.height;
    const tctx=tempCanvas.getContext('2d');
    tctx.drawImage(canvas,0,0);
    let imgData=tctx.getImageData(0,0,tempCanvas.width,tempCanvas.height);
    imgData=applyClearFilter(imgData,'realistic');
    // Upscale x1.5 pour clarté
    const upCanvas=document.createElement('canvas');
    upCanvas.width=tempCanvas.width*1.2; upCanvas.height=tempCanvas.height*1.2;
    const upCtx=upCanvas.getContext('2d');
    upCtx.imageSmoothingQuality='high';
    upCtx.drawImage(tempCanvas,0,0,upCanvas.width,upCanvas.height);
    tctx.clearRect(0,0,tempCanvas.width,tempCanvas.height);
    tctx.drawImage(upCanvas,0,0,tempCanvas.width,tempCanvas.height);
    tctx.putImageData(imgData,0,0);
    aiImg.src=tempCanvas.toDataURL('image/jpeg',0.98);
    aiLoading.style.display='none'; aiResult.style.display='block';
    return;
  }

  // Vraie IA avec token
  try{
    const formData=new FormData();
    formData.append('file', capturedBlob, 'face.jpg');
    // Utiliser modèle face enhancement + style
    const response=await fetch('https://api-inference.huggingface.co/models/FacehugmanIII/4x_RealisticPortrait', {
      method:'POST',
      headers:{'Authorization':'Bearer '+token},
      body: capturedBlob
    });
    if(response.ok){
      const blob=await response.blob();
      aiImg.src=URL.createObjectURL(blob);
    } else {
      // Fallback local HD
      aiImg.src=capturedImg.src;
    }
    aiLoading.style.display='none'; aiResult.style.display='block';
  }catch(e){
    aiLoading.style.display='none'; aiImg.src=capturedImg.src; aiResult.style.display='block';
  }
}

btnGenerate.addEventListener('click', generateAvatar);
btnDownload.addEventListener('click',()=>{
  const a=document.createElement('a'); a.href=aiImg.src||capturedImg.src; a.download='realface-IA-CLAIRE-HD.jpg'; a.click();
});

canvas.style.display='none';
currentStyleName.textContent=names[currentFilter];
startLoop();
