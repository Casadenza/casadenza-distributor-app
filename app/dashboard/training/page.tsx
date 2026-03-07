export default function Page() {
  return (
    <div className="border border-[#EEEAE2] bg-white rounded-[28px] p-8 shadow-sm max-w-3xl">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-1.5 w-1.5 rounded-full bg-[#C5A267]" />
        <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#C5A267]">Academy</span>
      </div>
      <h1 className="text-[30px] font-light tracking-tight text-[#1A1A1A]">
        Training <span className="font-serif italic text-[#C5A267]">Coming Soon</span>
      </h1>
      <p className="mt-4 max-w-2xl text-[14px] leading-7 text-[#7B766E]">
        Product learning modules, installation guidance, specification walkthroughs, and distributor enablement resources will be published here soon.
      </p>
    </div>
  );
}
