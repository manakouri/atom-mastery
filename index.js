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

const StatusBadge = ({ status }) => {
  const styles = {
    green: "bg-green-100 text-green-700 border-green-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    grey: "bg-slate-100 text-slate-500 border-slate-200"
  };
  const labels = { green: 'Mastery', amber: 'Needs Repeating', grey: 'Untaught' };
  return <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${styles[status] || styles.grey}`}>{labels[status] || 'Untaught'}</span>;
};

function App() {
  const [sessions, setSessions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSession, setSelectedSession] = useState(null);
  const [atoms, setAtoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [planningText, setPlanningText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [practiceMode, setPracticeMode] = useState(false);
  const [revealedIndex, setRevealedIndex] = useState(null);

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

  const handleSessionClick = async (session) => {
    setSelectedSession(session);
    setPlanningText(session.planning || "");
    setAtoms([]);
    setPracticeMode(false);
    setRevealedIndex(null);
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

  const savePlanning = async () => {
    if (!selectedSession) return;
    setIsSaving(true);
    try {
      const sessionRef = doc(db, "master_sessions", selectedSession.id);
      await updateDoc(sessionRef, { planning: planningText });
      setSessions(prev => prev.map(s => s.id === selectedSession.id ? { ...s, planning: planningText } : s));
      setTimeout(() => setIsSaving(false), 1000);
    } catch (e) { setIsSaving(false); }
  };

  const totalSessions = sessions.length;
  const masteredSessions = sessions.filter(s => s.status === 'green').length;
  const progressPercent = totalSessions > 0 ? Math.round((masteredSessions / totalSessions) * 100) : 0;
  
  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.strand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.session_id.toString() === searchTerm
  );

  if (loading) return <div className="p-20 text-center font-bold text-slate-400">Loading Roadmap...</div>;

  return (
    <div className="bg-slate-50 min-h-screen pb-20 font-sans">
      {/* HEADER */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-6">
        <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-end mb-4">
                <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase italic leading-none">Roadmap</h1>
                <span className="text-2xl font-black text-green-600">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-6">
                <div className="h-full bg-green-500 transition-all duration-700" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <div className="relative">
                <input type="text" placeholder="Search sessions..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-12 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <span className="absolute left-4 top-3.5">🔍</span>
            </div>
        </div>
      </div>

      {/* LIST */}
      <div className="max-w-2xl mx-auto pt-8 px-4 space-y-4">
        {filteredSessions.map(s => (
          <div key={s.id} onClick={() => handleSessionClick(s)} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all cursor-pointer">
            <div className="flex gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 ${s.status === 'green' ? 'bg-green-600 text-white' : s.status === 'amber' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{s.session_id}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{s.strand}</span>
                  <StatusBadge status={s.status} />
                </div>
                <h3 className="font-bold text-slate-800">{s.title}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* DRAWER */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl overflow-y-auto flex flex-col">
            <div className="p-6 border-b flex justify-between items-center bg-white sticky top-0 z-20">
              <button onClick={() => setSelectedSession(null)} className="text-slate-400 hover:text-slate-900 text-xs font-bold uppercase">✕ Close</button>
              <button onClick={() => setPracticeMode(!practiceMode)} className={`text-[10px] font-black px-4 py-1.5 rounded-full border transition-all ${practiceMode ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-blue-600 border-blue-200'}`}>
                {practiceMode ? 'Exit Practice' : 'Practice Mode'}
              </button>
            </div>
            
            <div className="p-8 space-y-10">
              {!practiceMode ? (
                <>
                  <section>
                    <div className="text-[10px] font-black text-blue-600 uppercase mb-2">{selectedSession.strand} • {selectedSession.session_id}</div>
                    <h2 className="text-3xl font-black text-slate-900 mb-2 leading-tight">{selectedSession.title}</h2>
                    <p className="text-slate-500 italic">{selectedSession.li}</p>
                    <div className="flex gap-2 mt-4">
                        {['grey', 'amber', 'green'].map(st => (
                            <button key={st} onClick={() => updateStatus(st)} className={`w-6 h-6 rounded-full border ${selectedSession.status === st ? (st === 'green' ? 'bg-green-600 border-green-700' : st === 'amber' ? 'bg-amber-500 border-amber-600' : 'bg-slate-400 border-slate-500') : 'bg-transparent border-slate-200'}`} />
                        ))}
                    </div>
                  </section>

                  <section className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Planning</h4>
                        <button onClick={savePlanning} className={`text-[10px] font-bold px-3 py-1 rounded-full ${isSaving ? 'bg-green-600 text-white' : 'bg-slate-900 text-white'}`}>{isSaving ? '✓ Saved' : 'Save Notes'}</button>
                    </div>
                    <textarea value={planningText} onChange={(e) => setPlanningText(e.target.value)} placeholder="Lesson notes..." className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm h-32 outline-none focus:ring-1 focus:ring-blue-400" />
                  </section>

                  <section className="space-y-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase border-b pb-2">Linked Atoms</h4>
                    {atoms.map((atom, i) => (
                      <div key={i} className="pl-4 border-l-2 border-slate-100 hover:border-blue-400 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">{atom.atom_id}</span>
                            <h5 className="font-bold text-slate-800 text-sm">{atom.title}</h5>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">{atom.description}</p>
                      </div>
                    ))}
                  </section>
                </>
              ) : (
                <section className="space-y-8">
                  <h4 className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Retrieval Practice</h4>
                  {atoms.map((atom, i) => {
                    const pool = atom.retrieval_pool || [];
                    const activeQ = pool.length > 0 ? pool[0] : { q: "No questions added yet.", a: "N/A" };
                    return (
                      <div key={i} className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl">
                        <div className="text-[10px] font-bold text-blue-400 mb-4 uppercase">{atom.atom_id}</div>
                        <h3 className="text-xl font-bold mb-6 text-slate-100">{activeQ.q}</h3>
                        <button onClick={() => setRevealedIndex(revealedIndex === i ? null : i)} className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold border border-white/10 transition-all">
                            {revealedIndex === i ? "Hide Answer" : "Reveal Answer"}
                        </button>
                        {revealedIndex === i && (
                            <div className="mt-6 pt-6 border-t border-white/10 text-green-400 font-bold text-lg animate-in slide-in-from-top-2">
                                {activeQ.a}
                            </div>
                        )}
                      </div>
                    );
                  })}
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
