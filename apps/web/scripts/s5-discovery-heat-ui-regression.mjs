import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const discover = readFileSync(path.join(root, 'src', 'views', 'Discover.vue'), 'utf8')

assert.match(discover, /rankFallbackMode = ref\(false\)/)
assert.match(discover, /rankFallbackMode\.value = false/)
assert.match(discover, /rankFallbackMode\.value = true/)
assert.match(discover, /formatHeatScore\(tool\.hot_score\)/)
assert.match(discover, /本地工具占位顺序，不代表热度排行/)
assert.match(discover, /localeCompare\(right\.name, 'zh-CN'\)/)
assert.equal(discover.includes('getFallbackScore'), false)
assert.equal(discover.includes('11.5 - index * 0.72'), false)
assert.equal(/hot_score:\s*['"]?[0-9]+(?:\.[0-9]+)?/.test(discover), false)

console.log('ranking UI displays server heat score through one formatter: PASS')
console.log('ranking fallback is explicitly labeled as non-heat local ordering: PASS')
console.log('ranking fallback is deterministic and never fabricates numeric heat: PASS')
console.log('S5.3 discovery heat UI regression: PASS')
