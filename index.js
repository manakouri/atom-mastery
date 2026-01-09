import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

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

// 2. HELPER COMPONENT: Status Badge
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

// 3. MAIN APP COMPONENT
function App() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch data from Firebase on load
  useEffect(() => {
    async function fetchData() {
      try {
        const q = query(collection(db, "master_sessions"), orderBy("session_id", "asc"));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSessions(data);
      } catch (error) {
        console.error("Error fetching sessions: ", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <header className="mb-12">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Number Knowledge</h1>
        <p className="text-slate-500">Mastery Roadmap: 35 Sessions to Fluency</p>
      </header>

      <div className="space-y-4">
        {sessions.map((session) => (
          <div 
            key={session.id} 
            className="group relative bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {session.session_id}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{session.strand}</span>
                    <StatusBadge status={session.status} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {session.title}
                  </h3>
                  <p className="text-slate-500 text-sm mt-1 leading-relaxed italic">
                    {session.li}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <footer className="mt-20 text-center border-t border-slate-100 pt-8 text-slate-400 text-xs">
        Data synced with Firebase Firestore • Project Number Knowledge
      </footer>
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
