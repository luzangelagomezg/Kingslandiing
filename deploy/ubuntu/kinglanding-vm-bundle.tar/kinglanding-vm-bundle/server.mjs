import { createServer } from 'node:http'
import { timingSafeEqual } from 'node:crypto'
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import initSqlJs from 'sql.js'

const projectRoot = dirname(fileURLToPath(import.meta.url))
const distRoot = resolve(projectRoot, 'dist')
const apiOnly = process.argv.includes('--api-only')
const sqlInjectionLab = process.argv.includes('--sql-injection-lab')
const port = Number(process.env.PORT ?? (apiOnly ? 4174 : 5000))
const host = process.env.HOST ?? (apiOnly ? '127.0.0.1' : '0.0.0.0')
const maxBodyBytes = 16 * 1024
const ftpUser = process.env.KINGSLANDING_FTP_USER?.trim()
const ftpPassword = process.env.KINGSLANDING_FTP_PASSWORD?.trim()
const databasePath = process.env.KINGSLANDING_DB_PATH ?? resolve(projectRoot, '.local/council.sqlite')
mkdirSync(dirname(databasePath), { recursive: true })

const SQL = await initSqlJs({
  locateFile: (filename) => resolve(projectRoot, 'node_modules/sql.js/dist', filename),
})
const councilDatabase = existsSync(databasePath)
  ? new SQL.Database(readFileSync(databasePath))
  : new SQL.Database()

councilDatabase.run(`
  CREATE TABLE IF NOT EXISTS council_records (
    id INTEGER PRIMARY KEY,
    search_key TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    message TEXT NOT NULL
  )
`)

const councilRecords = [
  [
    'libro de consultas',
    'Libro de consultas',
    'Varys señala el servicio FTP como siguiente etapa. Busca «susurros de Varys» y la «palabra del guardián» en el registro.',
  ],
  [
    'consejo',
    'Nota de los maestres',
    'Las aplicaciones deben separar los datos de las instrucciones mediante consultas preparadas.',
  ],
  [
    'cuervo',
    'Registro del Cuervo',
    'La frase de la imagen abre el índice del Consejo. Conserva el nombre del archivo hallado.',
  ],
  [
    'varys',
    'Susurro de Varys',
    'El mensaje de Varys está separado de las actas del Consejo y se encuentra en la etapa FTP.',
  ],
  [
    'seguridad',
    'Apunte sobre consultas',
    'Una consulta parametrizada conserva la estructura SQL y trata cada entrada como un valor.',
  ],
  [
    'the wall',
    'Informe de la Guardia',
    'La exploración inicial confirmó el portal del laboratorio como punto de partida del recorrido.',
  ],
]
const insertRecord = councilDatabase.prepare(
  'INSERT OR IGNORE INTO council_records (search_key, title, message) VALUES (?, ?, ?)',
)
for (const record of councilRecords) insertRecord.run(record)
insertRecord.free()

councilDatabase.run(
  "DELETE FROM council_records WHERE search_key IN ('usuario ftp', 'contraseña ftp')",
)
const upsertRecord = councilDatabase.prepare(`
  INSERT INTO council_records (search_key, title, message) VALUES (?, ?, ?)
  ON CONFLICT(search_key) DO UPDATE SET title = excluded.title, message = excluded.message
`)
upsertRecord.run(councilRecords[0])
if (ftpUser && ftpPassword) {
  upsertRecord.run([
    'susurros de varys',
    'susurros de varys',
    `En las sombras del Consejo, los mensajeros de Varys se presentan ante el guardián como «${ftpUser}».`,
  ])
  upsertRecord.run([
    'palabra del guardián',
    'palabra del guardián',
    `Para abrir el archivo de Varys, el guardián espera escuchar «${ftpPassword}».`,
  ])
}
upsertRecord.free()
writeFileSync(databasePath, Buffer.from(councilDatabase.export()))

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  })
  response.end(JSON.stringify(payload))
}

async function readJsonBody(request, response) {
  let size = 0
  const chunks = []

  for await (const chunk of request) {
    size += chunk.length
    if (size > maxBodyBytes) {
      sendJson(response, 413, { error: 'El archivo supera el tamaño permitido.' })
      return null
    }
    chunks.push(chunk)
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    sendJson(response, 400, { error: 'No se pudo leer el contenido enviado.' })
    return null
  }
}

