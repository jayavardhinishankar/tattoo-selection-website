import { useRef, useState } from 'react';
import { adminApi, errorMessage } from '../../services/api';
import { formatPrice } from '../../utils/format';
import { Notice } from '../../components/StateMessage';

const MAX_MB = 5;
const MAX_FILES = 100;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function fallbackName(file) {
  const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  return baseName.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase()) || 'Tattoo design';
}

export default function TattooFolderImport({ categories, initialCategoryId }) {
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [images, setImages] = useState([]);
  const [notice, setNotice] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [importing, setImporting] = useState(false);
  const runRef = useRef(0);
  const category = categories.find((item) => item._id === categoryId);
  const pendingCount = images.filter((item) => item.status !== 'imported').length;

  const suggestNames = async (files, runId) => {
    setGenerating(true);
    let nextIndex = 0;
    const worker = async () => {
      while (nextIndex < files.length && runRef.current === runId) {
        const index = nextIndex;
        nextIndex += 1;
        const item = files[index];
        setImages((current) => current.map((image) =>
          image.id === item.id ? { ...image, aiStatus: 'generating' } : image
        ));
        try {
          const body = new FormData();
          body.append('image', item.file);
          body.append('categoryId', categoryId);
          const result = await adminApi.suggestTattooName(body);
          if (runRef.current === runId) {
            setImages((current) => current.map((image) =>
              image.id === item.id
                ? { ...image, name: result.data.name, aiStatus: 'suggested', aiError: '' }
                : image
            ));
          }
        } catch (err) {
          if (runRef.current === runId) {
            setImages((current) => current.map((image) =>
              image.id === item.id
                ? { ...image, aiStatus: 'failed', aiError: errorMessage(err, 'AI name suggestion failed.') }
                : image
            ));
          }
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, files.length) }, worker));
    if (runRef.current === runId) setGenerating(false);
  };

  const chooseFolder = (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    const accepted = [];
    const rejected = [];
    for (const file of selected) {
      if (!TYPES.includes(file.type)) rejected.push(`${file.name}: unsupported file type`);
      else if (file.size > MAX_MB * 1024 * 1024) rejected.push(`${file.name}: larger than ${MAX_MB} MB`);
      else accepted.push(file);
    }

    const runId = ++runRef.current;
    setGenerating(false);
    setNotice(rejected.length ? { type: 'error', text: rejected.slice(0, 4).join('; ') + (rejected.length > 4 ? `; and ${rejected.length - 4} more files were skipped.` : '') } : null);
    if (accepted.length > MAX_FILES) {
      setImages([]);
      setNotice({ type: 'error', text: `Choose a folder with no more than ${MAX_FILES} supported images at a time.` });
      return;
    }
    const items = accepted.map((file, index) => ({
      id: `${runId}-${index}`,
      file,
      name: fallbackName(file),
      aiStatus: 'waiting',
      aiError: '',
      status: 'ready',
      importError: '',
    }));
    setImages(items);
    if (items.length && categoryId) suggestNames(items, runId);
    else if (items.length) setNotice({ type: 'error', text: 'Choose a category before selecting a folder.' });
  };

  const retrySuggestions = () => {
    const pending = images.filter((item) => item.status !== 'imported' && item.aiStatus !== 'suggested');
    if (pending.length) suggestNames(pending, ++runRef.current);
  };

  const importImages = async () => {
    if (!category) {
      setNotice({ type: 'error', text: 'Choose a category before importing images.' });
      return;
    }
    const invalidName = images.find((item) => item.status !== 'imported' && item.name.trim().length < 2);
    if (invalidName) {
      setNotice({ type: 'error', text: `Enter a name with at least 2 characters for ${invalidName.file.name}.` });
      return;
    }

    setImporting(true);
    setNotice(null);
    let succeeded = 0;
    let failed = 0;
    for (const item of images) {
      if (item.status === 'imported') continue;
      setImages((current) => current.map((image) =>
        image.id === item.id ? { ...image, status: 'uploading', importError: '' } : image
      ));
      try {
        const body = new FormData();
        body.append('name', item.name.trim());
        body.append('categoryId', category._id);
        body.append('description', category.description || '');
        body.append('price', String(category.startingPrice));
        body.append('isActive', 'true');
        body.append('image', item.file);
        await adminApi.createTattoo(body);
        succeeded += 1;
        setImages((current) => current.map((image) =>
          image.id === item.id ? { ...image, status: 'imported' } : image
        ));
      } catch (err) {
        failed += 1;
        setImages((current) => current.map((image) =>
          image.id === item.id
            ? { ...image, status: 'failed', importError: errorMessage(err, 'Could not add this tattoo.') }
            : image
        ));
      }
    }
    setImporting(false);
    if (failed) {
      setNotice({ type: 'error', text: `Imported ${succeeded} image${succeeded === 1 ? '' : 's'}; ${failed} failed. Failed images remain in the list so you can correct names and retry.` });
    } else {
      setNotice({ type: 'success', text: `Added all ${succeeded} tattoo${succeeded === 1 ? '' : 's'} to ${category.name}.` });
    }
  };

  return (
    <details className="panel tattoo-folder-import">
      <summary>Import a folder of tattoo images with AI name suggestions</summary>
      <p className="muted small">
        Select a category and a folder. Google Gemini analyzes each image to suggest a name; review and edit names before importing.
        Images are sent to Google for suggestions. Each tattoo uses the selected category’s starting price and description.
      </p>
      {notice && <Notice type={notice.type}>{notice.text}</Notice>}
      <label className="field">
        <span>Category for this folder</span>
        <select value={categoryId} disabled={importing || generating} onChange={(event) => setCategoryId(event.target.value)}>
          {categories.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
        </select>
      </label>
      <p className="muted small">
        {category ? `${formatPrice(category.startingPrice)} starting price · ${category.description || 'No category description'}` : 'Choose a category.'}
      </p>
      <label className="field">
        <span>Choose image folder (JPG, PNG, WEBP; up to {MAX_MB} MB each and {MAX_FILES} images)</span>
        <input
          type="file"
          accept={TYPES.join(',')}
          multiple
          webkitdirectory=""
          directory=""
          disabled={!categoryId || importing || generating}
          onChange={chooseFolder}
        />
      </label>
      {generating && <p className="muted" role="status">Generating AI name suggestions…</p>}
      {images.length > 0 && (
        <>
          <div className="tattoo-folder-image-list">
            {images.map((item) => (
              <div className="tattoo-folder-image" key={item.id}>
                <div>
                  <strong>{item.file.webkitRelativePath || item.file.name}</strong>
                  <small>
                    {item.status === 'imported' ? 'Added' : item.status === 'uploading' ? 'Adding…' : item.importError || item.aiError || (item.aiStatus === 'generating' ? 'AI naming…' : item.aiStatus === 'suggested' ? 'AI name suggested — review it' : 'Name can be edited')}
                  </small>
                </div>
                <label className="field">
                  <span>Tattoo name</span>
                  <input
                    value={item.name}
                    maxLength={100}
                    disabled={importing || item.status === 'imported'}
                    onChange={(event) => setImages((current) => current.map((image) =>
                      image.id === item.id ? { ...image, name: event.target.value } : image
                    ))}
                  />
                </label>
              </div>
            ))}
          </div>
          {images.some((item) => item.aiStatus === 'failed') && (
            <button className="btn btn-ghost" type="button" onClick={retrySuggestions} disabled={importing || generating}>
              Retry failed AI suggestions
            </button>
          )}
          <button className="btn btn-light" type="button" onClick={importImages} disabled={importing || generating || pendingCount === 0}>
            {importing ? 'Adding tattoos…' : `Add ${pendingCount} image${pendingCount === 1 ? '' : 's'} to category`}
          </button>
        </>
      )}
    </details>
  );
}
