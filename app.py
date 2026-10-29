
import cv2
import insightface
from insightface.app import FaceAnalysis
# Real ChapCam.com clone
app = FaceAnalysis(name='buffalo_l')
app.prepare(ctx_id=0, det_size=(640,640))
swapper = insightface.model_zoo.get_model('models/inswapper_128.onnx', providers=['CUDAExecutionProvider','CPUExecutionProvider'])
cap = cv2.VideoCapture(0)
target = cv2.imread('mark.jpg')
while True:
    ret, frame = cap.read()
    if not ret: break
    faces = app.get(frame)
    target_faces = app.get(target)
    if faces and target_faces:
        result = swapper.get(target, target_faces[0], faces[0], paste_back=True)
        cv2.imshow('Noir vers Mark - Real IA comme ChapCam', result)
    if cv2.waitKey(1) & 0xFF == ord('q'): break
cap.release()
cv2.destroyAllWindows()
