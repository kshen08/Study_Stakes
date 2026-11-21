import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

const TYPE_LABEL = { mc: 'Multiple choice', tf: 'True/False', short: 'Short answer', numeric: 'Numeric' };

function DocStatus({ doc }) {
  if (doc.status === 'ready') return <span className="pill good">Ready</span>;
  if (doc.status === 'error') return <span className="pill bad">Error</span>;
  if (doc.status === 'queued') return <span className="pill muted">Queued</span>;
  const pct = doc.chunks_total ? Math.round((doc.chunks_done / doc.chunks_total) * 100) : 0;
  return (
    <span className="progress-wrap">
      <span className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${Math.max(pct, 4)}%` }} />
      </span>
      <span className="muted small">{doc.chunks_total ? `${doc.chunks_done}/${doc.chunks_total} sections` : 'Reading file…'}</span>
    </span>
  );
}

function QuestionList({ docId, notify }) {
  const [qs, setQs] = useState(null);
  useEffect(() => {
    api.get(`/api/documents/${docId}/questions`).then(setQs).catch((e) => notify(e.message, 'bad'));
  }, [docId, notify]);
  if (!qs) return <div className="muted small pad">Loading questions…</div>;
  if (!qs.length) return <div className="muted small pad">No questions yet.</div>;
  const remove = async (id) => {
    await api.del(`/api/questions/${id}`);
    setQs((cur) => cur.filter((q) => q.id !== id));
  };
  return (
    <ul className="qlist">
      {qs.map((q) => (
        <li key={q.id}>
          <div className="qlist-meta">
            <span className={`pill tier-${q.difficulty}`}>{q.difficulty}</span>
            <span className="muted small">{TYPE_LABEL[q.type]} · p.{q.page}</span>
            <button className="link danger small" onClick={() => remove(q.id)} title="Remove this question">Remove</button>
          </div>
          <div>{q.prompt}</div>
          {q.choices && <ol className="choices-preview" type="A">{q.choices.map((c) => <li key={c} className={c === q.answer ? 'is-answer' : ''}>{c}</li>)}</ol>}
          {!q.choices && <div className="small"><strong>Answer:</strong> {q.answer}</div>}
        </li>
      ))}
    </ul>
  );
}

function CourseDetail({ course, notify, onChanged, onDeleted }) {
  const [docs, setDocs] = useState([]);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [openDoc, setOpenDoc] = useState(null);
  const fileRef = useRef();

  const load = useCallback(() => api.get(`/api/courses/${course.id}/documents`).then(setDocs).catch(() => {}), [course.id]);
  useEffect(() => { load(); }, [load]);

  const busy = docs.some((d) => d.status === 'queued' || d.status === 'processing');
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => { load(); onChanged(); }, 2000);
    return () => clearInterval(t);
  }, [busy, load, onChanged]);

  const uploadFiles = async (files) => {
    const list = [...files].filter((f) => /\.(pdf|txt|md)$/i.test(f.name));
    if (!list.length) return notify('Only PDF, .txt and .md files are supported. Export slides or Word docs to PDF first.', 'bad');
    const fd = new FormData();
    list.forEach((f) => fd.append('files', f));
    setUploading(true);
    try {
      await api.post(`/api/courses/${course.id}/documents`, fd);
      notify(`Uploaded ${list.length} file${list.length > 1 ? 's' : ''}. Generating questions…`, 'good');
      load();
      onChanged();
    } catch (e) {
      notify(e.message, 'bad');
    } finally {
      setUploading(false);
    }
  };

  const action = async (fn) => {
    try { await fn(); load(); onChanged(); } catch (e) { notify(e.message, 'bad'); }
  };

  const rename = () => {
    const name = prompt('Rename course', course.name);
    if (name && name.trim()) action(() => api.patch(`/api/courses/${course.id}`, { name }));
  };

  const del = () => {
    if (confirm(`Delete "${course.name}" and all its documents and questions?`)) {
      api.del(`/api/courses/${course.id}`).then(onDeleted).catch((e) => notify(e.message, 'bad'));
    }
  };

  return (
    <section className="card course-detail">
      <div className="row between">
        <h2>{course.name}</h2>
        <div className="row gap-sm">
          <button className="btn ghost small" onClick={rename}>Rename</button>
          <button className="btn ghost small danger" onClick={del}>Delete course</button>
        </div>
      </div>

      <div
        className={`dropzone ${drag ? 'drag' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); uploadFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileRef.current.click()}
      >
        <input ref={fileRef} type="file" accept=".pdf,.txt,.md" multiple hidden onChange={(e) => { uploadFiles(e.target.files); e.target.value = ''; }} />
        <div className="dz-icon" aria-hidden="true">⬆</div>
        <div><strong>{uploading ? 'Uploading…' : 'Drop lecture slides, notes or readings here'}</strong></div>
        <div className="muted small">PDF, .txt or .md, several at once. Generation runs on your machine and takes about 20–60s per section.</div>
      </div>

      {docs.length === 0 ? (
        <p className="muted">No documents yet. Upload something to generate questions.</p>
      ) : (
        <ul className="doclist">
          {docs.map((d) => (
            <li key={d.id} className="doc">
              <div className="doc-main">
                <div className="doc-name" title={d.filename}>{d.filename}</div>
                <div className="muted small">
                  {d.pages ? `${d.pages} page${d.pages === 1 ? '' : 's'} · ` : ''}{d.question_count} questions
                  {d.empty_pages > 0 && <span className="warn-text"> · {d.empty_pages} page{d.empty_pages > 1 ? 's' : ''} had no readable text (images/scans skipped)</span>}
                </div>
                {d.status === 'error' && <div className="bad-text small">{d.error}</div>}
              </div>
              <DocStatus doc={d} />
              <div className="doc-actions">
                {d.question_count > 0 && (
                  <button className="btn ghost small" onClick={() => setOpenDoc(openDoc === d.id ? null : d.id)}>
                    {openDoc === d.id ? 'Hide' : 'View'} questions
                  </button>
                )}
                {(d.status === 'ready' || d.status === 'error') && (
                  <button className="btn ghost small" onClick={() => action(() => api.post(`/api/documents/${d.id}/more`))}>
                    {d.status === 'error' ? 'Retry' : 'Generate more'}
                  </button>
                )}
                <button className="btn ghost small danger" onClick={() => confirm(`Delete ${d.filename} and its questions?`) && action(() => api.del(`/api/documents/${d.id}`))}>Delete</button>
              </div>
              {openDoc === d.id && <div className="doc-questions"><QuestionList docId={d.id} notify={notify} /></div>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Courses({ notify }) {
  const [courses, setCourses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [name, setName] = useState('');

  const load = useCallback(() => api.get('/api/courses').then((cs) => {
    setCourses(cs);
    setSelected((cur) => (cur && cs.some((c) => c.id === cur) ? cur : cs[0]?.id ?? null));
  }), []);
  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const c = await api.post('/api/courses', { name });
      setName('');
      await load();
      setSelected(c.id);
    } catch (err) {
      notify(err.message, 'bad');
    }
  };

  const course = courses.find((c) => c.id === selected);

  return (
    <div className="courses-layout">
      <aside className="card course-list">
        <h2>Courses</h2>
        <form onSubmit={create} className="row gap-sm">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CS 106B" aria-label="New course name" />
          <button className="btn primary" type="submit">Add</button>
        </form>
        <ul>
          {courses.map((c) => (
            <li key={c.id}>
              <button className={`course-item ${c.id === selected ? 'active' : ''}`} onClick={() => setSelected(c.id)}>
                <span>{c.name}</span>
                <span className="muted small">{c.doc_count} docs · {c.question_count} Qs</span>
              </button>
            </li>
          ))}
        </ul>
        {!courses.length && <p className="muted small">Create your first course to start uploading material.</p>}
      </aside>
      {course ? (
        <CourseDetail key={course.id} course={course} notify={notify} onChanged={load} onDeleted={load} />
      ) : (
        <section className="card empty-state">
          <h2>Add a course</h2>
          <p className="muted">Courses group your uploads (e.g. one per final). Questions are generated from each document you upload.</p>
        </section>
      )}
    </div>
  );
}
