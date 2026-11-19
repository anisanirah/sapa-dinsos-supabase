export default function Logo({ size = "large" }) {
  const isLarge = size === "large";
  
  return (
    <div className="flex items-center gap-3">
      {/* Ganti src dengan path logo kamu */}
      <img 
        src="/images/logo-dinsos.png" 
        alt="Logo DINSOS" 
        className={isLarge ? "h-10 w-10" : "h-8 w-8"}
        onError={(e) => {
          // Fallback jika logo tidak ditemukan
          e.target.style.display = 'none';
        }}
      />
      {/* Fallback icon jika logo belum ada */}
      <div className={`${isLarge ? "h-10 w-10" : "h-8 w-8"} bg-dinsos-600 rounded-lg flex items-center justify-center text-white font-bold ${isLarge ? "text-xl" : "text-lg"}`}>
        D
      </div>
      <div className="flex flex-col">
        <span className={`font-bold text-dinsos-700 ${isLarge ? "text-2xl" : "text-lg"}`}>
          DINSOS
        </span>
        <span className={`text-gray-500 ${isLarge ? "text-sm" : "text-xs"}`}>
          DINAS SOSIAL KABUPATEN MAJALENGKA
        </span>
      </div>
    </div>
  );
}