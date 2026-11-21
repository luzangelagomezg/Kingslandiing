import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

type Stage = { id: string; name: string; title: string }

type World3DProps = {
  stages: Stage[]
  selectedStage: number
  onSelectStage: (index: number) => void
  onUnavailable: () => void
  detailOpen: boolean
  fullscreen: boolean
  fullscreenError: string
  onToggleFullscreen: () => void
}

const locations = [
  [-15, -10], [-5, -12], [5, -9], [15, -12],
  [15, 8], [5, 12], [-5, 8], [-15, 12],
] as const

function makeLabel(text: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (!context) throw new Error('No se pudo crear el indicador de etapa.')
  context.fillStyle = '#e5c986'
  context.beginPath()
  context.arc(64, 64, 52, 0, Math.PI * 2)
  context.fill()
  context.strokeStyle = '#463629'
  context.lineWidth = 6
  context.stroke()
  context.fillStyle = '#30261e'
  context.font = 'bold 52px sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, 64, 68)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }))
  sprite.scale.set(2.2, 2.2, 1)
  return sprite
}

export default function World3D({ stages, selectedStage, onSelectStage, onUnavailable, detailOpen, fullscreen, fullscreenError, onToggleFullscreen }: World3DProps) {
  const canvasHost = useRef<HTMLDivElement>(null)
  const playerRef = useRef<THREE.Group | null>(null)
  const selectedRef = useRef(selectedStage)
  const lastArrival = useRef(selectedStage)
  const selectRef = useRef(onSelectStage)
  const firstPersonRef = useRef(false)
  const detailOpenRef = useRef(detailOpen)
  const yawRef = useRef(-Math.PI / 2)
  const pitchRef = useRef(0)
  const [firstPerson, setFirstPerson] = useState(false)
  const [pointerLocked, setPointerLocked] = useState(false)
  const [pointerError, setPointerError] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    detailOpenRef.current = detailOpen
    if (detailOpen && document.pointerLockElement === canvasHost.current) document.exitPointerLock()
  }, [detailOpen])

  useEffect(() => {
    selectRef.current = onSelectStage
  }, [onSelectStage])

  useEffect(() => {
    selectedRef.current = selectedStage
    if (playerRef.current && lastArrival.current !== selectedStage) {
      const [x, z] = locations[selectedStage]
      playerRef.current.position.set(x, 0, z + 2.2)
      lastArrival.current = selectedStage
    }
  }, [selectedStage])

  useEffect(() => {
    const host = canvasHost.current
    if (!host || error) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' })
    } catch (reason) {
      console.error('No se pudo iniciar el mundo 3D:', reason)
      const failureFrame = requestAnimationFrame(() => {
        setError('No se pudo iniciar el mundo 3D. Comprueba que WebGL esté habilitado o vuelve al mapa clásico.')
      })
      return () => cancelAnimationFrame(failureFrame)
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#687b79')
    scene.fog = new THREE.Fog('#687b79', 55, 110)
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 150)
    camera.position.set(0, 38, 42)
    camera.lookAt(0, 0, 0)
    scene.add(new THREE.HemisphereLight('#f8ebd1', '#34493e', 2.3))
    const sun = new THREE.DirectionalLight('#fff0d3', 2)
    sun.position.set(-16, 30, 12)
    scene.add(sun)

    const material = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.9 })
    const groundMaterial = material('#586a4c')
    const waterMaterial = material('#365962')
    const stoneMaterial = material('#aba392')
    const darkStoneMaterial = material('#505b59')
    const woodMaterial = material('#49392d')
    const roofMaterial = material('#782f2d')
    const goldMaterial = material('#d7b565')
    const treeMaterial = material('#365742')
    const snowMaterial = material('#dedbc7')
    const iceMaterial = material('#a8c6c6')
    const bannerMaterial = material('#892f2c')
    const ironMaterial = material('#343b3c')
    const bodyMaterial = material('#8d4b3b')
    const skinMaterial = material('#d9b48c')
    const materials = [groundMaterial, waterMaterial, stoneMaterial, darkStoneMaterial, woodMaterial, roofMaterial, goldMaterial, treeMaterial, snowMaterial, iceMaterial, bannerMaterial, ironMaterial, bodyMaterial, skinMaterial]

    const addMesh = (geometry: THREE.BufferGeometry, meshMaterial: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) => {
      const mesh = new THREE.Mesh(geometry, meshMaterial)
      mesh.position.set(x, y, z)
      parent.add(mesh)
      return mesh
    }

    addMesh(new THREE.BoxGeometry(50, 1, 40), waterMaterial, 0, -0.75, 0)
    addMesh(new THREE.BoxGeometry(42, 1.2, 34), groundMaterial, 0, -0.45, 0)
    addMesh(new THREE.BoxGeometry(39, 0.12, 31), material('#78815d'), 0, 0.2, 0)
    const addRegion = (points: [number, number][], regionMaterial: THREE.Material) => {
      const shape = new THREE.Shape()
      points.forEach(([x, z], index) => {
        if (index === 0) shape.moveTo(x, -z)
        else shape.lineTo(x, -z)
      })
      shape.closePath()
      const region = addMesh(new THREE.ShapeGeometry(shape), regionMaterial, 0, 0.28, 0)
      region.rotation.x = -Math.PI / 2
    }
    addRegion([[-19.5, -15.5], [-1, -15.5], [-1, -10], [-3, -9], [-4, -7.5], [-8, -8], [-10, -7], [-14, -8], [-17, -7.5], [-19.5, -9]], snowMaterial)
    addRegion([[0, 3], [4, 2.5], [7, 3.5], [10, 2], [15, 3.5], [19.5, 3], [19.5, 14], [14, 14], [10, 13], [7, 14], [3, 12], [0, 12.5]], material('#93835f'))

    // The icy wall marks the northern edge without blocking the playable route.
    addMesh(new THREE.BoxGeometry(18, 5.2, 1.15), iceMaterial, -10, 2.8, -16.3)
    for (let i = 0; i < 10; i++) {
      addMesh(new THREE.BoxGeometry(0.65, 0.8, 1.25), snowMaterial, -18.1 + i * 1.8, 5.7, -16.3)
    }

    const addBanner = (parent: THREE.Object3D, x: number, z: number) => {
      addMesh(new THREE.CylinderGeometry(0.06, 0.06, 2.5, 6), woodMaterial, x, 3.75, z, parent)
      addMesh(new THREE.BoxGeometry(0.85, 1.15, 0.06), bannerMaterial, x + 0.42, 4.25, z, parent)
      addMesh(new THREE.BoxGeometry(0.14, 0.6, 0.08), goldMaterial, x + 0.42, 4.25, z + 0.04, parent)
    }

    const makeTree = (x: number, z: number, scale: number) => {
      const tree = new THREE.Group()
      tree.position.set(x, 0.2, z)
      tree.scale.setScalar(scale)
      addMesh(new THREE.CylinderGeometry(0.15, 0.2, 1.4, 6), woodMaterial, 0, 0.7, 0, tree)
      addMesh(new THREE.ConeGeometry(0.95, 2.3, 7), treeMaterial, 0, 2, 0, tree)
      addMesh(new THREE.ConeGeometry(0.7, 1.7, 7), treeMaterial, 0, 2.9, 0, tree)
      scene.add(tree)
    }
    for (let i = 0; i < 75; i++) {
      const x = Math.sin(i * 42.37) * 19
      const z = Math.cos(i * 31.71) * 15
      if (locations.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 3.2)) continue
      makeTree(x, z, 0.65 + (i % 5) * 0.12)
    }

    for (let i = 0; i < locations.length - 1; i++) {
      const [x1, z1] = locations[i]
      const [x2, z2] = locations[i + 1]
      const distance = Math.hypot(x2 - x1, z2 - z1)
      const count = Math.floor(distance / 1.4)
      for (let j = 1; j < count; j++) {
        const t = j / count
        const stone = addMesh(new THREE.CylinderGeometry(0.28, 0.32, 0.08, 7), stoneMaterial, x1 + (x2 - x1) * t, 0.29, z1 + (z2 - z1) * t)
        stone.rotation.y = j * 0.7
      }
    }

    const beacons: THREE.Mesh[] = []
    locations.forEach(([x, z], index) => {
      const tower = new THREE.Group()
      tower.position.set(x, 0.2, z)
      addMesh(new THREE.CylinderGeometry(1.6, 1.9, 0.35, 8), darkStoneMaterial, 0, 0.18, 0, tower)
      if (index === 7) {
        addMesh(new THREE.BoxGeometry(1.7, 0.55, 1.4), ironMaterial, 0, 0.6, 0, tower)
        addMesh(new THREE.BoxGeometry(1.6, 2.4, 0.35), ironMaterial, 0, 1.75, -0.55, tower)
        for (let i = 0; i < 7; i++) {
          const blade = addMesh(new THREE.ConeGeometry(0.13, 1.2 + (i % 3) * 0.3, 4), ironMaterial, -0.72 + i * 0.24, 3.25, -0.55, tower)
          blade.rotation.z = (i - 3) * -0.12
        }
        addMesh(new THREE.BoxGeometry(0.25, 1, 1.4), ironMaterial, -0.9, 1.1, 0, tower)
        addMesh(new THREE.BoxGeometry(0.25, 1, 1.4), ironMaterial, 0.9, 1.1, 0, tower)
      } else {
        addMesh(new THREE.CylinderGeometry(0.9, 1.05, 2.8, 8), stoneMaterial, 0, 1.7, 0, tower)
        addMesh(new THREE.ConeGeometry(1.25, 1.45, 8), index === 0 ? darkStoneMaterial : roofMaterial, 0, 3.8, 0, tower)
        addMesh(new THREE.BoxGeometry(0.35, 0.9, 0.12), woodMaterial, 0, 0.85, 1.02, tower)
        addMesh(new THREE.BoxGeometry(0.35, 0.4, 0.12), goldMaterial, 0, 2.15, 0.92, tower)
        if (index === 1 || index === 3) {
          for (const side of [-1, 1]) {
            addMesh(new THREE.CylinderGeometry(0.42, 0.5, 2.1, 8), stoneMaterial, side * 1.45, 1.25, 0, tower)
            addMesh(new THREE.ConeGeometry(0.65, 0.85, 8), roofMaterial, side * 1.45, 2.7, 0, tower)
          }
          addBanner(tower, -1.6, -0.6)
        }
      }
      const beacon = addMesh(new THREE.OctahedronGeometry(0.38), goldMaterial, 0, 4.85, 0, tower)
      beacons.push(beacon)
      const label = makeLabel(stages[index].id)
      label.position.set(0, 6.25, 0)
      tower.add(label)
      scene.add(tower)
    })

    for (let i = 0; i < 4; i++) {
      const x = 1 + i * 6.1
      addMesh(new THREE.ConeGeometry(2.7 + (i % 3) * 0.5, 5 + (i % 3), 5), darkStoneMaterial, x, 2.5, -17.5)
      addMesh(new THREE.ConeGeometry(1.15, 2, 5), snowMaterial, x, 5 + (i % 3) * 0.7, -17.5)
    }

    const player = new THREE.Group()
    const [startX, startZ] = locations[selectedRef.current]
    player.position.set(startX, 0, startZ + 2.2)
    player.scale.setScalar(1.35)
    addMesh(new THREE.CylinderGeometry(0.38, 0.55, 1.2, 8), bodyMaterial, 0, 0.88, 0, player)
    addMesh(new THREE.SphereGeometry(0.38, 12, 8), skinMaterial, 0, 1.75, 0, player)
    addMesh(new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), woodMaterial, 0, 1.8, 0, player)
    addMesh(new THREE.BoxGeometry(0.25, 0.45, 0.3), woodMaterial, -0.25, 0.24, 0, player)
    addMesh(new THREE.BoxGeometry(0.25, 0.45, 0.3), woodMaterial, 0.25, 0.24, 0, player)
    scene.add(player)
    playerRef.current = player
    lastArrival.current = selectedRef.current

    const keys = new Set<string>()
    const supportedKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'])
    const onKeyDown = (event: KeyboardEvent) => {
      if (!supportedKeys.has(event.code) || detailOpenRef.current) return
      event.preventDefault()
      keys.add(event.code)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (supportedKeys.has(event.code)) {
        event.preventDefault()
        keys.delete(event.code)
      }
    }
    const clearKeys = () => keys.clear()
    const onMouseMove = (event: MouseEvent) => {
      if (!firstPersonRef.current || document.pointerLockElement !== host || detailOpenRef.current) return
      yawRef.current -= event.movementX * 0.0025
      pitchRef.current = THREE.MathUtils.clamp(pitchRef.current - event.movementY * 0.0025, -1.2, 1.2)
    }
    const onPointerLockChange = () => {
      const locked = document.pointerLockElement === host
      setPointerLocked(locked)
      if (!locked) clearKeys()
    }
    const onContextLost = (event: Event) => {
      event.preventDefault()
      clearKeys()
      setError('Se perdió la conexión gráfica del mundo 3D. Vuelve al mapa clásico y reabre la vista 3D.')
    }
    host.addEventListener('keydown', onKeyDown)
    host.addEventListener('keyup', onKeyUp)
    host.addEventListener('blur', clearKeys)
    window.addEventListener('blur', clearKeys)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('pointerlockchange', onPointerLockChange)
    renderer.domElement.addEventListener('webglcontextlost', onContextLost)

    const resize = () => {
      const width = host.clientWidth
      const height = host.clientHeight
      if (!width || !height) return
      camera.aspect = width / height
      camera.fov = firstPersonRef.current ? 70 : THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(42 / 2)) * Math.max(1, (4 / 3) / camera.aspect)))
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)
    resize()

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let previousTime = 0
    let frame = 0
    const render = (time: number) => {
      const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0
      previousTime = time
      if (detailOpenRef.current) clearKeys()
      const horizontal = Number(keys.has('ArrowRight') || keys.has('KeyD')) - Number(keys.has('ArrowLeft') || keys.has('KeyA'))
      const vertical = Number(keys.has('ArrowDown') || keys.has('KeyS')) - Number(keys.has('ArrowUp') || keys.has('KeyW'))
      const yaw = yawRef.current
      const dx = firstPersonRef.current ? horizontal * Math.cos(yaw) + vertical * Math.sin(yaw) : horizontal
      const dz = firstPersonRef.current ? -horizontal * Math.sin(yaw) + vertical * Math.cos(yaw) : vertical
      if (dx || dz) {
        const length = Math.hypot(dx, dz)
        const speed = firstPersonRef.current ? 5 : 8
        player.position.x = THREE.MathUtils.clamp(player.position.x + dx / length * delta * speed, -19.3, 19.3)
        player.position.z = THREE.MathUtils.clamp(player.position.z + dz / length * delta * speed, -15.3, 15.3)
        player.rotation.y = Math.atan2(dx, dz)
        const arrived = locations.findIndex(([x, z]) => Math.hypot(player.position.x - x, player.position.z - z) < 2.5)
        if (arrived === -1) lastArrival.current = -1
        else if (arrived !== lastArrival.current) {
          lastArrival.current = arrived
          selectRef.current(arrived)
        }
      }
      player.visible = !firstPersonRef.current
      if (firstPersonRef.current) {
        camera.position.set(player.position.x, 2.3, player.position.z)
        camera.rotation.order = 'YXZ'
        camera.rotation.set(pitchRef.current, yawRef.current, 0)
      } else {
        camera.position.set(0, 38, 42)
        camera.lookAt(0, 0, 0)
      }
      const targetFov = firstPersonRef.current ? 70 : THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(42 / 2)) * Math.max(1, (4 / 3) / camera.aspect)))
      if (camera.fov !== targetFov) {
        camera.fov = targetFov
        camera.updateProjectionMatrix()
      }
      if (!reducedMotion.matches) {
        beacons.forEach((beacon, index) => {
          beacon.rotation.y = time * 0.001 + index
          beacon.position.y = 4.85 + Math.sin(time * 0.002 + index) * 0.2
        })
      }
      renderer.render(scene, camera)
      frame = requestAnimationFrame(render)
    }
    frame = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      host.removeEventListener('keydown', onKeyDown)
      host.removeEventListener('keyup', onKeyUp)
      host.removeEventListener('blur', clearKeys)
      window.removeEventListener('blur', clearKeys)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('pointerlockchange', onPointerLockChange)
      if (document.pointerLockElement === host) document.exitPointerLock()
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost)
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          if (Array.isArray(object.material)) object.material.forEach((item) => item.dispose())
          else object.material.dispose()
        } else if (object instanceof THREE.Sprite) {
          object.material.map?.dispose()
          object.material.dispose()
        }
      })
      materials.forEach((item) => item.dispose())
      renderer.dispose()
      renderer.domElement.remove()
      playerRef.current = null
    }
  }, [stages, error])

  const changePerspective = (enabled: boolean) => {
    firstPersonRef.current = enabled
    setFirstPerson(enabled)
    setPointerError('')
    if (!enabled && document.pointerLockElement === canvasHost.current) document.exitPointerLock()
  }

  const focusWorld = (host: HTMLDivElement) => {
    host.focus()
    if (!firstPerson || detailOpen || document.pointerLockElement === host) return
    setPointerError('')
    try {
      void Promise.resolve(host.requestPointerLock()).catch((reason: unknown) => {
        console.error('No se pudo activar la mirada con ratón:', reason)
        setPointerError('No se pudo activar el ratón. Puedes girar con los botones y caminar con el teclado.')
      })
    } catch (reason) {
      console.error('No se pudo activar la mirada con ratón:', reason)
      setPointerError('No se pudo activar el ratón. Puedes girar con los botones y caminar con el teclado.')
    }
  }

  return (
    <div className="world-panel">
      <div className="world-panel-heading">
        <div>
          <span className="world-overline">EXPLORACIÓN · REINO 3D</span>
          <h3>El camino al trono</h3>
        </div>
        <div className="world-heading-actions">
          <span className="world-stage-count">{stages[selectedStage].id} / {stages.length.toString().padStart(2, '0')}</span>
          <button type="button" className="world-fullscreen-toggle" onClick={onToggleFullscreen}>
            {fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          </button>
        </div>
      </div>
      {fullscreenError && <p className="world-fullscreen-error" role="alert">{fullscreenError}</p>}
      <div className="world-camera-controls" role="group" aria-label="Perspectiva del mundo">
        <button type="button" aria-pressed={!firstPerson} onClick={() => changePerspective(false)}>Vista del mapa</button>
        <button type="button" aria-pressed={firstPerson} onClick={() => changePerspective(true)}>Primera persona</button>
        {firstPerson && (
          <>
            <button type="button" onClick={() => { yawRef.current += Math.PI / 6 }}>Girar a la izquierda</button>
            <button type="button" onClick={() => { yawRef.current -= Math.PI / 6 }}>Girar a la derecha</button>
          </>
        )}
      </div>
      <p className="world-instructions" id="world-instructions">{firstPerson
        ? 'Haz clic en el mundo para mirar con el ratón; camina con WASD o las flechas. Pulsa Esc para liberar el ratón. Acércate a una torre para abrir su reto; después de cerrarlo, haz clic en el mundo para seguir mirando.'
        : 'Haz clic en el mundo y mantén pulsadas las flechas del teclado para caminar. Acércate a una torre para ver su reto. También puedes elegir una etapa abajo.'}</p>
      {firstPerson && <p className="world-look-status" aria-live="polite">{pointerError || (pointerLocked ? 'Mirada con ratón activada · Esc para liberar' : 'Ratón libre · haz clic en el mundo para mirar')}</p>}
      {error ? (
        <div key="error" className="world-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={onUnavailable}>Volver al mapa clásico</button>
        </div>
      ) : (
        <div
          key="canvas"
          className="world-canvas"
          ref={canvasHost}
          id="world-canvas"
          tabIndex={0}
          role="group"
          aria-label="Mundo 3D interactivo"
          aria-describedby="world-instructions"
          onClick={(event) => focusWorld(event.currentTarget)}
        />
      )}
      <div className="world-current" aria-live="polite">
        <span>UBICACIÓN ACTUAL</span>
        <strong>{stages[selectedStage].name}</strong>
      </div>
      <div className="world-stage-list" role="tablist" aria-label="Etapas del mundo 3D">
        {stages.map((stage, index) => (
          <button
            type="button"
            role="tab"
            id={`stage-tab-${stage.id}`}
            key={stage.id}
            aria-selected={selectedStage === index}
            aria-controls="stage-detail"
            aria-label={`${stage.id}: ${stage.name}, ${stage.title}`}
            tabIndex={selectedStage === index ? 0 : -1}
            onClick={() => onSelectStage(index)}
            onKeyDown={(event) => {
              let next = index
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = Math.min(index + 1, stages.length - 1)
              else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = Math.max(index - 1, 0)
              else if (event.key === 'Home') next = 0
              else if (event.key === 'End') next = stages.length - 1
              else return
              event.preventDefault()
              onSelectStage(next)
              document.getElementById(`stage-tab-${stages[next].id}`)?.focus()
            }}
          >
            {stage.id}
          </button>
        ))}
      </div>
    </div>
  )
}
