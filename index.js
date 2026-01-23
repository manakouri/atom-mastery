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
  const atomTypeStyles = {
  Fact: "bg-blue-100 text-blue-700 border-blue-200",           // Blue
  Categorical: "bg-green-100 text-green-700 border-green-200", // Green
  Transformation: "bg-orange-100 text-orange-700 border-orange-200", // Orange
  Routine: "bg-purple-100 text-purple-700 border-purple-200"   // Purple
};

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

  // UPDATED RETRIEVAL ENGINE WITH DE-DUPLICATION logic
  const startRetrieval = async () => {
    const mastered = sessions.filter(s => s.status === 'green');
    if (mastered.length < 1) return alert("You need mastered (Green) sessions to generate retrieval!");
    
    // 1. Identify Target Intervals
    const n = Math.max(...mastered.map(s => s.session_id));
    const targets = [n - 1, n - 1, n - 3, n - 7, n - 14];
    
    const finalQuestions = [];
    const usedAtomIds = new Set(); // To prevent duplicates

    // 2. Build a flat pool of all available mastered atoms for fallback
    let fullPool = [];
    mastered.forEach(s => {
      if (s.atoms) {
        s.atoms.forEach(aId => {
          fullPool.push({ atomId: aId, sessionId: s.session_id, strand: s.strand });
        });
      }
    });

    const fetchQ = async (atomId, sourceId, strand) => {
      const snap = await getDoc(doc(db, "master_atoms", atomId));
      if (snap.exists() && snap.data().retrieval_pool?.length > 0) {
        const pool = snap.data().retrieval_pool;
        const randomQ = pool[Math.floor(Math.random() * pool.length)];
        return { ...randomQ, sourceId, atomId, strand };
      }
      return null;
    };

    // 3. Try to fill based on intervals (n-1, n-3, etc)
    for (const t of targets) {
      if (t <= 0) continue;
      
      const sessionMatches = mastered.filter(s => s.session_id === t);
      if (sessionMatches.length > 0) {
        // Pick a random session at this interval
        const s = sessionMatches[Math.floor(Math.random() * sessionMatches.length)];
        
        // Find atoms in this session we haven't used yet
        const availableAtoms = s.atoms.filter(aId => !usedAtomIds.has(aId));
        
        if (availableAtoms.length > 0) {
          const chosenAtomId = availableAtoms[Math.floor(Math.random() * availableAtoms.length)];
          const q = await fetchQ(chosenAtomId, t, s.strand);
          if (q) {
            finalQuestions.push(q);
            usedAtomIds.add(chosenAtomId);
          }
        }
      }
    }

    // 4. Fallback: If we have fewer than 5 questions, fill from the wider pool
    // (Only choosing atoms we haven't picked yet)
    let shuffledPool = fullPool.sort(() => 0.5 - Math.random());
    
    for (const item of shuffledPool) {
      if (finalQuestions.length >= 5) break;
      if (!usedAtomIds.has(item.atomId)) {
        const q = await fetchQ(item.atomId, item.sessionId, item.strand);
        if (q) {
          finalQuestions.push(q);
          usedAtomIds.add(item.atomId);
        }
      }
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

  const resetMasteryOnly = async () => {
    const confirmReset = window.confirm("Reset all sessions to 'Untaught'? This will NOT delete your teacher notes.");
    if (!confirmReset) return;
    try {
      const updatePromises = sessions.map(s => updateDoc(doc(db, "master_sessions", s.id), { status: 'grey' }));
      await Promise.all(updatePromises);
      setSessions(prev => prev.map(s => ({ ...s, status: 'grey' })));
      alert("Mastery reset successful.");
    } catch (e) { console.error("Reset Error:", e); }
  };

  const runBulkAtomUpdate = async () => {
  // 1. Paste your data from the gem here
  const newData = [
    { id: "atom_1", type: "Fact", atom: "The symbol for 'plus' is +" },
    { id: "atom_2", type: "Categorical", atom: "Identify the numerator" },
    // ... add all your atoms here
  ];

  const confirmRun = window.confirm(`Ready to update ${newData.length} atoms in Firestore?`);
  if (!confirmRun) return;

  try {
    for (const item of newData) {
      const atomRef = doc(db, "master_atoms", item.id);
      await updateDoc(atomRef, {
        type: item.type,
        atom: item.atom
      });
      console.log(`Updated: ${item.id}`);
    }
    alert("Bulk Update Complete!");
  } catch (e) {
    console.error("Bulk Update Error:", e);
    alert("Update failed. Check console.");
  }
};

  const strands = [...new Set(sessions.map(s => s.strand))];

  if (loading) return <div className="p-20 text-center font-bold text-slate-400 animate-pulse uppercase tracking-widest">Opening Roadmap...</div>;

  return (
    <div className="bg-[#f8fafc] min-h-screen pb-20 font-sans text-slate-900">
      {retrievalSet.length > 0 && <RetrievalScreen questions={retrievalSet} onClose={() => setRetrievalSet([])} />}

      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-6 py-6">
        <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row justify-between items-center gap-6">
            <div className="flex flex-col">
              <h1 className="text-3xl font-black tracking-tighter text-slate-800 leading-none">Number Knowledge</h1>
              <div className="flex items-center gap-4 mt-3">
                 <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <div className="w-2 h-2 rounded-full bg-slate-200"></div> Untaught
                 </div>
                 <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-500">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div> Review
                 </div>
                 <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-green-600">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div> Mastered
                 </div>
              </div>
            </div>
            
            <div className="flex flex-1 max-w-xl w-full relative group">
                <input type="text" placeholder="Search roadmap..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-100 border-2 border-transparent focus:border-blue-400 focus:bg-white rounded-2xl py-4 px-12 text-sm transition-all outline-none" />
                <span className="absolute left-4 top-4 grayscale group-focus-within:grayscale-0 transition-all">🔍</span>
            </div>

            <div className="flex gap-3">
              <button onClick={resetMasteryOnly} className="px-5 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 hover:text-red-500 transition-all text-[10px] font-black uppercase tracking-widest">
                Term Reset
              </button>
              <button onClick={startRetrieval} className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black px-8 py-4 rounded-2xl transition-all uppercase tracking-[0.2em] shadow-xl shadow-blue-200 active:scale-95">
                  Generate Retrieval
              </button>
  <button 
  onClick={runBulkAtomUpdate} 
  className="px-5 py-4 rounded-2xl border-2 border-orange-200 text-orange-500 hover:bg-orange-50 transition-all text-[10px] font-black uppercase tracking-widest"
>
  Sync Atom Metadata
</button>
            </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto pt-10 px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {strands.map(strandName => {
              const strandSessions = sessions.filter(s => s.strand === strandName && s.title.toLowerCase().includes(searchTerm.toLowerCase()));
              if (strandSessions.length === 0) return null;
              
              return (
                  <div key={strandName} className="bg-white rounded-[3rem] border-2 border-slate-100 shadow-sm overflow-hidden flex flex-col">
                      <div className="p-8 border-b border-slate-50 bg-slate-50/30">
                        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">{strandName}</h2>
                        <p className="text-[11px] font-bold text-blue-500 uppercase tracking-[0.2em] mt-1">Foundational Strand</p>
                      </div>

                      <div className="p-4 space-y-2 max-h-[65vh] overflow-y-auto custom-scrollbar">
                          {strandSessions.map(s => (
                              <div key={s.id} onClick={() => handleSessionClick(s)} className="group p-5 rounded-[2rem] border-2 border-transparent hover:border-blue-100 hover:bg-blue-50/20 transition-all cursor-pointer flex items-center justify-between">
                                  <div className="flex items-center gap-5">
                                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm transition-all ${s.status === 'green' ? 'bg-green-600 text-white' : s.status === 'amber' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        {s.session_id}
                                      </div>
                                      <div>
                                        <h3 className="font-bold text-slate-800 text-[15px] leading-tight group-hover:text-blue-600 transition-colors">{s.title}</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                                            {s.status === 'green' ? 'Mastered' : s.status === 'amber' ? 'Review' : 'Untaught'}
                                        </p>
                                      </div>
                                  </div>
                                  <div className={`w-3 h-3 rounded-full shrink-0 ${s.status === 'green' ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.4)]' : s.status === 'amber' ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]' : 'bg-slate-200'}`}></div>
                              </div>
                          ))}
                      </div>
                  </div>
              );
          })}
        </div>
      </div>

      {selectedSession && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <button onClick={() => setSelectedSession(null)} className="text-slate-400 hover:text-slate-900 text-[10px] font-black uppercase tracking-[0.2em]">✕ Close Drawer</button>
              <div className="flex gap-3">
                {['grey', 'amber', 'green'].map(st => (
                    <button key={st} onClick={() => updateStatus(st)} className={`w-8 h-8 rounded-xl border-2 transition-all ${selectedSession.status === st ? (st === 'green' ? 'bg-green-600 border-green-700' : st === 'amber' ? 'bg-amber-500 border-amber-600' : 'bg-slate-900 border-slate-900') : 'bg-transparent border-slate-200'}`} />
                ))}
              </div>
            </div>
            
            <div className="p-10 space-y-12">
              <section>
                <div className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em] mb-3">{selectedSession.strand}</div>
                <h2 className="text-4xl font-black text-slate-900 leading-tight mb-4">{selectedSession.title}</h2>
                <div className="bg-slate-50 border-2 border-slate-100 p-6 rounded-[2rem]">
                    <p className="text-slate-600 font-medium italic text-lg leading-relaxed">"{selectedSession.li}"</p>
                </div>
              </section>

              <section className="bg-blue-50/30 p-8 rounded-[2.5rem] border-2 border-blue-100/50">
                <div className="flex justify-between items-center mb-6">
                    <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Teacher Planning & Notes</h4>
                    <button onClick={savePlanning} className={`text-[10px] font-black px-6 py-2.5 rounded-full transition-all uppercase tracking-widest ${isSaving ? 'bg-green-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                        {isSaving ? '✓ Saved' : 'Save Session'}
                    </button>
                </div>
                <textarea value={planningText} onChange={(e) => setPlanningText(e.target.value)} placeholder="Type notes here..." className="w-full bg-white border-2 border-slate-100 rounded-2xl p-6 text-sm text-slate-700 h-48 focus:border-blue-400 outline-none transition-all shadow-sm" />
              </section>

            <section className="space-y-6 pb-10">
  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-3">
    Conceptual Atoms Breakdown
  </h4>
  
  {atoms.length > 0 ? (
    atoms.map((atom, i) => (
      <div key={i} className="group pl-6 border-l-4 border-slate-100 hover:border-blue-400 py-2 transition-all">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          {/* THE TYPE BADGE */}
          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md border ${atomTypeStyles[atom.type] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
            {atom.type || 'Atom'}
          </span>
          
          <h5 className="font-bold text-slate-800 text-sm">{atom.title}</h5>
        </div>
        
        {/* THE ATOM DESCRIPTION */}
        <p className="text-sm text-slate-500 leading-relaxed">
          {atom.atom || atom.description}
        </p>
      </div>
    ))
  ) : (
    <div className="text-slate-400 text-xs italic">No atoms loaded for this session.</div>
  )}
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
