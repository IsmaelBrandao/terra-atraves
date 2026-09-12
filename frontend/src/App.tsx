import { LocationPanel } from "./components/LocationPanel";
import { GlobeMap } from "./map/GlobeMap";

export function App() {
  return (
    <main className="relative h-dvh min-h-[560px] overflow-hidden bg-[#071411]">
      <div className="absolute inset-0">
        <GlobeMap />
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between p-5 sm:p-7">
        <a className="pointer-events-auto flex items-center gap-3 text-white" href="/">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200/20 bg-[#0b201a]/85 text-lg shadow-lg backdrop-blur">
            ◉
          </span>
          <span>
            <strong className="block font-display text-lg font-medium tracking-wide">Terra Através</strong>
            <span className="block text-[9px] font-bold uppercase tracking-[0.24em] text-emerald-100/45">
              explore o outro lado
            </span>
          </span>
        </a>
        <div className="hidden rounded-full border border-white/10 bg-[#071411]/75 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-50/55 backdrop-blur sm:block">
          arraste para girar · role para aproximar
        </div>
      </header>

      <aside className="absolute bottom-4 left-4 right-4 z-10 sm:bottom-7 sm:left-7 sm:right-auto sm:w-[360px]">
        <LocationPanel />
      </aside>

      <div className="pointer-events-none absolute bottom-7 right-20 z-10 hidden text-right text-[9px] uppercase tracking-[0.16em] text-white/35 md:block">
        mapas © OpenFreeMap
        <br />
        dados © OpenStreetMap
      </div>
    </main>
  );
}
