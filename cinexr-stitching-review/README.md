# Talk

This is a minimal power-slides talk starter. Write deck content and speaker notes in `slides.yaml`, custom slide code in `talk.js`, and put images, video, and other static files in `public/`.

## Files

- `slides.yaml` — your deck content and speaker notes
- `talk.js` — optional browser code for custom slides
- `public/` — media and static files served by the deck

## Run and build

```bash
npx power-slides dev .
npx power-slides build .
```

Deploy the `public/` folder to any static host.

## Edit slides.yaml

Start with a YAML list. Each item is one slide.

```yaml
- title: Power Slides
  eyebrow: Introducing
  subtitle: Agent-friendly deck creation
  align: center
  notes:
    - Plain text means an agent can draft and revise the deck for you.
    - Keep each slide focused; put the speaker story in the notes.

- columns:
    - title: Focused slides in plain text
      eyebrow: Start simple with
      subtitle: Easy for agents to edit, reorder, and reuse
    - image: /generated/plain-text-card.png
      fit: contain
  background: /generated/plain-text-16bit.png
  notes:
    - Each slide is a few lines of YAML, exactly what an agent is good at editing.
    - Ask an agent to restructure the deck, then review the diff like any change.

- columns:
    - image: /remote-control.png
      fit: contain
    - title: Remote Control
      eyebrow: Use your phone as a
      subtitle: Next slide preview, notes, pacing timers

- title: Full screen video
  eyebrow: Media helpers like
  subtitle: (on the next slide)

- video: /fractal-loop.mp4
  controls: true
  muted: true
  loop: true
  fit: contain

- columns:
    - title: Iframe Helper
      eyebrow: Interact with live web apps using the
      subtitle: Power Slides gives you both mobile and desktop options
    - iframe: https://david.app
      device: iphone
      screenBackground: '#061018'

- custom: particleField

- html: |
    <section class="ps-install-terminal">
      <!-- terminal-shaped install card with a talk-name input, generated commands, and Copy All -->
    </section>
```

The starter also shows text, image, video, columns, iframe, html, and custom slides.

Each slide can have one of the following:

- `title` — words on screen, with optional `notes`
- `image` — a full-slide image
- `video` — a full-slide video
- `iframe` — a web page embed
- `html` — trusted inline markup
- `custom` — a named renderer from `talk.js`

To combine types, use `columns`, such as iframe-plus-copy or image-plus-title.

For the full slide schema and `talk.js` API, see the package README and `docs/slide-api.md`.

## Theming and deck metadata

For deck-wide metadata or CSS defaults, wrap the same slide list in a deck object with `title`, `style`, and `slides`.

## Remote control

Run or build the deck, press `o` to open Options, click **Enable remote control**, then scan the QR code or open the shown URL on your phone.

The phone remote is the control surface: it navigates the deck, shows the full notes for the current slide, previews the current and next slide, and keeps talk/slide timers visible for pacing.

## Optional talk.js

Use `talk.js` for slides that need browser code.

```js
export default {
  renderers: {
    demo (slide, PS) {
      return PS.text({
        title: slide.title || 'Custom renderer',
        subtitle: 'Rendered by talk.js, the browser-code escape hatch'
      })
    }
  }
}
```

Then reference the renderer from YAML:

```yaml
- custom: demo
  title: Browser-native slide
```

For more custom-renderer details, see the package README and `docs/slide-api.md`. The packaged `examples/starter/` deck is the maintained example and init template.

## Advanced: npm runners

The generated `package.json` is there for hosts, CI, or runners that expect npm scripts:

```bash
npm install
npm run dev
npm run build
```

Use those scripts for hosts, CI, or deploy flows that run npm commands.

