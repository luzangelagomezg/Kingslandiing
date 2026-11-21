import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react'
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Compass,
  Crown,
  Database,
  Eye,
  Flag,
  KeyRound,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  Waypoints,
} from 'lucide-react'
import World3D from './World3D'
import AmbientSound from './AmbientSound'
import './App.css'

const maxFlagFileBytes = 16 * 1024
type CouncilRecord = { title: string; message: string }

const mapPositions = [
  { x: 13, y: 30 },
  { x: 37, y: 24 },
  { x: 63, y: 32 },
  { x: 86, y: 23 },
  { x: 87, y: 67 },
  { x: 63, y: 76 },
  { x: 37, y: 67 },
  { x: 13, y: 76 },
]

const stages = [
  {
    id: '01',
    name: 'The Wall',
    title: 'Reconocimiento',
    channel: 'Kali Linux / red',
    description:
      'La Guardia de la Noche detectó actividad al sur del Muro. Identifica el puesto y averigua qué servicio mantiene abierto el acceso al reino.',
    icon: Compass,
  },
  {
    id: '02',
    name: "King's Landing",
    title: 'Exploración web',
    channel: 'Navegador / sitio',
    description:
      'Los maestres publican los decretos a la vista, pero guardan el inventario del reino fuera del índice.',
    icon: Eye,
  },
  {
    id: '03',
    name: 'The Three-Eyed Raven',
    title: 'Esteganografía',
    channel: 'Imagen / pista',
    description:
      'El Cuervo ve lo que otros pasan por alto. La imagen no está completa hasta que encuentres lo que guarda.',
    icon: Waypoints,
  },
  {
    id: '04',
    name: 'The Small Council',
    title: 'Libro de consultas SQLite',
    channel: 'Portal / base local',
    description:
      'El Consejo registra sus decisiones en el libro de consultas.',
    icon: Database,
  },
  {
    id: '05',
    name: "Varys' Secrets",
    title: 'Acceso FTP',
    channel: 'FTP / archivos',
    description:
      'Los susurros de Varys no están en la sala del trono. Sus archivos esperan en el servicio que guarda documentos para transferir.',
    icon: KeyRound,
  },
  {
    id: '06',
    name: "The Raven's Cipher",
    title: 'Descifrado clásico',
    channel: 'Pista FTP / texto',
    description:
      'Varys dejó un mensaje cifrado para que solo quien conozca el secreto del Cuervo pueda leerlo.',
    icon: Sparkles,
  },
  {
    id: '07',
    name: "The Maester's Seal",
    title: 'Lógica / secuencia',
    channel: 'Archivo / deducción',
    description:
      'Ordena los sellos del archivo según las pistas del maestre. La secuencia correcta revela el último paso.',
    icon: ShieldCheck,
  },
  {
    id: '08',
    name: 'The Iron Throne',
    title: 'Bandera final',
    channel: 'Evidencia / cierre',
    description: 'El último mensaje señala dónde descansa la prueba final. Regresa al portal y presenta la evidencia para reclamar el Trono de Hierro.',
    icon: Flag,
  },
]

