import * as THREE from './node_modules/three/build/three.js'

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
  let state = {
    yaw: opts.yaw || 0,
    pitch: opts.pitch || 0,
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
      state.pitch = clamp(state.pitch + dy * 0.004, -1.25, 1.25)
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
    const ctx = baseInteractiveSlide(slide, target, { mode: 'pano', fov: 72 })
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
    const ctx = baseInteractiveSlide(slide, target, { cameraZ: 6.2, yaw: 0.3, pitch: -0.12, fov: 52 })
    const stage = new THREE.Group()
    const wall = makeCurvedWall(ctx.texture)
    stage.add(wall)
    stage.add(makeStageFloor())
    stage.add(makeCameraBox())
    ctx.scene.add(stage)
    ctx.scene.add(new THREE.AmbientLight(0xffffff, 1.35))
    animate360(ctx, function () {
      ctx.camera.position.set(0, 1.45, 6.2)
      ctx.camera.lookAt(0, 0.25, 0)
      stage.rotation.y = ctx.state.yaw * 0.28
    })
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
      </style>
      <h1 class="title"></h1>
      <div class="footer"><span class="name"></span><span class="separator">|</span><span class="date"></span></div>
    `

    root.style.setProperty('--bg', `url("${slide.background}")`)
    root.style.setProperty('--brightness', String(slide.brightness == null ? 0 : slide.brightness))
    root.querySelector('.title').textContent = slide.title || ''
    const parsedFooter = parseFooter(slide.footerName, slide.footerDate)
    root.querySelector('.name').textContent = parsedFooter.name
    root.querySelector('.date').textContent = parsedFooter.date
    root.querySelector('.separator').style.display = parsedFooter.date ? '' : 'none'
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
          top: 50%;
          width: 100%;
          height: var(--image-height);
          object-fit: cover;
          object-position: var(--image-position);
          transform: translate(-50%, calc(-50% + var(--image-offset-y))) scale(var(--image-scale));
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
    root.style.setProperty('--image-height', slide.imageHeight || '100%')
    root.style.setProperty('--image-position', slide.imagePosition || 'center center')
    root.style.setProperty('--image-scale', String(slide.imageScale == null ? 1 : slide.imageScale))
    root.style.setProperty('--image-offset-y', slide.imageOffsetY || '0px')
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
