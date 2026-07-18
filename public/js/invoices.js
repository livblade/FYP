document.addEventListener('DOMContentLoaded', () => {
  const rows = Array.from(document.querySelectorAll('#invoiceTableBody tr[data-status]'));
  if (!rows.length) {
    return;
  }

  const searchInput = document.getElementById('invoiceSearchInput');
  const filterButtons = Array.from(document.querySelectorAll('.invoice-filter-btn'));
  const pagination = document.getElementById('invoicePagination');
  const exportBtn = document.getElementById('exportInvoiceCsvBtn');

  const state = {
    statusFilter: 'ALL',
    searchQuery: '',
    currentPage: 1,
    perPage: 10
  };

  function getFilteredRows() {
    return rows.filter((row) => {
      const status = row.dataset.status || '';
      const text = row.textContent.toLowerCase();
      const statusMatch = state.statusFilter === 'ALL' || status === state.statusFilter;
      const searchMatch = !state.searchQuery || text.includes(state.searchQuery);
      return statusMatch && searchMatch;
    });
  }

  function renderPagination(totalCount) {
    if (!pagination) {
      return;
    }

    const pages = Math.max(1, Math.ceil(totalCount / state.perPage));
    if (state.currentPage > pages) {
      state.currentPage = pages;
    }

    pagination.innerHTML = '';
    for (let page = 1; page <= pages; page += 1) {
      const item = document.createElement('li');
      item.className = `page-item ${page === state.currentPage ? 'active' : ''}`;
      const button = document.createElement('button');
      button.className = 'page-link';
      button.type = 'button';
      button.textContent = String(page);
      button.addEventListener('click', () => {
        state.currentPage = page;
        render();
      });
      item.appendChild(button);
      pagination.appendChild(item);
    }
  }

  function render() {
    const filtered = getFilteredRows();
    const start = (state.currentPage - 1) * state.perPage;
    const end = start + state.perPage;

    rows.forEach((row) => {
      row.style.display = 'none';
    });

    filtered.slice(start, end).forEach((row) => {
      row.style.display = '';
    });

    renderPagination(filtered.length);
  }

  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      state.searchQuery = String(event.target.value || '').trim().toLowerCase();
      state.currentPage = 1;
      render();
    });
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      filterButtons.forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      state.statusFilter = button.dataset.filter || 'ALL';
      state.currentPage = 1;
      render();
    });
  });

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const filtered = getFilteredRows();
      const rowsForCsv = filtered.length ? filtered : rows;
      const csvRows = ['Invoice ID,Amount (SGD),Status,Created'];
      rowsForCsv.forEach((row) => {
        const cells = Array.from(row.querySelectorAll('td')).map((cell) => {
          return cell.textContent.replace(/\s+/g, ' ').trim().replace(/,/g, '');
        });
        csvRows.push(`"${cells[0]}","${cells[1]}","${cells[2]}","${cells[3]}"`);
      });

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoices_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  render();
});
