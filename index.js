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

// COMPONENT: Retrieval Overlay
const RetrievalScreen = ({ questions, onClose }) => {
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);

  if (!questions.length) return null;
  const current = questions[idx];

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
      <button onClick={onClose} className="absolute top-8 right-8 text-slate-500 font-bold uppercase tracking-tighter">✕ Exit</button>
      
      <div className="mb-8">
        <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Question {idx + 1} of {questions.length}</span>
        <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold">Session Source: {current.sourceId}</div>
      </div>

      <div className="max-w-2xl w-full">
        <h2 className="text-3xl md:text-5xl font-black mb-12 leading-tight">{current.q}</h2>
        
        {revealed ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="text-green-400 text-2xl md:text-4xl font-bold mb-12">{current.a}</div>
             <button 
                onClick={() => {
                    if(idx < questions.length - 1) { setIdx(idx + 1); setRevealed(false); }
                    else { onClose(); }
                }}
                className="px-10 py-4 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-transform"
             >
                {idx === questions.length - 1 ? 'Finish' : 'Next Question'}
             </button>
          </div>
        ) : (
          <button 
            onClick={() => setRevealed(true)}
            className="px-10 py-4 border-2 border-white/20 rounded-2xl font-black uppercase tracking-widest hover:bg-white/5 transition-colors"
          >
            Reveal Answer
          </button>
        )}
      </div>
    </div>
  );
};

