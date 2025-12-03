import { Text } from '@react-three/drei';
import { MeshProps, useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const TILE_SIZE = { width: 3.2, height: 4.4, depth: 0.16 };

export default function PlayerCameraTile({ position }: { position: MeshProps['position'] }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const textureRef = useRef<THREE.VideoTexture | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

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
        video.onloadeddata = () => {
          if (textureRef.current) return;
          setIsVideoReady(true);
          const texture = new THREE.VideoTexture(video);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.wrapS = THREE.ClampToEdgeWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
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
    }
  });

  const cameraLabel = error ? '카메라 접근 오류' : '실시간 내 모습';

  return (
    <group position={position} rotation-x={-0.22}>
      <mesh castShadow receiveShadow position={[0, 0, -TILE_SIZE.depth / 2]}>
        <boxGeometry args={[TILE_SIZE.width, TILE_SIZE.height, TILE_SIZE.depth]} />
        <meshStandardMaterial color="#1a3a54" metalness={0.28} roughness={0.42} />
      </mesh>

      <mesh position={[0, TILE_SIZE.height / 2 + 0.002, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[TILE_SIZE.width * 0.92, TILE_SIZE.height * 0.92]} />
        {textureRef.current && !error && isVideoReady ? (
          <meshBasicMaterial map={textureRef.current} toneMapped={false} />
        ) : (
          <meshStandardMaterial color="#0c121c" roughness={0.8} metalness={0.1} />
        )}
      </mesh>

      <mesh position={[0, TILE_SIZE.height / 2 + 0.12, 0]}>
        <boxGeometry args={[TILE_SIZE.width * 0.8, 0.08, 0.08]} />
        <meshStandardMaterial color="#7ad7f0" emissive="#173a4b" emissiveIntensity={0.65} />
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
    </group>
  );
}
