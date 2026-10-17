import { useEffect, useState } from 'react';
import usePolling from '../../hooks/usePolling';
import DesignPreview from '../../components/DesignPreview';
import ConfirmDialog from '../../components/ConfirmDialog';
import Spinner from '../../components/Spinner';
import StateMessage, { Notice } from '../../components/StateMessage';
import { adminApi, errorMessage } from '../../services/api';

const statuses = ['pending', 'reviewing', 'approved', 'rejected', 'completed'];

export default function ManageLetteringRequests() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState('');
  const [request, setRequest] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailVersion, setDetailVersion] = useState(0);
  const [notes, setNotes] = useState('');
  const [toDelete, setToDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const list = usePolling(() => adminApi.listLetteringRequests({ search: search || undefined, status: status || undefined, page, limit: 20 }), [search, status, page], 30000);
  const items = list.data?.data || [];

  useEffect(() => {
    if (!selectedId) return undefined;
    let active = true;
    setDetailLoading(true);
    setDetailError('');
    adminApi.getLetteringRequest(selectedId)
      .then((item) => {
        if (active) {
          setRequest(item);
          setNotes(item.internalNotes || '');
        }
      })
      .catch((err) => {
        if (active) setDetailError(errorMessage(err, 'Could not load the lettering request.'));
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedId, detailVersion]);

  const openRequest = (id) => {
    setSelectedId(id);
    setRequest(null);
    setNotes('');
  };

  const saveChanges = async (patch) => {
    if (!request) return;
    setBusy(true);
    try {
      const result = await adminApi.updateLetteringRequest(request._id, patch);
      setNotice({ type: 'success', text: result.message });
      setRequest(result.data);
      list.refresh();
      if (patch.internalNotes !== undefined) setNotes(patch.internalNotes);
    } catch (err) {
      setNotice({ type: 'error', text: errorMessage(err, 'Could not update the request.') });
    } finally {
      setBusy(false);
    }
  };

  const deleteRequest = async () => {
    setBusy(true);
    try {
      await adminApi.deleteLetteringRequest(request._id);
      setSelectedId('');
      setRequest(null);
      setToDelete(false);
      setNotice({ type: 'success', text: 'Lettering request deleted.' });
      list.refresh();
    } catch (err) {
      setNotice({ type: 'error', text: errorMessage(err, 'Could not delete the request.') });
      setToDelete(false);
    } finally {
      setBusy(false);
    }
  };

  const downloadSvg = () => {
    if (!request) return;
    const link = document.createElement('a');
    link.href = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(request.svg)}`;
    link.download = `${request.requestId}.svg`;
    link.click();
  };

  const downloadJpg = async () => {
    if (!request) return;
    const svgUrl = URL.createObjectURL(new Blob([request.svg], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const image = new Image();
      image.src = svgUrl;
      await image.decode();

      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = Math.max(300, Math.ceil(request.design.fontSize * request.design.lineSpacing + 100));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Your browser could not create a canvas for the JPG image.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const jpg = await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Your browser could not generate the JPG image.'));
        }, 'image/jpeg', 0.95);
      });
      const jpgUrl = URL.createObjectURL(jpg);
      const link = document.createElement('a');
      link.href = jpgUrl;
      link.download = `${request.requestId}.jpg`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(jpgUrl), 1000);
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Could not download the JPG image.' });
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  };

  const downloadRequest = () => {
    if (!request) return;
    const { design } = request;
    const details = [
      'LETTER TATTOO REQUEST',
      `Request ID: ${request.requestId}`,
      `Status: ${request.status}`,
      `Submitted: ${new Date(request.createdAt).toLocaleString()}`,
      '',
      'CUSTOMER',
      `Name: ${request.customerName || 'Not provided'}`,
      `Roll number: ${request.rollNumber || 'Not provided'}`,
      ...(request.contact ? [`Contact: ${request.contact}`] : []),
      '',
      'DESIGN',
      `Letter: ${design.text}`,
      `Font: ${design.fontFamily} (${design.fontCategory})`,
      `Weight: ${design.fontWeight}`,
      `Italic: ${design.italic ? 'Yes' : 'No'}`,
      `Font size: ${design.fontSize}px`,
      `Case: ${design.letterCase || 'original'}`,
      `Alignment: ${design.alignment}`,
      `Letter spacing: ${design.letterSpacing}px`,
      `Line spacing: ${design.lineSpacing}`,
      `Preview color: ${design.color}`,
      ...(request.placement ? [`Placement: ${request.placement}`] : []),
      ...(request.width !== null || request.height !== null
        ? [`Approximate size: ${request.width ?? '—'} × ${request.height ?? '—'} ${request.sizeUnit}`]
        : []),
      '',
      'REQUEST DETAILS',
      `Additional instructions: ${request.instructions || 'None'}`,
      `Artist suggestions welcome: ${request.suggestAdjustments ? 'Yes' : 'No'}`,
    ];
    const blob = new Blob([details.join('\r\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${request.requestId}-request.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
      <div className="admin-head"><h1>Letter Tattoo Requests</h1></div>
      {notice && <Notice type={notice.type} onClose={() => setNotice(null)}>{notice.text}</Notice>}
      <form className="filters admin-feature-filter" onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(searchInput.trim()); }}>
        <label className="field"><span>Search request ID, name, roll number or design text</span><input type="search" maxLength={80} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} /></label>
        <label className="field"><span>Status</span><select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label>
        <button type="submit" className="btn btn-ghost">Search</button>
      </form>
      {list.loading ? <Spinner /> : list.error ? (
        <StateMessage tone="error" title="Could not load requests" action={<button className="btn btn-light" onClick={list.refresh}>Try again</button>}>{errorMessage(list.error)}</StateMessage>
      ) : !items.length ? <StateMessage title="No lettering requests found">Customer designs submitted for review will appear here.</StateMessage> : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>Roll number</th><th>Customer</th><th>Design</th><th>Submitted</th><th>Status</th><th /></tr></thead>
            <tbody>{items.map((item) => (
              <tr key={item._id}>
                <td>{item.rollNumber || '—'}</td><td>{item.customerName || '—'}</td>
                <td className="desc-cell">{item.design.text}</td><td>{new Date(item.createdAt).toLocaleDateString()}</td>
                <td><span className={`pill ${item.status === 'completed' || item.status === 'approved' ? 'on' : 'off'}`}>{item.status}</span></td>
                <td className="row-actions"><button className="btn btn-ghost btn-sm" onClick={() => openRequest(item._id)}>Review</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {list.data?.pagination?.pages > 1 && <nav className="pagination"><button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous</button><span>Page {page} of {list.data.pagination.pages}</span><button className="btn btn-ghost btn-sm" disabled={page >= list.data.pagination.pages} onClick={() => setPage(page + 1)}>Next →</button></nav>}

      {selectedId && (detailLoading ? <Spinner label="Loading request…" /> : detailError ? <StateMessage tone="error" title="Could not load request" action={<button className="btn btn-light" onClick={() => setDetailVersion((version) => version + 1)}>Try again</button>}>{detailError}</StateMessage> : request && (
        <section className="panel lettering-detail">
          <div className="panel-head"><div><p className="eyebrow">{request.requestId}</p><h2>Design reference sheet</h2></div><button className="icon-btn" aria-label="Close request" onClick={() => setSelectedId('')}>×</button></div>
          <div className="print-sheet">
            <DesignPreview design={request.design} />
            <div className="print-meta"><strong>{request.requestId}</strong><p>{request.rollNumber ? `Roll number: ${request.rollNumber}` : 'Roll number not provided'}</p></div>
          </div>
          <div className="lettering-actions"><button className="btn btn-ghost btn-sm" onClick={downloadRequest}>Download request</button><button className="btn btn-ghost btn-sm" onClick={downloadSvg}>Download SVG</button><button className="btn btn-ghost btn-sm" onClick={downloadJpg}>Download JPG</button><button className="btn btn-ghost btn-sm" onClick={() => window.print()}>Print reference</button></div>
          <dl className="request-details">
            <dt>Customer</dt><dd>{request.customerName || 'Not provided'}</dd><dt>Roll number</dt><dd>{request.rollNumber || 'Not provided'}</dd>
            {request.contact && <><dt>Contact (legacy request)</dt><dd>{request.contact}</dd></>}
            <dt>Exact text</dt><dd className="preserve-lines">{request.design.text}</dd><dt>Font</dt><dd>{request.design.fontFamily} · {request.design.fontCategory}</dd>
            <dt>Typography</dt><dd>Weight {request.design.fontWeight}, {request.design.italic ? 'italic' : 'regular'}, {request.design.fontSize}px; letter spacing {request.design.letterSpacing}px; line spacing {request.design.lineSpacing}; {request.design.alignment}; {request.design.color}; {request.design.letterCase || 'original'} case</dd>
            {request.placement && <><dt>Placement</dt><dd>{request.placement}</dd></>}
            {(request.width !== null || request.height !== null) && <><dt>Approximate size</dt><dd>{request.width ?? '—'} × {request.height ?? '—'} {request.sizeUnit}</dd></>}
            <dt>Instructions</dt><dd className="preserve-lines">{request.instructions || 'None'}</dd><dt>Artist adjustments</dt><dd>{request.suggestAdjustments ? 'Requested' : 'Not requested'}</dd>
            <dt>Submitted</dt><dd>{new Date(request.createdAt).toLocaleString()}</dd>
          </dl>
          <div className="request-edit">
            <label className="field"><span>Request status</span><select value={request.status} disabled={busy} onChange={(e) => saveChanges({ status: e.target.value })}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="field"><span>Internal admin notes (private)</span><textarea rows={4} maxLength={4000} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
            <div className="lettering-actions"><button className="btn btn-light btn-sm" disabled={busy} onClick={() => saveChanges({ internalNotes: notes })}>Save notes</button><button className="btn btn-danger-outline btn-sm" onClick={() => setToDelete(true)}>Delete request</button></div>
          </div>
        </section>
      ))}
      {toDelete && <ConfirmDialog title="Delete this design request?" message="This customer request and its saved SVG preview will be permanently removed." busy={busy} onConfirm={deleteRequest} onCancel={() => setToDelete(false)} />}
    </>
  );
}
