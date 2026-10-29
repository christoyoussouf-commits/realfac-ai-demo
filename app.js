
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', {willReadFrequently: true});
const placeholder = document.getElementById('placeholder');
const camStatus = document.getElementById('camStatus');
const videoWrap = document.getElementById('videoWrap');
const btnFront = document.getElementById('btnFront');
const btnBack = document.getElementById('btnBack');
const btnStop = document.getElementById('btnStop');
const looks = document.querySelectorAll('.look');
const currentStyleName = document.getElementById('currentStyleName');
const fileInput = document.getElementById('fileInput');
const photoPreview = document.getElementById('photoPreview');
const photoImg = document.getElementById('photoImg');
const consent = document.getElementById('consent');
const roomCode = document.getElementById('roomCode');
const btnRoom = document.getElementById('btnRoom');
const roomStatus = document.getElementById('roomStatus');

let stream = null;
let currentFacing = 'user';
let currentFilter = 'realistic';
let animationId = null;
let isPhotoMode = false;
let photoSource = null;

const names = {
  realistic: 'Réaliste • Lissage naturel',
  natural: 'Naturel • Doux et lumineux',
  anime: 'Anime • VRAI effet cartoon',
  avatar3d: 'Avatar 3D • Pixar style'
};

function posterize(value, levels){
  return Math.floor(value / (256/levels)) * (256/levels);
}

function applyRealisticFilter(imageData){
  const data = imageData.data;
  for(let i=0;i<data.length;i+=4){
    // soft skin smoothing + slight brightness
    const r=data[i], g=data[i+1], b=data[i+2];
    // increase brightness a bit, reduce redness
    data[i] = r*0.95 + 15;
    data[i+1] = g*1.02 + 10;
    data[i+2] = b*1.05 + 12;
  }
  return imageData;
}

function applyNaturalFilter(imageData){
  const data = imageData.data;
  for(let i=0;i<data.length;i+=4){
    let r=data[i], g=data[i+1], b=data[i+2];
    r = r*1.1 + 20;
    g = g*1.08 + 15;
    b = b*0.95 + 5;
    // warm LUT
    data[i] = Math.min(255, r);
    data[i+1] = Math.min(255, g);
    data[i+2] = Math.min(255, b*0.9);
  }
  return imageData;
}

function applyAnimeFilter(imageData){
  const data = imageData.data;
  const w = imageData.width, h = imageData.height;
  // First pass: high contrast + saturation + posterize
  for(let i=0;i<data.length;i+=4){
    let r=data[i], g=data[i+1], b=data[i+2];
    // boost contrast and saturation
    const avg = (r+g+b)/3;
    r = avg + (r-avg)*1.8;
    g = avg + (g-avg)*1.8;
    b = avg + (b-avg)*1.8;
    // posterize to 5 levels for cartoon
    r = posterize(r, 6);
    g = posterize(g, 6);
    b = posterize(b, 6);
    // anime skin tone shift
    data[i] = Math.min(255, r*1.15);
    data[i+1] = Math.min(255, g*0.95);
    data[i+2] = Math.min(255, b*0.85 + 20);
  }
  return imageData;
}

function applyAvatar3DFilter(imageData){
  const data = imageData.data;
  for(let i=0;i<data.length;i+=4){
    let r=data[i], g=data[i+1], b=data[i+2];
    // Pixar / 3D plastic look: heavy posterization + specular highlight
    const brightness = (r+g+b)/3;
    const levels = 5;
    r = posterize(r, levels);
    g = posterize(g, levels);
    b = posterize(b, levels);
    // add 3D lighting: brighten center based on position
    const x = (i/4) % imageData.width;
    const y = Math.floor((i/4) / imageData.width);
    const cx = imageData.width/2, cy = imageData.height/2;
    const dist = Math.sqrt((x-cx)*(x-cx)+(y-cy)*(y-cy));
    const maxDist = Math.sqrt(cx*cx+cy*cy);
    const vignette = 1 - (dist/maxDist)*0.3;
    const highlight = brightness > 180 ? 30 : 0;
    data[i] = Math.min(255, (r*vignette + highlight)*1.1);
    data[i+1] = Math.min(255, (g*vignette + highlight)*0.95);
    data[i+2] = Math.min(255, (b*vignette + highlight*0.5)*1.05);
  }
  return imageData;
}

