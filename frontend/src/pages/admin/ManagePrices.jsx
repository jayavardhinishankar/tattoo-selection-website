import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import usePolling from '../../hooks/usePolling';
import { adminApi, errorMessage } from '../../services/api';
import { formatPrice } from '../../utils/format';
import Spinner from '../../components/Spinner';
import StateMessage, { Notice } from '../../components/StateMessage';

export default function ManagePrices() {
  const { data, loading, error, refresh } = usePolling(adminApi.listCategories, [], 60000);
  const [values, setValues] = useState({});
  const [savingId, setSavingId] = useState('');
  const [notice, setNotice] = useState(null);

  // Seed the inputs once per category without clobbering what the admin is typing.
  useEffect(() => {
    if (!data) return;
    setValues((prev) => {
      const next = { ...prev };
      data.forEach((c) => {
        if (next[c._id] === undefined) next[c._id] = String(c.startingPrice);
      });
      return next;
    });
  }, [data]);

  const save = async (c) => {
    const raw = values[c._id];
    const price = Number(raw);
    if (raw === '' || Number.isNaN(price) || price < 0) {
      setNotice({ type: 'error', text: `Enter a valid price for ${c.name}.` });
      return;
    }
    setSavingId(c._id);
    try {
      await adminApi.updateCategory(c._id, { startingPrice: price });
      setNotice({ type: 'success', text: `${c.name} starting price updated to ${formatPrice(price)}.` });
      refresh();
    } catch (err) {
      setNotice({ type: 'error', text: errorMessage(err) });
    } finally {
      setSavingId('');
    }
  };

  return (
    <>
      <div className="admin-head">
        <h1>Manage Prices</h1>
      </div>
      <p className="muted info-text">
        The <strong>starting price</strong> is the “Starting from” amount shown on each category. Every tattoo also has its
        own <strong>individual price</strong>, which you set when adding or editing it in{' '}
        <Link to="/admin/tattoos" className="link-btn">
          Manage Tattoos
        </Link>
        .
      </p>

      {notice && (
        <Notice type={notice.type} onClose={() => setNotice(null)}>
          {notice.text}
        </Notice>
      )}

      {loading ? (
        <Spinner />
      ) : error ? (
        <StateMessage
          tone="error"
          title="Could not load prices"
          action={
            <button className="btn btn-light" onClick={refresh}>
              Try again
            </button>
          }
        >
          {errorMessage(error)}
        </StateMessage>
      ) : data.length === 0 ? (
        <StateMessage title="No categories yet">Create categories first.</StateMessage>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Current starting price</th>
                <th>New starting price (₹)</th>
                <th>Tattoos</th>
                <th aria-label="Save" />
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c._id}>
                  <td>
                    <strong>{c.name}</strong>
                    {!c.isActive && <span className="pill off pill-gap">Inactive</span>}
                  </td>
                  <td>{formatPrice(c.startingPrice)}</td>
                  <td>
                    <input
                      className="inline-input"
                      type="number"
                      min="0"
                      step="1"
                      value={values[c._id] ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [c._id]: e.target.value }))}
                    />
                  </td>
                  <td>{c.tattooCount}</td>
                  <td className="row-actions">
                    <button
                      className="btn btn-light btn-sm"
                      disabled={savingId === c._id || String(c.startingPrice) === values[c._id]}
                      onClick={() => save(c)}
                    >
                      {savingId === c._id ? 'Saving…' : 'Save'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
