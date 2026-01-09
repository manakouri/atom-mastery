import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { 
  getFirestore, collection, getDocs, doc, getDoc, 
  query, orderBy, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// 1. FIREBASE CONFIG
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

// HELPER: Status Badge
const StatusBadge = ({ status }) => {
  const styles = {
    green: "bg-green-100 text-green-700 border-green-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    grey: "bg-slate-100 text-slate-500 border-slate-200"
  };
  const labels = { green: 'Mastery', amber: 'Needs Repeating', grey: 'Untaught' };
  return (
    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${styles[status] || styles.grey}`}>
      {labels[status]}
    </span>
  );
};

function App() {
  const [sessions, setSessions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSession, setSelectedSession] = useState(null);
  const [atoms, setAtoms] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const handleSessionClick = async (session) => {
    setSelectedSession(session);
    setPlanningText(session.planning || "");
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

  // 🔎 SEARCH LOGIC
  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.strand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.session_id.toString() === searchTerm
  );

  if (loading) return <div className="flex justify-center items-center min-h-screen text-slate-400 font-bold animate-pulse">Loading Roadmap...</div>;

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      {/* STICKY HEADER WITH SEARCH */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-6">
        <div className="max-w-2xl mx-auto">
            <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase mb-4 text-center">Number Knowledge</h1>
            <div className="relative">
                <input 
                    type="text" 
                    placeholder="Search by title, strand, or number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-100 border-none rounded-2xl py-3 px-12 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <span className="absolute left-4 top-3.5 text-slate-400">🔍</span>
                {searchTerm && (
                    <button 
                        onClick={() => setSearchTerm("")}
                        className="absolute right-4 top-3 text-xs font-bold text-slate-400 hover:text-slate-600"
                    >
                        Clear
                    </button>
                )}
            </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto pt-8 px-4">
        <div className="space-y-4">
          {filteredSessions.map(s => (
            <div 
              key={s.id} 
              onClick={() => handleSessionClick(s)}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 transition-all ${
                  s.status === 'green' ? 'bg-green-600 text-white' : 
                  s.status === 'amber' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {s.session_id}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{s.strand}</span>
                    <StatusBadge status={s.status} />
                  </div>
                  <h3 className="font-bold text-slate-800 group-hover:text-blue-600">{s.title}</h3>
                </div>
              </div>
            </div>
          ))}
          {filteredSessions.length === 0 && (
            <div className="text-center py-20 text-slate-400 italic">No sessions match your search.</div>
          )}
        </div>
      </div>

      {/* DETAIL DRAWER */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl overflow-y-auto flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b flex justify-between items-center bg-white sticky top-0 z-20">
              <button onClick={() => setSelectedSession(null)} className="text-slate-400 hover:text-slate-900 text-xs font-bold tracking-tighter uppercase">✕ Close</button>
              <div className="flex gap-2">
                 {['grey', 'amber', 'green'].map(st => (
                     <button 
                        key={st}
                        onClick={() => updateStatus(st)} 
                        className={`w-4 h-4 rounded-full border transition-all ${
                            selectedSession.status === st 
                            ? (st === 'green' ? 'bg-green-600 border-green-700 scale-125' : st === 'amber' ? 'bg-amber-500 border-amber-600 scale-125' : 'bg-slate-400 border-slate-500 scale-125') 
                            : 'bg-transparent border-slate-200 hover:border-slate-400'
                        }`}
                     />
                 ))}
              </div>
            </div>
            
            <div className="p-8 space-y-10">
              <section>
                <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-2">{selectedSession.strand} • Session {selectedSession.session_id}</div>
                <h2 className="text-3xl font-black text-slate-900 mb-2 leading-tight">{selectedSession.title}</h2>
                <p className="text-slate-500 font-medium italic">{selectedSession.li}</p>
              </section>

              {/* PLANNING SECTION */}
              <section className="bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Planning & Resources</h4>
                    <button 
                        onClick={savePlanning}
                        className={`text-[10px] font-bold px-3 py-1 rounded-full transition-all ${isSaving ? 'bg-green-600 text-white' : 'bg-slate-900 text-white hover:bg-black'}`}
                    >
                        {isSaving ? '✓ Saved' : 'Save Notes'}
                    </button>
                </div>
                <textarea 
                    value={planningText}
                    onChange={(e) => setPlanningText(e.target.value)}
                    placeholder="Enter focus groups or lesson links..."
                    className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-700 h-32 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                />
              </section>

              <section className="space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Linked Atoms</h4>
                {atoms.map((atom, i) => (
                  <div key={i} className="group relative pl-6 border-l-2 border-slate-100 hover:border-blue-400 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                        {/* THE ATOM ID TAG */}
                        <span className="font-mono text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-tighter">
                            {atom.atom_id}
                        </span>
                        <h5 className="font-bold text-slate-800 text-sm">{atom.title}</h5>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{atom.description}</p>
                  </div>
                ))}
              </section
