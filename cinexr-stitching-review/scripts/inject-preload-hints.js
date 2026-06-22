const fs = require('fs')
const path = require('path')

const indexPath = path.join(__dirname, '..', 'public', 'index.html')
const html = fs.readFileSync(indexPath, 'utf8')

const hints = [
  '<link rel="preload" as="image" href="./cinexr/title-main-stitch.png" fetchpriority="high">',
  '<link rel="prefetch" as="video" href="./cinexr/SIM_A001_0614BP_Stitched_1440p_vimeo_h264.mp4" type="video/mp4">',
  '<link rel="prefetch" as="image" href="./cinexr/main-plus-top-blend.png">',
  '<link rel="prefetch" as="image" href="./cinexr/main-cameras.png">',
  '<link rel="prefetch" as="image" href="./cinexr/top-flat-reflection.png">',
  '<link rel="prefetch" as="image" href="./cinexr/top-unwrapped-360.png">',
  '<link rel="prefetch" as="image" href="./cinexr/title-led-stage.png">'
].join('\n  ')

if (html.includes('rel="prefetch" as="video"')) {
  process.exit(0)
}

const next = html.replace('</head>', `  ${hints}\n</head>`)
fs.writeFileSync(indexPath, next)
