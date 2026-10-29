const $ = (id) => document.getElementById(id);
let stream = null;
let photoUrl = null;

function message(text) {
  $("callMessage").textContent = text;
}

$("startCamera").addEventListener("click", async () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    $("cameraStatus").textContent = "Indisponible";
    return alert("La caméra nécessite un navigateur compatible et une adresse HTTPS (ou localhost).");
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    $("cameraVideo").srcObject = stream;
    $("cameraVideo").style.display = "block";
    $("placeholder").style.display = "none";
    $("cameraStatus").textContent = "Caméra active";
    $("startCamera").disabled = true;
    $("stopCamera").disabled = false;
  } catch (error) {
    alert("Impossible d’ouvrir la caméra. Vérifiez les autorisations du navigateur : " + error.message);
  }
});

function stopCamera() {
  if (stream) stream.getTracks().forEach(track => track.stop());
  stream = null;
  $("cameraVideo").srcObject = null;
  $("cameraVideo").style.display = "none";
  $("placeholder").style.display = "flex";
  $("cameraStatus").textContent = "Caméra inactive";
  $("startCamera").disabled = false;
  $("stopCamera").disabled = true;
}
$("stopCamera").addEventListener("click", stopCamera);

$("photoInput").addEventListener("change", (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (!$("photoConsent").checked) {
    alert("Cochez d’abord la confirmation de droits et de consentement.");
    event.target.value = "";
    return;
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) {
    alert("Choisissez une image JPG, PNG ou WebP de moins de 8 Mo.");
    event.target.value = "";
    return;
  }
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = URL.createObjectURL(file);
  $("photoPreview").src = photoUrl;
  $("photoArea").hidden = false;
});
$("removePhoto").addEventListener("click", () => {
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = null;
  $("photoInput").value = "";
  $("photoArea").hidden = true;
  $("photoPreview").removeAttribute("src");
});
$("joinCall").addEventListener("click", () => {
  const code = $("roomCode").value.trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,32}$/.test(code)) {
    message("Entrez un code de 3 à 32 lettres, chiffres ou tirets.");
    return;
  }
  message("Code préparé : " + code + ". Les appels en direct ne sont pas encore connectés.");
});
window.addEventListener("beforeunload", () => {
  stopCamera();
  if (photoUrl) URL.revokeObjectURL(photoUrl);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}
