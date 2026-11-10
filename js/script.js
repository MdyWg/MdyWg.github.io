document.addEventListener('DOMContentLoaded', () => {

    // active nav tab stays in view on local
    const currentPage = window.location.pathname.split('/').pop()
    const activeNavLink = document.querySelector(`nav a[href="${currentPage}"]`)
    if (activeNavLink) {
        activeNavLink.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' })
        activeNavLink.parentElement.style.zIndex = '6'
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // butterfly perched on the folder of the inside pages, clicking it pops up my resume
    const RESUME_URL = './files/Mandy_Wang_Resume.pdf'
    const folder = document.querySelector('.content-body')
    if (folder) {
        folder.insertAdjacentHTML('afterbegin', `
            <div class="perch-layer">
                <svg class="resume-hint" aria-hidden="true">
                    <defs>
                        <marker id="hint-arrow" viewBox="0 0 10 10" refX="6" refY="5"
                            markerWidth="4" markerHeight="4" orient="auto">
                            <path d="M1 1 L7 5 L1 9"/>
                        </marker>
                    </defs>
                    <path class="hint-path" marker-end="url(#hint-arrow)"/>
                </svg>
                <button type="button" class="perch" aria-label="Open my resume" aria-haspopup="dialog">
                    <!-- units match the drawing's pixels, with 0,0 at the middle of the butterfly -->
                    <svg class="perch-legs" viewBox="-349.5 -299 699 598" aria-hidden="true">
                        <path d="M-42 195 C-70 215 -88 235 -92 245 C-90 262 -80 275 -68 285 L-50 286"/>
                        <path d="M20 218 C0 240 -12 250 -14 258 C-8 270 0 280 12 285 L28 286"/>
                        <path d="M73 238 C58 252 48 260 48 266 C54 276 62 282 74 285 L90 286"/>
                    </svg>
                    <span class="perch-fly">
                        <img src="./img/butterfly.png" alt="" class="perch-wings"/>
                        <img src="./img/butterfly.png" alt="" class="perch-body"/>
                    </span>
                </button>
                <span class="hint-label" aria-hidden="true">Click for resume!</span>
            </div>`)

        document.body.insertAdjacentHTML('beforeend', `
            <dialog class="resume-dialog" aria-label="Mandy's resume">
                <div class="resume-sheet">
                    <button type="button" class="resume-close" aria-label="Close resume">&times;</button>
                    <div class="resume-actions">
                        <a class="resume-btn" href="${RESUME_URL}" download="Mandy_Wang_Resume.pdf">Download</a>
                        <a class="resume-btn" href="${RESUME_URL}" target="_blank" rel="noopener">Open in new tab</a>
                    </div>
                    <iframe class="resume-frame" title="Mandy Wang's resume"></iframe>
                </div>
            </dialog>`)

        const perch = folder.querySelector('.perch')
        const layer = perch.parentElement
        const hintPath = layer.querySelector('.hint-path')
        const hintLabel = layer.querySelector('.hint-label')
        const dialog = document.querySelector('.resume-dialog')
        const sheet = dialog.querySelector('.resume-sheet')
        const frame = dialog.querySelector('.resume-frame')

        const drawHint = () => {
            const layerRect = layer.getBoundingClientRect()
            const navRect = document.querySelector('nav').getBoundingClientRect()
            const pageTop = -(layerRect.top + window.scrollY) // top of the page in layer units
            const tabsTop = navRect.top - layerRect.top
            const { offsetLeft: px, offsetTop: py, offsetWidth: pw, offsetHeight: ph } = perch

            // on narrow phones it shifts right rather than run off the left edge
            const labelRight = Math.max(px - pw * 0.8, hintLabel.offsetWidth + 12)
            const labelY = pageTop + (tabsTop - pageTop) * 0.35
            hintLabel.style.right = `${layer.clientWidth - labelRight}px`
            hintLabel.style.top = `${labelY}px`

            const start = { x: labelRight + 10, y: labelY + 4 }
            const end = { x: px - pw * 0.04, y: py + ph * 0.56 }
            const dx = end.x - start.x

            // too tight for a loop on phones, so it's a simple hook over to the wing
            if (dx < pw * 0.6) {
                hintPath.setAttribute('d', `M ${start.x} ${start.y}
                    C ${start.x + 40} ${start.y - 14} ${end.x - 6} ${end.y - 45} ${end.x} ${end.y}`)
                return
            }

            const loop = Math.max(end.y - start.y, dx * 0.6)
            const at = (x, y) => `${start.x + x * dx} ${start.y + y * loop}`
            hintPath.setAttribute('d', `M ${at(0, 0)}
                C ${at(0.35, -0.2)} ${at(0.72, 0.02)} ${at(0.64, 0.42)}
                C ${at(0.57, 0.78)} ${at(0.26, 0.72)} ${at(0.33, 0.42)}
                C ${at(0.4, 0.1)} ${at(0.75, 0.15)} ${end.x} ${end.y}`)
        }
        drawHint()
        window.addEventListener('resize', drawHint)
        document.fonts.ready.then(drawHint) // the tabs change height once the font loads

        const burst = (x, y) => {
            for (let i = 0; i < 9; i++) {
                const angle = (i / 9) * Math.PI * 2 + Math.random() * 0.5
                const distance = 50 + Math.random() * 45
                const flower = document.createElement('span')
                flower.className = 'burst-flower'
                flower.textContent = '✿'
                flower.style.left = `${x}px`
                flower.style.top = `${y}px`
                flower.style.setProperty('--dx', `${Math.cos(angle) * distance}px`)
                flower.style.setProperty('--dy', `${Math.sin(angle) * distance}px`)
                flower.addEventListener('animationend', () => flower.remove())
                document.body.appendChild(flower)
            }
        }

        let origin = { x: 0, y: 0 }
        const setOrigin = () => {
            sheet.style.setProperty('--from-x', `${origin.x - window.innerWidth / 2}px`)
            sheet.style.setProperty('--from-y', `${origin.y - window.innerHeight / 2}px`)
        }

        const openResume = () => {
            if (!frame.src) frame.src = `${RESUME_URL}#toolbar=0&navpanes=0&view=FitH`
            setOrigin()
            dialog.showModal()
        }

        const closeResume = () => {
            if (!dialog.open || dialog.classList.contains('closing')) return
            if (reducedMotion) return dialog.close()
            setOrigin()
            dialog.classList.add('closing')
            sheet.addEventListener('animationend', () => {
                dialog.classList.remove('closing')
                dialog.close()
            }, { once: true })
        }

        perch.addEventListener('click', () => {
            const rect = perch.getBoundingClientRect()
            origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
            if (reducedMotion) return openResume()
            if (perch.classList.contains('hopping')) return
            burst(origin.x, origin.y)
            perch.classList.add('hopping')
            setTimeout(openResume, 350)
        })
        perch.addEventListener('animationend', (e) => {
            if (e.animationName === 'perch-hop') perch.classList.remove('hopping')
        })

        dialog.querySelector('.resume-close').addEventListener('click', closeResume)
        dialog.addEventListener('cancel', (e) => {
            e.preventDefault() // Esc closes with the animation too
            closeResume()
        })
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) closeResume() // a click on the dimmed backdrop
        })
    }

    // butterfly flies in along a dashed trail and lands on the folder (home page)
    const perch = document.querySelector('.perch')
    const trail = document.querySelector('.flight-trail')
    if (perch && trail) {
        const FLIGHT_MS = 5000
        let frame = null

        const buildTrail = () => {
            const layer = perch.parentElement
            const trailHeight = layer.parentElement.getBoundingClientRect().top + window.scrollY
            trail.setAttribute('height', trailHeight)

            const endX = perch.offsetLeft + perch.offsetWidth / 2
            const endY = trailHeight + layer.offsetTop + perch.offsetTop + perch.offsetHeight / 2
            const tailX = endX - perch.offsetWidth * 0.62
            const width = Math.min(tailX - 10, endY * 2.8)

            // shape from the sketch in 0-1 units: down, sweep across, loop, then into the tail
            const at = (x, y) => `${tailX - width + x * width} ${y * endY}`
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
            path.setAttribute('d', `M ${at(0.02, -0.7)}
                C ${at(0.08, 0.45)} ${at(0.2, 0.95)} ${at(0.42, 0.95)}
                C ${at(0.66, 0.95)} ${at(0.86, 0.62)} ${at(0.78, 0.25)}
                C ${at(0.74, 0.04)} ${at(0.56, 0.04)} ${at(0.56, 0.3)}
                C ${at(0.56, 0.7)} ${at(0.82, 1.15)} ${at(1, 1.42)}`)
            const tailLength = path.getTotalLength() // dashes stop here, at the tail

            // the last stretch only moves the butterfly into its perched spot
            path.setAttribute('d', `${path.getAttribute('d')} L ${endX} ${endY}`)
            const length = path.getTotalLength()

            // one point every 2px, with heading kept continuous through the loop
            const points = []
            let heading = 0
            for (let s = 0; s <= length; s += 2) {
                const a = path.getPointAtLength(s)
                const b = path.getPointAtLength(s + 1)
                const raw = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI
                if (points.length) heading += ((raw - heading + 540) % 360 + 360) % 360 - 180
                else heading = raw
                points.push({ x: a.x, y: a.y, heading })
            }

            // each dash is its own element so it can appear on its own
            const dashLength = Math.max(8, endY * 0.09)
            const gap = dashLength * 0.8
            const dashes = []
            trail.replaceChildren()
            for (let s = 0; s + dashLength <= tailLength; s += dashLength + gap) {
                const dash = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
                const stops = []
                for (let d = 0; d <= dashLength; d += 2) {
                    const p = path.getPointAtLength(s + d)
                    stops.push(`${p.x},${p.y}`)
                }
                dash.setAttribute('points', stops.join(' '))
                trail.appendChild(dash)
                dashes.push({ el: dash, end: s + dashLength })
            }
            return { length, points, dashes, endX, endY }
        }

        const land = () => {
            perch.classList.remove('flying')
            ;['--fly-x', '--fly-y', '--fly-r', '--fly-s'].forEach((v) => perch.style.removeProperty(v))
        }

        const fly = () => {
            const { length, points, dashes, endX, endY } = buildTrail()
            const lastHeading = points[points.length - 1].heading
            dashes.forEach((d) => d.el.classList.add('dash-hidden'))
            perch.classList.add('flying')

            let start = null
            let nextDash = 0
            const step = (now) => {
                if (start === null) start = now
                const t = Math.min((now - start) / FLIGHT_MS, 1)
                const eased = (1 - Math.cos(t * Math.PI)) / 2
                const position = eased * length

                const p = points[Math.min(Math.round(position / 2), points.length - 1)]
                // small while flying, growing to full size for the landing
                const grow = Math.max(0, (eased - 0.8) / 0.2)
                perch.style.setProperty('--fly-x', `${p.x - endX}px`)
                perch.style.setProperty('--fly-y', `${p.y - endY}px`)
                perch.style.setProperty('--fly-r', `${p.heading - lastHeading}deg`)
                perch.style.setProperty('--fly-s', 0.5 + 0.5 * grow * grow * (3 - 2 * grow))

                while (nextDash < dashes.length && dashes[nextDash].end <= position) {
                    dashes[nextDash].el.classList.remove('dash-hidden')
                    nextDash++
                }

                if (t < 1) {
                    frame = requestAnimationFrame(step)
                } else {
                    frame = null
                    land()
                }
            }
            frame = requestAnimationFrame(step)
        }

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) buildTrail()
        else fly()

        // a resize mid-flight would throw off the path, so it just lands and redraws
        window.addEventListener('resize', () => {
            if (frame !== null) cancelAnimationFrame(frame)
            frame = null
            land()
            buildTrail()
        })
    }

    // draggable notes and photos joined by straight ropes (experiences page)
    const ropeBoard = document.querySelector('.rope-board')
    if (ropeBoard) {
        const MAX_SWING = 14 // degrees
        const DRAG_START = 5 // px a photo has to move before it counts as a drag rather than a click

        const wideLayout = window.matchMedia('(min-width: 1300px)') // matches the scattered board in style.css
        const noteEls = [...ropeBoard.querySelectorAll('.exp-note')]
        const photoEls = [...ropeBoard.querySelectorAll('.evidence-photo')]
        const draggableEls = [...noteEls, ...photoEls]
        const ropePaths = ropeBoard.querySelectorAll('.rope path')
        const photoRopePaths = ropeBoard.querySelectorAll('.strings path')
        const anchors = [...ropeBoard.querySelectorAll('.string-anchor')]
        const photoPins = [...ropeBoard.querySelectorAll('.evidence-pin')]
        const pinLayer = ropeBoard.querySelector('.pin-layer')
        let pins = []
        let items = [] // one per draggable element, only filled on the wide layout
        let frame = null
        let topItem = 1

        // where a rope ties onto a pin, just above its collar, in board coordinates
        const knot = (pin) => {
            const board = ropeBoard.getBoundingClientRect()
            const r = pin.getBoundingClientRect()
            return { x: r.left - board.left + r.width * 0.5, y: r.top - board.top + r.height * 0.55 }
        }

        const drawRopes = () => {
            if (items.length) {
                let d = `M ${pins[0].x} ${pins[0].y}`
                // left to right across the board, whatever order the notes are in the page
                items.slice(0, noteEls.length).sort((a, b) => a.clip.x - b.clip.x).forEach((note, i) => {
                    d += ` L ${note.clip.x + note.x} ${note.clip.y + note.y} L ${pins[i + 1].x} ${pins[i + 1].y}`
                })
                ropePaths.forEach((path) => path.setAttribute('d', d))
            }
            const d = anchors.map((anchor, i) => {
                const from = knot(anchor)
                const to = knot(photoPins[i])
                return `M ${from.x} ${from.y} L ${to.x} ${to.y}`
            }).join(' ')
            photoRopePaths.forEach((path) => path.setAttribute('d', d))

            // the ropes lie on top of the cards, so the pins and clothespins are drawn over the
            // ropes here, where the real ones would be (those stay hidden, only for measuring)
            const board = ropeBoard.getBoundingClientRect()
            const pinImages = [...anchors, ...photoPins].map((pin) => {
                const r = pin.getBoundingClientRect()
                return `<image href="./img/pin.svg" x="${r.left - board.left}" y="${r.top - board.top}"
                    width="${r.width}" height="${r.height}"/>`
            })
            const clothespins = items.slice(0, noteEls.length).map((note) => {
                const x = note.clip.x + note.x
                const y = note.clip.y + note.y
                return `<rect class="clothespin" x="-7" y="-16" width="14" height="40" rx="2"
                    transform="translate(${x} ${y}) rotate(${note.tilt + note.swing})"/>`
            })
            pinLayer.innerHTML = clothespins.join('') + pinImages.join('')
        }

        const clampToBoard = (item) => {
            item.x = Math.min(item.maxX, Math.max(item.minX, item.x))
            item.y = Math.min(item.maxY, Math.max(item.minY, item.y))
        }

        const stepItems = () => {
            let moving = false
            items.forEach((item) => {
                const targetSwing = Math.max(-MAX_SWING, Math.min(MAX_SWING, -item.speedX * 0.7))
                item.swing += (targetSwing - item.swing) * 0.2
                item.speedX *= 0.6

                if (!item.dragging && Math.abs(item.swing) < 0.05) {
                    item.swing = 0
                    item.speedX = 0
                } else {
                    moving = true
                }
                item.el.style.translate = `${item.x}px ${item.y}px`
                item.el.style.rotate = `${item.swing}deg`
            })
            return moving
        }

        // only runs while something is moving, so a page at rest does no work
        const tick = () => {
            const moving = stepItems()
            drawRopes()
            frame = moving ? requestAnimationFrame(tick) : null
        }
        const wake = () => {
            if (frame === null) frame = requestAnimationFrame(tick)
        }

        const setDragLimits = (item) => {
            const left = item.el.offsetLeft + item.el.offsetParent.offsetLeft
            const top = item.el.offsetTop + item.el.offsetParent.offsetTop
            item.minX = -left
            item.maxX = ropeBoard.clientWidth - left - item.el.offsetWidth
            item.minY = -top - 60
            item.maxY = Math.max(0, ropeBoard.clientHeight - top - item.el.offsetHeight)
        }

        const buildBoard = () => {
            if (frame !== null) cancelAnimationFrame(frame)
            frame = null
            draggableEls.forEach((el) => {
                if (el.dataset.below) el.style.removeProperty('top')
                el.style.removeProperty('translate')
                el.style.removeProperty('rotate')
                el.style.removeProperty('z-index')
                el.classList.remove('dragging')
            })
            if (!wideLayout.matches) {
                items = []
                ropePaths.forEach((path) => path.removeAttribute('d'))
                drawRopes()
                return
            }

            // a photo with data-below hangs a set distance under that note's bottom edge,
            // so its rope stays the same length however tall the note's text makes it
            photoEls.forEach((el) => {
                const above = el.dataset.below && document.getElementById(el.dataset.below)
                if (!above) return
                el.style.top = `${above.offsetTop + above.offsetHeight + Number(el.dataset.gap || 0)}px`
            })

            pins = [...ropeBoard.querySelectorAll('.rope-pin')].map((pin) => {
                const style = getComputedStyle(pin)
                return { x: parseFloat(style.left), y: parseFloat(style.top) }
            })
            items = draggableEls.map((el) => {
                const item = {
                    el,
                    clip: {
                        x: el.offsetLeft + el.offsetParent.offsetLeft + el.offsetWidth / 2,
                        y: el.offsetTop + el.offsetParent.offsetTop - 8
                    },
                    tilt: parseFloat(getComputedStyle(el).getPropertyValue('--tilt')) || 0,
                    x: 0, y: 0, speedX: 0, swing: 0, dragging: false, moved: false
                }
                setDragLimits(item)
                return item
            })
            drawRopes()
        }

        draggableEls.forEach((el, index) => {
            el.addEventListener('pointerdown', (e) => {
                const item = items[index]
                if (!item) return // narrow layout: no dragging, so the page can scroll
                e.preventDefault()
                el.setPointerCapture(e.pointerId)
                setDragLimits(item)
                item.dragging = true
                item.moved = false
                item.startX = e.clientX
                item.startY = e.clientY
                item.grabX = e.clientX - item.x
                item.grabY = e.clientY - item.y
                el.style.zIndex = ++topItem // the last one moved stays on top after it's dropped
            })
            el.addEventListener('pointermove', (e) => {
                const item = items[index]
                if (!item || !item.dragging) return
                if (!item.moved) {
                    if (Math.hypot(e.clientX - item.startX, e.clientY - item.startY) < DRAG_START) return
                    item.moved = true
                    el.classList.add('dragging')
                }
                const oldX = item.x
                item.x = e.clientX - item.grabX
                item.y = e.clientY - item.grabY
                clampToBoard(item)
                item.speedX = item.x - oldX
                wake()
            })
            const release = () => {
                const item = items[index]
                if (!item || !item.dragging) return
                item.dragging = false
                item.speedX = 0 // stays where it was dropped, with no throw
                el.classList.remove('dragging')
                wake()
            }
            el.addEventListener('pointerup', release)
            el.addEventListener('pointercancel', release)
            // a photo that was dragged shouldn't also open big when it's let go
            el.addEventListener('click', (e) => {
                const item = items[index]
                if (item && item.moved) {
                    e.stopImmediatePropagation()
                    item.moved = false
                }
            })
        })

        buildBoard()
        window.addEventListener('resize', buildBoard)
        // photos and fonts arriving late move everything, so it all gets measured again
        window.addEventListener('load', buildBoard)
        document.fonts.ready.then(buildBoard)
    }

    // click a photo or the video to see it bigger (experiences and projects pages)
    const viewer = document.querySelector('.photo-viewer')
    if (viewer) {
        const bigImg = viewer.querySelector('img')
        const bigVideo = viewer.querySelector('video')
        const bigCaption = viewer.querySelector('figcaption')
        const hint = viewer.querySelector('.photo-viewer-hint')

        // the board's clip plays on its own unless the visitor has asked for less motion
        document.querySelectorAll('.evidence-photo video').forEach((clip) => {
            if (reducedMotion) {
                clip.removeAttribute('autoplay')
                clip.pause()
            }
        })

        document.querySelectorAll('.evidence-photo').forEach((photo) => {
            photo.addEventListener('click', () => {
                const clip = photo.querySelector('video')
                const img = photo.querySelector('img')
                bigImg.hidden = Boolean(clip)
                bigVideo.hidden = !clip
                if (clip) {
                    bigVideo.src = clip.currentSrc || clip.src
                    bigVideo.currentTime = 0
                    bigVideo.play().catch(() => {}) // the click counts as permission to play with sound
                    hint.textContent = 'click outside the video to close'
                } else {
                    bigImg.src = img.src
                    bigImg.alt = img.alt
                    hint.textContent = 'click anywhere to close'
                }
                bigCaption.textContent = photo.querySelector('.evidence-caption').textContent
                viewer.showModal()
            })
        })

        document.querySelectorAll('.spread-photo img').forEach((img) => {
            img.addEventListener('click', () => {
                bigImg.hidden = false
                bigVideo.hidden = true
                bigImg.src = img.src
                bigImg.alt = img.alt
                hint.textContent = 'click anywhere to close'
                bigCaption.textContent = img.dataset.caption ||
                    img.closest('.spread-photo').querySelector('figcaption').textContent
                viewer.showModal()
            })
        })

        // clicks on the video work its controls instead of closing
        viewer.addEventListener('click', (e) => {
            if (e.target !== bigVideo) viewer.close()
        })
        viewer.addEventListener('close', () => bigVideo.pause())
    }

    // photo slideshows on the projects page: arrows, dots, and left/right keys
    document.querySelectorAll('.slideshow').forEach((show) => {
        const slides = [...show.querySelectorAll('.slides img')]
        const caption = show.querySelector('figcaption')
        const dotBox = show.querySelector('.slide-dots')
        let current = 0

        const dots = slides.map((slide, i) => {
            const dot = document.createElement('button')
            dot.type = 'button'
            dot.className = 'slide-dot'
            dot.textContent = '✿'
            dot.setAttribute('aria-label', `Photo ${i + 1} of ${slides.length}`)
            dot.addEventListener('click', () => go(i))
            dotBox.appendChild(dot)
            return dot
        })

        const go = (index) => {
            current = (index + slides.length) % slides.length
            slides.forEach((slide, i) => { slide.hidden = i !== current })
            dots.forEach((dot, i) => dot.setAttribute('aria-current', i === current))
            caption.textContent = slides[current].dataset.caption
        }

        show.querySelector('.slide-prev').addEventListener('click', () => go(current - 1))
        show.querySelector('.slide-next').addEventListener('click', () => go(current + 1))
        show.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') go(current - 1)
            if (e.key === 'ArrowRight') go(current + 1)
        })
        go(0)
    })

    // use typed.js for portfolio title animation
    if (document.querySelector('#title')) {
        const typed = new Typed('#title', {
            strings: ["Hi, I'm<br>Mandy"],
            contentType: 'html',
            typeSpeed: 100,
            showCursor: false,
            onComplete: () => {
                const cursor = document.createElement('span')
                cursor.className = 'static-cursor'
                cursor.textContent = '|'
                document.querySelector('#title').appendChild(cursor)
            }
        })
    }

    // GitHub API
    if (document.getElementById('repo-grid')) {
        let activeFilter = 'all'

        const HIDDEN_REPOS = ['apcsa_material', 'overfishing-site', 'Databases2026', 'IntroWebDevClass', 'DynamicWebDev']
        const isShown = (name) =>
            !HIDDEN_REPOS.some((hidden) => hidden.toLowerCase() === name.toLowerCase())

        const sanitizeClass = (str) =>
            str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

        // GitHub allows 60 requests an hour per visitor and one load uses one per repo,
        // so results are saved in the browser and only refreshed once they're this old
        const CACHE_KEY = 'github-projects'
        const CACHE_MS = 60 * 60 * 1000

        const readCache = () => {
            try {
                return JSON.parse(localStorage.getItem(CACHE_KEY))
            } catch (e) {
                return null
            }
        }

        const writeCache = (projects) => {
            try {
                localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), projects }))
            } catch (e) {
                // storage can be full or blocked, the page still works without it
            }
        }

        // throws on an error reply, otherwise its message would be read as repo data
        const fetchJson = async (url) => {
            const response = await fetch(url)
            if (!response.ok) throw new Error(`GitHub replied ${response.status}`)
            return response.json()
        }

        const fetchProjects = async () => {
            const repos = await fetchJson('https://api.github.com/users/MdyWg/repos?sort=updated&per_page=20')
            const shown = repos.filter(({ name }) => isShown(name))
            return Promise.all(shown.map(async ({ html_url, name, description }) => ({
                repo: { html_url, name, description },
                langs: await fetchJson(`https://api.github.com/repos/MdyWg/${name}/languages`)
            })))
        }

        const renderCard = (repo, langs) => {
            const { html_url, name, description } = repo
            const langKeys = Object.keys(langs)
            const top3 = langKeys.sort((a, b) => langs[b] - langs[a]).slice(0, 3)
            const langClasses = langKeys.map(sanitizeClass).join(' ') || 'other'

            const tags = top3.length
                ? top3.map((l) => `<span class="lang-tag">${l}</span>`).join('')
                : '<span class="lang-tag">Other</span>'

            const cardHTML = `
                <div class="repo-card ${langClasses}">
                    <h3><a href="${html_url}" target="_blank">${name}</a></h3>
                    <p class="repo-desc">${description || 'No description'}</p>
                    <div class="repo-langs">${tags}</div>
                </div>`

            document.getElementById('repo-grid').insertAdjacentHTML('beforeend', cardHTML)
        }

        const renderFilters = (allLangs) => {
            const filterContainer = document.getElementById('lang-filters')
            Object.keys(allLangs).sort().forEach((lang) => {
                const btn = document.createElement('button')
                btn.className = 'lang-btn'
                btn.textContent = lang
                btn.dataset.lang = sanitizeClass(lang)
                filterContainer.appendChild(btn)
            })
        }

        // filter cards by active language
        const applyFilter = () => {
            document.querySelectorAll('.repo-card').forEach((card) => {
                const matchesLang = activeFilter === 'all' || card.classList.contains(activeFilter)
                card.style.display = matchesLang ? '' : 'none'
            })
        }

        // fetch repos and languages then render everything
        const loadProjects = async () => {
            const cached = readCache()
            let projects = cached && Date.now() - cached.savedAt < CACHE_MS ? cached.projects : null

            if (!projects) {
                try {
                    projects = await fetchProjects()
                    writeCache(projects)
                } catch (e) {
                    // an out of date list is better than none
                    projects = cached ? cached.projects : null
                }
            }

            if (!projects) {
                document.getElementById('repo-grid').innerHTML = `
                    <p class="repo-error">
                        My projects couldn't load right now, but you can
                        <a href="https://github.com/MdyWg" target="_blank">see them all on GitHub</a>.
                    </p>`
                return
            }

            // checked here too, so hiding a repo also applies to a list saved before it was hidden
            const allLangs = {}
            projects.filter(({ repo }) => isShown(repo.name)).forEach(({ repo, langs }) => {
                renderCard(repo, langs)
                Object.keys(langs).forEach((l) => { allLangs[l] = true })
            })

            renderFilters(allLangs)

            document.getElementById('lang-filters').addEventListener('click', (e) => {
                if (!e.target.classList.contains('lang-btn')) return
                document.querySelectorAll('.lang-btn').forEach((b) => b.classList.remove('active'))
                e.target.classList.add('active')
                activeFilter = e.target.dataset.lang || 'all'
                applyFilter()
            })
        }

        loadProjects()
    }

    // Copy email to clipboard (contact page)
    const copyText = (text) => {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
    }

    document.querySelectorAll('.copy').forEach((el) => {
        el.addEventListener('click', () => {
            copyText(el.dataset.email)

            const popup = document.createElement('div')
            popup.className = 'copy-popup'
            popup.textContent = 'Copied!'

            // sits just above the address that was clicked
            document.body.appendChild(popup)
            const rect = el.getBoundingClientRect()
            popup.style.left = `${rect.left + rect.width / 2 - popup.offsetWidth / 2}px`
            popup.style.top = `${rect.top - popup.offsetHeight - 6}px`

            requestAnimationFrame(() => popup.classList.add('show'))

            setTimeout(() => {
                popup.classList.remove('show')
                setTimeout(() => popup.parentNode.removeChild(popup), 200)
            }, 1500)
        })
    })

})
