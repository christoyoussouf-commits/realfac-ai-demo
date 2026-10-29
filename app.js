const $ = (id) => document.getElementById(id);

let stream = null;
let photoUrl = null;
let facingMode = "user";
let selectedStyle = "realistic";

const styleCopy = {
  realistic: "Style réaliste sélectionné. Filtre léger pour conserver un rendu naturel.",
  anime: "Style anime sélectionné. Couleurs et contraste renforcés : ce n’est pas encore une conversion IA en dessin animé.",
  avatar3d: "Style avatar 3D sélectionné. Filtre stylisé : un véritable avatar 3D nécessite un modèle dédié.",
  custom: "Style personnalisé sélectionné. Ajustez l’intensité et la teinte ci-dessous."
};

function setMessage(text) {
  $("callMessage").textContent = text;
}

function setCameraStatus(text, active = false) {
  $("cameraStatus").textContent = text;
  $("cameraStatus").classList.toggle("active", active);
  $("cameraStatus").innerHTML = `<i></i> ${text}`;
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    alert("La caméra nécessite un navigateur compatible et une adresse HTTPS (ou localhost).");
    return;
  }
  if (stream) stopCamera();
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    $("cameraVideo").srcObject = stream;
    $("cameraVideo").hidden = false;
    $("placeholder").hidden = true;
    $("photoPreview").hidden = true;
    setCameraStatus("Caméra active", true);
    $("startCamera").disabled = true;
    $("stopCamera").disabled = false;
    $("flipCamera").hidden = false;
  } catch (error) {
    setCameraStatus("Caméra inactive");
    alert("Impossible d’ouvrir la caméra. Vérifiez les autorisations du navigateur et réessayez. " + error.message);
  }
}

function stopCamera() {
  if (stream) stream.getTracks().forEach(track => track.stop());
  stream = null;
  $("cameraVideo").srcObject = null;
  $("cameraVideo").hidden = true;
  $("placeholder").hidden = false;
  setCameraStatus("Caméra inactive");
  $("startCamera").disabled = false;
  $("stopCamera").disabled = true;
}

$("startCamera").addEventListener("click", startCamera);
$("stopCamera").addEventListener("click", stopCamera);

$("flipCamera").addEventListener("click", async () => {
  facingMode = facingMode === "user" ? "environment" : "user";
  if (stream) await startCamera();
});

function chooseStyle(style) {
  selectedStyle = style;
  $("preview").classList.remove("effect-realistic", "effect-anime", "effect-avatar3d", "effect-custom");
  $("preview").classList.add(`effect-${style}`);
  document.querySelectorAll(".style-card").forEach(button => {
    const active = button.dataset.style === style;
    button.classList.toggle("selected", active);
    button.setAttribute("aria-pressed", String(active));
  });
  $("customControls").hidden = style !== "custom";
  $("styleMessage").textContent = styleCopy[style];
  applyCustomEffect();
}

document.querySelectorAll(".style-card").forEach(button => {
  button.addEventListener("click", () => chooseStyle(button.dataset.style));
});

function applyCustomEffect() {
  const intensity = Number($("intensity").value) / 100;
  const tone = Number($("tone").value);
  $("intensityValue").value = `${$("intensity").value}%`;
  $("intensityValue").textContent = `${$("intensity").value}%`;
  $("preview").style.setProperty("--custom-brightness", String(intensity));
  $("preview").style.setProperty("--custom-saturation", String(intensity));
  $("preview").style.setProperty("--custom-hue", `${tone}deg`);
}
$("intensity").addEventListener("input", applyCustomEffect);
$("tone").addEventListener("input", applyCustomEffect);

$("photoInput").addEventListener("change", event => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!$("photoConsent").checked) {
    alert("Cochez d’abord la confirmation des droits et du consentement.");
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
  $("photoPreview").hidden = false;
  $("cameraVideo").hidden = true;
  $("placeholder").hidden = true;
  $("photoArea").hidden = false;
  $("stopCamera").disabled = true;
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
    $("cameraVideo").srcObject = null;
  }
  $("startCamera").disabled = false;
  setCameraStatus("Photo affichée");
});

$("removePhoto").addEventListener("click", () => {
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = null;
  $("photoInput").value = "";
  $("photoPreview").removeAttribute("src");
  $("photoPreview").hidden = true;
  $("photoArea").hidden = true;
  $("placeholder").hidden = false;
  setCameraStatus("Caméra inactive");
});

$("joinCall").addEventListener("click", () => {
  const code = $("roomCode").value.trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,32}$/.test(code)) {
    setMessage("Entrez un code de 3 à 32 lettres, chiffres ou tirets.");
    $("roomCode").focus();
    return;
  }
  setMessage(`Salle ${code} préparée. La connexion entre utilisateurs n’est pas encore activée dans cette version.`);
});

$("year").textContent = new Date().getFullYear();
window.addEventListener("beforeunload", () => {
  if (stream) stream.getTracks().forEach(track => track.stop());
  if (photoUrl) URL.revokeObjectURL(photoUrl);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}
