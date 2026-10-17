import { useState } from 'react';
import usePolling from '../../hooks/usePolling';
import { adminApi, errorMessage } from '../../services/api';
import { formatPrice } from '../../utils/format';
import Spinner from '../../components/Spinner';
import ConfirmDialog from '../../components/ConfirmDialog';
import StateMessage, { Notice } from '../../components/StateMessage';

const blank = { name: '', description: '', startingPrice: '', isActive: true };

function CategoryForm({ initial, onSaved, onCancel }) {
  const isEdit = Boolean(initial._id);
  const [form, setForm] = useState({
    name: initial.name || '',
    description: initial.description || '',
    startingPrice: initial.startingPrice !== undefined ? String(initial.startingPrice) : '',
    isActive: initial.isActive !== undefined ? initial.isActive : true,
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (ev) => {
    ev.preventDefault();
    setServerError('');
    const er = {};
    if (form.name.trim().length < 2) er.name = 'Name must be at least 2 characters';
    if (form.startingPrice === '' || Number(form.startingPrice) < 0 || Number.isNaN(Number(form.startingPrice)))
      er.startingPrice = 'Enter a valid starting price';
    setErrors(er);
    if (Object.keys(er).length) return;

    const body = {
      name: form.name.trim(),
      description: form.description.trim(),
      startingPrice: Number(form.startingPrice),
      isActive: form.isActive,
    };
    setBusy(true);
    try {
      const res = isEdit ? await adminApi.updateCategory(initial._id, body) : await adminApi.createCategory(body);
      onSaved(res.message);
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="panel" onSubmit={submit} noValidate>
      <h2>{isEdit ? `Edit “${initial.name}”` : 'Add New Category'}</h2>
      <Notice type="error">{serverError}</Notice>
      <div className="form-grid">
        <div className="form-col">
          <label className="field">
            <span>Category name</span>
            <input value={form.name} onChange={set('name')} maxLength={60} aria-invalid={!!errors.name} />
            {errors.name && <small className="field-error">{errors.name}</small>}
          </label>
          <label className="field">
            <span>Starting price (₹)</span>
            <input type="number" min="0" step="1" value={form.startingPrice} onChange={set('startingPrice')} aria-invalid={!!errors.startingPrice} />
            {errors.startingPrice && <small className="field-error">{errors.startingPrice}</small>}
          </label>
          <label className="check">
            <input type="checkbox" checked={form.isActive} onChange={set('isActive')} />
            <span>Active (visible to visitors)</span>
          </label>
        </div>
        <div className="form-col">
          <label className="field">
            <span>Description</span>
            <textarea rows={5} value={form.description} onChange={set('description')} maxLength={500} />
          </label>
        </div>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="btn btn-light" disabled={busy}>
          {busy ? 'Saving…' : 'Save Category'}
        </button>
      </div>
    </form>
  );
}

export default function ManageCategories() {
  const { data, loading, error, refresh } = usePolling(adminApi.listCategories, [], 30000);
  const [editing, setEditing] = useState(null); // null | {} (new) | category
  const [notice, setNotice] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const res = await adminApi.deleteCategory(toDelete._id);
      setNotice({ type: 'success', text: res.message });
      refresh();
    } catch (err) {
      setNotice({ type: 'error', text: errorMessage(err, 'Could not delete the category.') });
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  return (
    <>
      <div className="admin-head">
        <h1>Manage Tattoo Categories</h1>
        {!editing && (
          <button className="btn btn-light" onClick={() => setEditing(blank)}>
            + Add Category
          </button>
        )}
      </div>

      {notice && (
        <Notice type={notice.type} onClose={() => setNotice(null)}>
          {notice.text}
        </Notice>
      )}

      {editing && (
        <CategoryForm
          key={editing._id || 'new'}
          initial={editing}
          onCancel={() => setEditing(null)}
          onSaved={(msg) => {
            setEditing(null);
            setNotice({ type: 'success', text: msg });
            refresh();
          }}
        />
      )}

      {loading ? (
        <Spinner />
      ) : error ? (
        <StateMessage
          tone="error"
          title="Could not load categories"
          action={
            <button className="btn btn-light" onClick={refresh}>
              Try again
            </button>
          }
        >
          {errorMessage(error)}
        </StateMessage>
      ) : data.length === 0 ? (
        <StateMessage title="No categories">Add a category to start organising tattoos.</StateMessage>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Starting price</th>
                <th>Tattoos</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c._id}>
                  <td>
                    <strong>{c.name}</strong>
                  </td>
                  <td className="desc-cell">{c.description || '—'}</td>
                  <td>{formatPrice(c.startingPrice)}</td>
                  <td>
                    {c.tattooCount} <span className="muted small">({c.activeTattooCount} active)</span>
                  </td>
                  <td>
                    <span className={`pill ${c.isActive ? 'on' : 'off'}`}>{c.isActive ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="row-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(c)}>
                      Edit
                    </button>
                    <button className="btn btn-danger-outline btn-sm" onClick={() => setToDelete(c)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {toDelete && (
        <ConfirmDialog
          title={`Delete “${toDelete.name}”?`}
          message={
            toDelete.tattooCount > 0
              ? `This category still contains ${toDelete.tattooCount} tattoo(s), so it cannot be deleted. Move or delete those tattoos first.`
              : 'This category is empty and will be permanently removed.'
          }
          confirmLabel="Delete category"
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </>
  );
}
