
const video=document.getElementById('video');
const resultCanvas=document.getElementById('resultCanvas');
const rctx=resultCanvas.getContext('2d');
const miniCanvas=document.getElementById('miniCanvas');
const mctx=miniCanvas.getContext('2d');
const overlay=document.getElementById('overlay');
const resultPlaceholder=document.getElementById('resultPlaceholder');
const camStatus=document.getElementById('camStatus');
const btnFront=document.getElementById('btnFront');
const btnStop=document.getElementById('btnStop');
const targetFile=document.getElementById('targetFile');
const targetImg=document.getElementById('targetImg');
const targetPreview=document.getElementById('targetPreview');
const targetStatus=document.getElementById('targetStatus');
const zoomSlider=document.getElementById('zoom');
const featherSlider=document.getElementById('feather');

let stream=null, isLive=false;
let faceMesh=null, targetFaceMesh=null;
let targetLandmarks=null, targetImage=null, targetBox=null;
let sourceLandmarks=null;
let animationId=null;
let targetCanvas=null, targetCtx=null;

// Init FaceMesh
function initFaceMesh(){
  faceMesh = new FaceMesh({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`});
  faceMesh.setOptions({maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.5, minTrackingConfidence:0.5});
  faceMesh.onResults(onLiveResults);
  
  targetFaceMesh = new FaceMesh({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`});
  targetFaceMesh.setOptions({maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.5});
  
  camStatus.textContent='IA prête • Choisis qui tu veux devenir';
  camStatus.className='status active';
}

function getFaceBox(landmarks, width, height){
  let minX=1,minY=1,maxX=0,maxY=0;
  for(const p of landmarks){ if(p.x<minX)minX=p.x; if(p.y<minY)minY=p.y; if(p.x>maxX)maxX=p.x; if(p.y>maxY)maxY=p.y; }
  return {x:minX*width, y:minY*height, w:(maxX-minX)*width, h:(maxY-minY)*height, cx:(minX+maxX)/2*width, cy:(minY+maxY)/2*height};
}

function onLiveResults(results){
  if(!isLive || !targetLandmarks) return;
  if(results.multiFaceLandmarks && results.multiFaceLandmarks.length>0){
    sourceLandmarks=results.multiFaceLandmarks[0];
    renderSwap();
  }
}

