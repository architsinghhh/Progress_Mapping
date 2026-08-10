import { useGLTF } from '@react-three/drei'
import { driveModelUrlForStage } from '@/features/model3d/modelSource'

export { SITE_GLB_URL, SITE_GLB_USES_DRIVE, SITE_GLB_SOURCE_LABEL } from '@/features/model3d/modelSource'
export { driveModelUrlForStage, fetchModelIndex } from '@/features/model3d/modelSource'

type SiteGlbModelProps = {
  modelStageId?: string
}

/** Lightweight R3F primitive — prefer SiteModelCanvas / FinalModelViewer for UI. */
export function SiteGlbModel({ modelStageId = 'final' }: SiteGlbModelProps) {
  const url = driveModelUrlForStage(modelStageId)
  const { scene } = useGLTF(url)
  return <primitive object={scene} dispose={null} />
}
