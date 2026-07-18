// Person 4: Responsible for dashboard data widgets, filters, and export triggers.
document.addEventListener('DOMContentLoaded', () => {
  refreshDashboardData();
  setInterval(refreshDashboardData, 30000);
});

let revenueChart;
let statusChart;

async function refreshDashboardData() {
  try {
    const response = await fetch('/dashboard/metrics', {
      headers: { Accept: 'application/json' }
    });
    const payload = await response.json();

    if (!payload.success) {
      return;
    }

    renderMetrics(payload.data.totals || {});
    const recentInvoices = payload.data.recent_invoices || [];
    renderRecentInvoices(recentInvoices);
    renderCharts(recentInvoices);
  } catch (error) {
    console.error('Failed to refresh dashboard data:', error);
  }
}

function renderMetrics(totals) {
  const revenue = Number(totals.revenue_sgd || 0).toFixed(2);
  setText('metricRevenue', revenue);
  setText('metricTransactions', totals.transaction_count || 0);
  setText('metricPending', totals.pending_payments || 0);
  setText('metricSettlements', totals.settlement_count || 0);
}

function renderRecentInvoices(invoices) {
  const table = document.querySelector('#recentInvoiceTable tbody');
  if (!table) {
    return;
  }

  if (!invoices.length) {
    table.innerHTML = '<tr><td colspan="5" class="text-muted">No activity yet.</td></tr>';
    return;
  }

  table.innerHTML = invoices
    .map((invoice) => {
      return `
        <tr>
          <td><a href="/invoices/${invoice.public_id}">${invoice.public_id}</a></td>
          <td>${Number(invoice.amount_sgd || 0).toFixed(2)}</td>
          <td><span class="badge bg-secondary">${invoice.status}</span></td>
          <td><span class="badge bg-dark">${invoice.payment_status || 'N/A'}</span></td>
          <td>${new Date(invoice.created_at).toLocaleString()}</td>
        </tr>
      `;
    })
    .join('');
}

function setText(elementId, text) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = text;
  }
}

function renderCharts(invoices) {
  const revenueCanvas = document.getElementById('revenueChart');
  const statusCanvas = document.getElementById('statusChart');

  if (revenueCanvas) {
    const labels = invoices.map((item) => item.public_id).reverse();
    const amounts = invoices.map((item) => Number(item.amount_sgd || 0)).reverse();

    if (revenueChart) {
      revenueChart.destroy();
    }

    revenueChart = new Chart(revenueCanvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Amount (SGD)',
            data: amounts,
            borderColor: '#f0b90b',
            backgroundColor: 'rgba(240, 185, 11, 0.15)',
            fill: true,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  if (statusCanvas) {
    const statusMap = invoices.reduce((acc, item) => {
      const status = item.status || 'UNKNOWN';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const labels = Object.keys(statusMap);
    const values = labels.map((label) => statusMap[label]);
    const colors = ['#0ecb81', '#f0b90b', '#1e80ff', '#f6465d', '#848e9c'];

    if (statusChart) {
      statusChart.destroy();
    }

    statusChart = new Chart(statusCanvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors.slice(0, Math.max(values.length, 1))
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }
}

window.DashboardService = {
  refreshDashboardData
};