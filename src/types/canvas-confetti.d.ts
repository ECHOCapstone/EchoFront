// canvas-confetti 는 타입을 동봉하지 않고 @types 도 설치돼 있지 않아, 사용하는 범위만 최소 선언한다.
declare module 'canvas-confetti' {
  type Options = {
    particleCount?: number;
    angle?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    drift?: number;
    ticks?: number;
    origin?: { x?: number; y?: number };
    colors?: string[];
    shapes?: string[];
    scalar?: number;
    zIndex?: number;
    disableForReducedMotion?: boolean;
  };

  type ConfettiFn = (options?: Options) => Promise<null> | null;

  const confetti: ConfettiFn & {
    reset: () => void;
  };

  export default confetti;
}
