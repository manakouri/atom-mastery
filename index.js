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

// --- COMPONENT: RETRIEVAL OVERLAY ---
const RetrievalScreen = ({ questions, onClose }) => {
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  if (!questions.length) return null;
  const current = questions[idx];

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
      <button onClick={onClose} className="absolute top-8 right-8 text-slate-500 font-bold uppercase tracking-tighter hover:text-white transition-colors">✕ Exit Retrieval</button>
      <div className="mb-8">
        <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Question {idx + 1} of {questions.length}</span>
        <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest">Source: {current.strand} • Session {current.sourceId}</div>
      </div>
      <div className="max-w-3xl w-full">
        <h2 className="text-4xl md:text-7xl font-black mb-12 leading-tight tracking-tight">{current.q}</h2>
        {revealed ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="text-green-400 text-3xl md:text-5xl font-bold mb-12 tracking-tight">{current.a}</div>
             <button onClick={() => { if(idx < questions.length - 1) { setIdx(idx + 1); setRevealed(false); } else { onClose(); } }}
                className="px-12 py-5 bg-white text-slate-900 rounded-3xl font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-2xl"
             >
                {idx === questions.length - 1 ? 'Finish' : 'Next Question'}
             </button>
          </div>
        ) : (
          <button onClick={() => setRevealed(true)} className="px-12 py-5 border-2 border-white/20 rounded-3xl font-black uppercase tracking-widest hover:bg-white/5 transition-colors">Reveal Answer</button>
        )}
      </div>
    </div>
  );
};