async function validateFlag(request, response) {
  const expectedFlag = process.env.KINGSLANDING_FINAL_FLAG?.trim()
  if (!expectedFlag) {
    sendJson(response, 503, { error: 'La validación final todavía no está configurada.' })
    return
  }

  if (!request.headers['content-type']?.startsWith('application/json')) {
    sendJson(response, 415, { error: 'Envía el texto de la bandera como JSON.' })
    return
  }

  const payload = await readJsonBody(request, response)
  if (payload === null) return

  const submittedFlag = typeof payload.flag === 'string' ? payload.flag.trim() : ''
  const expected = Buffer.from(expectedFlag, 'utf8')
  const submitted = Buffer.from(submittedFlag, 'utf8')
  const valid = expected.length === submitted.length && timingSafeEqual(expected, submitted)

  sendJson(response, 200, {
    valid,
    message: valid
      ? 'La bandera fue validada. Has ganado el derecho a sentarte en el Trono de Hierro.'
      : 'La evidencia no coincide. Revisa el archivo final y vuelve a intentarlo.',
  })
}

async function searchCouncil(request, response) {
  if (!request.headers['content-type']?.startsWith('application/json')) {
    sendJson(response, 415, { error: 'Envía la búsqueda como JSON.' })
    return
  }

  const payload = await readJsonBody(request, response)
  if (payload === null) return

  const query = typeof payload?.query === 'string'
    ? payload.query.trim().toLocaleLowerCase('es')
    : ''

  if (!query || query.length > 100) {
    sendJson(response, 400, {
      error: 'Escribe una búsqueda de hasta 100 caracteres.',
    })
    return
  }

  let statement
  const records = []

  try {
    if (sqlInjectionLab) {
      // VULNERABLE A PROPÓSITO: exclusivamente para el laboratorio.
      // La entrada del usuario pasa a formar parte del código SQL.
      const sql =
        `SELECT title, message FROM council_records WHERE search_key = '${query}'`

      console.log('[LAB] SQL ejecutado:', sql)
      statement = councilDatabase.prepare(sql)
    } else {
      // SEGURO: la entrada se trata como un valor.
      statement = councilDatabase.prepare(
        'SELECT title, message FROM council_records WHERE search_key = ?',
      )
      statement.bind([query])
    }

    while (statement.step()) {
      records.push(statement.getAsObject())
    }
  } catch (error) {
    console.error('Error en la consulta del Consejo:', error)

    sendJson(response, 500, {
      error: 'No se pudo ejecutar la búsqueda.',
    })
    return
  } finally {
    statement?.free()
  }

  sendJson(response, 200, { records })
}

function serveStaticFile(request, response) {
  let pathname
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  } catch {
    response.writeHead(400).end()
    return
  }

  const normalizedPath = normalize(pathname).replace(/^([/\\])+/, '')
  let filePath = resolve(distRoot, normalizedPath || 'index.html')
  if (filePath !== distRoot && !filePath.startsWith(`${distRoot}${sep}`)) {
    response.writeHead(403).end()
    return
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    filePath = join(distRoot, 'index.html')
  }
  if (!existsSync(filePath)) {
    response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Ejecuta la compilación antes de iniciar el servidor.')
    return
  }

  response.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Type': mimeTypes[extname(filePath)] ?? 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
  })
  createReadStream(filePath).pipe(response)
}

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname

  if (request.method === 'POST' && pathname === '/api/validate-final') {
    await validateFlag(request, response)
    return
  }

  if (request.method === 'POST' && pathname === '/api/council/search') {
    await searchCouncil(request, response)
    return
  }

  if (apiOnly) {
    sendJson(response, 404, { error: 'Ruta no encontrada.' })
    return
  }

  if (request.method === 'GET' || request.method === 'HEAD') {
    serveStaticFile(request, response)
    return
  }

  sendJson(response, 405, { error: 'Método no permitido.' })
})

server.listen(port, host, () => {
  console.log(`Portal KINGSLANDING disponible en http://${host}:${port}`)
})