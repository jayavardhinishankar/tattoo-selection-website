import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { adminApi, errorMessage, imageSrc } from '../../services/api';
import { formatNumber } from '../../utils/format';
import Spinner from '../../components/Spinner';
import StateMessage, { Notice } from '../../components/StateMessage';
import TattooFolderImport from './TattooFolderImport';

const MAX_MB = 5;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const empty = { name: '', categoryId: '', description: '', price: '', isActive: true };

export default function TattooForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(empty);
  const [categories, setCategories] = useState([]);
  const [tattoo, setTattoo] = useState(null); // the tattoo being edited
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    setForm(empty);
    setFile(null);
    setPreview('');
    setTattoo(null);
    (async () => {
      try {
        const cats = await adminApi.listCategories();
        if (!active) return;
        setCategories(cats);
        if (editing) {
          const t = await adminApi.getTattoo(id);
          if (!active) return;
          setTattoo(t);
          setForm({
            name: t.name,
            categoryId: t.categoryId?._id || '',
            description: t.description || '',
            price: String(t.price),
            isActive: t.isActive,
          });
        } else if (cats.length) {
          setForm((f) => ({
            ...f,
            categoryId: cats[0]._id,
            price: String(cats[0].startingPrice),
            description: cats[0].description || '',
          }));
        }
      } catch (err) {
        if (active) setLoadError(errorMessage(err, 'Could not load the form data.'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, editing]);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const selectCategory = (e) => {
    const categoryId = e.target.value;
    const category = categories.find((item) => item._id === categoryId);
    setForm((current) => ({
      ...current,
      categoryId,
      ...(category
        ? { price: String(category.startingPrice), description: category.description || '' }
        : {}),
    }));
  };

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    setErrors((er) => ({ ...er, image: undefined }));
    if (!f) {
      setFile(null);
      setPreview('');
      return;
    }
    if (!TYPES.includes(f.type)) {
      setErrors((er) => ({ ...er, image: 'Only JPG, PNG or WEBP images are allowed' }));
      e.target.value = '';
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setErrors((er) => ({ ...er, image: `Image must be smaller than ${MAX_MB} MB` }));
      e.target.value = '';
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (!form.categoryId) e.categoryId = 'Please choose a category';
    if (form.price === '' || Number.isNaN(Number(form.price)) || Number(form.price) < 0) e.price = 'Enter a valid price (0 or more)';
    if (!editing && !file) e.image = 'Please choose an image';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setServerError('');
    if (!validate()) return;

    const fd = new FormData();
    fd.append('name', form.name.trim());
    fd.append('categoryId', form.categoryId);
    fd.append('description', form.description.trim());
    fd.append('price', form.price);
    fd.append('isActive', String(form.isActive));
    if (file) fd.append('image', file);

    setBusy(true);
    try {
      const res = editing ? await adminApi.updateTattoo(id, fd) : await adminApi.createTattoo(fd);
      navigate('/admin/tattoos', { state: { notice: res.message } });
    } catch (err) {
      setServerError(errorMessage(err, 'Could not save the tattoo.'));
      window.scrollTo(0, 0);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;
  if (loadError)
    return (
      <StateMessage tone="error" title="Something went wrong" action={<Link to="/admin/tattoos" className="btn btn-light">Back to tattoos</Link>}>
        {loadError}
      </StateMessage>
    );

  if (!categories.length) {
    return (
      <StateMessage
        title="Create a category first"
        action={
          <Link to="/admin/categories" className="btn btn-light">
            Manage categories
          </Link>
        }
      >
        A tattoo must belong to a category.
      </StateMessage>
    );
  }

  const shownImage = preview || (tattoo ? imageSrc(tattoo.imageUrl) : '');

  return (
    <>
      <div className="admin-head">
        <h1>{editing ? `Edit Tattoo ${tattoo ? formatNumber(tattoo.tattooNumber) : ''}` : 'Add New Tattoo'}</h1>
        <Link to="/admin/tattoos" className="btn btn-ghost">
          Cancel
        </Link>
      </div>

      <Notice type="error">{serverError}</Notice>

      <form className="panel form-grid" onSubmit={submit} noValidate>
        <div className="form-col">
          <label className="field">
            <span>Tattoo name</span>
            <input value={form.name} onChange={set('name')} maxLength={100} aria-invalid={!!errors.name} />
            {errors.name && <small className="field-error">{errors.name}</small>}
          </label>

          <label className="field">
            <span>Category</span>
            <select value={form.categoryId} onChange={selectCategory} aria-invalid={!!errors.categoryId}>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                  {!c.isActive ? ' (inactive)' : ''}
                </option>
              ))}
            </select>
            {errors.categoryId && <small className="field-error">{errors.categoryId}</small>}
          </label>

          <label className="field">
            <span>Price (₹) — this tattoo&apos;s own price</span>
            <input type="number" min="0" step="1" value={form.price} onChange={set('price')} aria-invalid={!!errors.price} />
            {errors.price && <small className="field-error">{errors.price}</small>}
          </label>

          <label className="field">
            <span>Description</span>
            <textarea rows={4} value={form.description} onChange={set('description')} maxLength={1000} />
          </label>

          <label className="check">
            <input type="checkbox" checked={form.isActive} onChange={set('isActive')} />
            <span>Active (visible to visitors)</span>
          </label>
        </div>

        <div className="form-col">
          <div className="field">
            <span>Tattoo image {editing && '(leave empty to keep the current one)'}</span>
            <div className="image-drop">
              {shownImage ? <img src={shownImage} alt="Preview" /> : <p className="muted">JPG, PNG or WEBP, up to {MAX_MB} MB</p>}
            </div>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickFile} aria-invalid={!!errors.image} />
            {errors.image && <small className="field-error">{errors.image}</small>}
          </div>
          {editing && tattoo && (
            <p className="muted small">
              Tattoo number {formatNumber(tattoo.tattooNumber)} is permanent and cannot be changed.
            </p>
          )}
        </div>

        <div className="form-actions">
          <button className="btn btn-light" type="submit" disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Save Changes' : 'Add Tattoo'}
          </button>
        </div>
      </form>
      {!editing && <TattooFolderImport categories={categories} initialCategoryId={form.categoryId} />}
    </>
  );
}
