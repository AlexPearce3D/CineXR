import * as THREE from './node_modules/three/build/three.js'
import { GLTFLoader } from './node_modules/three/examples/jsm/loaders/GLTFLoader.js'

export default {
  renderers: {
    dual360,
    globe360,
    hotspot360,
    ledVolume360,
    mediaFrame,
    panorama360,
    stitchCompare,
    titleWithFooter
  }
}

function baseInteractiveSlide (slide, target, opts) {
  opts = opts || {}
  target.innerHTML = ''

  const root = document.createElement('section')
  root.className = 'cxr-360-slide'
  root.innerHTML = `
    <style>
      .cxr-360-slide {
        box-sizing: border-box;
        position: relative;
        width: 100vw;
        height: 100vh;
        overflow: hidden;
        background: #05070a;
        color: #f6f4ee;
        font-family: Inter, system-ui, sans-serif;
      }
      .cxr-360-slide canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
      }
      .cxr-360-slide .flat {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: contain;
        background: #000;
        display: none;
      }
      .cxr-360-slide .copy {
        position: absolute;
        z-index: 3;
        left: clamp(1rem, 4vw, 3.8rem);
        top: clamp(1rem, 5vh, 3.2rem);
        max-width: min(46rem, calc(100vw - 2rem));
        pointer-events: none;
      }
      .cxr-360-slide h1 {
        margin: 0;
        max-width: 18ch;
        font-size: clamp(2.4rem, 5vw, 5.5rem);
        line-height: .92;
        letter-spacing: 0;
        text-shadow: 0 .25rem 1.8rem rgba(0,0,0,.8);
      }
      .cxr-360-slide .subtitle {
        margin: .9rem 0 0;
        max-width: 34rem;
        color: rgba(246,244,238,.78);
        font-size: clamp(.95rem, 1.55vw, 1.28rem);
        line-height: 1.35;
        text-shadow: 0 .18rem 1rem rgba(0,0,0,.8);
      }
      .cxr-360-slide .toolbar {
        position: absolute;
        z-index: 4;
        right: clamp(1rem, 3vw, 2.5rem);
        bottom: clamp(1rem, 4vh, 2.4rem);
        display: flex;
        gap: .55rem;
      }
      .cxr-360-slide button {
        border: 1px solid rgba(255,255,255,.18);
        background: rgba(5,7,10,.72);
        color: #f6f4ee;
        padding: .65rem .8rem;
        font: 900 .78rem Inter, system-ui, sans-serif;
        letter-spacing: .08em;
        text-transform: uppercase;
        cursor: pointer;
      }
      .cxr-360-slide button.active {
        border-color: var(--accent);
        color: var(--accent);
      }
      .cxr-360-slide .hint {
        position: absolute;
        z-index: 4;
        left: clamp(1rem, 4vw, 3.8rem);
        bottom: clamp(1rem, 4vh, 2.4rem);
        color: rgba(246,244,238,.62);
        font-size: clamp(.72rem, 1vw, .88rem);
        font-weight: 800;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      .cxr-360-slide .hotspots {
        position: absolute;
        inset: 0;
        z-index: 4;
        pointer-events: none;
      }
      .cxr-360-slide .hotspot {
        position: absolute;
        padding: .5rem .62rem;
        border: 1px solid rgba(243,179,91,.68);
        background: rgba(5,7,10,.76);
        color: #f6f4ee;
        font-size: clamp(.68rem, .9vw, .82rem);
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: .06em;
        box-shadow: 0 .8rem 1.8rem rgba(0,0,0,.38);
      }
    </style>
    <img class="flat" alt="">
    <div class="copy"><h1></h1><p class="subtitle"></p></div>
    <div class="hint">Drag to rotate</div>
    <div class="toolbar"></div>
    <div class="hotspots"></div>
  `

  root.querySelector('h1').textContent = slide.title || ''
  root.querySelector('.subtitle').textContent = slide.subtitle || ''
  root.querySelector('.flat').src = slide.image || slide.video || ''
  target.appendChild(root)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputEncoding = THREE.sRGBEncoding
  root.insertBefore(renderer.domElement, root.firstChild)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(opts.fov || 65, 1, 0.1, 1000)
  camera.position.set(0, 0, opts.cameraZ || 0.01)

  let cleanup = []
  const media = createMediaTexture(slide, cleanup)
  const texture = media.texture
  const pitchMin = opts.pitchMin == null ? -1.25 : opts.pitchMin
  const pitchMax = opts.pitchMax == null ? 1.25 : opts.pitchMax
  let state = {
    yaw: opts.yaw || 0,
    pitch: clamp(opts.pitch == null ? 0 : opts.pitch, pitchMin, pitchMax),
    pitchMin: pitchMin,
    pitchMax: pitchMax,
    distance: opts.distance || 3.2,
    mode: opts.mode || 'pano',
    dragging: false,
    lastX: 0,
    lastY: 0,
    raf: 0
  }

  function resize () {
    const width = root.clientWidth || window.innerWidth
    const height = root.clientHeight || window.innerHeight
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }

  function attachDrag () {
    function down (event) {
      state.dragging = true
      state.lastX = event.clientX
      state.lastY = event.clientY
      root.setPointerCapture(event.pointerId)
    }
    function move (event) {
      if (!state.dragging) return
      const dx = event.clientX - state.lastX
      const dy = event.clientY - state.lastY
      state.lastX = event.clientX
      state.lastY = event.clientY
      state.yaw -= dx * 0.005
      state.pitch = clamp(state.pitch + dy * 0.004, state.pitchMin, state.pitchMax)
    }
    function up () {
      state.dragging = false
    }
    root.addEventListener('pointerdown', down)
    root.addEventListener('pointermove', move)
    root.addEventListener('pointerup', up)
    cleanup.push(function () {
      root.removeEventListener('pointerdown', down)
      root.removeEventListener('pointermove', move)
      root.removeEventListener('pointerup', up)
    })
  }

  resize()
  window.addEventListener('resize', resize)
  cleanup.push(function () { window.removeEventListener('resize', resize) })
  attachDrag()

  return { root, scene, camera, renderer, texture, media, state, cleanup, resize }
}

