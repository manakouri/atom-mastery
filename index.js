import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { 
  getFirestore, collection, getDocs, doc, getDoc, 
  query, orderBy, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB5L2VJahLNK76xWxC7MjsGbbcf70HjARs",
  authDomain: "number-knowledge-71dba.firebaseapp.com",
  projectId: "number-knowledge-71dba",
  storageBucket: "number-knowledge-71dba.firebasestorage.app",
  messagingSenderId: "931772776390",
  appId: "1:931772776390:web:e6fddd88629bcf1d803cc7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// COMPONENT: Retrieval Overlay (Fullscreen Question View)
const RetrievalScreen = ({ questions, onClose }) => {
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  if (!questions.length) return null;
  const current = questions[idx];

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
      <button onClick={onClose} className="absolute top-8 right-8 text-slate-500 font-bold uppercase tracking-tighter hover:text-white transition-colors">✕ Exit Practice</button>
      <div className="mb-8">
        <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Question {idx + 1} of {questions.length}</span>
        <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest">Source: Session {current.sourceId}</div>
      </div>
      <div className="max-w-2xl w-full">
        <h2 className="text-3xl md:text-5xl font-black mb-12 leading-tight">{current.q}</h2>
        {revealed ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="text-green-400 text-2xl md:text-4xl font-bold mb-12 tracking-tight">{current.a}</div>
             <button onClick={() => { if(idx < questions.length - 1) { setIdx(idx + 1); setRevealed(false); } else { onClose(); } }}
                className="px-10 py-4 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-transform"
             >
                {idx === questions.length - 1 ? 'Finish Session' : 'Next Question'}
             </button>
          </div>
        ) : (
          <button onClick={() => setRevealed(true)} className="px-10 py-4 border-2 border-white/20 rounded-2xl font-black uppercase tracking-widest hover:bg-white/5 transition-colors">Reveal Answer</button>
        )}
      </div>
    </div>
  );
};

