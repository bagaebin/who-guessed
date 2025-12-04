import { Html, RoundedBox, Text } from '@react-three/drei';
import { MeshProps, useFrame, useThree } from '@react-three/fiber';
import {
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import * as THREE from 'three';
import { useGameStore } from '../state/gameStore';
import { TILE_COLOR_GUIDE } from '../utils/tileStyleGuide';

type PlayerCameraTileProps = {
  position: MeshProps['position'];
};

const TILE_SIZE = { width: 3.2, height: 4.4, depth: 0.16 };

export default function PlayerCameraTile({ position }: PlayerCameraTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const textureRef = useRef<THREE.VideoTexture | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [videoAspect, setVideoAspect] = useState(1);
  const { size } = useThree();
  const { playerText, setPlayerText, submitPlayerText, isLoading } = useGameStore();

  const planeAspect = useMemo(() => TILE_SIZE.width / TILE_SIZE.height, []);
  const tileStyle = useMemo(() => TILE_COLOR_GUIDE.active, []);

  useEffect(() => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    videoRef.current = video;
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera is unavailable. Please check your permissions.');
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
        setError('Failed to access your camera. Please check browser permissions.');
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

  const handleBubbleSubmit = useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      const trimmed = playerText.trim();
      if (!trimmed) return;
      await submitPlayerText(trimmed);
    },
    [playerText, submitPlayerText]
  );

  const handleInputKeyDown = useCallback(
    async (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
        event.preventDefault();
        await handleBubbleSubmit();
      }
    },
    [handleBubbleSubmit]
  );

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditable = target
        ? target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
        : false;

      if (isEditable) return;

      if (
        event.key.length === 1 &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.isComposing
      ) {
        inputRef.current?.focus();
        setPlayerText((prev) => `${prev}${event.key}`);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [focusCamera, setPlayerText]);

  const bubbleDistanceFactor = useMemo(() => {
    const baseDistanceFactor = 3.8;
    const widthScale = size.width / 1280;
    const clampedScale = THREE.MathUtils.clamp(widthScale, 1.05, 1.55);
    return baseDistanceFactor * clampedScale;
  }, [size.width]);

  return (
    <group position={position} rotation-x={-0.22}>
      <RoundedBox
        args={[TILE_SIZE.width, TILE_SIZE.height, TILE_SIZE.depth]}
        radius={tileStyle.borderRadius}
        smoothness={8}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={tileStyle.baseColor} metalness={0.2} roughness={0.6} />
      </RoundedBox>

      <mesh position={[0, 0, TILE_SIZE.depth / 2 + 0.002]} scale={[-1, 1, 1]}>
        <planeGeometry args={[TILE_SIZE.width * 0.85, TILE_SIZE.height * 0.92]} />
        {textureRef.current && !error && isVideoReady ? (
          <meshBasicMaterial
            map={textureRef.current}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        ) : (
          <meshStandardMaterial
            color={tileStyle.accentColor}
            roughness={0.68}
            metalness={0.16}
            side={THREE.DoubleSide}
          />
        )}
      </mesh>

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
        distanceFactor={bubbleDistanceFactor}
        transform
        center
      >
        <form className="camera-bubble" onSubmit={handleBubbleSubmit}>
          <div className="camera-bubble__input-row">
            <input
              ref={inputRef}
              type="text"
              value={playerText}
              onChange={(event) => setPlayerText(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Type your bubble text"
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </Html>
    </group>
  );
}
