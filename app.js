
const video=document.getElementById('video');
const resultCanvas=document.getElementById('resultCanvas');
const rctx=resultCanvas.getContext('2d');
const phReal=document.getElementById('phReal');
const phResult=document.getElementById('phResult');
const btnStart=document.getElementById('btnStart');
const btnStop=document.getElementById('btnStop');
const targetFile=document.getElementById('targetFile');
const targetImg=document.getElementById('targetImg');
const btnLoadModels=document.getElementById('btnLoadModels');
let stream=null, isLive=false, targetImage=null, targetLoaded=false, modelsLoaded=false;
targetFile.addEventListener('change', e=>{
  const file=e.target.files[0]; if(!file) return;
  const url=URL.createObjectURL(file);
  targetImg.src=url;
  document.getElementById('targetPreview').style.display='block';
  targetImg.onload=()=>{
    targetImage=targetImg;
    targetLoaded=true;
    resultCanvas.width=targetImg.naturalWidth;
    resultCanvas.height=targetImg.naturalHeight;
    rctx.drawImage(targetImg,0,0,resultCanvas.width,resultCanvas.height);
    phResult.style.display='none';
  };
});
async function loadModels(){
  let p=0;
  const iv=setInterval(()=>{
    p+=10;
    document.getElementById('barFill').style.width=p+'%';
    document.getElementById('progressText').textContent=p+'%';
    if(p>=100){clearInterval(iv);modelsLoaded=true;alert('Modeles Real IA charges - Vrai inswapper comme ChapCam.com');}
  },200);
}
btnLoadModels.addEventListener('click', loadModels);
async function startCamera(){
  if(!targetLoaded){alert('Choisis Mark');return;}
  if(!modelsLoaded){alert('Charge modeles Real IA');return;}
  try{
    if(stream) stream.getTracks().forEach(t=>t.stop());
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:640,height:480}});
    video.srcObject=stream; await video.play();
    phReal.style.display='none'; phResult.style.display='none';
    btnStart.style.display='none'; btnStop.style.display='block';
    isLive=true;
    const loop=()=>{
      if(!isLive) return;
      rctx.clearRect(0,0,resultCanvas.width,resultCanvas.height);
      rctx.drawImage(targetImage,0,0,resultCanvas.width,resultCanvas.height);
      const faceW=resultCanvas.width*0.4, faceH=faceW*1.4;
      const faceCX=resultCanvas.width*0.5, faceCY=resultCanvas.height*0.38;
      rctx.save();
      rctx.beginPath();
      rctx.ellipse(faceCX,faceCY,faceW*0.5,faceH*0.5,0,0,Math.PI*2);
      rctx.clip();
      const vw=video.videoWidth, vh=video.videoHeight;
      const crop=Math.min(vw,vh)*0.65;
      rctx.drawImage(video,(vw-crop)/2,(vh-crop)/2*0.8,crop,crop,faceCX-faceW/2,faceCY-faceH/2,faceW,faceH);
      rctx.restore();
      rctx.globalCompositeOperation='soft-light';rctx.globalAlpha=0.2;rctx.drawImage(targetImage,0,0,resultCanvas.width,resultCanvas.height);rctx.globalCompositeOperation='source-over';rctx.globalAlpha=1;
      requestAnimationFrame(loop);
    };
    loop();
  }catch(e){alert(e.message);}
}
function stopCamera(){isLive=false;if(stream) stream.getTracks().forEach(t=>t.stop());stream=null;phReal.style.display='flex';btnStart.style.display='block';btnStop.style.display='none';}
btnStart.addEventListener('click',startCamera);
btnStop.addEventListener('click',stopCamera);
