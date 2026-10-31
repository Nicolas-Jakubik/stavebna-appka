#!/usr/bin/env node
'use strict'

// SAFE, MANUAL, READ-ONLY check for SD-EVIDENCIA-OPRAVY-2026-10-28.
// Compare September attendance in the isolated local PG17 restore to the
// already-deployed HTTPS app read API. No names/rows/passwords are output
// or persisted. Strong data agreement does not prove the Supabase project ref.

const { execFileSync } = require('node:child_process')
const { join } = require('node:path')
const { homedir, userInfo } = require('node:os')

const LIVE_ORIGIN = 'https://stavebna-appka.vercel.app'
const DB_NAME = 'sd_evidencia_restore_20261030'
const LAB = join(homedir(), 'SD-Evidencia-TestObnovy')
const PGDATA = join(LAB, 'pgdata')
const SOCKET = join(LAB, 'socket')
const PSQL = process.env.PSQL_BIN
const LIMIT = 500

function canonicalRow(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new Error('Unexpected row')
  }
  const keys = ['meno', 'zakazka', 'datum', 'prichod', 'odchod', 'objekt_id']
  if (keys.some(key => !Object.hasOwn(row, key))) throw new Error('Missing field')
  return JSON.stringify([
    row.meno == null ? null : String(row.meno),
    row.zakazka == null ? null : String(row.zakazka),
    row.datum == null ? null : String(row.datum).slice(0, 10),
    row.prichod == null ? null : String(row.prichod).slice(0, 5),
    row.odchod == null ? null : String(row.odchod).slice(0, 5),
    row.objekt_id == null ? null : String(row.objekt_id),
  ])
}

function sameRows(local, remote) {
  if (!Array.isArray(local) || !Array.isArray(remote)) return false
  if (local.length !== remote.length) return false
  const a = local.map(canonicalRow).sort()
  const b = remote.map(canonicalRow).sort()
  return a.every((value, i) => value === b[i])
}

function sql(query) {
  if (!PSQL || !PSQL.startsWith('/')) throw new Error('PSQL_BIN not set')
  return execFileSync(PSQL, [
    '-XAtq', '-v', 'ON_ERROR_STOP=1',
    '-h', SOCKET, '-p', '55439', '-U', userInfo().username,
    '-d', DB_NAME, '-c', query,
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 15000, maxBuffer: 4 * 1024 * 1024 })
}

async function main() {
  const check = sql("SELECT current_database() || '|' || current_setting('data_directory') || '|' || (inet_server_addr() IS NULL)::text || '|' || (SELECT count(*) FROM pg_tables WHERE schemaname='public') || '|' || (SELECT count(*) FROM public.dochadzka)")
    .trim()
  if (check !== [DB_NAME, PGDATA, 'true', '12', '884'].join('|')) {
    throw new Error('Wrong local restore')
  }

  const rowsSql = [
    'SELECT jsonb_build_object(',
    "'meno', meno, 'zakazka', zakazka, 'datum', datum::text,",
    "'prichod', substring(prichod::text,1,5),",
    "'odchod', substring(odchod::text,1,5), 'objekt_id', objekt_id",
    ')::text FROM public.dochadzka',
    "WHERE datum >= '2026-09-01' AND datum <= '2026-09-30'",
    'ORDER BY id',
  ].join(' ')
  const local = sql(rowsSql).trim().split('\n').filter(Boolean).map(JSON.parse)
  if (local.length !== 200) throw new Error('Historical local count changed')

  const query = new URLSearchParams([
    ['select', 'meno,zakazka,datum,prichod,odchod,objekt_id'],
    ['datum', 'gte.2026-09-01'],
    ['datum', 'lte.2026-09-30'],
    ['limit', String(LIMIT)],
    ['offset', '0'],
  ])
  const url = LIVE_ORIGIN + '/api/recorder/database/dochadzka?' + query
  const response = await fetch(url, {
    method: 'GET', headers: { Accept: 'application/json' },
    redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(20000),
  })
  if (!response.ok) throw new Error('Live endpoint unavailable')
  const length = Number(response.headers.get('content-length'))
  if (Number.isFinite(length) && length > 1024 * 1024) throw new Error('Unexpected response size')
  const buffer = await response.arrayBuffer()
  if (buffer.byteLength > 1024 * 1024) throw new Error('Unexpected response size')
  const live = JSON.parse(Buffer.from(buffer).toString('utf8'))
  if (!Array.isArray(live) || live.length > LIMIT) throw new Error('Unexpected response shape')

  const identical = sameRows(local, live)
  console.log('Izolovaná záloha – september 2026: ' + local.length + ' záznamov')
  console.log('Používaná živá adresa – september 2026: ' + live.length + ' záznamov')
  console.log('Presná zhoda historických záznamov: ' + (identical ? 'ÁNO' : 'NIE'))
  if (identical) {
    console.log('Silná dátová zhoda, nie priame potvrdenie Vercel/Supabase ref.')
  } else {
    console.log('STOP: Rozdiel môže spôsobovať aj neskoršia úprava dochádzky. Nenasadzovať.')
    process.exitCode = 2
  }
}

if (require.main === module) {
  main().catch(() => {
    // Do not output DB/HTTP exception contents or employee data.
    console.error('STOP: Porovnanie sa nedokončilo. Nič sa neupravovalo.')
    process.exitCode = 2
  })
}

module.exports = { canonicalRow, sameRows }