// --- MAIN APPLICATION ---
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
        const snap = await getDocs(collection(db, "master_sessions"));
        const allData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const sorted = allData.sort((a, b) => a.session_id - b.session_id);
        setSessions(sorted);
      } catch (e) { console.error("Fetch Error:", e); }
      setLoading(false);
    }
    fetchSessions();
  }, []);

  // THE ENGINE: 2x (n-1), (n-3), (n-7), (n-14)
  const startRetrieval = async () => {
    const mastered = sessions.filter(s => s.status === 'green');
    if (mastered.length < 1) return alert("You need mastered (Green) sessions to generate retrieval!");
    
    const n = Math.max(...mastered.map(s => s.session_id));
    const targets = [n - 1, n - 1, n - 3, n - 7, n - 14];
    const finalQuestions = [];
    
    let fullPool = [];
    mastered.forEach(s => s.atoms?.forEach(a => fullPool.push({ atomId: a, sessionId: s.session_id, strand: s.strand })));

    const fetchQ = async (atomId, sourceId, strand) => {
      const snap = await getDoc(doc(db, "master_atoms", atomId));
      if (snap.exists() && snap.data().retrieval_pool?.length > 0) {
        const pool = snap.data().retrieval_pool;
        return { ...pool[Math.floor(Math.random() * pool.length)], sourceId, atomId, strand };
      }
      return null;
    };

    for (const t of targets) {
      if (t <= 0) continue;
      const matches = mastered.filter(s => s.session_id === t);
      if (matches.length > 0) {
        const s = matches[Math.floor(Math.random() * matches.length)];
        const q = await fetchQ(s.atoms[Math.floor(Math.random() * s.atoms.length)], t, s.strand);
        if (q) finalQuestions.push(q);
      }
    }

    while (finalQuestions.length < 5 && fullPool.length > 0) {
      const pick = fullPool[Math.floor(Math.random() * fullPool.length)];
      if (finalQuestions.length >= 5) break; 
      const q = await fetchQ(pick.atomId, pick.sessionId, pick.strand);
      if (q) finalQuestions.push(q);
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

  const strands = [...new Set(sessions.map(s => s.strand))];

  if (loading) return <div className="p-20 text-center font-bold text-slate-400 animate-pulse uppercase tracking-widest">Initializing Roadmap...</div>;

  return (
    <div className="bg-slate-50 min-h-screen pb-20 font-sans text-slate-900">
      {retrievalSet.length > 0 && <RetrievalScreen questions={retrievalSet} onClose={() => setRetrievalSet([])} />}

      {/* STICKY HEADER */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-6">
        <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row justify-between items-center gap-6">
            <div>
              <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none">Command Center</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Multi-Strand Spaced Practice</p>
            </div>
            
            <div className="flex flex-1 max-w-xl w-full relative">
                <input type="text" placeholder="Search roadmap..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-100 border-none rounded-2xl py-4 px-12 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <span className="absolute left-4 top-4 text-slate-400">🔍</span>
            </div>

            <button onClick={startRetrieval} className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black px-8 py-4 rounded-2xl transition-all uppercase tracking-[0.2em] shadow-xl shadow-blue-200 whitespace-nowrap active:scale-95">
                Generate Daily Retrieval
            </button>
        </div>
      </div>

      {/* SIDE-BY-SIDE GRID */}
      <div className="max-w-[1400px] mx-auto pt-10 px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {strands.map(strandName => {
              const strandSessions = sessions.filter(s => s.strand === strandName && s.title.toLowerCase().includes(searchTerm.toLowerCase()));
              if (strandSessions.length === 0) return null;
              
              const masteredCount = strandSessions.filter(s => s.status === 'green').length;

              return (
                  <div key={strandName} className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col">
                      <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-end">
                        <div>
                          <h2 className="text-[12px] font-black text-blue-600 uppercase tracking-[0.4em] mb-1">{strandName}</h2>
                          <div className="text-3xl font-black text-slate-900 tracking-tighter">Curriculum</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Mastery Progress</div>
                          <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black">{masteredCount} / {strandSessions.length}</div>
                        </div>
                      </div>

                      <div className="p-4 space-y-2 max-h-[65vh] overflow-y-auto overflow-x-hidden">
                          {strandSessions.map(s => (
                              <div key={s.id} onClick={() => handleSessionClick(s)} className="group p-5 rounded-[2rem] border border-transparent hover:border-blue-200 hover:bg-blue-50/40 transition-all cursor-pointer flex items-center justify-between">
                                  <div className="flex items-center gap-5">
                                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm transition-all ${s.status === 'green' ? 'bg-green-600 text-white' : s.status === 'amber' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        {s.session_id}
                                      </div>
                                      <div>
                                        <h3 className="font-bold text-slate-800 text-[15px] leading-tight group-hover:text-blue-700 transition-colors">{s.title}</h3>
                                        <p className="text-[10px] text-slate-400 font-medium line-clamp-1 mt-0.5">{s.li}</p>
                                      </div>
                                  </div>
                                  <div className={`w-3 h-3 rounded-full shrink-0 ${s.status === 'green' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : s.status === 'amber' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]' : 'bg-slate-200'}`}></div>
                              </div>
                          ))}
                      </div>
                  </div>
              );
          })}
        </div>
      </div>

      {/* TEACHER DRAWER */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <button onClick={() => setSelectedSession(null)} className="text-slate-400 hover:text-slate-900 text-xs font-black uppercase tracking-widest">✕ Close Drawer</button>
              <div className="flex gap-3">
                {['grey', 'amber', 'green'].map(st => (
                    <button key={st} onClick={() => updateStatus(st)} className={`w-8 h-8 rounded-xl border-2 transition-all ${selectedSession.status === st ? (st === 'green' ? 'bg-green-600 border-green-700' : st === 'amber' ? 'bg-amber-500 border-amber-600' : 'bg-slate-900 border-slate-900') : 'bg-transparent border-slate-200 hover:border-slate-400'}`} />
                ))}
              </div>
            </div>
            
            <div className="p-10 space-y-12">
              <section>
                <div className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em] mb-3">{selectedSession.strand} • Session {selectedSession.session_id}</div>
                <h2 className="text-4xl font-black text-slate-900 leading-[1.1] mb-4">{selectedSession.title}</h2>
                <div className="bg-blue-50/50 border-l-4 border-blue-500 p-4 rounded-r-2xl">
                    <p className="text-slate-700 font-medium italic text-lg leading-relaxed">"{selectedSession.li}"</p>
                </div>
              </section>

              <section className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner">
                <div className="flex justify-between items-center mb-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Teacher Planning & Notes</h4>
                    <button onClick={savePlanning} className={`text-[10px] font-black px-6 py-2.5 rounded-full transition-all uppercase tracking-widest ${isSaving ? 'bg-green-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                        {isSaving ? '✓ Saved' : 'Save Session'}
                    </button>
                </div>
                <textarea 
                    value={planningText} 
                    onChange={(e) => setPlanningText(e.target.value)} 
                    placeholder="Focus groups, extension tasks, or lesson reflections..." 
                    className="w-full bg-white border border-slate-200 rounded-2xl p-6 text-sm text-slate-700 h-48 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm" 
                />
              </section>

              <section className="space-y-6 pb-10">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-3">Linked Technical Atoms</h4>
                {atoms.map((atom, i) => (
                    <div key={i} className="pl-6 border-l-2 border-slate-200 py-1 hover:border-blue-400 transition-all">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-lg border border-blue-100">{atom.atom_id}</span>
                            <h5 className="font-bold text-slate-800">{atom.title}</h5>
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed">{atom.description}</p>
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
