import { Html, RoundedBox, Text } from '@react-three/drei';
import { MeshProps, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { playerCameraTileColors } from '../theme/tileColors';

const TILE_SIZE = { width: 3.2, height: 4.4, depth: 0.16 };

export default function PlayerCameraTile({ position }: { position: MeshProps['position'] }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const textureRef = useRef<THREE.VideoTexture | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [videoAspect, setVideoAspect] = useState(1);
  const [cameraNote, setCameraNote] = useState('');

  const planeAspect = useMemo(() => TILE_SIZE.width / TILE_SIZE.height, []);

  useEffect(() => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    videoRef.current = video;
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

        video.srcObject = stream;
        video.onloadedmetadata = () => {
          if (textureRef.current) return;
          const aspect = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 1;
          setVideoAspect(aspect);
          setIsVideoReady(true);
          const texture = new THREE.VideoTexture(video);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.wrapS = THREE.ClampToEdgeWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.offset.set(0, 0);
          texture.repeat.set(1, 1);
          textureRef.current = texture;
        };

        await video.play();
      } catch (err) {
        setError('카메라 접근에 실패했습니다. 브라우저 권한을 확인해주세요.');
      }
    };

    startCamera();

    return () => {
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
    };
  }, []);

  useFrame(() => {
    if (textureRef.current && isVideoReady) {
      textureRef.current.needsUpdate = true;
      const isVideoWider = videoAspect > planeAspect;

      if (isVideoWider) {
        const repeatX = planeAspect / videoAspect;
        textureRef.current.repeat.set(repeatX, 1);
        textureRef.current.offset.set((1 - repeatX) / 2, 0);
      } else {
        const repeatY = videoAspect / planeAspect;
        textureRef.current.repeat.set(1, repeatY);
        textureRef.current.offset.set(0, (1 - repeatY) / 2);
      }
    }
  });

  const cameraLabel = error ? '카메라 접근 오류' : '실시간 내 모습';

  return (
    <group position={position} rotation-x={-0.22}>
      <RoundedBox
        args={[TILE_SIZE.width, TILE_SIZE.height, TILE_SIZE.depth]}
        radius={0.18}
        smoothness={8}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={playerCameraTileColors.frame}
          metalness={0.24}
          roughness={0.38}
        />
      </RoundedBox>

      <mesh position={[0, 0, TILE_SIZE.depth / 2 + 0.002]} scale={[-1, 1, 1]}>
        <planeGeometry args={[TILE_SIZE.width * 0.92, TILE_SIZE.height * 0.92]} />
        {textureRef.current && !error && isVideoReady ? (
          <meshBasicMaterial
            map={textureRef.current}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        ) : (
          <meshStandardMaterial
            color={playerCameraTileColors.fallback}
            roughness={0.74}
            metalness={0.12}
            side={THREE.DoubleSide}
          />
        )}
      </mesh>

      <RoundedBox
        args={[TILE_SIZE.width * 0.8, 0.08, 0.08]}
        radius={0.025}
        smoothness={4}
        position={[0, TILE_SIZE.height / 2 + 0.12, 0]}
      >
        <meshStandardMaterial
          color={playerCameraTileColors.accent}
          emissive="#112b4f"
          emissiveIntensity={0.85}
        />
      </RoundedBox>

      <Text
        position={[0, TILE_SIZE.height / 2 + 0.28, 0]}
        color={playerCameraTileColors.text}
        fontSize={0.32}
        outlineWidth={0.03}
        outlineColor={playerCameraTileColors.outline}
        anchorY="bottom"
      >
        {cameraLabel}
      </Text>

      {error && (
        <Text
          position={[0, -TILE_SIZE.height / 2 - 0.35, 0]}
          color="#ff9b9b"
          fontSize={0.24}
          maxWidth={TILE_SIZE.width * 0.9}
          textAlign="center"
          anchorY="top"
          outlineWidth={0.02}
          outlineColor="#0a0a0a"
        >
          {error}
        </Text>
      )}

      <Html
        position={[0, -TILE_SIZE.height / 2 - 0.6, TILE_SIZE.depth / 2]}
        distanceFactor={3.2}
        center
      >
        <div className="camera-bubble">
          <div className="camera-bubble__label">말풍선 메모</div>
          <input
            type="text"
            value={cameraNote}
            onChange={(event) => setCameraNote(event.target.value)}
            placeholder="타일 아래 말풍선에 적을 내용을 입력하세요"
          />
        </div>
      </Html>
    </group>
  );
}
