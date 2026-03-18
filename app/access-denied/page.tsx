import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function AccessDenied() {
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white p-4">
      <div className="bg-[#0a0a0a] border border-red-500/20 p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center max-w-md text-center">
        <div className="bg-red-500/10 p-5 rounded-full mb-6 text-red-500">
          <AlertTriangle size={48} />
        </div>
        <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-4">
          Access Denied
        </h1>
        <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest leading-relaxed mb-8">
          You do not have permission to view this page. Contact an administrator if you believe this is an error.
        </p>
        <Link 
          href="/" 
          className="w-full bg-yellow-400 text-black font-black py-4 rounded-xl uppercase tracking-widest text-[10px] shadow-lg transition-all hover:bg-yellow-300"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}