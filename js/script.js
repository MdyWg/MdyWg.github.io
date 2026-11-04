document.addEventListener('DOMContentLoaded', () => {

    // active nav tab stays in view on local
    const currentPage = window.location.pathname.split('/').pop()
    const activeNavLink = document.querySelector(`nav a[href="${currentPage}"]`)
    if (activeNavLink) {
        activeNavLink.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' })
        activeNavLink.parentElement.style.zIndex = '6'
    }

    // butterfly flies in along a dashed trail and lands on the folder (home page)
    const perch = document.querySelector('.perch')
    if (perch) {
        const trail = document.querySelector('.flight-trail')
        const FLIGHT_MS = 5000
        let frame = null

        // lays out the path and dashes to fit the current window, returns what the flight needs
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

    // rope with draggable notes (experiences page)
    const ropeBoard = document.querySelector('.rope-board')
    if (ropeBoard) {
        const POINTS_PER_SPAN = 14 // rope is a chain of points, more is smoother
        const SLACK = 1.02 // rope is this much longer than the straight distance, which makes it sag
        const GRAVITY = 0.5
        const STIFFNESS_PASSES = 14 // how many times per frame the rope corrects its length
        const ROPE_DRAG = 0.8 // how much of its speed the rope keeps each frame, lower stops wobble sooner
        const MAX_SWING = 14 // degrees

        const wideLayout = window.matchMedia('(min-width: 1100px)')
        const noteEls = [...ropeBoard.querySelectorAll('.exp-note')]
        const paths = ropeBoard.querySelectorAll('.rope path')
        let spans = []
        let notes = []
        let frame = null
        let topNote = 1

        // one span of rope from a to b, its middle point is held by the note's clip
        const makeSpan = (a, b, note) => {
            const buildLength = (from, to) =>
                Math.hypot(to.x - from.x, to.y - from.y) * SLACK / POINTS_PER_SPAN
            const points = []
            const addRun = (from, to, skipFirst) => {
                for (let i = skipFirst ? 1 : 0; i <= POINTS_PER_SPAN; i++) {
                    const x = from.x + (to.x - from.x) * i / POINTS_PER_SPAN
                    const y = from.y + (to.y - from.y) * i / POINTS_PER_SPAN
                    points.push({ x, y, oldX: x, oldY: y })
                }
            }
            addRun(a, note.clip, false)
            addRun(note.clip, b, true)
            return {
                points,
                note,
                linkLengths: points.slice(1).map((_, i) =>
                    i < POINTS_PER_SPAN ? buildLength(a, note.clip) : buildLength(note.clip, b))
            }
        }

        const stepRope = () => {
            let moved = 0
            spans.forEach(({ points, note, linkLengths }) => {
                const last = points.length - 1
                for (let i = 1; i < last; i++) {
                    if (i === POINTS_PER_SPAN) continue
                    const p = points[i]
                    const x = p.x + (p.x - p.oldX) * ROPE_DRAG
                    const y = p.y + (p.y - p.oldY) * ROPE_DRAG + GRAVITY
                    p.oldX = p.x
                    p.oldY = p.y
                    p.x = x
                    p.y = y
                }
                const clip = points[POINTS_PER_SPAN]
                clip.x = note.clip.x + note.x
                clip.y = note.clip.y + note.y

                for (let pass = 0; pass < STIFFNESS_PASSES; pass++) {
                    for (let i = 0; i < last; i++) {
                        const a = points[i]
                        const b = points[i + 1]
                        const dx = b.x - a.x
                        const dy = b.y - a.y
                        const distance = Math.hypot(dx, dy) || 1
                        const correction = (distance - linkLengths[i]) / distance
                        const aFixed = i === 0 || i === POINTS_PER_SPAN
                        const bFixed = i + 1 === last || i + 1 === POINTS_PER_SPAN
                        const aShare = aFixed ? 0 : bFixed ? 1 : 0.5
                        const bShare = bFixed ? 0 : aFixed ? 1 : 0.5
                        a.x += dx * correction * aShare
                        a.y += dy * correction * aShare
                        b.x -= dx * correction * bShare
                        b.y -= dy * correction * bShare
                    }
                }
                points.forEach((p, i) => {
                    if (i === POINTS_PER_SPAN) return // the clip follows its note and isn't simulated
                    moved = Math.max(moved, Math.abs(p.x - p.oldX), Math.abs(p.y - p.oldY))
                })
            })
            return moved
        }

        const drawRope = () => {
            const d = spans.map(({ points }) => {
                let line = `M ${points[0].x} ${points[0].y}`
                for (let i = 1; i < points.length - 1; i++) {
                    const midX = (points[i].x + points[i + 1].x) / 2
                    const midY = (points[i].y + points[i + 1].y) / 2
                    line += ` Q ${points[i].x} ${points[i].y} ${midX} ${midY}`
                }
                const end = points[points.length - 1]
                return `${line} L ${end.x} ${end.y}`
            }).join(' ')
            paths.forEach((path) => path.setAttribute('d', d))
        }

        const clampToBoard = (note) => {
            note.x = Math.min(note.maxX, Math.max(note.minX, note.x))
            note.y = Math.min(note.maxY, Math.max(note.minY, note.y))
        }

        const stepNotes = () => {
            let moving = false
            notes.forEach((note) => {
                // leans with its movement, pivoting at the clip, and eases level without overshooting
                const targetSwing = Math.max(-MAX_SWING, Math.min(MAX_SWING, -note.speedX * 0.7))
                note.swing += (targetSwing - note.swing) * 0.2
                note.speedX *= 0.6

                if (!note.dragging && Math.abs(note.swing) < 0.05) {
                    note.swing = 0
                    note.speedX = 0
                } else {
                    moving = true
                }
                note.el.style.translate = `${note.x}px ${note.y}px`
                note.el.style.rotate = `${note.swing}deg`
            })
            return moving
        }

        // only runs while something is moving, so a page at rest does no work
        const tick = () => {
            const notesMoving = stepNotes()
            const ropeMoved = stepRope()
            drawRope()
            frame = notesMoving || ropeMoved > 0.02 ? requestAnimationFrame(tick) : null
        }
        const wake = () => {
            if (frame === null) frame = requestAnimationFrame(tick)
        }

        const setDragLimits = (note) => {
            const left = note.el.offsetLeft + note.el.offsetParent.offsetLeft
            const top = note.el.offsetTop + note.el.offsetParent.offsetTop
            note.minX = -left
            note.maxX = ropeBoard.clientWidth - left - note.el.offsetWidth
            note.minY = -top - 60
            note.maxY = Math.max(0, ropeBoard.clientHeight - top - note.el.offsetHeight)
        }

        const buildRope = () => {
            if (frame !== null) cancelAnimationFrame(frame)
            frame = null
            noteEls.forEach((el) => {
                el.style.removeProperty('translate')
                el.style.removeProperty('rotate')
                el.style.removeProperty('z-index')
                el.classList.remove('dragging')
            })
            if (!wideLayout.matches) {
                spans = []
                notes = []
                paths.forEach((path) => path.removeAttribute('d'))
                return
            }

            const pins = [...ropeBoard.querySelectorAll('.rope-pin')].map((pin) => {
                const style = getComputedStyle(pin)
                return { x: parseFloat(style.left), y: parseFloat(style.top) }
            })
            notes = noteEls.map((el) => {
                const note = {
                    el,
                    clip: {
                        x: el.offsetLeft + el.offsetParent.offsetLeft + el.offsetWidth / 2,
                        y: el.offsetTop + el.offsetParent.offsetTop - 8
                    },
                    x: 0, y: 0, speedX: 0, swing: 0, dragging: false
                }
                setDragLimits(note)
                return note
            })
            spans = notes.map((note, i) => makeSpan(pins[i], pins[i + 1], note))

            // settles into its hanging shape before anyone sees it
            for (let i = 0; i < 300; i++) stepRope()
            drawRope()
        }

        noteEls.forEach((el, index) => {
            el.addEventListener('pointerdown', (e) => {
                const note = notes[index]
                if (!note) return
                e.preventDefault()
                el.setPointerCapture(e.pointerId)
                el.classList.add('dragging')
                setDragLimits(note)
                note.dragging = true
                el.style.zIndex = ++topNote // the last one moved stays on top after it's dropped
                note.grabX = e.clientX - note.x
                note.grabY = e.clientY - note.y
                wake()
            })
            el.addEventListener('pointermove', (e) => {
                const note = notes[index]
                if (!note || !note.dragging) return
                const oldX = note.x
                note.x = e.clientX - note.grabX
                note.y = e.clientY - note.grabY
                clampToBoard(note)
                note.speedX = note.x - oldX
                wake()
            })
            const release = () => {
                const note = notes[index]
                if (!note || !note.dragging) return
                note.dragging = false
                note.speedX = 0 // stays where it was dropped, with no throw
                el.classList.remove('dragging')
                wake()
            }
            el.addEventListener('pointerup', release)
            el.addEventListener('pointercancel', release)
        })

        buildRope()
        window.addEventListener('resize', buildRope)
    }

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

        const HIDDEN_REPOS = ['apcsa_material', 'overfishing-site', 'Databases2026', 'IntroWebDevClass']
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
