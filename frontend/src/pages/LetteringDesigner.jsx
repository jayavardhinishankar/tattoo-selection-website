import { useMemo, useState } from 'react';
import DesignPreview from '../components/DesignPreview';
import StateMessage, { Notice } from '../components/StateMessage';
import { fontCategories, fontLibrary } from '../utils/fontLibrary';
import { errorMessage, publicApi } from '../services/api';

const defaults = {
  text: '',
  letterCase: 'original',
  fontFamily: 'Alex Brush',
  fontCategory: 'Calligraphy',
  fontWeight: 400,
  italic: false,
  fontSize: 52,
  letterSpacing: 0,
  lineSpacing: 1.25,
  alignment: 'center',
  color: '#111111',
};
const requestDefaults = {
  customerName: '',
  rollNumber: '',
  instructions: '',
  suggestAdjustments: false,
};

export default function LetteringDesigner() {
  const [design, setDesign] = useState(defaults);
  const [request, setRequest] = useState(requestDefaults);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [letterError, setLetterError] = useState('');

  const fonts = useMemo(() => fontLibrary.filter((font) =>
    (!category || font.category === category) && font.family.toLowerCase().includes(search.trim().toLowerCase())
  ), [category, search]);
  const updateRequest = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setRequest((current) => ({ ...current, [key]: value }));
  };
  const updateLetter = (event) => {
    const value = event.target.value;
    if (value === '') {
      setDesign((current) => ({ ...current, text: '' }));
      setLetterError('');
    } else if (/^\p{L}$/u.test(value)) {
      setDesign((current) => ({ ...current, text: value }));
      setLetterError('');
    } else {
      setLetterError('Enter one letter only. Numbers, spaces, and words are not accepted.');
    }
  };

  async function submit(event) {
    event.preventDefault();
    setMessage(null);
    if (!/^\p{L}$/u.test(design.text)) {
      setMessage({ type: 'error', text: 'Enter exactly one letter before submitting.' });
      return;
    }
    setBusy(true);
    try {
      const result = await publicApi.submitLetteringRequest({ ...request, design });
      setMessage({ type: 'success', text: `${result.message} Reference: ${result.data.requestId}` });
      setDesign(defaults);
      setRequest(requestDefaults);
      setConfirmed(false);
      setLetterError('');
    } catch (err) {
      setMessage({ type: 'error', text: errorMessage(err, 'Could not submit the lettering request.') });
    } finally {
      setBusy(false);
    }
  }

  const selectFont = (font) => setDesign((current) => ({ ...current, fontFamily: font.family, fontCategory: font.category }));
  const style = (font) => ({
    fontFamily: `'${font.family.replace(/['\\]/g, '')}', ${font.source === 'system' ? 'system-ui' : 'cursive'}`,
    fontWeight: 500,
  });

  return (
    <section className="container section feature-page">
      <p className="eyebrow">Personal lettering studio</p>
      <h1>Letter Tattoo Designer</h1>
      <p className="muted">Create a reference for your artist. This screen preview is a design reference, not a production-ready stencil.</p>
      {message && <Notice type={message.type}>{message.text}</Notice>}
      <form className="designer-layout" onSubmit={submit}>
        <div className="designer-controls panel">
          <label className="field">
            <span>Choose your letter *</span>
            <input
              className="lettering-letter-input"
              type="text"
              value={design.text}
              onChange={updateLetter}
              placeholder="A"
              aria-invalid={Boolean(letterError)}
              aria-describedby="lettering-letter-hint"
              autoCapitalize="off"
              autoComplete="off"
              spellCheck="false"
            />
            <small className={letterError ? 'field-error' : 'field-hint'} id="lettering-letter-hint">
              {letterError || 'Enter one alphabetic character. Words and numbers are not accepted.'}
            </small>
          </label>
          <div className="font-filters">
            <label className="field"><span>Search fonts</span><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a font…" /></label>
            <label className="field"><span>Style category</span><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All styles</option>{fontCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <div className="font-list" role="listbox" aria-label="Font library">
            {fonts.map((font) => (
              <button type="button" role="option" aria-selected={design.fontFamily === font.family} className={`font-choice ${design.fontFamily === font.family ? 'selected' : ''}`} key={font.family} onClick={() => selectFont(font)} style={style(font)}>
                <span>{font.family}</span><small>{font.category}</small>
              </button>
            ))}
            {!fonts.length && <p className="muted">No fonts match that search.</p>}
          </div>
          <label className="field"><span>Font weight: {design.fontWeight}</span><select value={design.fontWeight} onChange={(e) => setDesign((current) => ({ ...current, fontWeight: Number(e.target.value) }))}>{[300, 400, 500, 600, 700, 800, 900].map((weight) => <option key={weight} value={weight}>{weight}</option>)}</select></label>
          <label className="check"><input type="checkbox" checked={design.italic} onChange={(e) => setDesign((current) => ({ ...current, italic: e.target.checked }))} /><span>Italic</span></label>
          <label className="field"><span>Lettering size: {design.fontSize}px</span><input type="range" min="16" max="120" value={design.fontSize} onChange={(e) => setDesign((current) => ({ ...current, fontSize: Number(e.target.value) }))} /></label>
          <button className="btn btn-ghost" type="button" onClick={() => { setDesign(defaults); setRequest(requestDefaults); setConfirmed(false); setLetterError(''); }}>Reset designer</button>
        </div>

        <div className="designer-submission">
          <div className="panel">
            <div className="panel-head"><h2>Live design preview</h2><span className="muted small">{design.fontFamily}</span></div>
            <div className="case-controls" aria-label="Preview letter case">
              {['original', 'uppercase', 'lowercase'].map((letterCase) => <button type="button" key={letterCase} className={`btn btn-sm ${design.letterCase === letterCase ? 'btn-selected' : 'btn-ghost'}`} onClick={() => setDesign((current) => ({ ...current, letterCase }))}>{letterCase}</button>)}
            </div>
            <DesignPreview design={design} />
            <p className="muted small">
              {design.fontCategory === 'Installed system fonts'
                ? 'This font comes from the attached Windows font list and displays when installed on your device; other devices may use a fallback.'
                : 'Google Fonts are loaded when selected. If a font is unavailable, the browser uses a cursive fallback.'}
            </p>
          </div>
          <div className="panel feature-form lettering-request-form">
            <div className="lettering-request-heading">
              <p className="eyebrow">One last step</p>
              <h2>Request details</h2>
              <p className="muted small">Add any context that will help your artist make this design yours.</p>
            </div>
            <label className="field"><span>Your name <small>(optional)</small></span><input className="lettering-field-control" type="text" autoComplete="name" maxLength={100} value={request.customerName} onChange={updateRequest('customerName')} placeholder="e.g. Alex Morgan" /></label>
            <label className="field"><span>Roll number <small>(optional)</small></span><input className="lettering-field-control" type="text" maxLength={40} value={request.rollNumber} onChange={updateRequest('rollNumber')} placeholder="Enter your roll number" /></label>
            <label className="field"><span>Additional instructions <small>(optional)</small></span><textarea className="lettering-field-control" rows={3} maxLength={2000} value={request.instructions} onChange={updateRequest('instructions')} placeholder="Share any details or questions for your artist…" /></label>
            <label className="lettering-option">
              <input type="checkbox" checked={request.suggestAdjustments} onChange={updateRequest('suggestAdjustments')} />
              <span><strong>Artist suggestions welcome</strong><small>Let the artist recommend adjustments to your design.</small></span>
            </label>
            <label className="lettering-option final-confirm">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
              <span><strong>Preview confirmed</strong><small>I reviewed the design and request details above.</small></span>
            </label>
            <button className="btn btn-light btn-block lettering-submit" type="submit" disabled={busy || !confirmed}>{busy ? 'Submitting…' : 'Submit design for review'}</button>
          </div>
        </div>
      </form>
      {message?.type === 'error' && <StateMessage tone="error" title="Check the request">{message.text}</StateMessage>}
    </section>
  );
}
