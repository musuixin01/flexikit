import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (...parts) => readFileSync(path.join(root, ...parts), 'utf8')

const adminApi = read('src', 'api', 'admin.ts')
const router = read('src', 'router', 'index.ts')
const sidebar = read('src', 'components', 'layout', 'Sidebar.vue')
const layout = read('src', 'views', 'admin', 'AdminLayout.vue')
const overview = read('src', 'views', 'admin', 'AdminOverview.vue')
const users = read('src', 'views', 'admin', 'AdminUsers.vue')
const aiUsage = read('src', 'views', 'admin', 'AdminAiUsage.vue')

for (const endpoint of [
  '/admin/access',
  '/admin/overview',
  '/admin/users',
  '/admin/audit-events',
  '/admin/ai-usage',
]) {
  assert.match(adminApi, new RegExp(endpoint.replaceAll('/', '\\/')))
}

assert.equal(/api\.(post|put)\(/.test(adminApi), false)
assert.match(adminApi, /api\.patch<AdminUserDetail>\(`\/admin\/users\/\$\{userId\}\/status`/)
assert.match(adminApi, /api\.patch<AdminUserDetail>\(`\/admin\/users\/\$\{userId\}\/role`/)
assert.match(adminApi, /api\.delete<AdminDeleteUserResult>/)
assert.match(adminApi, /confirmationUsername/)
assert.match(adminApi, /response\?\.status === 403/)
assert.match(adminApi, /response\?\.status === 401/)

assert.match(router, /path: '\/admin'/)
assert.match(router, /name: 'AdminOverview'/)
assert.match(router, /name: 'AdminUsers'/)
assert.match(router, /name: 'AdminAiUsage'/)

assert.match(layout, /accessState === 'denied'/)
assert.match(layout, /accessState === 'unauthenticated'/)
assert.match(layout, /adminApi\.inspectAccess\(\)/)
assert.match(layout, /bootstrap-admin/)
assert.match(layout, /持久管理员/)
assert.match(layout, /\.admin-page \{ position: relative; z-index: 1;/)
assert.equal(layout.includes('--card-bg'), false)
assert.equal(overview.includes('--card-bg'), false)
assert.equal(users.includes('--card-bg'), false)
assert.equal(aiUsage.includes('--card-bg'), false)

assert.match(sidebar, /v-if="isAdmin"/)
assert.match(sidebar, /adminApi\.checkAccess\(\)/)
assert.match(sidebar, /to="\/admin\/overview"/)

assert.match(overview, /totalUsers/)
assert.match(overview, /adminUsers/)
assert.match(overview, /suspendedUsers/)
assert.match(overview, /newUsersLast7Days/)
assert.match(overview, /activeSessions/)
assert.match(overview, /adminApi\.listAuditEvents/)
assert.match(overview, /最近管理操作/)
assert.match(overview, /AI Usage & Cost 已启用真实统计/)
assert.match(overview, /Provider 返回的 usage/)

assert.match(users, /adminApi\.listUsers/)
assert.match(users, /adminApi\.getUserDetail/)
assert.match(users, /adminApi\.updateUserStatus/)
assert.match(users, /adminApi\.updateUserRole/)
assert.match(users, /adminApi\.deleteUser/)
assert.match(users, /admin\.users\.status\.write/)
assert.match(users, /admin\.users\.role\.write/)
assert.match(users, /admin\.users\.delete\.write/)
assert.match(users, /所有变更都会进入管理员审计/)
assert.match(users, /请输入完整用户名/)
assert.match(users, /永久删除账号/)
assert.match(users, /selected\.role === 'admin'/)
assert.match(users, /selected\.id === currentAccess\.userId/)
assert.equal(users.includes('password_hash'), false)
assert.equal(users.includes('tokenHash'), false)
assert.equal(users.includes('apiKey'), false)
assert.equal(users.includes('prompt'), false)

assert.match(aiUsage, /adminApi\.getAiUsageStatus/)
assert.match(aiUsage, /Provider usage 已接入/)
assert.match(aiUsage, /Provider 返回的真实 Token usage/)
assert.match(aiUsage, /platformEstimatedCostUsd/)
assert.match(aiUsage, /byokEstimatedCostUsd/)
assert.match(aiUsage, /unpricedRequestCount/)
assert.match(aiUsage, /pricingCatalogVersion/)
assert.match(aiUsage, /未识别模型或过期促销价不会猜价/)

console.log('Admin API limits writes to role/status PATCH and guarded user DELETE: PASS')
console.log('Admin routes expose Overview, Users and AI Usage & Cost: PASS')
console.log('Admin layout distinguishes login, denial, bootstrap and persistent access: PASS')
console.log('Users view binds safe metadata and guarded audited status/role/delete actions: PASS')
console.log('Overview exposes measured admin/status metrics and recent audit events: PASS')
console.log('AI Usage view exposes measured usage, split billing and unpriced safeguards: PASS')
console.log('S5 Admin Console V1 frontend regression: PASS')
