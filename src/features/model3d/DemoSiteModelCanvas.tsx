import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import { cn } from '@/shared/lib/utils'

export type DemoSiteKind = 'mall' | 'society'
/** 0 = baseline pads, 1 = mid rise, 2 = current massing */
export type DemoModelStage = 0 | 1 | 2

export const DEMO_MODEL_STAGES: { id: DemoModelStage; label: string }[] = [
  { id: 0, label: 'Baseline' },
  { id: 1, label: 'Mid build' },
  { id: 2, label: 'Current' },
]

function Ground({ tone }: { tone: 'warm' | 'green' }) {
  const color = tone === 'warm' ? '#c4a574' : '#86efac'
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[48, 36]} />
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  )
}

function Pad({
  position,
  size,
  color,
}: {
  position: [number, number, number]
  size: [number, number]
  color: string
}) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  )
}

function BoxBuilding({
  position,
  size,
  color,
  visible = true,
}: {
  position: [number, number, number]
  size: [number, number, number]
  color: string
  visible?: boolean
}) {
  if (!visible) return null
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.55} metalness={0.08} />
    </mesh>
  )
}

function Tower({
  position,
  floors,
  color,
  maxFloors,
}: {
  position: [number, number, number]
  floors: number
  color: string
  maxFloors: number
}) {
  const h = Math.max(0.4, floors * 1.15)
  const y = h / 2
  return (
    <group position={position}>
      <BoxBuilding position={[0, y, 0]} size={[4.2, h, 4.2]} color={color} />
      {floors > 0 &&
        Array.from({ length: Math.min(floors, maxFloors) }).map((_, i) => (
          <mesh key={i} position={[0, 0.55 + i * 1.15, 2.12]}>
            <boxGeometry args={[3.2, 0.18, 0.08]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
          </mesh>
        ))}
    </group>
  )
}

function MallMassing({ stage }: { stage: DemoModelStage }) {
  const showShell = stage >= 1
  const showCinema = stage >= 1
  const showAtrium = stage >= 1
  const showRoof = stage >= 2
  const cinemaH = stage >= 2 ? 7.5 : stage >= 1 ? 4.2 : 0
  const retailH = stage >= 2 ? 5.5 : stage >= 1 ? 3.2 : 0
  const atriumH = stage >= 2 ? 9 : stage >= 1 ? 5 : 0

  return (
    <group>
      <Ground tone="warm" />
      {/* ring road */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.4, 34]} />
        <meshStandardMaterial color="#4a5560" />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[44, 2.2]} />
        <meshStandardMaterial color="#4a5560" />
      </mesh>

      <Pad position={[-12, 0.03, -8]} size={[14, 10]} color="#e7e5e4" />
      <Pad position={[12, 0.03, -8]} size={[14, 10]} color="#e7e5e4" />
      <Pad position={[-12, 0.03, 8]} size={[12, 10]} color="#e7e5e4" />
      <Pad position={[6, 0.03, 8]} size={[18, 10]} color="#e7e5e4" />

      {/* A Hypermarket */}
      <BoxBuilding
        position={[-12, retailH / 2, -8]}
        size={[12, retailH || 0.2, 8]}
        color="#fdba74"
        visible={showShell}
      />
      {/* B Atrium / glass */}
      <BoxBuilding
        position={[12, atriumH / 2, -8]}
        size={[11, atriumH || 0.2, 8]}
        color="#38bdf8"
        visible={showAtrium}
      />
      {showAtrium && stage >= 2 && (
        <mesh position={[12, atriumH + 0.4, -8]}>
          <cylinderGeometry args={[2.2, 2.8, 0.6, 24]} />
          <meshStandardMaterial color="#0ea5e9" transparent opacity={0.55} />
        </mesh>
      )}
      {/* C Cinema — slightly tilted “redo” wall cue at stage 2 */}
      <BoxBuilding
        position={[-12, cinemaH / 2, 8]}
        size={[10, cinemaH || 0.2, 8]}
        color="#fecaca"
        visible={showCinema}
      />
      {stage >= 2 && (
        <mesh position={[-12, 4.2, 12.2]} rotation={[0, 0, -0.19]}>
          <boxGeometry args={[8, 5.5, 0.45]} />
          <meshStandardMaterial color="#7f1d1d" />
        </mesh>
      )}
      {/* D Parking podium */}
      <BoxBuilding
        position={[4, stage >= 1 ? 1.2 : 0.15, 8]}
        size={[10, stage >= 1 ? 2.4 : 0.3, 7]}
        color="#a8a29e"
        visible
      />
      {/* E Rooftop fun — barely started */}
      <BoxBuilding
        position={[14, stage >= 2 ? 1.4 : 0.2, 9]}
        size={[7, stage >= 2 ? 2.6 : 0.35, 7]}
        color="#fde68a"
        visible={showRoof || stage === 0}
      />
      {stage >= 2 && (
        <mesh position={[14, 3.4, 9]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.2, 0.18, 10, 28]} />
          <meshStandardMaterial color="#ea580c" />
        </mesh>
      )}
    </group>
  )
}