function createMediaTexture (slide, cleanup) {
  if (slide.video) {
    const video = document.createElement('video')
    video.src = slide.video
    video.crossOrigin = 'anonymous'
    video.loop = true
    video.muted = true
    video.playsInline = true
    video.autoplay = true
    video.preload = 'auto'
    const texture = new THREE.VideoTexture(video)
    texture.encoding = THREE.sRGBEncoding
    const play = function () {
      const promise = video.play()
      if (promise && typeof promise.catch === 'function') promise.catch(function () {})
    }
    play()
    cleanup.push(function () {
      video.pause()
      video.removeAttribute('src')
      video.load()
      texture.dispose()
    })
    return { texture, video }
  }

  const texture = new THREE.TextureLoader().load(slide.image)
  texture.encoding = THREE.sRGBEncoding
  cleanup.push(function () { texture.dispose() })
  return { texture }
}

function panorama360 (slide) {
  return function renderPanorama360 (target) {
    const ctx = baseInteractiveSlide(slide, target, {
      mode: 'pano',
      fov: 72,
      yaw: slide.yaw == null ? 0 : slide.yaw,
      pitch: slide.pitch == null ? 0 : slide.pitch,
      pitchMin: slide.pitchMin == null ? 0 : slide.pitchMin,
      pitchMax: slide.pitchMax == null ? 1.25 : slide.pitchMax
    })
    const sphere = makePanoramaSphere(ctx.texture)
    ctx.scene.add(sphere)
    animate360(ctx, function () {
      ctx.camera.position.set(0, 0, 0.01)
      ctx.camera.lookAt(directionFromAngles(ctx.state.yaw, ctx.state.pitch))
    })
  }
}

function globe360 (slide) {
  return function renderGlobe360 (target) {
    const ctx = baseInteractiveSlide(slide, target, { mode: 'globe', cameraZ: 3.2, yaw: -0.8, pitch: 0.12 })
    const group = new THREE.Group()
    const globe = makeGlobe(ctx.texture)
    group.add(globe)
    if (slide.wireframe) group.add(makeWireframeSphere())
    ctx.scene.add(group)
    ctx.scene.add(new THREE.AmbientLight(0xffffff, 1.4))
    animate360(ctx, function () {
      ctx.camera.position.set(0, 0, ctx.state.distance)
      ctx.camera.lookAt(0, 0, 0)
      group.rotation.y = ctx.state.yaw
      group.rotation.x = ctx.state.pitch
    })
  }
}

function dual360 (slide) {
  return function renderDual360 (target) {
    const ctx = baseInteractiveSlide(slide, target, { mode: 'pano', fov: 72, cameraZ: 3.2 })
    const pano = makePanoramaSphere(ctx.texture)
    const globe = new THREE.Group()
    globe.add(makeGlobe(ctx.texture))
    ctx.scene.add(pano)
    ctx.scene.add(globe)
    ctx.scene.add(new THREE.AmbientLight(0xffffff, 1.4))

    const flat = ctx.root.querySelector('.flat')
    const toolbar = ctx.root.querySelector('.toolbar')
    const modes = [
      { id: 'pano', label: 'Inside' },
      { id: 'globe', label: 'Globe' },
      { id: 'flat', label: 'Flat' }
    ]
    modes.forEach(function (mode) {
      const button = document.createElement('button')
      button.textContent = mode.label
      button.addEventListener('click', function () {
        ctx.state.mode = mode.id
        setButtons()
      })
      toolbar.appendChild(button)
    })
    function setButtons () {
      Array.from(toolbar.querySelectorAll('button')).forEach(function (button, index) {
        button.classList.toggle('active', modes[index].id === ctx.state.mode)
      })
    }
    setButtons()

    animate360(ctx, function () {
      pano.visible = ctx.state.mode === 'pano'
      globe.visible = ctx.state.mode === 'globe'
      flat.style.display = ctx.state.mode === 'flat' ? 'block' : 'none'
      ctx.renderer.domElement.style.display = ctx.state.mode === 'flat' ? 'none' : 'block'
      if (ctx.state.mode === 'pano') {
        ctx.camera.position.set(0, 0, 0.01)
        ctx.camera.lookAt(directionFromAngles(ctx.state.yaw, ctx.state.pitch))
      } else {
        ctx.camera.position.set(0, 0, ctx.state.distance)
        ctx.camera.lookAt(0, 0, 0)
        globe.rotation.y = ctx.state.yaw
        globe.rotation.x = ctx.state.pitch
      }
    })
  }
}

function hotspot360 (slide) {
  return function renderHotspot360 (target) {
    const ctx = baseInteractiveSlide(slide, target, { mode: 'pano', fov: 72 })
    ctx.scene.add(makePanoramaSphere(ctx.texture))
    const layer = ctx.root.querySelector('.hotspots')
    const hotspots = [
      { label: 'Sun / flare', yaw: -1.05, pitch: 0.45 },
      { label: 'Zenith blend', yaw: 0.25, pitch: 0.72 },
      { label: 'Horizon', yaw: 0.02, pitch: -0.08 },
      { label: 'Nadir / black', yaw: 1.7, pitch: -0.8 }
    ].map(function (spot) {
      const el = document.createElement('div')
      el.className = 'hotspot'
      el.textContent = spot.label
      layer.appendChild(el)
      spot.el = el
      return spot
    })
    animate360(ctx, function () {
      ctx.camera.position.set(0, 0, 0.01)
      ctx.camera.lookAt(directionFromAngles(ctx.state.yaw, ctx.state.pitch))
      hotspots.forEach(function (spot) {
        placeHotspot(ctx, spot)
      })
    })
  }
}