function App() {
  const routeRef = useRef<HTMLDivElement>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [fullscreenError, setFullscreenError] = useState('')
  const [selectedStage, setSelectedStage] = useState(0)
  const [routeView, setRouteView] = useState<'3d' | 'map'>('3d')
  const [detailOpen, setDetailOpen] = useState(false)
  const [flagText, setFlagText] = useState('')
  const [selectedFileName, setSelectedFileName] = useState('')
  const [validationMessage, setValidationMessage] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [hasWon, setHasWon] = useState(false)
  const [councilQuery, setCouncilQuery] = useState('')
  const [councilRecords, setCouncilRecords] = useState<CouncilRecord[]>([])
  const [councilMessage, setCouncilMessage] = useState('')
  const [isSearchingCouncil, setIsSearchingCouncil] = useState(false)
  const [challengeAnswer, setChallengeAnswer] = useState('')
  const [challengeMessage, setChallengeMessage] = useState('')
  const [isCheckingChallenge, setIsCheckingChallenge] = useState(false)
  const [completedChallenges, setCompletedChallenges] = useState<string[]>([])
  const [sealOrder, setSealOrder] = useState<string[]>([])
  const stage = stages[selectedStage]
  const StageIcon = stage.icon

  useEffect(() => {
    const updateFullscreen = () => setFullscreen(document.fullscreenElement === routeRef.current && routeRef.current !== null)
    document.addEventListener('fullscreenchange', updateFullscreen)
    return () => document.removeEventListener('fullscreenchange', updateFullscreen)
  }, [])

  const toggleFullscreen = async () => {
    setFullscreenError('')
    try {
      if (document.fullscreenElement === routeRef.current && routeRef.current) {
        await document.exitFullscreen()
      } else {
        if (!routeRef.current || !document.fullscreenEnabled) throw new Error('Pantalla completa no disponible')
        await routeRef.current.requestFullscreen()
      }
    } catch (reason) {
      console.error('No se pudo cambiar el modo de pantalla completa:', reason)
      setFullscreenError('No se pudo cambiar a pantalla completa. Revisa los permisos del navegador.')
    }
  }

  const handleFlagFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.txt') || file.size > maxFlagFileBytes) {
      setValidationMessage('Selecciona un archivo .txt de hasta 16 KB.')
      event.target.value = ''
      return
    }

    setFlagText((await file.text()).trim())
    setSelectedFileName(file.name)
    setValidationMessage('')
  }

  const handleFlagSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const submittedFlag = flagText.trim()
    if (!submittedFlag) {
      setValidationMessage('Pega la bandera o carga el archivo .txt.')
      return
    }

    setIsValidating(true)
    setValidationMessage('')
    try {
      const response = await fetch('/api/validate-final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag: submittedFlag }),
      })
      const result = await response.json() as { valid?: boolean; message?: string; error?: string }

      if (!response.ok) {
        setValidationMessage(result.error ?? 'No se pudo validar la evidencia. Contacta al instructor.')
      } else if (result.valid) {
        setHasWon(true)
      } else {
        setValidationMessage(result.message ?? 'La evidencia no coincide. Revisa el archivo final y vuelve a intentarlo.')
      }
    } catch {
      setValidationMessage('No se pudo conectar con el validador del laboratorio.')
    } finally {
      setIsValidating(false)
    }
  }

  const handleCouncilSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = councilQuery.trim()
    if (!query) {
      setCouncilMessage('Escribe la frase del Cuervo para buscar en el registro.')
      return
    }

    setIsSearchingCouncil(true)
    setCouncilMessage('')
    setCouncilRecords([])
    try {
      const response = await fetch('/api/council/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const result = await response.json() as {
        records?: CouncilRecord[]
        error?: string
      }

      if (!response.ok) {
        setCouncilMessage(result.error ?? 'No se pudo consultar el registro del Consejo.')
      } else if (result.records?.length) {
        setCouncilRecords(result.records)
      } else {
        setCouncilMessage('No se encontró ningún registro con esa frase. Comprueba el texto y vuelve a intentar.')
      }
    } catch {
      setCouncilMessage('No se pudo conectar con el registro SQLite del Consejo.')
    } finally {
      setIsSearchingCouncil(false)
    }
  }

  const handleChallengeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const challenge = selectedStage === 5 ? 'raven-cipher' : 'maester-seal'
    const answer = challenge === 'raven-cipher' ? challengeAnswer : sealOrder.join(',')

    if (!answer.trim()) {
      setChallengeMessage(challenge === 'raven-cipher'
        ? 'Escribe el mensaje descifrado para continuar.'
        : 'Ordena los cuatro sellos antes de comprobar la secuencia.')
      return
    }

    setIsCheckingChallenge(true)
    setChallengeMessage('')
    try {
      const response = await fetch('/api/challenge/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge, answer }),
      })
      const result = await response.json() as { valid?: boolean; message?: string; error?: string }

      if (!response.ok) {
        setChallengeMessage(result.error ?? 'No se pudo comprobar la respuesta.')
      } else if (result.valid) {
        setCompletedChallenges((current) => current.includes(challenge) ? current : [...current, challenge])
        setChallengeMessage(result.message ?? 'Respuesta correcta. La ruta continúa.')
      } else {
        setChallengeMessage(result.message ?? 'La respuesta no coincide. Revisa las pistas e inténtalo otra vez.')
      }
    } catch {
      setChallengeMessage('No se pudo conectar con el registro del laboratorio.')
    } finally {
      setIsCheckingChallenge(false)
    }
  }

  const toggleSeal = (seal: string) => {
    setSealOrder((current) => current.includes(seal)
      ? current.filter((item) => item !== seal)
      : current.length < 4 ? [...current, seal] : current)
    setChallengeMessage('')
  }

  if (hasWon) {
    return (
      <main className="victory-page">
        <div className="victory-image" role="img" aria-label="Castillo de Harlech en Gales" />
        <div className="victory-content">
          <a className="wordmark victory-wordmark" href="#victoria">
            <span className="wordmark-mark">K</span>
            <span>KING'S LANDING</span>
          </a>
          <div className="victory-seal"><Crown size={30} strokeWidth={1.4} /></div>
          <p className="eyebrow">BANDERA VALIDADA · MISIÓN COMPLETADA</p>
          <h1 id="victoria">Has ganado el derecho<br />al <em>Trono de Hierro.</em></h1>
          <p className="victory-copy">La evidencia fue aceptada. El reino reconoce tu recorrido desde The Wall hasta los secretos de Varys.</p>
          <button
            className="victory-return"
            type="button"
            onClick={() => {
              setHasWon(false)
              setSelectedStage(7)
              setFlagText('')
              setSelectedFileName('')
              setValidationMessage('')
            }}
          >
            <ArrowLeft size={16} aria-hidden="true" /> Volver a la misión
          </button>
        </div>
        <div className="victory-caption">KINGSLANDING <span>·</span> LABORATORIO CTF</div>
      </main>
    )
  }

  const openDetail = () => {
    setDetailOpen(true)
    requestAnimationFrame(() => {
      document.getElementById('stage-detail')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    })
  }

  const selectStage = (index: number) => {
    setSelectedStage(index)
    setChallengeMessage('')
    openDetail()
  }

  const focusMap = () => {
    requestAnimationFrame(() => {
      const target = (routeView === '3d' ? document.getElementById('world-canvas') : null)
        ?? document.getElementById(`stage-tab-${stage.id}`)
      target?.focus({ preventScroll: true })
    })
  }

  const closeDetail = () => {
    setDetailOpen(false)
    focusMap()
  }

  const handleStageKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index

    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      nextIndex = Math.min(index + 1, stages.length - 1)
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      nextIndex = Math.max(index - 1, 0)
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = stages.length - 1
    } else {
      return
    }
    event.preventDefault()
    selectStage(nextIndex)
    document.getElementById(`stage-tab-${stages[nextIndex].id}`)?.focus()
  }

  return (
    <div className={`app-shell${routeView === '3d' ? ' game-mode' : ''}`}>
      <header className="topbar">
        <a className="wordmark" href="#inicio" aria-label="King's Landing, inicio">
          <span className="wordmark-mark">K</span>
          <span>KING'S LANDING</span>
        </a>
        <nav className="main-nav" aria-label="Navegación principal">
          <a href="#ruta" onClick={focusMap}>Ruta de misión</a>
          <a href="#protocolo">Protocolo</a>
        </nav>
        <div className="network-status">
          <span className="status-dot" />
          <span>LABORATORIO AISLADO</span>
        </div>
      </header>

      <main id="inicio">
        <section id="ruta" className="route-section" aria-labelledby="route-title">
          <div className="route-heading">
            <div>
              <span className="section-index">B / SECUENCIA DEL RETO</span>
              <h1 id="route-title">La ruta de misión</h1>
            </div>
            <p>Explora el reino y descubre las ocho etapas de la misión.</p>
          </div>

          <div className="view-switcher" role="group" aria-label="Vista de la ruta">
            <button type="button" className={routeView === '3d' ? 'is-active' : ''} aria-pressed={routeView === '3d'} onClick={() => setRouteView('3d')}>Mundo 3D</button>
            <button type="button" className={routeView === 'map' ? 'is-active' : ''} aria-pressed={routeView === 'map'} onClick={() => setRouteView('map')}>Mapa clásico</button>
          </div>
          <div className="route-layout" ref={routeRef} onKeyDown={(event) => {
            if (event.key === 'Escape' && detailOpen) {
              event.preventDefault()
              closeDetail()
            }
          }}>
            <AmbientSound />
            {routeView === '3d' ? (
              <World3D stages={stages} selectedStage={selectedStage} onSelectStage={selectStage} onUnavailable={() => setRouteView('map')} detailOpen={detailOpen} fullscreen={fullscreen} fullscreenError={fullscreenError} onToggleFullscreen={toggleFullscreen} />
            ) : (
            <div className="map-panel">
              <div className="map-header">
                <div>
                  <span className="map-overline">EL CAMINO AL TRONO</span>
                  <h3>Mapa del reino</h3>
                </div>
                <span className="map-compass" aria-hidden="true"><Compass size={24} /></span>
              </div>
              <p className="map-instructions" id="map-instructions">Selecciona un punto y usa las flechas del teclado para avanzar o retroceder. También puedes pulsar los puntos o los botones inferiores.</p>
              <div className="quest-map" role="tablist" aria-label="Mapa de las etapas del reto" aria-describedby="map-instructions" aria-orientation="horizontal">
                <svg className="map-art" viewBox="0 0 800 720" preserveAspectRatio="none" aria-hidden="true">
                  <path className="map-route-shadow" d="M104 216 Q200 164 296 173 T504 230 Q615 195 688 166 Q760 244 696 482 Q628 513 504 547 T296 482 Q190 500 104 547" />
                  <path className="map-route-line" d="M104 216 Q200 164 296 173 T504 230 Q615 195 688 166 Q760 244 696 482 Q628 513 504 547 T296 482 Q190 500 104 547" />
                </svg>
                {stages.map((item, index) => {
                  const Icon = item.icon
                  const isSelected = selectedStage === index
                  const challengeId = index === 5 ? 'raven-cipher' : index === 6 ? 'maester-seal' : ''
                  const isCompleted = challengeId !== '' && completedChallenges.includes(challengeId)
                  return (
                    <button
                      className={`map-node${isSelected ? ' is-selected' : ''}${isCompleted ? ' is-completed' : ''}`}
                      id={`stage-tab-${item.id}`}
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-label={`${item.id}: ${item.name}, ${item.title}${isCompleted ? ', completado' : ''}`}
                      aria-selected={isSelected}
                      aria-controls="stage-detail"
                      tabIndex={isSelected ? 0 : -1}
                      style={{ left: `${mapPositions[index].x}%`, top: `${mapPositions[index].y}%` }}
                      onClick={() => selectStage(index)}
                      onKeyDown={(event) => handleStageKeyDown(event, index)}
                    >
                      <span className="map-node-icon">{isCompleted ? <Check size={19} aria-hidden="true" /> : <Icon size={19} aria-hidden="true" />}</span>
                      <span className="map-node-number">{item.id}</span>
                    </button>
                  )
                })}
                <div
                  className="map-traveler"
                  style={{ left: `${mapPositions[selectedStage].x}%`, top: `${mapPositions[selectedStage].y}%` }}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 48 62">
                    <ellipse cx="24" cy="57" rx="14" ry="3" fill="#2c3126" opacity=".25" />
                    <path d="M13 44 10 54h9l5-8 5 8h9l-3-10Z" fill="#343a33" />
                    <path d="M13 25q-5 8-4 19l15 5 15-5q1-11-4-19Z" fill="#6c4637" stroke="#352c26" strokeWidth="2" />
                    <path d="M18 29h12l-2 14h-8Z" fill="#bf9d65" />
                    <circle cx="24" cy="19" r="10" fill="#d2b58b" stroke="#352c26" strokeWidth="2" />
                    <path d="M14 18q0-12 10-12t10 12q-10-5-20 0Z" fill="#47433a" />
                    <path d="M18 21h2m8 0h2" stroke="#352c26" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
              <div className="map-navigation">
                <button type="button" onClick={() => selectStage(selectedStage - 1)} onKeyDown={(event) => handleStageKeyDown(event, selectedStage)} disabled={selectedStage === 0} aria-label="Ir a la etapa anterior">
                  <ArrowLeft size={16} aria-hidden="true" /> Anterior
                </button>
                <div className="map-current" aria-live="polite">
                  <span>ESTÁS EN {stage.id} / 08</span>
                  <strong>{stage.name}</strong>
                </div>
                <button type="button" onClick={() => selectStage(selectedStage + 1)} onKeyDown={(event) => handleStageKeyDown(event, selectedStage)} disabled={selectedStage === stages.length - 1} aria-label="Ir a la etapa siguiente">
                  Siguiente <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
            )}

            {!detailOpen && (
              <button className="show-stage-detail" type="button" aria-controls="stage-detail" aria-expanded="false" onClick={openDetail}>
                Ver reto {stage.id}
              </button>
            )}
            <article
              className="stage-detail"
              id="stage-detail"
              role="tabpanel"
              aria-labelledby={`stage-tab-${stage.id}`}
              key={stage.id}
              hidden={!detailOpen}
            >
              <button className="close-stage-detail" type="button" onClick={closeDetail} aria-label="Cerrar información del reto">
                <span aria-hidden="true">×</span> Cerrar
              </button>
              <div className="detail-topline">
                <span>ETAPA {stage.id} <i>/ 08</i></span>
                <span className="detail-status"><span /> {selectedStage === 7 ? 'VALIDACIÓN DISPONIBLE' : selectedStage === 3 ? 'CONSULTA SQLITE DISPONIBLE' : selectedStage === 5 || selectedStage === 6 ? completedChallenges.includes(selectedStage === 5 ? 'raven-cipher' : 'maester-seal') ? 'DESAFÍO COMPLETADO' : 'DESAFÍO INTERACTIVO' : 'EN PREPARACIÓN'}</span>
              </div>
              <div className="detail-icon"><StageIcon size={24} strokeWidth={1.5} /></div>
              <p className="detail-channel">{stage.channel}</p>
              <h3>{stage.name}</h3>
              <p className="detail-title">{stage.title}</p>
              <p className="detail-description">{stage.description}</p>
              <div className="detail-rule" />
              <div className="detail-footer">
                <span>PISTA → HALLAZGO → SIGUIENTE ETAPA</span>
                <span>{stage.id} / 08</span>
              </div>
              {selectedStage === 3 && (
                <section className="council-lab" aria-labelledby="council-lab-title">
                  <h4 id="council-lab-title">Libro de consultas del Consejo</h4>
                  <p>Busca <strong>libro de consultas</strong> y sigue las referencias del acta: <strong>susurros de Varys</strong> y <strong>palabra del guardián</strong>.</p>
                  <form className="council-search" onSubmit={handleCouncilSearch}>
                    <label htmlFor="council-query">FRASE DE BÚSQUEDA</label>
                    <div className="council-search-row">
                      <input
                        id="council-query"
                        value={councilQuery}
                        onChange={(event) => {
                          setCouncilQuery(event.target.value)
                          setCouncilRecords([])
                          setCouncilMessage('')
                        }}
                        maxLength={100}
                        placeholder=""
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <button className="council-run" type="submit" disabled={isSearchingCouncil}>
                        <Search size={15} aria-hidden="true" />
                        {isSearchingCouncil ? 'Buscando…' : 'Buscar'}
                      </button>
                    </div>
                  </form>
                  {councilMessage && <p className="council-message" role="status" aria-live="polite">{councilMessage}</p>}
                  {councilRecords.map((record) => (
                    <article className="council-result" key={record.title}>
                      <strong>{record.title}</strong>
                      <p>{record.message}</p>
                    </article>
                  ))}
                </section>
              )}
              {selectedStage === 5 && (
                <section className="challenge-panel" aria-labelledby="cipher-title">
                  <h4 id="cipher-title">Mensaje interceptado</h4>
                  <p>Usa la frase cifrada que encontraste en <code>mensaje_de_varys.txt</code>. Fue desplazada tres letras hacia adelante; descífrala para conocer el mensaje original.</p>
                  <form className="challenge-form" onSubmit={handleChallengeSubmit}>
                    <label htmlFor="cipher-answer">MENSAJE DESCIFRADO</label>
                    <div className="challenge-input-row">
                      <input id="cipher-answer" value={challengeAnswer} onChange={(event) => { setChallengeAnswer(event.target.value); setChallengeMessage('') }} autoComplete="off" spellCheck={false} disabled={completedChallenges.includes('raven-cipher')} />
                      <button className="council-run" type="submit" disabled={isCheckingChallenge || completedChallenges.includes('raven-cipher')}>
                        {completedChallenges.includes('raven-cipher') ? <Check size={15} aria-hidden="true" /> : <ArrowRight size={15} aria-hidden="true" />}
                        {isCheckingChallenge ? 'Comprobando…' : completedChallenges.includes('raven-cipher') ? 'Resuelto' : 'Descifrar'}
                      </button>
                    </div>
                  </form>
                  {challengeMessage && <p className={`challenge-message${completedChallenges.includes('raven-cipher') ? ' is-success' : ''}`} role="status" aria-live="polite">{challengeMessage}</p>}
                </section>
              )}
              {selectedStage === 6 && (
                <section className="challenge-panel" aria-labelledby="seal-title">
                  <h4 id="seal-title">El orden del archivo</h4>
                  <p>El maestre dejó tres pistas. Pulsa los sellos para colocarlos de primero a último:</p>
                  <ul className="seal-clues">
                    <li>El mapa se archivó antes que el cuervo.</li>
                    <li>El cuervo llegó antes que el dragón.</li>
                    <li>La corona fue el último sello.</li>
                  </ul>
                  <div className="seal-options" aria-label="Selecciona los sellos en orden">
                    {['Dragón', 'Mapa', 'Corona', 'Cuervo'].map((seal) => (
                      <button
                        className={`seal-option${sealOrder.includes(seal.toLocaleLowerCase('es')) ? ' is-picked' : ''}`}
                        key={seal}
                        type="button"
                        onClick={() => toggleSeal(seal.toLocaleLowerCase('es'))}
                        aria-pressed={sealOrder.includes(seal.toLocaleLowerCase('es'))}
                        disabled={completedChallenges.includes('maester-seal')}
                      >
                        <span>{sealOrder.indexOf(seal.toLocaleLowerCase('es')) + 1 || '·'}</span>{seal}
                      </button>
                    ))}
                  </div>
                  <div className="seal-actions">
                    <p className="seal-order" aria-live="polite">{sealOrder.length ? sealOrder.map((seal) => seal[0].toLocaleUpperCase('es') + seal.slice(1)).join(' → ') : 'Tu secuencia aparecerá aquí.'}</p>
                    <button className="seal-reset" type="button" onClick={() => { setSealOrder([]); setChallengeMessage('') }} disabled={!sealOrder.length}>
                      <RotateCcw size={14} aria-hidden="true" /> Reiniciar
                    </button>
                  </div>
                  <form className="challenge-form" onSubmit={handleChallengeSubmit}>
                    <button className="council-run" type="submit" disabled={isCheckingChallenge || sealOrder.length !== 4 || completedChallenges.includes('maester-seal')}>
                      {completedChallenges.includes('maester-seal') ? <Check size={15} aria-hidden="true" /> : <ArrowRight size={15} aria-hidden="true" />}
                      {isCheckingChallenge ? 'Comprobando…' : completedChallenges.includes('maester-seal') ? 'Secuencia resuelta' : 'Comprobar secuencia'}
                    </button>
                  </form>
                  {challengeMessage && <p className={`challenge-message${completedChallenges.includes('maester-seal') ? ' is-success' : ''}`} role="status" aria-live="polite">{challengeMessage}</p>}
                </section>
              )}
              {selectedStage === 7 && (
                <form className="flag-validation" onSubmit={handleFlagSubmit}>
                  <label htmlFor="final-flag">EVIDENCIA FINAL</label>
                  <textarea
                    id="final-flag"
                    value={flagText}
                    onChange={(event) => {
                      setFlagText(event.target.value)
                      setSelectedFileName('')
                      setValidationMessage('')
                    }}
                    maxLength={maxFlagFileBytes}
                    rows={2}
                    placeholder="Pega aquí el texto del archivo final"
                    aria-describedby="flag-file-note flag-validation-message"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <div className="flag-form-actions">
                    <label className="file-picker">
                      <Upload size={15} aria-hidden="true" />
                      Cargar .txt
                      <input type="file" accept=".txt,text/plain" onChange={handleFlagFile} />
                    </label>
                    <button className="flag-submit" type="submit" disabled={isValidating || !flagText.trim()}>
                      {isValidating ? 'Validando…' : 'Validar evidencia'}
                      <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  </div>
                  <p className="flag-file-note" id="flag-file-note">
                    {selectedFileName || 'Se acepta pegar el texto o cargar un archivo .txt (máximo 16 KB).'}
                  </p>
                  <p
                    className={`flag-validation-message${validationMessage ? ' is-visible' : ''}`}
                    id="flag-validation-message"
                    role="status"
                    aria-live="polite"
                  >
                    {validationMessage}
                  </p>
                </form>
              )}
            </article>
          </div>
        </section>

        <section id="protocolo" className="protocol-section" aria-labelledby="protocol-title">
          <div className="protocol-mark"><ShieldCheck size={25} strokeWidth={1.5} /></div>
          <div className="protocol-copy">
            <span className="section-index">C / REGLAS DE OPERACIÓN</span>
            <h2 id="protocol-title">Mantén el reto en su reino.</h2>
            <p>Mantén las pruebas dentro de KINGSLANDING y la red Host-Only del laboratorio. No conectes esa VM a redes públicas ni ejecutes pruebas contra sistemas externos.</p>
          </div>
          <div className="protocol-stamp"><span>ALCANCE</span><strong>VIRTUALBOX<br />HOST-ONLY</strong></div>
        </section>
      </main>

      <footer className="footer">
        <span>KINGSLANDING <i>·</i> LABORATORIO CTF</span>
        <span><span className="status-dot" /> OCHO ETAPAS · UNA BANDERA FINAL</span>
        <a href="https://commons.wikimedia.org/wiki/File:Harlech_Castle_Gatehouse_Tower,_Merionethshire,_Wales_-_25-07-2017.jpg" target="_blank" rel="noreferrer">FOTO: CMAO20 / CC BY-SA 4.0</a>
      </footer>
    </div>
  )
}

export default App
