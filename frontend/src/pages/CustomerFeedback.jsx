import { useState } from 'react';
import usePolling from '../hooks/usePolling';
import { errorMessage, imageSrc, publicApi } from '../services/api';
import Spinner from '../components/Spinner';
import StateMessage, { Notice } from '../components/StateMessage';

const initialForm = { customerName: '', contactEmail: '', rating: '5', message: '' };

export default function CustomerFeedback() {
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState('');
  const feedback = usePolling(() => publicApi.getApprovedFeedback({ page: 1, limit: 12 }), [], 30000);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setNotice(null);
    setError('');
    if (!form.customerName.trim() || form.customerName.length > 100) return setError('Enter your name (up to 100 characters).');
    if (!form.message.trim() || form.message.length > 2000) return setError('Write feedback (up to 2,000 characters).');
    if (form.contactEmail && (form.contactEmail.includes('@')
      ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)
      : !/^[+\d().\s-]{5,30}$/.test(form.contactEmail))) return setError('Enter a valid email address or phone number.');
    setBusy(true);
    try {
      const result = await publicApi.submitFeedback({ ...form, rating: Number(form.rating) });
      setNotice(result.message);
      setForm(initialForm);
      formElement.reset();
    } catch (err) {
      setError(errorMessage(err, 'Could not submit feedback.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="container section feature-page">
      <header className="feedback-hero">
        <div>
          <p className="eyebrow">Your experience matters</p>
          <h1>Tell us how we did.</h1>
          <p className="muted">Your feedback helps our artists keep making work you'll love. Share a few words and rate your visit.</p>
        </div>
        <aside className="feedback-promise">
          <span className="feedback-promise-icon" aria-hidden="true">✦</span>
          <strong>Reviewed with care</strong>
          <span>Every submission is checked by our team before appearing in testimonials.</span>
        </aside>
      </header>
      {notice && <Notice type="success">{notice}</Notice>}
      {error && <Notice type="error">{error}</Notice>}

      <div className="feedback-page-grid">
        <form className="panel feature-form feedback-form" onSubmit={submit}>
          <div className="feedback-form-heading">
            <div><p className="eyebrow">Customer feedback</p><h2>Leave a review</h2></div>
            <span className="muted small">* Required</span>
          </div>
          <div className="feedback-fields">
            <label className="field">
              <span>Your name *</span>
              <div className="feedback-name-control">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
                </svg>
                <input
                  className="feedback-name-input"
                  required
                  maxLength={100}
                  value={form.customerName}
                  onChange={update('customerName')}
                  autoComplete="name"
                  placeholder="e.g. Alex Morgan"
                  aria-describedby="feedback-name-hint"
                />
              </div>
              <small className="field-hint" id="feedback-name-hint">This name is shown with your review if it is approved.</small>
            </label>
            <label className="field">
              <span>Email or phone <small>(optional)</small></span>
              <input type="text" maxLength={254} value={form.contactEmail} onChange={update('contactEmail')} autoComplete="email" />
            </label>
          </div>
          <fieldset className="rating-field">
            <legend>Your rating *</legend>
            <div className="rating-buttons" role="radiogroup" aria-label="Rating from 1 to 5 stars">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  type="button"
                  key={rating}
                  role="radio"
                  aria-checked={Number(form.rating) === rating}
                  aria-label={`${rating} star${rating > 1 ? 's' : ''}`}
                  className={Number(form.rating) >= rating ? 'rating-star selected' : 'rating-star'}
                  onClick={() => setForm((current) => ({ ...current, rating: String(rating) }))}
                >
                  ★
                </button>
              ))}
              <span className="rating-caption">{form.rating} out of 5</span>
            </div>
          </fieldset>
          <label className="field">
            <span>Your feedback *</span>
            <textarea required rows={5} maxLength={2000} value={form.message} onChange={update('message')} placeholder="What stood out about your experience?" />
            <small className="field-hint">{form.message.length}/2,000 characters</small>
          </label>
          <div className="feedback-submit-row">
            <span className="muted small">Your contact information is never shown publicly.</span>
            <button className="btn btn-light" type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Send feedback'}</button>
          </div>
        </form>
        <aside className="feedback-side">
          <div className="panel feedback-guidance">
            <p className="eyebrow">A little goes a long way</p>
            <h3>Help future customers feel confident.</h3>
            <p className="muted">Tell us about the studio, your artist, or how your finished tattoo turned out. Honest, respectful feedback is always welcome.</p>
            <div className="feedback-guidance-rule" />
            <p className="small"><strong>Private by default</strong><br /><span className="muted">Your review is only published after it has been approved.</span></p>
          </div>
        </aside>
      </div>

      <div className="section-head feature-section-head feedback-testimonial-heading">
        <div><p className="eyebrow">The studio community</p><h2>Words from our customers</h2></div>
        {feedback.data?.pagination?.total > 0 && <span className="muted small">{feedback.data.pagination.total} approved review{feedback.data.pagination.total === 1 ? '' : 's'}</span>}
      </div>
      {feedback.loading ? <Spinner label="Loading testimonials…" /> : feedback.error ? (
        <StateMessage tone="error" title="Testimonials are unavailable" action={<button className="btn btn-light" onClick={feedback.refresh}>Try again</button>}>{errorMessage(feedback.error)}</StateMessage>
      ) : feedback.data?.data.length ? (
        <div className="feedback-grid">
          {feedback.data.data.map((item) => (
            <article className="panel feedback-card" key={item._id}>
              {item.imageUrl && <img src={imageSrc(item.imageUrl)} alt="Customer feedback attachment" loading="lazy" />}
              <div className="feedback-card-meta">
                <p className="feedback-stars" aria-label={`${item.rating} out of 5 stars`}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</p>
                <time className="muted small" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString()}</time>
              </div>
              <p className="feedback-card-quote">“</p>
              <blockquote>{item.message}</blockquote>
              <p className="feedback-author"><span className="feedback-avatar" aria-hidden="true">{item.customerName.slice(0, 1).toUpperCase()}</span><strong>{item.customerName}</strong></p>
            </article>
          ))}
        </div>
      ) : <StateMessage title="No testimonials yet">Approved customer feedback will appear here.</StateMessage>}
    </section>
  );
}
