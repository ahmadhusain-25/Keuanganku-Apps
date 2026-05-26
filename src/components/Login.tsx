
export const Login = ({ onLogin, onGuestLogin }: { onLogin: () => void; onGuestLogin: () => void }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] text-slate-100 relative overflow-hidden font-sans py-12 px-4">
      {/* Mesh Background Decorative Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] bg-indigo-900/30 rounded-full blur-[100px] pointer-events-none -z-10" />

      <div className="w-full max-w-md p-8 bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl flex flex-col z-10 transition-all duration-300">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center text-white tracking-tight mb-2">
          Keuanganku
        </h1>
        <p className="text-center text-slate-400 mb-8 text-sm">
          Aplikasi Manajemen Keuangan Anda
        </p>

        <button
          onClick={onLogin}
          className="w-full relative group overflow-hidden bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 transition-colors rounded-2xl py-4 px-6 flex flex-col items-center justify-center font-semibold text-white shadow-lg cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-6 h-6">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
            <span>Masuk dengan Google</span>
          </div>
        </button>

        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-white/10"></div>
          <span className="px-3 text-xs text-slate-500 uppercase tracking-widest">Atau</span>
          <div className="flex-1 border-t border-white/10"></div>
        </div>

        <button
          onClick={onGuestLogin}
          className="w-full bg-gradient-to-r from-blue-600/10 to-indigo-600/10 hover:from-blue-600/20 hover:to-indigo-600/20 border border-blue-500/20 hover:border-blue-500/40 transition-all rounded-2xl py-4 px-6 flex items-center justify-center font-semibold text-blue-400 shadow-md group cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Masuk sebagai Tamu (Uji Coba)</span>
          </div>
        </button>

        <p className="mt-8 text-xs text-center text-slate-500 max-w-xs mx-auto leading-relaxed">
          Google Login memerlukan akses ke Google Drive (untuk spreadsheet data keuangan) dan Google Calendar (untuk Integrasi Pengingat). Jika Anda hanya ingin mencoba aplikasi secara lokal, pilih opsi Tamu.
        </p>
      </div>
    </div>
  );
};
