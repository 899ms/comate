import { GLOBAL_MODULES, type AppModule } from "../domain/navigation.js";

const comateIconUrl = new URL("../../../assets/comate-icon.svg", import.meta.url).href;

interface GlobalRailProps {
  activeModule: AppModule;
  onActiveModuleChange: (value: AppModule) => void;
}

export function GlobalRail({
  activeModule,
  onActiveModuleChange
}: GlobalRailProps) {
  return (
    <aside className="global-rail" aria-label="CoMate modules">
      <div className="global-rail-brand" title="CoMate">
        <img src={comateIconUrl} alt="CoMate" />
      </div>
      <span className="global-rail-name">CoMate</span>

      <nav className="global-rail-nav" aria-label="Global modules">
        {GLOBAL_MODULES.map((module) => {
          const Icon = module.icon;
          const active = activeModule === module.id;
          return (
            <button
              key={module.id}
              className={active ? "global-rail-button active" : "global-rail-button"}
              type="button"
              onClick={() => onActiveModuleChange(module.id)}
              title={module.label}
              aria-label={module.label}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={18} aria-hidden="true" />
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
