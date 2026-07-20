import re

with open("web/os-childcare.jsx", "r") as f:
    data = f.read()

old_agg = """      const agg = {
        enrolled: 0, presentToday: 0, absentToday: 0,
        invoicesDue: 0, invoicesOverdue30d: 0, overdueAmount: 0,
        totalInvoiced: 0, unreadParentMessages: 0, unansweredMessages24h: 0,
        milestonesThisWeek: 0, activitiesScheduledToday: 0,
      };
      centersData.forEach(c => {
        agg.enrolled += c.kpi.enrolled;
        agg.presentToday += c.kpi.presentToday;
        agg.absentToday += c.kpi.absentToday;
        agg.invoicesDue += c.kpi.invoicesDue;
        agg.invoicesOverdue30d += c.kpi.invoicesOverdue30d;
        agg.overdueAmount += c.kpi.overdueAmount;
        agg.totalInvoiced += c.kpi.totalInvoiced;
        agg.unreadParentMessages += c.kpi.unreadParentMessages;
        agg.unansweredMessages24h += c.kpi.unansweredMessages24h;
        agg.milestonesThisWeek += c.kpi.milestonesThisWeek;
        agg.activitiesScheduledToday += c.kpi.activitiesScheduledToday;
      });"""

new_agg = """      const agg = {
        enrolled: 0, presentToday: 0, absentToday: 0, caretakers: 0,
        invoicesDue: 0, invoicesOverdue30d: 0, overdueAmount: 0,
        totalInvoiced: 0, unreadParentMessages: 0, unansweredMessages24h: 0,
        milestonesThisWeek: 0, activitiesScheduledToday: 0,
      };
      centersData.forEach(c => {
        agg.enrolled += c.kpi.enrolled;
        agg.presentToday += c.kpi.presentToday;
        agg.absentToday += c.kpi.absentToday;
        agg.caretakers += c.kpi.caretakers || 0;
        agg.invoicesDue += c.kpi.invoicesDue;
        agg.invoicesOverdue30d += c.kpi.invoicesOverdue30d;
        agg.overdueAmount += c.kpi.overdueAmount;
        agg.totalInvoiced += c.kpi.totalInvoiced;
        agg.unreadParentMessages += c.kpi.unreadParentMessages;
        agg.unansweredMessages24h += c.kpi.unansweredMessages24h;
        agg.milestonesThisWeek += c.kpi.milestonesThisWeek;
        agg.activitiesScheduledToday += c.kpi.activitiesScheduledToday;
      });
      agg.attendanceRate = agg.enrolled ? (agg.presentToday / agg.enrolled) : 0;
      agg.collectionRate = agg.totalInvoiced ? ((agg.totalInvoiced - agg.overdueAmount) / agg.totalInvoiced) : 0;
"""

if old_agg in data:
    data = data.replace(old_agg, new_agg)
    with open("web/os-childcare.jsx", "w") as f:
        f.write(data)
    print("SUCCESS")
else:
    print("FAILED TO MATCH")
