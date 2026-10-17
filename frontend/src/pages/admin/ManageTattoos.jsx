import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import JSZip from 'jszip';
import usePolling from '../../hooks/usePolling';
import { adminApi, errorMessage, imageSrc } from '../../services/api';
import { formatNumber, formatPrice } from '../../utils/format';
import Spinner from '../../components/Spinner';
import ConfirmDialog from '../../components/ConfirmDialog';
import StateMessage, { Notice } from '../../components/StateMessage';

export default function ManageTattoos() {
  const location = useLocation();
  const [notice, setNotice] = useState(location.state?.notice ? { type: 'success', text: location.state.notice } : null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedTattoos, setSelectedTattoos] = useState({});
  const [downloading, setDownloading] = useState(false);

  const cats = usePolling(adminApi.listCategories, [], 60000);
  const list = usePolling(
    () => adminApi.listTattoos({ search: query || undefined, category: category || undefined, status: status || undefined, page, limit: 20 }),
    [query, category, status, page],
    30000
  );

  const items = list.data?.data || [];
  const pagination = list.data?.pagination;
  const selectedItems = useMemo(() => Object.values(selectedTattoos), [selectedTattoos]);
  const currentPageSelected = items.length > 0 && items.every((item) => selectedTattoos[item._id]);

  const toggleSelected = (tattoo) => {
    setSelectedTattoos((current) => {
      const next = { ...current };
      if (next[tattoo._id]) delete next[tattoo._id];
      else next[tattoo._id] = tattoo;
      return next;
    });
  };

  const togglePageSelected = () => {
    setSelectedTattoos((current) => {
      const next = { ...current };
      if (currentPageSelected) items.forEach((item) => delete next[item._id]);
      else items.forEach((item) => { next[item._id] = item; });
      return next;
    });
  };

  const downloadSelected = async () => {
    if (!selectedItems.length) return;
    setDownloading(true);
    setNotice(null);
    try {
      const zip = new JSZip();
      const folderNames = new Map();
      const entries = await Promise.all(selectedItems.map(async (tattoo) => {
        const response = await fetch(imageSrc(tattoo.imageUrl), { credentials: 'omit' });
        if (!response.ok) throw new Error(`Could not download image for ${formatNumber(tattoo.tattooNumber)} (${response.status}).`);
        const image = await response.blob();
        if (!image.type.startsWith('image/')) throw new Error(`Downloaded file for ${formatNumber(tattoo.tattooNumber)} is not an image.`);
        return { tattoo, image, contentType: image.type };
      }));

      const safeName = (value) => value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').trim().replace(/\s+/g, '_') || 'Uncategorised';
      entries.forEach(({ tattoo, image, contentType }) => {
        const originalCategory = tattoo.categoryId?.name || 'Uncategorised';
        let folderName = folderNames.get(originalCategory);
        if (!folderName) {
          folderName = safeName(originalCategory);
          folderNames.set(originalCategory, folderName);
        }
        const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
        const filename = `${formatNumber(tattoo.tattooNumber).slice(1)}_${safeName(tattoo.name)}.${extension}`;
        zip.folder(folderName).file(filename, image);
      });
      zip.file('README.txt', `Tattoo image export\nSelected tattoos: ${entries.length}\nFolders are organized by category. Filenames start with the permanent tattoo number and include the tattoo name.\n`);
      const archive = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const url = URL.createObjectURL(archive);
      const link = document.createElement('a');
      link.href = url;
      link.download = `selected-tattoos-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice({ type: 'success', text: `Downloaded ${entries.length} tattoo image${entries.length === 1 ? '' : 's'} in a ZIP archive.` });
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Could not create the tattoo download archive.' });
    } finally {
      setDownloading(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const res = await adminApi.deleteTattoo(toDelete._id);
      setNotice({ type: 'success', text: res.message });
      setSelectedTattoos((current) => {
        const next = { ...current };
        delete next[toDelete._id];
        return next;
      });
      setToDelete(null);
      if (items.length === 1 && page > 1) setPage(page - 1);
      else list.refresh();
    } catch (err) {
      setNotice({ type: 'error', text: errorMessage(err, 'Could not delete the tattoo.') });
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (t) => {
    try {
      const fd = new FormData();
      fd.append('isActive', String(!t.isActive));
      await adminApi.updateTattoo(t._id, fd);
      setNotice({ type: 'success', text: `${formatNumber(t.tattooNumber)} is now ${t.isActive ? 'hidden from' : 'visible to'} visitors.` });
      list.refresh();
    } catch (err) {
      setNotice({ type: 'error', text: errorMessage(err) });
    }
  };

  return (
    <>
      <div className="admin-head">
        <h1>Manage Tattoos</h1>
        <Link to="/admin/tattoos/new" className="btn btn-light">
          + Add New Tattoo
        </Link>
      </div>

      {notice && (
        <Notice type={notice.type} onClose={() => setNotice(null)}>
          {notice.text}
        </Notice>
      )}

      <form
        className="filters"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(search.trim());
        }}
      >
        <input
          type="search"
          placeholder="Search by number or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxLength={60}
        />
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          <option value="">All categories</option>
          {(cats.data || []).map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button className="btn btn-ghost" type="submit">
          Search
        </button>
      </form>
      {selectedItems.length > 0 && (
        <div className="tattoo-selection-toolbar">
          <span>{selectedItems.length} tattoo{selectedItems.length === 1 ? '' : 's'} selected</span>
          <div>
            <button className="btn btn-light btn-sm" type="button" onClick={downloadSelected} disabled={downloading}>
              {downloading ? 'Preparing ZIP…' : 'Download selected tattoos'}
            </button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setSelectedTattoos({})} disabled={downloading}>
              Clear selection
            </button>
          </div>
        </div>
      )}

      {list.loading ? (
        <Spinner />
      ) : list.error ? (
        <StateMessage
          tone="error"
          title="Could not load tattoos"
          action={
            <button className="btn btn-light" onClick={list.refresh}>
              Try again
            </button>
          }
        >
          {errorMessage(list.error)}
        </StateMessage>
      ) : items.length === 0 ? (
        <StateMessage title="No tattoos found">Add a tattoo or adjust your filters.</StateMessage>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="Select all tattoos on this page"
                    checked={currentPageSelected}
                    onChange={togglePageSelected}
                  />
                </th>
                <th>Image</th>
                <th>Number</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t._id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select tattoo ${formatNumber(t.tattooNumber)} ${t.name}`}
                      checked={Boolean(selectedTattoos[t._id])}
                      onChange={() => toggleSelected(t)}
                    />
                  </td>
                  <td>
                    <img className="thumb" src={imageSrc(t.imageUrl)} alt={t.name} loading="lazy" />
                  </td>
                  <td>
                    <strong>{formatNumber(t.tattooNumber)}</strong>
                  </td>
                  <td>{t.name}</td>
                  <td>{t.categoryId?.name || '—'}</td>
                  <td>{formatPrice(t.price)}</td>
                  <td>
                    <button
                      className={`pill ${t.isActive ? 'on' : 'off'} pill-btn`}
                      onClick={() => toggleActive(t)}
                      title="Click to toggle visibility"
                    >
                      {t.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="row-actions">
                    <Link to={`/admin/tattoos/${t._id}/edit`} className="btn btn-ghost btn-sm">
                      Edit
                    </Link>
                    <button className="btn btn-danger-outline btn-sm" onClick={() => setToDelete(t)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <nav className="pagination">
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ← Previous
          </button>
          <span className="muted">
            Page {pagination.page} of {pagination.pages} ({pagination.total} tattoos)
          </span>
          <button className="btn btn-ghost btn-sm" disabled={page >= pagination.pages} onClick={() => setPage(page + 1)}>
            Next →
          </button>
        </nav>
      )}

      {toDelete && (
        <ConfirmDialog
          title={`Delete ${formatNumber(toDelete.tattooNumber)}?`}
          message={`“${toDelete.name}” will be removed from the website and its image deleted. The number ${formatNumber(
            toDelete.tattooNumber
          )} will never be reused. This cannot be undone.`}
          confirmLabel="Yes, delete"
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </>
  );
}
