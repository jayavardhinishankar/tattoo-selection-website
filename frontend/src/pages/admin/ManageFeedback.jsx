import { useState } from 'react';
import usePolling from '../../hooks/usePolling';
import { adminApi, errorMessage, imageSrc } from '../../services/api';
import Spinner from '../../components/Spinner';
import ConfirmDialog from '../../components/ConfirmDialog';
import StateMessage, { Notice } from '../../components/StateMessage';

const statuses = ['pending', 'approved', 'rejected'];

export default function ManageFeedback() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const list = usePolling(() => adminApi.listFeedback({ status: status || undefined, page, limit: 20 }), [status, page], 30000);
  const items = list.data?.data || [];

  const updateStatus = async (item, nextStatus) => {
    try {
      await adminApi.updateFeedbackStatus(item._id, nextStatus);
      setNotice({ type: 'success', text: 'Feedback status updated.' });
      list.refresh();
      if (selected?._id === item._id) setSelected({ ...item, status: nextStatus });
    } catch (err) {
      setNotice({ type: 'error', text: errorMessage(err, 'Could not update feedback.') });
    }
  };

  const deleteSelected = async () => {
    setBusy(true);
    try {
      await adminApi.deleteFeedback(toDelete._id);
      setNotice({ type: 'success', text: 'Feedback deleted.' });
      if (selected?._id === toDelete._id) setSelected(null);
      setToDelete(null);
      list.refresh();
    } catch (err) {
      setNotice({ type: 'error', text: errorMessage(err, 'Could not delete feedback.') });
      setToDelete(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="admin-head feedback-admin-heading">
        <div><p className="eyebrow">Community moderation</p><h1>Customer Feedback</h1><p className="muted">Review submissions and choose which stories are shared publicly.</p></div>
        {list.data && <div className="feedback-admin-total"><strong>{list.data.pagination.total}</strong><span>{status ? `${status} submissions` : 'total submissions'}</span></div>}
      </div>
      {notice && <Notice type={notice.type} onClose={() => setNotice(null)}>{notice.text}</Notice>}
      <div className="feedback-status-filters" role="group" aria-label="Filter feedback by status">
        {[['', 'All submissions'], ['pending', 'Awaiting review'], ['approved', 'Published'], ['rejected', 'Not published']].map(([value, label]) => (
          <button type="button" key={value || 'all'} className={`feedback-filter-button ${status === value ? 'active' : ''}`} aria-pressed={status === value} onClick={() => { setStatus(value); setPage(1); }}>
            {label}
          </button>
        ))}
      </div>
      {list.loading ? <Spinner /> : list.error ? (
        <StateMessage tone="error" title="Could not load feedback" action={<button className="btn btn-light" onClick={list.refresh}>Try again</button>}>{errorMessage(list.error)}</StateMessage>
      ) : !items.length ? <StateMessage title="No feedback found">Customer submissions will appear here for review.</StateMessage> : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>Customer</th><th>Review preview</th><th>Rating</th><th>Submitted</th><th>Status</th><th>Review</th></tr></thead>
            <tbody>{items.map((item) => (
              <tr key={item._id}>
                <td><strong>{item.customerName}</strong>{item.contactEmail && <small className="feedback-table-contact">{item.contactEmail}</small>}</td>
                <td className="feedback-table-message">{item.message}</td>
                <td aria-label={`${item.rating} out of 5 stars`}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</td>
                <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                <td><span className={`pill ${item.status === 'approved' ? 'on' : 'off'}`}>{item.status === 'approved' ? 'Published' : item.status === 'pending' ? 'Pending' : 'Rejected'}</span></td>
                <td className="row-actions"><button className="btn btn-ghost btn-sm" onClick={() => setSelected(selected?._id === item._id ? null : item)}>{selected?._id === item._id ? 'Close' : 'Review'}</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {list.data?.pagination?.pages > 1 && <nav className="pagination"><button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous</button><span>Page {page} of {list.data.pagination.pages}</span><button className="btn btn-ghost btn-sm" disabled={page >= list.data.pagination.pages} onClick={() => setPage(page + 1)}>Next →</button></nav>}
      {selected && (
        <section className="panel feedback-detail">
          <div className="panel-head"><h2>Feedback details</h2><button className="icon-btn" aria-label="Close details" onClick={() => setSelected(null)}>×</button></div>
          <p className="feedback-detail-rating"><span className="feedback-stars">{'★'.repeat(selected.rating)}{'☆'.repeat(5 - selected.rating)}</span><strong>{selected.rating}/5</strong></p>
          <p className="feedback-detail-customer"><strong>{selected.customerName}</strong><time className="muted small" dateTime={selected.createdAt}>{new Date(selected.createdAt).toLocaleString()}</time></p>
          {selected.contactEmail && <p>Contact: {selected.contactEmail}</p>}
          <blockquote className="feedback-full-message">{selected.message}</blockquote>
          {selected.imageUrl && <img className="feedback-admin-image" src={imageSrc(selected.imageUrl)} alt="Customer attachment" />}
          <div className="row-actions feedback-actions">
            <label className="field"><span>Moderation status</span><select value={selected.status} onChange={(e) => updateStatus(selected, e.target.value)}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label>
            <button className="btn btn-danger-outline btn-sm" onClick={() => setToDelete(selected)}>Delete feedback</button>
          </div>
        </section>
      )}
      {toDelete && <ConfirmDialog title="Delete this feedback?" message="This submission and its uploaded image will be permanently removed." busy={busy} onConfirm={deleteSelected} onCancel={() => setToDelete(null)} />}
    </>
  );
}