function SocietyMassing({ stage }: { stage: DemoModelStage }) {
  const floorsA = stage === 0 ? 0 : stage === 1 ? 4 : 6
  const floorsB = stage === 0 ? 0 : stage === 1 ? 1 : 2
  const clubH = stage >= 1 ? (stage >= 2 ? 3.2 : 2) : 0.25
  const evH = stage >= 2 ? 1.4 : 0.25

  return (
    <group>
      <Ground tone="green" />
      <mesh position={[0, 0.02, 14]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.35, 1]}>
        <circleGeometry args={[16, 48]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.35} />
      </mesh>

      <Pad position={[-9, 0.03, -2]} size={[12, 16]} color="#d1fae5" />
      <Pad position={[9, 0.03, -2]} size={[12, 16]} color="#fecaca" />
      <Pad position={[-6, 0.03, 12]} size={[14, 6]} color="#a7f3d0" />
      <Pad position={[10, 0.03, 12]} size={[10, 6]} color="#bbf7d0" />

      {floorsA > 0 ? (
        <Tower position={[-9, 0, -2]} floors={floorsA} maxFloors={14} color="#34d399" />
      ) : (
        <BoxBuilding position={[-9, 0.2, -2]} size={[5, 0.4, 5]} color="#6ee7b7" />
      )}

      {floorsB > 0 ? (
        <Tower position={[9, 0, -2]} floors={floorsB} maxFloors={14} color="#0ea5e9" />
      ) : (
        <group position={[9, 0, -2]}>
          <BoxBuilding position={[0, 0.2, 0]} size={[5, 0.4, 5]} color="#fca5a5" />
          {stage >= 1 && (
            <mesh position={[0, 0.05, 3.2]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[2.4, 24]} />
              <meshStandardMaterial color="#7f1d1d" transparent opacity={0.45} />
            </mesh>
          )}
        </group>
      )}

      <BoxBuilding
        position={[-6, clubH / 2, 12]}
        size={[12, clubH, 4.5]}
        color="#6ee7b7"
        visible
      />
      {stage >= 2 && (
        <mesh position={[-8, 0.35, 12]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.5, 1]}>
          <circleGeometry args={[2.8, 32]} />
          <meshStandardMaterial color="#f9a8d7" />
        </mesh>
      )}

      <BoxBuilding position={[10, evH / 2, 12]} size={[8, evH, 4.5]} color="#86efac" visible />
    </group>
  )
}

function SceneContent({ kind, stage }: { kind: DemoSiteKind; stage: DemoModelStage }) {
  return kind === 'mall' ? <MallMassing stage={stage} /> : <SocietyMassing stage={stage} />
}

type DemoSiteModelCanvasProps = {
  kind: DemoSiteKind
  stage?: DemoModelStage
  autoRotate?: boolean
  className?: string
}

/** Procedural demo massing for mall / society sites (no GLB). */
export function DemoSiteModelCanvas({
  kind,
  stage = 2,
  autoRotate = false,
  className,
}: DemoSiteModelCanvasProps) {
  const bg = useMemo(() => (kind === 'mall' ? '#f5e6d3' : '#e8faf0'), [kind])

  return (
    <div className={cn('absolute inset-0', className)} style={{ background: bg }}>
      <Canvas
        shadows
        camera={{ position: [28, 22, 28], fov: 42, near: 0.2, far: 200 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={[bg]} />
        <ambientLight intensity={0.55} />
        <hemisphereLight args={['#ffffff', '#94a3b8', 0.55]} />
        <directionalLight
          castShadow
          intensity={1.05}
          position={[20, 30, 12]}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <SceneContent kind={kind} stage={stage} />
        <ContactShadows position={[0, 0.01, 0]} opacity={0.35} scale={55} blur={2.4} far={20} />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.06}
          maxPolarAngle={Math.PI / 2.05}
          minDistance={12}
          maxDistance={70}
          autoRotate={autoRotate}
          autoRotateSpeed={0.55}
          target={[0, 2, 0]}
        />
      </Canvas>
      <div className="pointer-events-none absolute top-2 left-2 rounded-md bg-slate-900/70 px-2 py-1 text-[10px] font-bold text-white">
        Demo 3D · {kind === 'mall' ? 'Mall massing' : 'Society towers'}
      </div>
    </div>
  )
}