// MAIN APP
function App() {
  const [sessions, setSessions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSession, setSelectedSession] = useState(null);
  const [atoms, setAtoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retrievalSet, setRetrievalSet] = useState([]);

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

  // THE SPACED RETRIEVAL LOGIC

  const startRetrieval = async () => {
    // 1. Get all mastered sessions
    const mastered = sessions.filter(s => s.status === 'green');
    
    if (mastered.length < 1) {
      return alert("You need at least one 'Mastery' (Green) session to start retrieval!");
    }

    // 2. Determine 'n' (the highest session ID reached so far)
    const n = Math.max(...mastered.map(s => s.session_id));
    
    // 3. Define our ideal targets [n-1, n-1, n-3, n-7, n-14]
    const targets = [n - 1, n - 1, n - 3, n - 7, n - 14];
    const finalQuestions = [];
    
    // 4. Create a pool of ALL mastered atoms to use for gap-filling
    let masteredAtomsPool = [];
    for (const session of mastered) {
      for (const atomId of (session.atoms || [])) {
        masteredAtomsPool.push({ atomId, sessionId: session.session_id });
      }
    }

    // Helper to fetch a random question from a specific atom ID
    const getRandomQuestionFromAtom = async (atomId, sourceId) => {
      const atomSnap = await getDoc(doc(db, "master_atoms", atomId));
      if (atomSnap.exists()) {
        const data = atomSnap.data();
        const pool = data.retrieval_pool || [];
        if (pool.length > 0) {
          const randomQ = pool[Math.floor(Math.random() * pool.length)];
          return { ...randomQ, sourceId, atomId };
        }
      }
      return null;
    };

    // 5. Try to fill based on Spaced Targets
    for (const targetId of targets) {
      if (targetId <= 0) continue;
      
      // Find all sessions matching this target ID (could be multiple strands)
      const potentialSessions = mastered.filter(s => s.session_id === targetId);
      
      if (potentialSessions.length > 0) {
        // Pick a random session from the matches, then a random atom from that session
        const selectedSession = potentialSessions[Math.floor(Math.random() * potentialSessions.length)];
        const selectedAtomId = selectedSession.atoms[Math.floor(Math.random() * selectedSession.atoms.length)];
        
        const q = await getRandomQuestionFromAtom(selectedAtomId, targetId);
        if (q) finalQuestions.push(q);
      }
    }

    // 6. GAP FILLING: If we have < 5 questions, draw randomly from the entire mastered pool
    while (finalQuestions.length < 5 && masteredAtomsPool.length > 0) {
      const randomEntry = masteredAtomsPool[Math.floor(Math.random() * masteredAtomsPool.length)];
      
      // Prevent duplicates in the same set
      if (finalQuestions.some(q => q.atomId === randomEntry.atomId)) {
          // If we have very few atoms, we might have to allow duplicates, 
          // but for now we'll just try to avoid them.
          if (masteredAtomsPool.length <= finalQuestions.length) break; 
          continue; 
      }

      const q = await getRandomQuestionFromAtom(randomEntry.atomId, randomEntry.sessionId);
      if (q) finalQuestions.push(q);
      
      // Safety break to prevent infinite loops if atoms don't have questions
      if (finalQuestions.length >= 5) break;
    }

    setRetrievalSet(finalQuestions);
  };

  const handleSessionClick = async (session) => {
    setSelectedSession(session);
    setAtoms([]);
    try {
      const fetchedAtoms = [];
      for (const atomId of (session.atoms || [])) {
        const atomDoc = await getDoc(doc(db, "master_atoms", atomId));
        if (atomDoc.exists()) fetchedAtoms.push(atomDoc.data());
      }
      setAtoms(fetchedAtoms);
    } catch (e) { console.error(e); }
  };

  const updateStatus = async (newStatus) => {
    if (!selectedSession) return;
    try {
      const sessionRef = doc(db, "master_sessions", selectedSession.id);
      await updateDoc(sessionRef, { status: newStatus });
      setSessions(prev => prev.map(s => s.id === selectedSession.id ? { ...s, status: newStatus } : s));
      setSelectedSession(prev => ({ ...prev, status: newStatus }));
    } catch (e) { alert(e.message); }
  };

  if (loading) return <div className="p-20 text-center text-slate-400 font-bold">Initializing...</div>;

  return (
    <div className="bg-slate-50 min-h-screen pb-20 font-sans">
      {retrievalSet.length > 0 && <RetrievalScreen questions={retrievalSet} onClose={() => setRetrievalSet([])} />}

      <div className="max-w-2xl mx-auto px-4 py-10">
        <header className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase">Roadmap</h1>
            <button 
                onClick={startRetrieval}
                className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black px-6 py-3 rounded-2xl shadow-lg shadow-blue-200 transition-all uppercase tracking-[0.2em]"
            >
                Generate Retrieval
            </button>
        </header>

        <div className="relative mb-8">
            <input type="text" placeholder="Search roadmap..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl py-4 px-12 text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500" />
            <span className="absolute left-4 top-4">🔍</span>
        </div>

        <div className="space-y-4">
          {sessions.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
            <div key={s.id} onClick={() => handleSessionClick(s)} className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-blue-400 transition-all cursor-pointer flex items-center justify-between group">
              <div className="flex items-center gap-5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${s.status === 'green' ? 'bg-green-600 text-white' : s.status === 'amber' ? 'bg-amber-500 text-white' : 'bg-slate-50 text-slate-400'}`}>{s.session_id}</div>
                <div>
                    <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{s.strand}</div>
                    <h3 className="font-bold text-slate-800">{s.title}</h3>
                </div>
              </div>
              <div className={`w-3 h-3 rounded-full ${s.status === 'green' ? 'bg-green-500' : s.status === 'amber' ? 'bg-amber-500' : 'bg-slate-200'}`}></div>
            </div>
          ))}
        </div>
      </div>

      {/* SESSION DRAWER (TEACHER VIEW) */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl overflow-y-auto p-8 flex flex-col">
            <button onClick={() => setSelectedSession(null)} className="text-slate-400 hover:text-slate-900 text-xs font-bold uppercase mb-8">✕ Close</button>
            <div className="mb-8">
                <h2 className="text-3xl font-black mb-2">{selectedSession.title}</h2>
                <p className="text-slate-500 font-medium italic mb-6">{selectedSession.li}</p>
                <div className="flex gap-4">
                    {['grey', 'amber', 'green'].map(st => (
                        <button key={st} onClick={() => updateStatus(st)} className={`flex-1 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${selectedSession.status === st ? (st === 'green' ? 'bg-green-600 border-green-600 text-white' : st === 'amber' ? 'bg-amber-500 border-amber-500 text-white' : 'bg-slate-900 border-slate-900 text-white') : 'bg-white border-slate-200 text-slate-400'}`}>
                            {st === 'grey' ? 'Untaught' : st === 'amber' ? 'Review' : 'Mastery'}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Technical Atoms</h4>
                {atoms.map((atom, i) => (
                    <div key={i} className="pl-4 border-l-2 border-slate-100 py-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">{atom.atom_id}</span>
                            <h5 className="font-bold text-slate-800 text-sm">{atom.title}</h5>
                        </div>
                        <p className="text-xs text-slate-500">{atom.description}</p>
                    </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
