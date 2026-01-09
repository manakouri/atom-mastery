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
    setPlanningText(session.planning || ""); // Load existing planning
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

  // NEW: Save Planning function
  const savePlanning = async () => {
    if (!selectedSession) return;
    setIsSaving(true);
    try {
      const sessionRef = doc(db, "master_sessions", selectedSession.id);
      await updateDoc(sessionRef, { planning: planningText });
      // Update local sessions state so it persists without refresh
      setSessions(prev => prev.map(s => s.id === selectedSession.id ? { ...s, planning: planningText } : s));
      setTimeout(() => setIsSaving(false), 1000); // Show "Saved" for 1 sec
    } catch (e) {
      console.error(e);
      setIsSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen text-slate-400">Loading Journey...</div>;

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <div className="max-w-2xl mx-auto py-12 px-4">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">Roadmap</h1>
          <p className="text-slate-500 text-sm font-medium">Number Knowledge Mastery</p>
        </header>

        <div className="space-y-4">
          {sessions.map(s => (
            <div 
              key={s.id} 
              onClick={() => handleSessionClick(s)}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 transition-all ${
                  s.status === 'green' ? 'bg-green-600 text-white rotate-3' : 
                  s.status === 'amber' ? 'bg-amber-500 text-white -rotate-3' : 'bg-slate-100 text-slate-400'
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
        </div>
      </div>

      {/* DETAIL DRAWER */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl overflow-y-auto flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b flex justify-between items-center bg-white sticky top-0 z-20">
              <button onClick={() => setSelectedSession(null)} className="text-slate-400 hover:text-slate-900 text-sm font-bold tracking-tighter uppercase">✕ Close</button>
              <div className="flex gap-2">
                 <button onClick={() => updateStatus('grey')} className={`w-3 h-3 rounded-full border ${selectedSession.status === 'grey' ? 'bg-slate-400 border-slate-500' : 'bg-transparent border-slate-200'}`}></button>
                 <button onClick={() => updateStatus('amber')} className={`w-3 h-3 rounded-full border ${selectedSession.status === 'amber' ? 'bg-amber-500 border-amber-600' : 'bg-transparent border-slate-200'}`}></button>
                 <button onClick={() => updateStatus('green')} className={`w-3 h-3 rounded-full border ${selectedSession.status === 'green' ? 'bg-green-600 border-green-700' : 'bg-transparent border-slate-200'}`}></button>
              </div>
            </div>
            
            <div className="p-8 space-y-10">
              <section>
                <h2 className="text-3xl font-black text-slate-900 mb-2 leading-tight">{selectedSession.title}</h2>
                <p className="text-blue-600 font-bold text-sm tracking-tight">{selectedSession.li}</p>
              </section>

              {/* PLANNING SECTION */}
              <section className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-black text-blue-900 uppercase tracking-widest">Planning & Resources</h4>
                    <button 
                        onClick={savePlanning}
                        className={`text-[10px] font-bold px-3 py-1 rounded-full transition-all ${isSaving ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                        {isSaving ? '✓ Saved' : 'Save Notes'}
                    </button>
                </div>
                <textarea 
                    value={planningText}
                    onChange={(e) => setPlanningText(e.target.value)}
                    placeholder="Add links to White Rose, games, or student focus notes here..."
                    className="w-full bg-white border border-blue-100 rounded-xl p-4 text-sm text-slate-700 h-32 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all"
                />
              </section>

              <section className="space-y-6">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Learning Atoms</h4>
                {atoms.map((atom, i) => (
                  <div key={i} className="group border-l-2 border-slate-100 pl-4 py-1 hover:border-blue-400 transition-colors">
                    <h5 className="font-bold text-slate-800 text-sm mb-1">{atom.title}</h5>
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
