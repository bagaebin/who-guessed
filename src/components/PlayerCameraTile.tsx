import { Html, RoundedBox, Text } from '@react-three/drei';
import { MeshProps, useFrame } from '@react-three/fiber';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../state/gameStore';
import { TILE_COLOR_GUIDE } from '../utils/tileStyleGuide';

const TILE_SIZE = { width: 3.2, height: 4.4, depth: 0.16 };

type PlayerCameraTileProps = {
  position: MeshProps['position'];
  onFocusCameraTile?: () => void;
};

export default function PlayerCameraTile({ position, onFocusCameraTile }: PlayerCameraTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const textureRef = useRef<THREE.VideoTexture | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [videoAspect, setVideoAspect] = useState(1);
  const [cameraNote, setCameraNote] = useState('안녕하세요! 저는 단발머리에 캐주얼을 좋아해요.');
  const [isComposing, setIsComposing] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { submitPlayerText, isLoading } = useGameStore();

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
  const activeTileStyle = TILE_COLOR_GUIDE.active;

  const focusBubbleInput = () => {
    const input = inputRef.current;
    if (!input) return;
    input.focus({ preventScroll: true });
    const length = input.value.length;
    input.setSelectionRange(length, length);
  };

  useEffect(() => {
    const handleGlobalKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return;
      if (event.key.length === 1 || event.key === 'Enter' || event.key === 'Backspace' || event.key === ' ') {
        focusBubbleInput();
        onFocusCameraTile?.();
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [onFocusCameraTile]);

  const handleBubbleSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (isComposing) return;
    const text = cameraNote.trim();
    if (!text) return;
    await submitPlayerText(text);
  };

  return (
    <group position={position} rotation-x={-0.22}>
      <RoundedBox
        args={[TILE_SIZE.width, TILE_SIZE.height, TILE_SIZE.depth]}
        radius={activeTileStyle.borderRadius}
        smoothness={6}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={activeTileStyle.baseColor}
          metalness={0.22}
          roughness={0.42}
          emissive={activeTileStyle.accentColor}
          emissiveIntensity={0.06}
        />
      </RoundedBox>

      <RoundedBox
        position={[0, 0, TILE_SIZE.depth / 2 + 0.008]}
        args={[TILE_SIZE.width * 0.94, TILE_SIZE.height * 0.94, 0.04]}
        radius={activeTileStyle.borderRadius * 0.9}
        smoothness={6}
      >
        <meshStandardMaterial
          color={activeTileStyle.accentColor}
          metalness={0.3}
          roughness={0.36}
          emissive={activeTileStyle.accentColor}
          emissiveIntensity={0.35}
        />
      </RoundedBox>

      <mesh position={[0, 0, TILE_SIZE.depth / 2 + 0.022]} scale={[-1, 1, 1]}>
        <planeGeometry args={[TILE_SIZE.width * 0.86, TILE_SIZE.height * 0.86]} />
        {textureRef.current && !error && isVideoReady ? (
          <meshBasicMaterial
            map={textureRef.current}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        ) : (
          <meshStandardMaterial
            color="#0f1c30"
            roughness={0.74}
            metalness={0.12}
            side={THREE.DoubleSide}
          />
        )}
      </mesh>

      <mesh position={[0, TILE_SIZE.height / 2 + 0.12, 0]}>
        <boxGeometry args={[TILE_SIZE.width * 0.8, 0.08, 0.08]} />
        <meshStandardMaterial
          color={activeTileStyle.baseColor}
          emissive={activeTileStyle.accentColor}
          emissiveIntensity={0.9}
        />
      </mesh>

      <Text
        position={[0, TILE_SIZE.height / 2 + 0.28, 0]}
        color="#e9eef8"
        fontSize={0.32}
        outlineWidth={0.03}
        outlineColor="#0a121b"
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
        <form className="camera-bubble" onSubmit={handleBubbleSubmit}>
          <div className="camera-bubble__label">LLM에게 자기소개</div>
          <div className="camera-bubble__actions">
            <input
              ref={inputRef}
              type="text"
              value={cameraNote}
              onChange={(event) => setCameraNote(event.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  if ((event.nativeEvent as CompositionEvent).isComposing) return;
                  event.preventDefault();
                  handleBubbleSubmit();
                }
              }}
              placeholder="타일 아래 말풍선에서 LLM에게 자기소개를 보내보세요"
            />
            <button type="submit" disabled={isLoading || !cameraNote.trim()}>
              {isLoading ? '전송 중...' : '전송'}
            </button>
          </div>
          <div className="camera-bubble__hint">Enter 키로도 전송할 수 있어요.</div>
        </form>
      </Html>
    </group>
  );
}