function renderSwap(){
  if(!sourceLandmarks || !targetLandmarks || !targetImage) return;
  
  const zoom=parseFloat(zoomSlider.value);
  const feather=parseFloat(featherSlider.value);
  
  // Prepare canvases size
  if(resultCanvas.width!==targetImage.naturalWidth){ resultCanvas.width=targetImage.naturalWidth; resultCanvas.height=targetImage.naturalHeight; }
  if(miniCanvas.width!==video.videoWidth){ miniCanvas.width=video.videoWidth; miniCanvas.height=video.videoHeight; }
  
  // Draw mini preview (your camera)
  mctx.clearRect(0,0,miniCanvas.width,miniCanvas.height);
  mctx.drawImage(video,0,0,miniCanvas.width,miniCanvas.height);
  
  // Clear main
  rctx.clearRect(0,0,resultCanvas.width,resultCanvas.height);
  // Draw target background (costume, body)
  rctx.drawImage(targetImage,0,0,resultCanvas.width,resultCanvas.height);
  
  // Source face box
  const sLeftEye=sourceLandmarks[33], sRightEye=sourceLandmarks[263], sNose=sourceLandmarks[1];
  const sMouthLeft=sourceLandmarks[61], sMouthRight=sourceLandmarks[291];
  const sUpperLip=sourceLandmarks[13], sLowerLip=sourceLandmarks[14];
  
  // Target face box
  const tLeftEye=targetLandmarks[33], tRightEye=targetLandmarks[263], tNose=targetLandmarks[1];
  const tMouthLeft=targetLandmarks[61], tMouthRight=targetLandmarks[291];
  const tChin=targetLandmarks[152], tForehead=targetLandmarks[10];
  
  // Calculate affine transform from source to target
  // Use eyes and nose as reference triangle
  const srcTri=[
    {x:sLeftEye.x*video.videoWidth, y:sLeftEye.y*video.videoHeight},
    {x:sRightEye.x*video.videoWidth, y:sRightEye.y*video.videoHeight},
    {x:sNose.x*video.videoWidth, y:sNose.y*video.videoHeight}
  ];
  const dstTri=[
    {x:tLeftEye.x*resultCanvas.width, y:tLeftEye.y*resultCanvas.height},
    {x:tRightEye.x*resultCanvas.width, y:tRightEye.y*resultCanvas.height},
    {x:tNose.x*resultCanvas.width, y:tNose.y*resultCanvas.height}
  ];
  
  // Calculate scale and rotation
  const srcEyeDist=Math.hypot(srcTri[1].x-srcTri[0].x, srcTri[1].y-srcTri[0].y);
  const dstEyeDist=Math.hypot(dstTri[1].x-dstTri[0].x, dstTri[1].y-dstTri[0].y);
  const scale=(dstEyeDist/srcEyeDist)*zoom;
  const srcAngle=Math.atan2(srcTri[1].y-srcTri[0].y, srcTri[1].x-srcTri[0].x);
  const dstAngle=Math.atan2(dstTri[1].y-dstTri[0].y, dstTri[1].x-dstTri[0].x);
  const rotation=dstAngle-srcAngle;
  
  // Mouth open detection for extra realism
  const srcMouthOpen=Math.hypot(sLowerLip.y-sUpperLip.y, sLowerLip.x-sUpperLip.x);
  
  rctx.save();
  
  // Create oval clip for face (so your face blends into target)
  const faceCX=dstTri[2].x;
  const faceCY=dstTri[2].y + resultCanvas.height*0.02;
  const faceW=dstEyeDist*2.6;
  const faceH=dstEyeDist*3.2;
  
  // Feathered edge
  if(feather>0){
    const gradient=rctx.createRadialGradient(faceCX, faceCY, faceW*0.5, faceCX, faceCY, faceW*0.85);
    gradient.addColorStop(0, 'rgba(0,0,0,1)');
    gradient.addColorStop(0.6, 'rgba(0,0,0,1)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    rctx.fillStyle=gradient;
  }
  
  rctx.beginPath();
  rctx.ellipse(faceCX, faceCY, faceW*0.55, faceH*0.62, 0,0,Math.PI*2);
  rctx.clip();
  
  // Transform source video to target face position
  rctx.translate(faceCX, faceCY);
  rctx.rotate(rotation);
  rctx.scale(scale, scale);
  rctx.translate(-(srcTri[2].x), -(srcTri[2].y));
  
  // Draw your face warped onto target
  // Use video as source, centered on nose
  rctx.drawImage(video, 0,0, video.videoWidth, video.videoHeight, -srcTri[2].x+srcTri[2].x - video.videoWidth/2, -srcTri[2].y+srcTri[2].y - video.videoHeight/2, video.videoWidth, video.videoHeight);
  
  rctx.restore();
  
  // Blend edges with target skin tone for realism
  rctx.globalCompositeOperation='soft-light';
  rctx.globalAlpha=0.12;
  rctx.drawImage(targetImage,0,0,resultCanvas.width,resultCanvas.height);
  rctx.globalCompositeOperation='source-over';
  rctx.globalAlpha=1;
}

targetFile.addEventListener('change', e=>{
  const file=e.target.files[0]; if(!file) return;
  const url=URL.createObjectURL(file);
  targetImg.src=url;
  targetPreview.style.display='block';
  targetStatus.textContent='Analyse du visage à remplacer...';
  targetImg.onload=async ()=>{
    targetImage=targetImg;
    resultCanvas.width=targetImg.naturalWidth; resultCanvas.height=targetImg.naturalHeight;
    rctx.drawImage(targetImg,0,0,resultCanvas.width,resultCanvas.height);
    resultPlaceholder.style.display='none';
    
    // Detect target face landmarks
    const tempCanvas=document.createElement('canvas');
    tempCanvas.width=targetImg.naturalWidth; tempCanvas.height=targetImg.naturalHeight;
    const tctx=tempCanvas.getContext('2d');
    tctx.drawImage(targetImg,0,0);
    
    targetFaceMesh.onResults((res)=>{
      if(res.multiFaceLandmarks && res.multiFaceLandmarks.length>0){
        targetLandmarks=res.multiFaceLandmarks[0];
        targetStatus.textContent=`✅ Visage à remplacer trouvé ! Prêt à mettre ton visage à la place.`;
        camStatus.textContent='Photo prête • Clique sur DEVENIR LA PHOTO';
        camStatus.className='status active';
      } else {
        targetStatus.textContent='⚠️ Aucun visage trouvé. Prends une photo où le visage est bien visible de face.';
      }
    });
    await targetFaceMesh.send({image: tempCanvas});
  };
});

async function startCamera(){
  if(!targetLandmarks){ alert('Choisis d\'abord la photo que tu veux devenir !'); return; }
  try{
    if(stream) stream.getTracks().forEach(t=>t.stop());
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});
    video.srcObject=stream;
    await video.play();
    camStatus.textContent='LIVE • Tu es dans la photo ! Parle, bouge, souris !';
    camStatus.className='status active';
    btnStop.style.display='inline-block'; btnFront.style.display='none';
    isLive=true;
    
    const camera = new Camera(video, {
      onFrame: async () => { await faceMesh.send({image: video}); },
      width: 640,
      height: 480
    });
    camera.start();
  }catch(e){ alert('Caméra: '+e.message); }
}

function stopCamera(){
  isLive=false;
  if(stream) stream.getTracks().forEach(t=>t.stop()); stream=null;
  camStatus.textContent='Arrêté'; btnStop.style.display='none'; btnFront.style.display='inline-block';
}

btnFront.addEventListener('click', startCamera);
btnStop.addEventListener('click', stopCamera);

initFaceMesh();
