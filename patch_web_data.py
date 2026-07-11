import re

with open('web/index.html', 'r') as f:
    content = f.read()

# 1. Add Charis Childcare to DEFAULT_PROJECTS
project_replacement = """  const DEFAULT_PROJECTS = [
    { id: 'proj-childcare', name: 'Charis Childcare OS', client: 'Internal / Charis Creations',
      status: 'active', health: 'healthy', progress: 85, priority: 'high',
      platform: 'NEXT OS Vertical', domain: 'childcare.next',
      team: ['HT', 'ML', 'FA'], startDate: '2026-07-01', deadline: '2026-12-31',
      uptime: 100, lastDeploy: '1 hour ago', errors24h: 0, warnings24h: 1 },"""
content = content.replace("  const DEFAULT_PROJECTS = [", project_replacement)

# 2. Add Charis Childcare to DEFAULT_TENANTS
tenant_replacement = """  const DEFAULT_TENANTS = [
    { id: 'charis-childcare', name: 'Charis Childcare', vertical: 'childcare', country: 'Uganda', currency: 'UGX',
      health: 'advisory', lastSignalAt: '10m ago',
      prototypeUrl: '',
      kpis: { revenue: 5000000, expenses: 1200000 },
      verticalKpis: {
        enrolled: 24, presentToday: 21, attendanceRate: 0.875,
        invoicesOverdue: 1, unreadMessages: 5, milestonesLogged: 7,
      },
      latest: { severity: 'warn', title: '1 invoice overdue 30+ days', summary: 'Nakamya family is 30+ days overdue.' } },"""
content = content.replace("  const DEFAULT_TENANTS = [", tenant_replacement)

# 3. Add to DEFAULT_TRANSACTIONS
txn_replacement = """  const DEFAULT_TRANSACTIONS = [
    { id: 'TXN-CC-001', date: '25 Jun 2026', desc: 'Nakamya family fee payment', type: 'income', amount: 300000, category: 'Project', status: 'completed' },"""
content = content.replace("  const DEFAULT_TRANSACTIONS = [", txn_replacement)

with open('web/index.html', 'w') as f:
    f.write(content)

print("web/index.html data patched.")