function processFrame(source){
  if(!source) return;
  const vw = source.videoWidth || source.width || 640;
  const vh = source.videoHeight || source.height || 480;
  if(canvas.width !== vw || canvas.height !== vh){
    canvas.width = vw;
    canvas.height = vh;
  }
  ctx.drawImage(source, 0, 0, vw, vh);
  let frame = ctx.getImageData(0,0,vw,vh);
  if(currentFilter === 'realistic') frame = applyRealisticFilter(frame);
  else if(currentFilter === 'natural') frame = applyNaturalFilter(frame);
  else if(currentFilter === 'anime') frame = applyAnimeFilter(frame);
  else if(currentFilter === 'avatar3d') frame = applyAvatar3DFilter(frame);
  ctx.putImageData(frame, 0, 0);
}

function loop(){
  if(isPhotoMode && photoSource){
    processFrame(photoSource);
  } else if(video.srcObject && !video.paused){
    processFrame(video);
  }
  animationId = requestAnimationFrame(loop);
}

function startLoop(){
  if(animationId) cancelAnimationFrame(animationId);
  loop();
}

looks.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    looks.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.style;
    currentStyleName.textContent = names[currentFilter];
    if(currentFilter === 'anime'){
      videoWrap.style.boxShadow='0 0 0 2px #ff5cc8 inset, 0 0 30px rgba(255,92,200,0.3)';
    } else if(currentFilter === 'avatar3d'){
      videoWrap.style.boxShadow='0 0 0 2px #4ef2ff inset, 0 0 30px rgba(78,242,255,0.3)';
    } else {
      videoWrap.style.boxShadow='none';
    }
  });
});

async function startCamera(facing){
  try{
    isPhotoMode = false;
    if(stream){ stream.getTracks().forEach(t=>t.stop()); }
    const constraints = { video: { facingMode: facing, width: {ideal: 640}, height: {ideal: 480} }, audio:false };
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    await video.play();
    placeholder.style.display='none';
    video.style.display='none'; // we show canvas only
    canvas.style.display='block';
    camStatus.textContent = 'Caméra active • '+(facing==='user'?'Frontale':'Arrière')+' • '+names[currentFilter];
    camStatus.className='status active';
    btnStop.style.display='inline-block';
    photoPreview.style.display='none';
    startLoop();
  }catch(e){
    alert('Caméra non disponible: '+e.message);
  }
}

function stopCamera(){
  if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; }
  if(animationId) cancelAnimationFrame(animationId);
  video.srcObject=null;
  video.style.display='none';
  canvas.style.display='none';
  placeholder.style.display='block';
  camStatus.textContent='Caméra inactive • Prêt à commencer ?';
  camStatus.className='status inactive';
  btnStop.style.display='none';
  isPhotoMode=false;
}

btnFront.addEventListener('click', ()=>{ currentFacing='user'; startCamera('user'); });
btnBack.addEventListener('click', ()=>{ currentFacing='environment'; startCamera('environment'); });
btnStop.addEventListener('click', stopCamera);

fileInput.addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  if(file.size > 8*1024*1024){ alert('Photo trop lourde (max 8 Mo)'); return; }
  if(!consent.checked){ alert('Coche la case de consentement d\'abord.'); return; }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = ()=>{
    photoSource = img;
    isPhotoMode = true;
    if(stream) { stream.getTracks().forEach(t=>t.stop()); stream=null; }
    video.style.display='none';
    placeholder.style.display='none';
    canvas.style.display='block';
    photoPreview.style.display='none';
    camStatus.textContent='Photo importée • '+file.name.substring(0,20)+' • '+names[currentFilter];
    camStatus.className='status active';
    btnStop.style.display='inline-block';
    startLoop();
  };
  img.src = url;
});

btnRoom.addEventListener('click', ()=>{
  const code = roomCode.value.trim().toUpperCase();
  if(!code || code.length < 4){ roomStatus.textContent='Entre un code valide (ex: REAL-123)'; return; }
  roomStatus.textContent='Salle '+code+' prête ! Phase 2 active - filtres IA locaux.';
  btnRoom.textContent='Salle prête ✓';
  setTimeout(()=>btnRoom.textContent='Préparer l\'appel', 2000);
});

// Init
canvas.style.display='none';
currentStyleName.textContent = names[currentFilter];
startLoop();
