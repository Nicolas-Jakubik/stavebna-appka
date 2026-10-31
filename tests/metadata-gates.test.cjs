const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

test('release metadata verification script contains read-only catalog checks', () => {
  const sql = fs.readFileSync(path.join(__dirname,'../scripts/verify-db-readiness.sql'),'utf8')
  const withoutCommentsAndStrings=sql.replace(/--[^\n]*/g,'').replace(/'(?:''|[^'])*'/g,"''")
  for (const verb of ['create','alter','drop','truncate','insert','update','delete','grant','revoke','execute','call','do']) {
    assert.doesNotMatch(withoutCommentsAndStrings,new RegExp('\\b'+verb+'\\b','i'),verb+' not allowed')
  }
  assert.match(sql,/pg_proc/)
  assert.match(sql,/pg_trigger/)
  assert.match(sql,/has_function_privilege/)
  assert.match(sql,/has_table_privilege/)
  assert.match(sql,/relrowsecurity/)
})

test('newest recorder object migration contains server-only object-aware RPC', () => {
  const p=path.join(__dirname,'../supabase/migrations/20261001103500_project_objects.sql')
  const src=fs.readFileSync(p,'utf8')
  assert.match(src,/create or replace function public\.record_attendance_secure\(entries jsonb\)/i)
  assert.match(src,/objekt_id bigint/)
  assert.match(src,/revoke all on function public\.record_attendance_secure\(jsonb\) from public, anon, authenticated/i)
  assert.match(src,/grant execute on function public\.record_attendance_secure\(jsonb\) to service_role/i)
})

test('private backup always requires encryption before persisting an archive', () => {
  const src=fs.readFileSync(path.join(__dirname,'../scripts/backup-public-db.sh'),'utf8')
  assert.match(src,/BACKUP_AGE_RECIPIENT/)
  assert.match(src,/BACKUP_AGE_IDENTITY:\?/)
  assert.match(src,/require\|verify-ca\|verify-full/)
  assert.match(src,/age --decrypt --identity/)
  assert.match(src,/pg_dump[\s\S]*\|\s*age --encrypt/)
  assert.match(src,/\.dump\.age/)
  assert.doesNotMatch(src,/pg_dump[^\n]*--file=/)
})
