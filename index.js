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

// 2. HELPER: Status Badge
const StatusBadge = ({ status }) => {
  const styles = {
    green: "bg-green-100 text-green-700 border-green-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    grey: "bg-slate-100 text-slate-500 border-slate-200"
  };
  return (
    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${styles[status] || styles.grey}`}>
      {status === 'amber' ? 'Taught / Needs Repeating' : status === 'green' ? 'Mastery' : 'Untaught'}
    </span>
  );
};

// 3. MAIN APP
function App() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [atoms, setAtoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Fetch data from Firebase
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

  // NEW: Update Status Function
  const updateStatus = async (newStatus) => {
    if (!selectedSession) return;
    setUpdating(true);
    try {
      const sessionRef = doc(db, "master_sessions", selectedSession.id);
      await updateDoc(sessionRef, { status: newStatus });
      
      // Update local state so the UI changes immediately
      setSessions(prev => prev.map(s => 
        s.id === selectedSession.id ? { ...s, status: newStatus } : s
      ));
      setSelectedSession(prev => ({ ...prev, status: newStatus }));
      
    } catch (e) {
      alert("Error updating status: " + e.message);
    }
    setUpdating(false);
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen text-slate-400">Loading Journey...</div>;

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <div className="max-w-2xl mx-auto py-12 px-4">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Number Knowledge</h1>
          <p className="text-slate-500">Teacher's Tracking Dashboard</p>
        </header>

        <div className="space-y-4">
          {sessions.map(s => (
            <div 
              key={s.id} 
              onClick={() => handleSessionClick(s)}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                  s.status === 'green' ? 'bg-green-600 text-white' : 
                  s.status === 'amber' ? 'bg-amber-500 text-white' : 'bg-slate-900 text-white'
                }`}>
                  {s.session_id}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{s.strand}</span>
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
          <div className="w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto p-0 flex flex-col">
            <div className="p-6 border-b flex justify-between items-center bg-white sticky top-0 z-20">
              <button onClick={() => setSelectedSession(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕ Close</button>
              <h4 className="text-xs font-black uppercase text-slate-400">Session Details</h4>
            </div>
            
            <div className="p-8 flex-1">
              <div className="mb-8">
                <h2 className="text-2xl font-black text-slate-900 mb-2">{selectedSession.title}</h2>
                <p className="text-slate-500 italic mb-6">{selectedSession.li}</p>
                
                {/* STATUS SELECTOR */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-3 text-center">Update Progress</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => updateStatus('grey')}
                      className={`py-2 px-1 rounded-lg text-[10px] font-bold border transition-all ${selectedSession.status === 'grey' ? 'bg-white border-slate-300 shadow-sm ring-2 ring-slate-900/5' : 'bg-transparent border-transparent opacity-50'}`}
                    >
                      Untaught
                    </button>
                    <button 
                      onClick={() => updateStatus('amber')}
                      className={`py-2 px-1 rounded-lg text-[10px] font-bold border transition-all ${selectedSession.status === 'amber' ? 'bg-amber-500 text-white border-amber-600' : 'bg-transparent border-transparent opacity-50'}`}
                    >
                      Taught
                    </button>
                    <button 
                      onClick={() => updateStatus('green')}
                      className={`py-2 px-1 rounded-lg text-[10px] font-bold border transition-all ${selectedSession.status === 'green' ? 'bg-green-600 text-white border-green-700' : 'bg-transparent border-transparent opacity-50'}`}
                    >
                      Mastery
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Linked Atoms</h4>
                {atoms.map((atom, i) => (
                  <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h5 className="font-bold text-slate-800 text-sm mb-1">{atom.title}</h5>
                    <p className="text-xs text-slate-600 leading-relaxed">{atom.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
