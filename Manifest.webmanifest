const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
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

const filters = {
  realistic: 'contrast(1.05) saturate(1.05)',
  natural: 'contrast(0.95) saturate(1.15) brightness(1.08) sepia(0.08)',
  anime: 'contrast(1.3) saturate(1.8) hue-rotate(-8deg) brightness(1.1)',
  avatar3d: 'contrast(1.2) saturate(0.3) brightness(1.15) blur(0.3px)'
};

const names = {
  realistic: 'Effet visuel léger',
  natural: 'Naturel et doux',
  anime: 'Anime - Couleurs intenses',
  avatar3d: 'Avatar 3D - Stylisé'
};

function applyStyle(){
  const f = filters[currentFilter] || filters.realistic;
  video.style.filter = f;
  photoImg.style.filter = f;
  if(currentFilter === 'anime'){
    videoWrap.style.boxShadow = '0 0 0 2px #ff5cc8 inset';
  } else if(currentFilter === 'avatar3d'){
    videoWrap.style.boxShadow = '0 0 0 2px #4ef2ff inset';
  } else {
    videoWrap.style.boxShadow = 'none';
  }
}

looks.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    looks.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.style;
    currentStyleName.textContent = names[currentFilter];
    applyStyle();
  });
});

async function startCamera(facing){
  try{
    if(stream){ stream.getTracks().forEach(t=>t.stop()); }
    const constraints = { video: { facingMode: facing, width: {ideal: 1280}, height: {ideal: 720} }, audio:false };
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    await video.play();
    placeholder.style.display='none';
    video.style.display='block';
    camStatus.textContent = 'Caméra active • '+ (facing==='user' ? 'Frontale' : 'Arrière');
    camStatus.className='status active';
    btnStop.style.display='inline-block';
    resizeCanvas();
    applyStyle();
  }catch(e){
    alert('Caméra non disponible: '+e.message+'\nEssaie avec une photo.');
    camStatus.textContent='Caméra inactive';
    camStatus.className='status inactive';
  }
}

function stopCamera(){
  if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; }
  video.srcObject=null;
  video.style.display='none';
  placeholder.style.display='block';
  camStatus.textContent='Caméra inactive • Prêt à commencer ?';
  camStatus.className='status inactive';
  btnStop.style.display='none';
}

function resizeCanvas(){
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
}

btnFront.addEventListener('click', ()=>{ currentFacing='user'; startCamera('user'); });
btnBack.addEventListener('click', ()=>{ currentFacing='environment'; startCamera('environment'); });
btnStop.addEventListener('click', stopCamera);

fileInput.addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  if(file.size > 8*1024*1024){ alert('Photo trop lourde (max 8 Mo)'); return; }
  if(!consent.checked){ alert('Coche la case de consentement d\'abord.'); consent.focus(); return; }
  const url = URL.createObjectURL(file);
  photoImg.src = url;
  photoPreview.style.display='block';
  placeholder.style.display='none';
  video.style.display='none';
  if(stream) stopCamera();
  // show photo in video area as background
  photoImg.onload = ()=>{ applyStyle(); };
  camStatus.textContent='Photo importée • '+file.name.substring(0,18);
  camStatus.className='status active';
});

btnRoom.addEventListener('click', ()=>{
  const code = roomCode.value.trim().toUpperCase();
  if(!code || code.length < 4){ roomStatus.textContent='Entre un code valide (ex: REAL-123)'; return; }
  if(!/^[A-Z0-9-]{4,12}$/.test(code)){ roomStatus.textContent='Code invalide: lettres, chiffres et tirets seulement.'; return; }
  roomStatus.textContent='Salle '+code+' prête (simulation locale). Aucune connexion distante pour l\'instant.';
  btnRoom.textContent='Salle prête ✓';
  setTimeout(()=>btnRoom.textContent='Préparer l\'appel', 2000);
});

window.addEventListener('resize', resizeCanvas);
applyStyle();

// PWA manifest placeholder check
if('serviceWorker' in navigator){ /* optional */ }
