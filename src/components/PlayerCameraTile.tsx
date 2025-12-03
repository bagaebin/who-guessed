import { useEffect, useRef, useState } from 'react';

export default function PlayerCameraTile() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('카메라를 사용할 수 없습니다. 권한 설정을 확인해주세요.');
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        setError('카메라 접근에 실패했습니다. 브라우저 권한을 확인해주세요.');
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  return (
    <div className="camera-tile" aria-label="플레이어 카메라 타일">
      <div className="camera-frame">
        <video ref={videoRef} muted playsInline autoPlay />
        {error ? <div className="camera-error">{error}</div> : <div className="camera-label">실시간 내 모습</div>}
      </div>
    </div>
  );
}