function ledVolume360 (slide) {
  return function renderLedVolume360 (target) {
    target.innerHTML = ''
    const root = document.createElement('section')
    root.className = 'cxr-led-stage-slide'
    root.innerHTML = `
      <style>
        .cxr-led-stage-slide {
          box-sizing: border-box;
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: #07080a;
          color: #f4f6f2;
          font-family: Inter, system-ui, sans-serif;
        }
        .cxr-led-stage-slide canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
        }
        .cxr-led-stage-slide .view-actions {
          position: absolute;
          z-index: 4;
          top: clamp(1rem, 2vw, 1.8rem);
          left: clamp(1rem, 2vw, 1.8rem);
          display: flex;
          gap: .55rem;
        }
        .cxr-led-stage-slide button {
          min-height: 2.8rem;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: .42rem;
          background: rgba(28,33,42,.9);
          color: #f4f6f2;
          padding: .55rem .78rem;
          font: 800 .82rem Inter, system-ui, sans-serif;
          cursor: pointer;
          box-shadow: 0 .45rem 1.2rem rgba(0,0,0,.22);
        }
        .cxr-led-stage-slide button.active {
          border-color: rgba(83, 205, 189, .75);
          color: #70ddd2;
        }
        .cxr-led-stage-slide .interaction-hint {
          position: absolute;
          z-index: 4;
          left: clamp(1rem, 2vw, 1.8rem);
          bottom: clamp(1rem, 2vw, 1.8rem);
          display: flex;
          gap: clamp(1.4rem, 2vw, 2.4rem);
          flex-wrap: wrap;
          color: rgba(244,246,242,.68);
          font-size: clamp(.68rem, .85vw, .86rem);
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
          text-shadow: 0 .18rem .75rem rgba(0,0,0,.85);
          pointer-events: none;
        }
        @media (max-width: 900px) {
          .cxr-led-stage-slide .view-actions {
            gap: .4rem;
          }
          .cxr-led-stage-slide button {
            min-height: 2.35rem;
            padding: .45rem .55rem;
            font-size: .72rem;
          }
        }
      </style>
      <canvas></canvas>
      <div class="view-actions">
        <button type="button" data-view="back" class="active">Back</button>
        <button type="button" data-view="left">Passenger</button>
        <button type="button" data-view="right">Driver</button>
        <button type="button" data-view="front">Front</button>
      </div>
      <div class="interaction-hint">
        <span>Click + drag to look around</span>
        <span>Right click + drag to pan</span>
        <span>Scroll to zoom</span>
      </div>
    `
    target.appendChild(root)

    const cleanup = []
    const media = createMediaTexture(slide, cleanup)
    const canvas = root.querySelector('canvas')
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputEncoding = THREE.sRGBEncoding
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.08
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x07080a)
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 180)
    const targetPoint = new THREE.Vector3(0, 0.82, 0.05)
    const projectionCenter = new THREE.Vector3()
    const wallMaterial = makeLedProjectionMaterial(media.texture, projectionCenter)
    const wallGroup = makeLedStageWall(wallMaterial)
    scene.add(wallGroup)
    scene.add(makeLedStageFloor())
    scene.add(new THREE.HemisphereLight(0xbfd6ff, 0x101318, 0.6))

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2)
    keyLight.position.set(4, 7, 6)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(1024, 1024)
    scene.add(keyLight)
    const fillLight = new THREE.PointLight(0xffffff, 1.55, 18)
    fillLight.position.set(-5, 3.2, 2)
    scene.add(fillLight)
    const rimLight = new THREE.SpotLight(0xffffff, 4, 12, Math.PI * 0.22, 0.45, 1.2)
    rimLight.position.set(-3.8, 4.5, 3.8)
    rimLight.target.position.set(0, 0.65, 0)
    scene.add(rimLight)
    scene.add(rimLight.target)
    const reflectionTarget = new THREE.WebGLCubeRenderTarget(256, {
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter
    })
    reflectionTarget.texture.encoding = THREE.sRGBEncoding
    const reflectionCamera = new THREE.CubeCamera(0.25, 80, reflectionTarget)
    reflectionCamera.position.set(0, 0.95, 0)
    scene.add(reflectionCamera)

    let yawOffset = 0
    let pitchOffset = 0
    let dragging = false
    let dragButton = 0
    let lastX = 0
    let lastY = 0
    let raf = 0
    let zoom = 1
    const panOffset = new THREE.Vector3()
    let carObject = null
    let reflectionFrame = 0
    const views = {
      front: { position: [0, 1.34, 4.4], target: [0, 0.88, 0.1] },
      left: { position: [-3.7, 1.2, 0.28], target: [0, 0.86, 0.28] },
      right: { position: [3.7, 1.2, 0.28], target: [0, 0.86, 0.28] },
      back: { position: [-2.15, 1.34, -4.45], target: [0.18, 0.88, 0.02] }
    }
    let activeView = 'back'

    function setCameraView (view) {
      activeView = view
      yawOffset = 0
      pitchOffset = 0
      zoom = 1
      panOffset.set(0, 0, 0)
      const next = views[view]
      camera.position.set(next.position[0], next.position[1], next.position[2])
      targetPoint.set(next.target[0], next.target[1], next.target[2])
      camera.lookAt(targetPoint)
      Array.from(root.querySelectorAll('[data-view]')).forEach(function (button) {
        button.classList.toggle('active', button.dataset.view === view)
      })
    }

    Array.from(root.querySelectorAll('[data-view]')).forEach(function (button) {
      button.addEventListener('pointerdown', function (event) { event.stopPropagation() })
      button.addEventListener('click', function (event) {
        event.stopPropagation()
        setCameraView(button.dataset.view)
      })
    })

    function pointerDown (event) {
      dragging = true
      dragButton = event.button
      lastX = event.clientX
      lastY = event.clientY
      root.setPointerCapture(event.pointerId)
    }
    function pointerMove (event) {
      if (!dragging) return
      const dx = event.clientX - lastX
      const dy = event.clientY - lastY
      lastX = event.clientX
      lastY = event.clientY
      if (dragButton === 2) {
        const next = views[activeView]
        const target = new THREE.Vector3(next.target[0], next.target[1], next.target[2]).add(panOffset)
        const viewportHeight = canvas.clientHeight || root.clientHeight || window.innerHeight || 1
        const distance = camera.position.distanceTo(target) * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5))
        const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0)
        const up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1)
        panOffset.addScaledVector(right, -2 * dx * distance / viewportHeight)
        panOffset.addScaledVector(up, 2 * dy * distance / viewportHeight)
      } else {
        yawOffset -= dx * 0.005
        pitchOffset = clamp(pitchOffset + dy * 0.004, -0.45, 0.45)
      }
    }
    function pointerUp () {
      dragging = false
    }
    function wheel (event) {
      event.preventDefault()
      zoom = clamp(zoom * (event.deltaY > 0 ? 1.08 : 0.92), 0.25, 2.25)
    }
    function contextMenu (event) {
      event.preventDefault()
    }
    root.addEventListener('pointerdown', pointerDown)
    root.addEventListener('pointermove', pointerMove)
    root.addEventListener('pointerup', pointerUp)
    root.addEventListener('pointercancel', pointerUp)
    root.addEventListener('wheel', wheel, { passive: false })
    root.addEventListener('contextmenu', contextMenu)
    cleanup.push(function () {
      root.removeEventListener('pointerdown', pointerDown)
      root.removeEventListener('pointermove', pointerMove)
      root.removeEventListener('pointerup', pointerUp)
      root.removeEventListener('pointercancel', pointerUp)
      root.removeEventListener('wheel', wheel)
      root.removeEventListener('contextmenu', contextMenu)
      wallMaterial.dispose()
      reflectionTarget.dispose()
    })

    const carUrl = slide.car || './cinexr/RealisticCar05_HD_LOD0_black_parent_fixed.glb'
    const carLoader = new GLTFLoader()
    carLoader.load(carUrl, function (gltf) {
      const car = normalizeLedCar(gltf.scene)
      carObject = car
      applyLedCarReflectionEnvironment(carObject, reflectionTarget.texture)
      scene.add(car)
      cleanup.push(function () { disposeLedObject(car) })
    }, undefined, function () {
      scene.add(makeFallbackLedCar())
    })

    function resize () {
      const width = canvas.clientWidth || root.clientWidth
      const height = canvas.clientHeight || root.clientHeight
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }

    function render () {
      if (!root.isConnected) {
        cleanup.forEach(function (fn) { fn() })
        renderer.dispose()
        return
      }
      resize()
      const next = views[activeView]
      const basePosition = new THREE.Vector3(next.position[0], next.position[1], next.position[2])
      const baseTarget = new THREE.Vector3(next.target[0], next.target[1], next.target[2]).add(panOffset)
      const orbit = basePosition.clone().sub(baseTarget)
      orbit.multiplyScalar(zoom)
      orbit.applyAxisAngle(new THREE.Vector3(0, 1, 0), yawOffset)
      const side = new THREE.Vector3().crossVectors(orbit, new THREE.Vector3(0, 1, 0)).normalize()
      orbit.applyAxisAngle(side, pitchOffset)
      camera.position.copy(baseTarget).add(orbit)
      camera.lookAt(baseTarget)
      camera.getWorldPosition(projectionCenter)
      if (carObject && reflectionFrame++ % 4 === 0) {
        const wasVisible = carObject.visible
        carObject.visible = false
        reflectionCamera.position.set(0, 0.95, 0)
        reflectionCamera.update(renderer, scene)
        carObject.visible = wasVisible
      }
      renderer.render(scene, camera)
      raf = window.requestAnimationFrame(render)
    }

    window.addEventListener('resize', resize)
    cleanup.push(function () {
      window.removeEventListener('resize', resize)
      window.cancelAnimationFrame(raf)
    })
    setCameraView('back')
    render()
  }
}

