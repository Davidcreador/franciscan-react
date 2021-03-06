const express = require('express')
const next = require('next')
const LRUCache = require('lru-cache')

const port = parseInt(process.env.PORT, 10) || 3000
const dev = process.env.NODE_ENV !== 'production'
const app = next({ dir: '.', dev })
const handle = app.getRequestHandler()

// This is where we cache our rendered HTML pages
const ssrCache = new LRUCache({
  max: 100,
  maxAge: dev ? 5 : 1000 * 60 * 60 // 1hour
})

app.prepare().then(() => {
  const server = express()

  // Use the `renderAndCache` utility defined below to serve pages
  server.get('/', (req, res) => renderAndCache(req, res, '/'))
  server.get('/faculty/:id', (req, res) =>
    renderAndCache(req, res, '/faculty', { id: req.params.id })
  )
  server.get('/contact/:id', (req, res) =>
    renderAndCache(req, res, '/directory', { id: req.params.id })
  )
  server.get('/news/:id', (req, res) =>
    renderAndCache(req, res, '/news', { id: req.params.id })
  )

  // Route to each page individually to one component (like majors) pass in the correct slug manually as the id
  // Make a proper route (majors/business) and have it go to the same component
  // server.get('/:id', (req, res) =>
  //   renderAndCache(req, res, '/major', { id: 'economics' })
  // )

  // Majors
  server.get('/economics', (req, res) =>
    renderAndCache(req, res, '/major', { id: 'economics' })
  )
  server.get('/major/:id', (req, res) =>
    renderAndCache(req, res, '/major', { id: req.params.id })
  )
  server.get('/accounting', (req, res) =>
    renderAndCache(req, res, '/major', { id: 'accounting' })
  )

  // server.get('/dept/:dept_id/minor/:minor_id', (req, res) =>
  //   renderAndCache(req, res, '/minor', { id: req.params.id })
  // )

  // Minors
  server.get('/comm-arts/film-studies', (req, res) =>
    renderAndCache(req, res, '/minor', { id: 'film-studies-minor' })
  )

  server.get('/minor/:id', (req, res) =>
    renderAndCache(req, res, '/minor', { id: req.params.id })
  )

  // Associate Degree Programs
  server.get('/associate', (req, res) =>
    renderAndCache(req, res, '/associate', { id: 'main' })
  )

  server.get('/associate/:id', (req, res) =>
    renderAndCache(req, res, '/associate', { id: req.params.id })
  )

  // Departments
  // server.get('/department', (req, res) =>
  //   renderAndCache(req, res, '/departmentList', { id: req.params.id })
  // )

  server.get('/department/:id', (req, res) =>
    renderAndCache(req, res, '/department', { id: req.params.id })
  )

  server.get('*', (req, res) => {
    return handle(req, res)
  })

  server.listen(port, err => {
    if (err) throw err
    console.log(`> Ready on http://localhost:${port}`)
  })
})

/*
 * NB: make sure to modify this to take into account anything that should trigger
 * an immediate page change (e.g a locale stored in req.session)
 */
function getCacheKey (req) {
  return `${req.url}`
}

function renderAndCache (req, res, pagePath, queryParams) {
  const key = getCacheKey(req)

  // If we have a page in the cache, let's serve it
  if (ssrCache.has(key)) {
    console.log(`CACHE HIT: ${key}`)
    res.send(ssrCache.get(key))
    return
  }

  // If not let's render the page into HTML
  app
    .renderToHTML(req, res, pagePath, queryParams)
    .then(html => {
      // Let's cache this page
      console.log(`CACHE MISS: ${key}`)
      ssrCache.set(key, html)

      res.send(html)
    })
    .catch(err => {
      app.renderError(err, req, res, pagePath, queryParams)
    })
}
