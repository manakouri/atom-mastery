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

  // 1. DATA FETCHING
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

  // 2. RETRIEVAL ENGINE (The Spaced Practice Logic)
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

  // 3. SESSION INTERACTION
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

  // 4. RESET LOGIC (Clears colors, keeps notes)
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

  const strands = [...new Set(sessions.map(s => s.strand))];

  if (loading) return <div className="p-20 text-center font-bold text-slate-400 animate-pulse uppercase tracking-widest">Opening Roadmap...</div>;

  return (
    <div className="bg-[#f8fafc] min-h-screen pb-20 font-sans text-slate-900">
      {retrievalSet.length > 0 && <RetrievalScreen questions={retrievalSet} onClose={() => setRetrievalSet([])} />}

      {/* HEADER */}
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
              <button onClick={startRetrieval} className="bg-blue-60