function makePanoramaSphere (texture) {
  const geometry = new THREE.SphereGeometry(500, 64, 32)
  geometry.scale(-1, 1, 1)
  return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture }))
}

function makeGlobe (texture) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(1.25, 64, 32),
    new THREE.MeshBasicMaterial({ map: texture })
  )
}

function makeWireframeSphere () {
  return new THREE.Mesh(
    new THREE.SphereGeometry(1.255, 24, 12),
    new THREE.MeshBasicMaterial({ color: 0xf3b35b, wireframe: true, transparent: true, opacity: 0.22 })
  )
}

function makeCurvedWall (texture) {
  const group = new THREE.Group()
  const count = 14
  const radius = 3.6
  for (let i = 0; i < count; i++) {
    const angle = -1.05 + (2.1 * i) / (count - 1)
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.74, 1.8),
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })
    )
    panel.position.set(Math.sin(angle) * radius, 1.1, -Math.cos(angle) * radius + 2.5)
    panel.rotation.y = -angle
    panel.scale.x = 1.18
    group.add(panel)
  }
  return group
}

function makeStageFloor () {
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(3.2, 48),
    new THREE.MeshBasicMaterial({ color: 0x111518, transparent: true, opacity: 0.88 })
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.03
  return floor
}

function makeCameraBox () {
  const group = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.32, 1.2),
    new THREE.MeshBasicMaterial({ color: 0xbfc4c8 })
  )
  body.position.set(0, 0.2, 0.45)
  const lens = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.18, 0.35),
    new THREE.MeshBasicMaterial({ color: 0x32d7d7 })
  )
  lens.position.set(0, 0.27, -0.25)
  group.add(body)
  group.add(lens)
  return group
}

