import re

with open('web/index.html', 'r') as f:
    content = f.read()

# 1. Add Charis Childcare OS to PAGE_TITLES
content = content.replace(
    "'sentinel': 'Nia HQ',",
    "'sentinel': 'Nia HQ',\n  'childcare': 'Charis Childcare OS',"
)

# 2. Add childcare routing in AppShell switch
content = content.replace(
    "case 'studio': return <StudioOSPage />;",
    "case 'studio': return <StudioOSPage />;\n      case 'childcare': return <ChildcareOSPage />;"
)

# 3. Add script tag for os-childcare.jsx
# We will just append it before the PAGE_TITLES in web/index.html
content = content.replace(
    "/* -- Page Titles Map -- */",
    "  </script>\n  <!-- ── os-childcare.jsx — Charis Childcare OS Panel ── -->\n  <script type=\"text/babel\" src=\"os-childcare.jsx\"></script>\n  <script type=\"text/babel\">\n/* -- Page Titles Map -- */"
)

# 4. Add childcare to os-data.jsx verticalKpis section in web/index.html
kpi_replacement = """    fleet: {
      metrics: [
        { label: 'Active Vehicles', value: 142 },
        { label: 'Idle / Maintenance', value: 18 }
      ]
    },
    childcare: {
      metrics: [
        { label: 'Enrolled Children', value: 24 },
        { label: 'Present Today', value: 21 },
        { label: 'Attendance Rate', value: '87.5%' },
        { label: 'Invoices Overdue', value: 1 }
      ]
    }"""
content = content.replace(
    """    fleet: {
      metrics: [
        { label: 'Active Vehicles', value: 142 },
        { label: 'Idle / Maintenance', value: 18 }
      ]
    }""",
    kpi_replacement
)

# 5. Add childcare tenant to TENANTS in web/index.html
tenant_replacement = """  { id: 'next-cargo', name: 'NEXT Cargo', vertical: 'fleet', location: 'Kampala' },
  { id: 'charis-childcare', name: 'Charis Childcare', vertical: 'childcare', location: 'Kampala' }"""
content = content.replace(
    "  { id: 'next-cargo', name: 'NEXT Cargo', vertical: 'fleet', location: 'Kampala' }",
    tenant_replacement
)

# 6. Add childcare project in DEFAULT_PROJECTS
project_replacement = """  { id: 'proj-5', tenantId: 'next-cargo', name: 'Fleet Maintenance', budget: 15000000, spent: 12500000, status: 'active' },
  { id: 'proj-childcare', tenantId: 'charis-childcare', name: 'Charis Childcare OS', budget: 5000000, spent: 1200000, status: 'active' }"""
content = content.replace(
    "  { id: 'proj-5', tenantId: 'next-cargo', name: 'Fleet Maintenance', budget: 15000000, spent: 12500000, status: 'active' }",
    project_replacement
)

# 7. Add childcare transaction
txn_replacement = """  { id: 'TXN-010', projectId: 'proj-5', amount: -2500000, date: '2026-06-18', description: 'Spare parts (Toyota)' },
  { id: 'TXN-CC-001', projectId: 'proj-childcare', amount: 300000, date: '2026-06-25', description: 'Nakamya family fee payment' }"""
content = content.replace(
    "  { id: 'TXN-010', projectId: 'proj-5', amount: -2500000, date: '2026-06-18', description: 'Spare parts (Toyota)' }",
    txn_replacement
)

# 8. Add os-agent.jsx modifications
nia_tools_replacement = """  'evaluate_health',
  'read_childcare_schedule',
  'open_childcare_os'
];"""
content = content.replace(
    "  'evaluate_health'\n];",
    nia_tools_replacement
)

nia_def_replacement = """    description: 'Evaluates the live health KPIs of a specific tenant (e.g. peak-primary or charis-childcare) and flags any critical anomalies or overdue tasks.'
  },
  {
    name: 'read_childcare_schedule',
    description: 'Reads today\\'s daily schedule and activity roster for Charis Childcare.'
  },
  {
    name: 'open_childcare_os',
    description: 'Navigates the user to the Charis Childcare OS panel.'
  }"""
content = content.replace(
    "    description: 'Evaluates the live health KPIs of a specific tenant (e.g. peak-primary) and flags any critical anomalies or overdue tasks.'\n  }",
    nia_def_replacement
)

# 9. In executeTool
exec_tool_replacement = """    case 'evaluate_health':
      const t = DB.tenants.find(tx => tx.id === args.tenant_id);
      if (!t) return `[System] Tenant ${args.tenant_id} not found.`;
      
      if (t.vertical === 'childcare') {
        const kpis = DB.verticalKpis.childcare.metrics;
        const overdue = kpis.find(k => k.label === 'Invoices Overdue')?.value || 0;
        let report = `Health Report for ${t.name}:\nAll systems nominal.`;
        if (overdue > 0) {
          report = `WARNING: ${t.name} has ${overdue} overdue invoice(s).\nPriority: High (Impacts cash flow).\nRecommendation: Draft a warm WhatsApp reminder to the family.`;
        }
        return report;
      }
      
      if (t.vertical === 'schools') {"""
content = content.replace(
    """    case 'evaluate_health':
      const t = DB.tenants.find(tx => tx.id === args.tenant_id);
      if (!t) return `[System] Tenant ${args.tenant_id} not found.`;
      if (t.vertical === 'schools') {""",
    exec_tool_replacement
)

# 10. Add routing in executeTool for open_childcare_os
routing_tool_replacement = """      return `[System] Current KPI summary for ${args.tenant_id}:\n${JSON.stringify(kpis)}`;

    case 'read_childcare_schedule':
      return `[System] Charis Childcare Today's Schedule:\\n07:30 Arrival & Free Play\\n09:00 Morning Circle\\n09:30 Structured Learning (Letters)\\n10:30 Snack Time\\n11:00 Creative Arts\\n12:00 Lunch\\n12:45 Nap Time\\n14:00 Outdoor Play\\n15:00 Pick-up Window`;

    case 'open_childcare_os':
      if (window.NEXT_OS_NAVIGATE) window.NEXT_OS_NAVIGATE('childcare');
      return `[System] Navigated to Charis Childcare OS panel.`;

    default:"""
content = content.replace(
    """      return `[System] Current KPI summary for ${args.tenant_id}:\n${JSON.stringify(kpis)}`;

    default:""",
    routing_tool_replacement
)

# 11. Add childcare to os-shell.jsx NAV_SECTIONS
nav_replacement = """  { id: 'projects', label: 'Projects', items: [
    { id: 'childcare', label: 'Childcare OS', icon: 'childcare' },
    { id: 'schools', label: 'Schools OS', icon: 'schools' },"""
content = content.replace(
    """  { id: 'projects', label: 'Projects', items: [
    { id: 'schools', label: 'Schools OS', icon: 'schools' },""",
    nav_replacement
)

# 12. Add childcare icon to os-shell.jsx
icon_replacement = """  schools: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  childcare: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
      <path d="M5 20c0-4 3-7 7-7s7 3 7 7" />
    </svg>
  ),"""
content = content.replace(
    """  schools: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),""",
    icon_replacement
)

with open('web/index.html', 'w') as f:
    f.write(content)

print("web/index.html patched.")
