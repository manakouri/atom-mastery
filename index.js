import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

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
      {status}
    </span>
  );
};

// 3. MAIN APP
function App() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [atoms, setAtoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAtoms, setLoadingAtoms] = useState(false);

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

  // Fetch Atoms when a session is clicked
  const handleSessionClick = async (session) => {
    setSelectedSession(session);
    setLoadingAtoms(true);
    setAtoms([]);
    
    try {
      const fetchedAtoms = [];
      // Loop through the atom IDs stored in the session
      for (const atomId of (session.atoms || [])) {
        const atomDoc = await getDoc(doc(db, "master_atoms", atomId));
        if (atomDoc.exists()) fetchedAtoms.push(atomDoc.data());
      }
      setAtoms(fetchedAtoms);
    } catch (e) { console.error("Error fetching atoms:", e); }
    setLoadingAtoms(false);
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen animate-pulse text-slate-400">Loading Roadmap...</div>;

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <div className="max-w-2xl mx-auto py-12 px-4">
        <header className="mb-10">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Number Knowledge</h1>
          <p className="text-slate-500">Interactive Learning Journey</p>
        </header>

        <div className="space-y-4">
          {sessions.map(s => (
            <div 
              key={s.id} 
              onClick={() => handleSessionClick(s)}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                  {s.session_id}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{s.strand}</span>
                    <StatusBadge status={s.status} />
                  </div>
                  <h3 className="font-bold text-slate-800 group-hover:text-blue-600">{s.title}</h3>
                  <p className="text-slate-500 text-sm italic line-clamp-1">{s.li}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DETAIL DRAWER */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b sticky top-0 bg-white z-10 flex justify-between items-center">
              <button onClick={() => setSelectedSession(null)} className="text-slate-400 hover:text-slate-600">✕ Close</button>
              <StatusBadge status={selectedSession.status} />
            </div>
            
            <div className="p-8">
              <h2 className="text-2xl font-black text-slate-900 mb-2">{selectedSession.title}</h2>
              <p className="text-blue-600 font-medium mb-6">{selectedSession.li}</p>
              
              <div className="space-y-8">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Learning Atoms</h4>
                
                {loadingAtoms ? (
                   <div className="space-y-4">
                     {[1,2].map(i => <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-xl"></div>)}
                   </div>
                ) : atoms.length > 0 ? (
                  atoms.map((atom, i) => (
                    <div key={i} className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                      <div className="text-[10px] font-black text-slate-400 mb-1">{atom.atom_id}</div>
                      <h5 className="font-bold text-slate-800 mb-2">{atom.title}</h5>
                      <p className="text-sm text-slate-600 leading-relaxed mb-4">{atom.description}</p>
                      
                      {atom.misconceptions?.length > 0 && (
                        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                          <span className="text-[10px] font-bold text-amber-700 uppercase">Misconception</span>
                          <p className="text-xs text-amber-800">{atom.misconceptions[0]}</p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic text-sm">No atoms found for this session.</p>
                )}
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