function makeLedProjectionMaterial (texture, projectionCenter) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: texture },
      brightness: { value: 1 },
      rotation: { value: THREE.MathUtils.degToRad(-90) },
      projectionCenter: { value: projectionCenter }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      #define PI 3.1415926535897932384626433832795
      uniform sampler2D map;
      uniform float brightness;
      uniform float rotation;
      uniform vec3 projectionCenter;
      varying vec3 vWorldPosition;
      void main() {
        vec3 direction = normalize(vWorldPosition - projectionCenter);
        float longitude = atan(direction.z, direction.x) + rotation;
        float latitude = asin(clamp(direction.y, -1.0, 1.0));
        vec2 sphericalUv = vec2(fract(0.5 + longitude / (2.0 * PI)), 0.5 + latitude / PI);
        vec4 texel = texture2D(map, sphericalUv);
        gl_FragColor = vec4(texel.rgb * brightness, texel.a);
      }
    `,
    side: THREE.BackSide,
    toneMapped: false
  })
}

function makeLedStageWall (material) {
  const group = new THREE.Group()
  const radius = 8.6
  const height = 4.2
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 160, 1, true, 0, Math.PI * 2), material)
  wall.position.y = height / 2
  group.add(wall)
  const ceilingGeometry = new THREE.CircleGeometry(radius, 128)
  ceilingGeometry.rotateX(-Math.PI / 2)
  const ceiling = new THREE.Mesh(ceilingGeometry, material)
  ceiling.position.y = height
  group.add(ceiling)
  return group
}

function makeLedStageFloor () {
  const group = new THREE.Group()
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(10.8, 11.2, 0.24, 128),
    new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.86, metalness: 0.02 })
  )
  floor.position.y = -0.12
  floor.receiveShadow = true
  const turntable = new THREE.Mesh(
    new THREE.CylinderGeometry(3.45, 3.5, 0.08, 128),
    new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.78, metalness: 0.02 })
  )
  turntable.position.y = 0.04
  turntable.receiveShadow = true
  group.add(floor)
  group.add(turntable)
  return group
}

function makeLedGrid () {
  const grid = new THREE.GridHelper(22, 44, 0x4fc3b1, 0x2e343d)
  grid.position.y = 0.09
  return grid
}

function normalizeLedCar (model) {
  const wrapper = new THREE.Group()
  wrapper.add(model)
  model.updateMatrixWorld(true)
  const box = getRenderableBounds(model)
  if (box.isEmpty()) return makeFallbackLedCar()
  const size = box.getSize(new THREE.Vector3())
  const longestSide = Math.max(size.x, size.y, size.z)
  const scale = longestSide > 0 ? 4.25 / longestSide : 1
  wrapper.scale.setScalar(scale)
  wrapper.updateMatrixWorld(true)
  const centeredBox = getRenderableBounds(wrapper)
  const center = centeredBox.getCenter(new THREE.Vector3())
  wrapper.position.x -= center.x
  wrapper.position.z -= center.z
  wrapper.updateMatrixWorld(true)
  const scaledBox = getRenderableBounds(wrapper)
  wrapper.position.y += 0.11 - scaledBox.min.y
  wrapper.rotation.y = 0
  wrapper.traverse(function (child) {
    if (!child.isMesh) return
    child.frustumCulled = false
    child.castShadow = true
    child.receiveShadow = true
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    materials.forEach(function (material) {
      material.side = THREE.DoubleSide
      tuneLedCarReflectionMaterial(material, child)
      material.needsUpdate = true
    })
  })
  return wrapper
}

function applyLedCarReflectionEnvironment (car, envMap) {
  car.traverse(function (child) {
    if (!child.isMesh) return
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    materials.forEach(function (material) {
      if (!material) return
      if ('envMap' in material) material.envMap = envMap
      tuneLedCarReflectionMaterial(material, child)
      material.needsUpdate = true
    })
  })
}

function tuneLedCarReflectionMaterial (material, mesh) {
  if (!material) return
  const label = ((material.name || '') + ' ' + (mesh.name || '')).toLowerCase()
  const isBodyPaint = /body/.test(label)
  const isGlass = /glass|window|windshield/.test(label)
  const isRubber = /tire|tyre|rubber/.test(label)
  const isInterior = /interior|seat|leather|dash|headrest/.test(label)
  const isWheelOrGrill = /wheel|rim|grill|parts/.test(label)

  if (isBodyPaint && 'color' in material) material.color.setRGB(0.003, 0.003, 0.003)
  if (isBodyPaint && 'metalness' in material) material.metalness = 0

  if ('envMapIntensity' in material) {
    if (isRubber || isInterior) material.envMapIntensity = 0.18
    else if (isBodyPaint) material.envMapIntensity = 1.75
    else if (isGlass) material.envMapIntensity = 1.45
    else if (isWheelOrGrill) material.envMapIntensity = 0.65
    else material.envMapIntensity = 0.55
  }

  if ('roughness' in material) {
    if (isRubber) material.roughness = Math.max(material.roughness || 0.78, 0.78)
    else if (isInterior) material.roughness = Math.max(material.roughness || 0.62, 0.62)
    else if (isBodyPaint) material.roughness = 0.12
    else if (isGlass) material.roughness = 0.08
    else if (isWheelOrGrill) material.roughness = Math.max(material.roughness || 0.42, 0.42)
  }

  if ('clearcoat' in material) {
    if (isBodyPaint) material.clearcoat = 0.9
    else if (!isGlass) material.clearcoat = Math.min(material.clearcoat || 0, 0.18)
  }
  if ('clearcoatRoughness' in material) {
    if (isBodyPaint) material.clearcoatRoughness = 0.06
    else if (!isGlass) material.clearcoatRoughness = Math.max(material.clearcoatRoughness || 0.35, 0.35)
  }
}

function getRenderableBounds (object) {
  const bounds = new THREE.Box3()
  const meshBox = new THREE.Box3()
  object.updateMatrixWorld(true)
  object.traverse(function (child) {
    if (!child.isMesh || !child.geometry) return
    if (!child.geometry.boundingBox) child.geometry.computeBoundingBox()
    meshBox.copy(child.geometry.boundingBox).applyMatrix4(child.matrixWorld)
    bounds.union(meshBox)
  })
  return bounds
}

function makeFallbackLedCar () {
  const group = new THREE.Group()
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x20252a, roughness: 0.34, metalness: 0.55 })
  const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x0d151c, roughness: 0.12, metalness: 0.2 })
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.42, 4.1), bodyMaterial)
  body.position.y = 0.45
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.48, 1.55), glassMaterial)
  cabin.position.set(0, 0.88, -0.25)
  group.add(body)
  group.add(cabin)
  group.position.y = 0.12
  group.rotation.y = 0
  return group
}

function disposeLedObject (object) {
  object.traverse(function (child) {
    if (!child.isMesh) return
    if (child.geometry) child.geometry.dispose()
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    materials.forEach(function (material) {
      if (material) material.dispose()
    })
  })
}

function rotateStagePoint (point) {
  return new THREE.Vector3(point[0], point[1], point[2]).applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(-90))
}

function animate360 (ctx, update) {
  function render () {
    if (!ctx.root.isConnected) {
      ctx.cleanup.forEach(function (fn) { fn() })
      ctx.renderer.dispose()
      return
    }
    update()
    ctx.renderer.render(ctx.scene, ctx.camera)
    ctx.state.raf = window.requestAnimationFrame(render)
  }
  render()
}

function directionFromAngles (yaw, pitch) {
  return new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch)
  )
}

function placeHotspot (ctx, spot) {
  const vector = directionFromAngles(spot.yaw, spot.pitch).project(ctx.camera)
  const visible = vector.z < 1
  spot.el.style.display = visible ? 'block' : 'none'
  spot.el.style.left = ((vector.x * 0.5 + 0.5) * 100).toFixed(2) + '%'
  spot.el.style.top = ((-vector.y * 0.5 + 0.5) * 100).toFixed(2) + '%'
}

function clamp (value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function titleWithFooter (slide) {
  return function renderTitleWithFooter (target) {
    target.innerHTML = ''

    const root = document.createElement('section')
    root.className = 'cxr-title-with-footer'
    root.innerHTML = `
      <style>
        .cxr-title-with-footer {
          box-sizing: border-box;
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: #05070a;
          color: #f6f4ee;
          font-family: Inter, system-ui, sans-serif;
        }
        .cxr-title-with-footer::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: var(--bg);
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }
        .cxr-title-with-footer::after {
          content: "";
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,var(--brightness));
        }
        .cxr-title-with-footer .title {
          position: absolute;
          z-index: 1;
          left: 50%;
          top: 50%;
          width: min(90vw, 72rem);
          margin: 0;
          transform: translate(-50%, -35vh);
          text-align: center;
          font-size: 4.8vw;
          line-height: 1.02;
          letter-spacing: 0;
          text-shadow: 0 3px 14px rgba(0,0,0,.55);
          white-space: pre-line;
        }
        .cxr-title-with-footer .footer {
          position: absolute;
          z-index: 1;
          left: clamp(1.6rem, 4vw, 4rem);
          right: clamp(1.6rem, 4vw, 4rem);
          bottom: clamp(1.2rem, 4vh, 2.8rem);
          display: flex;
          justify-content: flex-start;
          align-items: center;
          gap: 1.05rem;
          color: rgba(246,244,238,.84);
          font-size: clamp(.85rem, 1.15vw, 1.1rem);
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
          text-shadow: 0 2px 10px rgba(0,0,0,.7);
        }
        .cxr-title-with-footer .separator {
          color: rgba(246,244,238,.62);
        }
        .cxr-title-with-footer .nav-hint {
          position: absolute;
          z-index: 1;
          right: clamp(1.6rem, 4vw, 4rem);
          bottom: clamp(1.2rem, 4vh, 2.8rem);
          display: flex;
          align-items: center;
          gap: clamp(.9rem, 1.3vw, 1.35rem);
          box-sizing: border-box;
          min-height: clamp(3.1rem, 5vw, 4.6rem);
          padding: clamp(.55rem, .9vw, .8rem) clamp(.8rem, 1.35vw, 1.35rem);
          border: 1px solid rgba(246,244,238,.34);
          border-radius: clamp(.85rem, 1.4vw, 1.25rem);
          background: rgba(0,0,0,.42);
          box-shadow:
            inset 0 0 0 1px rgba(246,244,238,.08),
            0 .55rem 1.4rem rgba(0,0,0,.36);
          color: rgba(246,244,238,.84);
        }
        .cxr-title-with-footer .nav-key {
          display: grid;
          place-items: center;
          width: clamp(2.45rem, 4vw, 3.55rem);
          aspect-ratio: 1.35;
          border: 1px solid rgba(246,244,238,.52);
          border-radius: clamp(.45rem, .8vw, .7rem);
          background: rgba(246,244,238,.08);
          font-size: clamp(1.65rem, 2.8vw, 2.55rem);
          line-height: 1;
          box-shadow: inset 0 0 .45rem rgba(246,244,238,.1);
        }
        .cxr-title-with-footer .nav-divider {
          width: 1px;
          height: clamp(2.35rem, 3.8vw, 3.35rem);
          background: rgba(246,244,238,.42);
        }
        .cxr-title-with-footer .nav-copy {
          display: grid;
          gap: .18rem;
          font-size: clamp(.72rem, 1.1vw, 1rem);
          font-weight: 800;
          letter-spacing: .18em;
          line-height: 1.15;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .cxr-title-with-footer .nav-copy strong {
          color: #f6f4ee;
          font-weight: 950;
          letter-spacing: .2em;
        }
      </style>
      <h1 class="title"></h1>
      <div class="footer"><span class="name"></span><span class="separator">|</span><span class="date"></span></div>
      <div class="nav-hint">
        <span class="nav-key">→</span>
        <span class="nav-divider"></span>
        <span class="nav-copy"><span>Press right arrow</span><span>For <strong>next slide</strong></span></span>
      </div>
    `

    root.style.setProperty('--bg', `url("${slide.background}")`)
    root.style.setProperty('--brightness', String(slide.brightness == null ? 0 : slide.brightness))
    root.querySelector('.title').textContent = slide.title || ''
    const parsedFooter = parseFooter(slide.footerName, slide.footerDate)
    root.querySelector('.name').textContent = parsedFooter.name
    root.querySelector('.date').textContent = parsedFooter.date
    root.querySelector('.separator').style.display = parsedFooter.date ? '' : 'none'
    const navHint = root.querySelector('.nav-hint')
    navHint.style.display = slide.navHint ? '' : 'none'
    target.appendChild(root)
  }
}

function parseFooter (name, date) {
  if (date) return { name: name || '', date: date || '' }
  const text = name || ''
  const parts = String(text).split('|')
  if (parts.length < 2) return { name: text, date: '' }
  return {
    name: parts[0].trim(),
    date: parts.slice(1).join('|').trim()
  }
}

function mediaFrame (slide) {
  return function renderMediaFrame (target) {
    target.innerHTML = ''

    const root = document.createElement('section')
    root.className = 'cxr-media-frame'
    root.innerHTML = `
      <style>
        .cxr-media-frame {
          box-sizing: border-box;
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          display: grid;
          place-items: center;
          background: #05070a;
          color: #f6f4ee;
          font-family: Inter, system-ui, sans-serif;
        }
        .cxr-media-frame::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg, rgba(5,7,10,.8), transparent 27%, transparent 63%, rgba(5,7,10,.86)),
            var(--bg) center / cover no-repeat;
          filter: blur(24px) brightness(.54);
          transform: scale(1.05);
        }
        .cxr-media-frame img {
          position: absolute;
          z-index: 1;
          left: 50%;
          top: var(--image-top);
          width: 100%;
          height: var(--image-height);
          object-fit: cover;
          object-position: var(--image-position);
          transform: translate(-50%, var(--image-translate-y)) scale(var(--image-scale));
          transform-origin: center var(--image-origin-y);
          background: #000;
        }
        .cxr-media-frame .copy {
          position: absolute;
          z-index: 2;
          left: clamp(1rem, 3vw, 2.6rem);
          right: clamp(1rem, 3vw, 2.6rem);
          bottom: clamp(1rem, 4vh, 2.4rem);
          display: grid;
          gap: .55rem;
          max-width: min(70rem, calc(100vw - 2rem));
          padding: clamp(.8rem, 1.6vw, 1.2rem);
          border: 1px solid rgba(255,255,255,.14);
          background: rgba(5,7,10,.76);
          box-shadow: 0 .9rem 2.5rem rgba(0,0,0,.36);
        }
        .cxr-media-frame .label {
          color: var(--accent);
          font-size: clamp(.75rem, 1vw, .95rem);
          font-weight: 900;
          letter-spacing: .14em;
          text-transform: uppercase;
        }
        .cxr-media-frame h1 {
          margin: 0;
          max-width: 20ch;
          font-size: clamp(1.8rem, 4.2vw, 4rem);
          line-height: .96;
          letter-spacing: 0;
        }
        .cxr-media-frame .subtitle {
          margin: 0;
          max-width: 58rem;
          color: rgba(246,244,238,.82);
          font-size: clamp(.95rem, 1.5vw, 1.22rem);
          line-height: 1.35;
        }
        .cxr-media-frame .filename {
          margin: .15rem 0 0;
          color: rgba(246,244,238,.66);
          font: 800 clamp(.7rem, .95vw, .9rem) ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          overflow-wrap: anywhere;
        }
      </style>
      <img alt="">
      <div class="copy">
        <div class="label"></div>
        <h1></h1>
        <p class="subtitle"></p>
        <p class="filename"></p>
      </div>
    `

    root.style.setProperty('--bg', `url("${slide.background || slide.image}")`)
    const imageAlignY = slide.imageAlignY || 'center'
    const alignTop = imageAlignY === 'top'
    const alignBottom = imageAlignY === 'bottom'
    root.style.setProperty('--image-height', slide.imageHeight || '100%')
    root.style.setProperty('--image-position', slide.imagePosition || 'center center')
    root.style.setProperty('--image-scale', String(slide.imageScale == null ? 1 : slide.imageScale))
    root.style.setProperty('--image-top', alignTop ? '0' : alignBottom ? '100%' : '50%')
    root.style.setProperty('--image-translate-y', alignTop ? (slide.imageOffsetY || '0px') : alignBottom ? `calc(-100% + ${slide.imageOffsetY || '0px'})` : `calc(-50% + ${slide.imageOffsetY || '0px'})`)
    root.style.setProperty('--image-origin-y', alignTop ? 'top' : alignBottom ? 'bottom' : 'center')
    root.querySelector('img').src = slide.image
    root.querySelector('.label').textContent = slide.label || ''
    root.querySelector('h1').textContent = slide.title || ''
    root.querySelector('.subtitle').textContent = slide.subtitle || ''
    root.querySelector('.filename').textContent = slide.filename || ''
    target.appendChild(root)
  }
}

function stitchCompare (slide) {
  return function renderStitchCompare (target) {
    target.innerHTML = ''

    const root = document.createElement('section')
    root.className = 'cxr-stitch-compare'
    root.innerHTML = `
      <style>
        .cxr-stitch-compare {
          --split: 50%;
          box-sizing: border-box;
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: #05070a;
          color: #f6f4ee;
          font-family: Inter, system-ui, sans-serif;
          cursor: ew-resize;
          user-select: none;
        }
        .cxr-stitch-compare img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #000;
          pointer-events: none;
        }
        .cxr-stitch-compare .after {
          clip-path: inset(0 0 0 var(--split));
        }
        .cxr-stitch-compare .shade {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, rgba(5,7,10,.78), transparent 36%, transparent 64%, rgba(5,7,10,.35)),
            linear-gradient(180deg, rgba(5,7,10,.58), transparent 28%, transparent 74%, rgba(5,7,10,.64));
          pointer-events: none;
        }
        .cxr-stitch-compare .copy {
          position: absolute;
          left: clamp(1rem, 5vw, 4.6rem);
          top: clamp(1rem, 6vh, 4rem);
          width: min(86rem, calc(100vw - 2rem));
          pointer-events: none;
        }
        .cxr-stitch-compare .eyebrow {
          margin: 0 0 .65rem;
          color: var(--accent);
          font-size: clamp(.82rem, 1.2vw, 1.05rem);
          font-weight: 900;
          letter-spacing: .16em;
          text-transform: uppercase;
        }
        .cxr-stitch-compare h1 {
          margin: 0;
          max-width: none;
          font-size: clamp(2.8rem, 4.9vw, 6rem);
          line-height: .88;
          letter-spacing: 0;
          white-space: nowrap;
          text-shadow: 0 .25rem 1.7rem rgba(0,0,0,.72);
        }
        .cxr-stitch-compare .subtitle {
          margin: 1rem 0 0;
          max-width: 33rem;
          color: rgba(246,244,238,.82);
          font-size: clamp(1rem, 1.9vw, 1.45rem);
          line-height: 1.35;
          text-shadow: 0 .18rem 1rem rgba(0,0,0,.8);
        }
        .cxr-stitch-compare .divider {
          position: absolute;
          top: 0;
          bottom: 0;
          left: var(--split);
          width: 2px;
          background: rgba(255,255,255,.9);
          box-shadow: 0 0 1.5rem rgba(123,214,255,.9);
          transform: translateX(-1px);
        }
        .cxr-stitch-compare .handle {
          position: absolute;
          left: var(--split);
          top: 50%;
          width: 3.4rem;
          height: 3.4rem;
          border: 1px solid rgba(255,255,255,.72);
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: rgba(5,7,10,.72);
          color: #fff;
          font-weight: 900;
          transform: translate(-50%, -50%);
          box-shadow: 0 .9rem 2.2rem rgba(0,0,0,.42);
        }
        .cxr-stitch-compare .labels {
          position: absolute;
          left: clamp(1rem, 3vw, 2.6rem);
          right: clamp(1rem, 3vw, 2.6rem);
          bottom: clamp(1rem, 4vh, 2.6rem);
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          pointer-events: none;
        }
        .cxr-stitch-compare .label {
          padding: .65rem .85rem;
          border: 1px solid rgba(255,255,255,.16);
          background: rgba(5,7,10,.72);
          color: #f6f4ee;
          font-size: clamp(.82rem, 1.2vw, 1rem);
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .08em;
        }
        .cxr-stitch-compare .label span {
          display: block;
          margin-top: .35rem;
          color: rgba(246,244,238,.62);
          font: 800 clamp(.58rem, .75vw, .72rem) ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          text-transform: none;
          letter-spacing: 0;
          overflow-wrap: anywhere;
        }
      </style>
      <img class="before" alt="">
      <img class="after" alt="">
      <div class="shade"></div>
      <div class="copy">
        <p class="eyebrow"></p>
        <h1></h1>
        <p class="subtitle"></p>
      </div>
      <div class="divider"></div>
      <div class="handle" aria-hidden="true">|</div>
      <div class="labels">
        <div class="label before-label"><strong></strong><span></span></div>
        <div class="label after-label"><strong></strong><span></span></div>
      </div>
    `

    root.querySelector('.before').src = slide.before
    root.querySelector('.after').src = slide.after
    root.querySelector('.eyebrow').textContent = slide.eyebrow || 'Comparison'
    root.querySelector('h1').textContent = slide.title || 'Before and after'
    root.querySelector('.subtitle').textContent = slide.subtitle || ''
    root.querySelector('.before-label strong').textContent = slide.beforeLabel || 'Before'
    root.querySelector('.before-label span').textContent = slide.beforeFile || ''
    root.querySelector('.after-label strong').textContent = slide.afterLabel || 'After'
    root.querySelector('.after-label span').textContent = slide.afterFile || ''

    function setSplit (clientX) {
      const rect = root.getBoundingClientRect()
      const pct = Math.max(8, Math.min(92, ((clientX - rect.left) / rect.width) * 100))
      root.style.setProperty('--split', pct.toFixed(2) + '%')
    }

    root.addEventListener('pointerdown', function (event) {
      root.setPointerCapture(event.pointerId)
      setSplit(event.clientX)
    })
    root.addEventListener('pointermove', function (event) {
      if (event.buttons) setSplit(event.clientX)
    })
    root.addEventListener('mousemove', function (event) {
      setSplit(event.clientX)
    })

    target.appendChild(root)
  }
}