function App() {
  const [sessions, setSessions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSession, setSelectedSession] = useState(null);
  const [atoms, setAtoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retrievalSet, setRetrievalSet] = useState([]);
  const [planningText, setPlanningText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const q = query(collection(db, "master_sessions"), orderBy("session_id", "asc"));
        const snap = await getDocs(q);
        setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    fetchSessions();
  }, []);

  const startRetrieval = async () => {
    const mastered = sessions.filter(s => s.status === 'green');
    if (mastered.length < 1) return alert("Mark sessions as 'Mastery' to begin retrieval.");
    
    const n = Math.max(...mastered.map(s => s.session_id));
    const targets = [n - 1, n - 1, n - 3, n - 7, n - 14];
    const finalQuestions = [];
    
    let fullPool = [];
    mastered.forEach(s => s.atoms?.forEach(a => fullPool.push({ atomId: a, sessionId: s.session_id })));

    const fetchQ = async (atomId, sourceId) => {
      const snap = await getDoc(doc(db, "master_atoms", atomId));
      if (snap.exists() && snap.data().retrieval_pool?.length > 0) {
        const pool = snap.data().retrieval_pool;
        return { ...pool[Math.floor(Math.random() * pool.length)], sourceId, atomId };
      }
      return null;
    };

    for (const t of targets) {
      if (t <= 0) continue;
      const matches = mastered.filter(s => s.session_id === t);
      if (matches.length > 0) {
        const s = matches[Math.floor(Math.random() * matches.length)];
        const q = await fetchQ(s.atoms[Math.floor(Math.random() * s.atoms.length)], t);
        if (q) finalQuestions.push(q);
      }
    }

    while (finalQuestions.length < 5 && fullPool.length > 0) {
      const pick = fullPool[Math.floor(Math.random() * fullPool.length)];
      if (finalQuestions.some(q => q.atomId === pick.atomId)) {
        if (fullPool.length <= finalQuestions.length) break;
        continue;
      }
      const q = await fetchQ(pick.atomId, pick.sessionId);
      if (q) finalQuestions.push(q);
      if (finalQuestions.length >= 5) break;
    }
    setRetrievalSet(finalQuestions);
  };

  const handleSessionClick = async (session) => {
    setSelectedSession(session);
    setPlanningText(session.planning || "");
    setAtoms([]);
    try {
      const fetched = [];
      for (const id of (session.atoms || [])) {
        const d = await getDoc(doc(db, "master_atoms", id));
        if (d.exists()) fetched.push(d.data());
      }
      setAtoms(fetched);
    } catch (e) { console.error(e); }
  };

  const updateStatus = async (newStatus) => {
    if (!selectedSession) return;
    const ref = doc(db, "master_sessions", selectedSession.id);
    await updateDoc(ref, { status: newStatus });
    setSessions(prev => prev.map(s => s.id === selectedSession.id ? { ...s, status: newStatus } : s));
    setSelectedSession(prev => ({ ...prev, status: newStatus }));
  };

  const savePlanning = async () => {
    if (!selectedSession) return;
    setIsSaving(true);
    await updateDoc(doc(db, "master_sessions", selectedSession.id), { planning: planningText });
    setSessions(prev => prev.map(s => s.id === selectedSession.id ? { ...s, planning: planningText } : s));
    setTimeout(() => setIsSaving(false), 800);
  };

  // Grouping Logic for the Roadmap
  const filtered = sessions.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.strand.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const strands = [...new Set(sessions.map(s => s.strand))];

  if (loading) return <div className="p-20 text-center font-bold text-slate-400 animate-pulse uppercase tracking-widest">Loading Unified Roadmap...</div>;

  return (
    <div className="bg-slate-50 min-h-screen pb-20 font-sans text-slate-900">
      {retrievalSet.length > 0 && <RetrievalScreen questions={retrievalSet} onClose={() => setRetrievalSet([])} />}

      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-6">
        <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-black italic tracking-tighter uppercase">Mastery Roadmap</h1>
                <button onClick={startRetrieval} className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black px-5 py-3 rounded-2xl transition-all uppercase tracking-widest shadow-lg shadow-blue-100">Daily Retrieval</button>
            </div>
            <div className="relative">
                <input type="text" placeholder="Search roadmap..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-100 border-none rounded-2xl py-3.5 px-12 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <span className="absolute left-4 top-3.5">🔍</span>
            </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto pt-8 px-4 space-y-12">
        {strands.map(strandName => {
            const strandSessions = filtered.filter(s => s.strand === strandName);
            if (strandSessions.length === 0) return null;
            
            return (
                <div key={strandName} className="space-y-4">
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2">{strandName}</h2>
                    <div className="space-y-3">
                        {strandSessions.map(s => (
                            <div key={s.id} onClick={() => handleSessionClick(s)} className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-blue-300 transition-all cursor-pointer flex items-center justify-between group shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm ${s.status === 'green' ? 'bg-green-600 text-white' : s.status === 'amber' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{s.session_id}</div>
                                    <h3 className="font-bold text-slate-800 leading-tight">{s.title}</h3>
                                </div>
                                <div className={`w-2.5 h-2.5 rounded-full ${s.status === 'green' ? 'bg-green-500' : s.status === 'amber' ? 'bg-amber-500' : 'bg-slate-200'}`}></div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        })}
      </div>

      {/* SESSION DRAWER */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl overflow-y-auto flex flex-col">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <button onClick={() => setSelectedSession(null)} className="text-slate-400 hover:text-slate-900 text-xs font-black uppercase tracking-tighter">✕ Close</button>
              <div className="flex gap-2">
                {['grey', 'amber', 'green'].map(st => (
                    <button key={st} onClick={() => updateStatus(st)} className={`w-6 h-6 rounded-full border-2 ${selectedSession.status === st ? (st === 'green' ? 'bg-green-600 border-green-700' : st === 'amber' ? 'bg-amber-500 border-amber-600' : 'bg-slate-900 border-slate-900') : 'bg-transparent border-slate-200'}`} />
                ))}
              </div>
            </div>
            
            <div className="p-8 space-y-10">
              <section>
                <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">{selectedSession.strand} • Session {selectedSession.session_id}</div>
                <h2 className="text-3xl font-black text-slate-900 leading-tight mb-2">{selectedSession.title}</h2>
                <p className="text-slate-500 font-medium italic">{selectedSession.li}</p>
              </section>

              <section className="bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Teacher Planning</h4>
                    <button onClick={savePlanning} className={`text-[10px] font-bold px-4 py-1.5 rounded-full transition-all ${isSaving ? 'bg-green-600 text-white' : 'bg-slate-900 text-white'}`}>
                        {isSaving ? '✓ Saved' : 'Save Notes'}
                    </button>
                </div>
                <textarea value={planningText} onChange={(e) => setPlanningText(e.target.value)} placeholder="Lesson notes..." className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm text-slate-700 h-40 focus:ring-2 focus:ring-blue-500 outline-none" />
              </section>

              <section className="space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Linked Atoms</h4>
                {atoms.map((atom, i) => (
                    <div key={i} className="pl-4 border-l-2 border-slate-100 py-1 hover:border-blue-400 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">{atom.atom_id}</span>
                            <h5 className="font-bold text-slate-800 text-sm">{atom.title}</h5>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">{atom.description}</p>
                    </div>
                ))}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
