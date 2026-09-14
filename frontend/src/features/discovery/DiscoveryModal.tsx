import { Dialog } from "../../components/Dialog";
import { formatKilometers } from "../location/formatLocation";
import { CalculationDetails } from "./CalculationDetails";
import { DestinationImage } from "./DestinationImage";
import type { Discovery, DiscoveryPlace } from "./discoveryContent";
import type { DiscoveryImageProvider } from "./images/imageProvider";
import { REOPEN_DISCOVERY_ID } from "./discoveryIds";
import { ShareMenu } from "./ShareMenu";

interface DiscoveryModalProps {
  open: boolean;
  discovery: Discovery;
  onClose: () => void;
  onRepeat: () => void;
  onChooseAnother: () => void;
  imageProvider?: DiscoveryImageProvider;
}

function discoveryNarrative(discovery: Discovery): string {
  if (discovery.kind === "land") {
    if (discovery.title.toLocaleLowerCase("pt-BR") === "terra firme") {
      return "Você atravessaria o planeta e sairia em terra firme.";
    }
    const destination = [discovery.title, discovery.locale].filter(Boolean).join(", ");
    return `Você atravessaria o planeta e sairia em terra firme: ${destination}.`;
  }

  const land = discovery.nearestLand;
  if (!land) return "Seu ponto de saída fica em pleno oceano, sem terra firme identificada nesta consulta.";
  const distance = land.distanceKm != null ? formatKilometers(land.distanceKm) : null;
  if (land.name === "Pequena ilha ou costa") {
    return distance
      ? `Seu ponto de saída fica em pleno oceano. A terra firme mais próxima está a aproximadamente ${distance}.`
      : "Seu ponto de saída fica em pleno oceano. A terra firme mais próxima foi identificada.";
  }
  return distance
    ? `Seu ponto de saída fica em pleno oceano. ${land.name} é a terra firme mais próxima, a aproximadamente ${distance}.`
    : `Seu ponto de saída fica em pleno oceano. ${land.name} é a terra firme mais próxima.`;
}

function NearbyFact({ label, place, showDetail = false }: { label: string; place: DiscoveryPlace; showDetail?: boolean }) {
  return (
    <div className="discovery-nearby__item">
      <dt>{label}</dt>
      <dd>
        <strong>{place.name}</strong>
        {showDetail && place.detail && <span>{place.detail}</span>}
        {place.distanceKm != null && (
          <span>
            {formatKilometers(place.distanceKm)} {place.distanceReference === "costa" ? "da costa mais próxima" : "do ponto de saída"}
          </span>
        )}
      </dd>
    </div>
  );
}

function RouteComparison({ discovery }: { discovery: Discovery }) {
  return (
    <section className="discovery-route" aria-label="Origem e antípoda">
      <div className="discovery-route__end discovery-route__end--origin">
        <span className="discovery-route__label">Origem</span>
        <strong>{discovery.origin.title}</strong>
        {discovery.origin.subtitle && <span>{discovery.origin.subtitle}</span>}
      </div>
      <div className="discovery-route__line">
        <span className="discovery-route__distance">≈ {formatKilometers(discovery.throughEarthKm)}</span>
        <span className="discovery-route__caption">atravessando a Terra</span>
      </div>
      <div className="discovery-route__end discovery-route__end--antipode">
        <span className="discovery-route__label">Antípoda</span>
        <strong>{discovery.title}</strong>
        <span>{discovery.kind === "land" ? discovery.locale ?? "Terra firme" : "Destino direto no oceano"}</span>
      </div>
    </section>
  );
}

function DestinationFacts({ discovery }: { discovery: Discovery }) {
  if (discovery.kind === "ocean") {
    const settlement = discovery.nearestSettlement?.name === discovery.nearestLand?.name ? null : discovery.nearestSettlement;
    if (!discovery.nearestLand && !settlement) return null;
    return (
      <dl className="discovery-nearby">
        {discovery.nearestLand && <NearbyFact label="Terra firme mais próxima" place={discovery.nearestLand} />}
        {settlement && <NearbyFact label="Localidade habitada próxima" place={settlement} showDetail />}
      </dl>
    );
  }
  const nearby = discovery.nearestPlace;
  if (!nearby || nearby.name.toLocaleLowerCase("pt-BR") === discovery.title.toLocaleLowerCase("pt-BR")) return null;
  return (
    <dl className="discovery-nearby">
      <NearbyFact label="Localidade próxima" place={nearby} showDetail />
    </dl>
  );
}

export function DiscoveryModal({ open, discovery, onClose, onRepeat, onChooseAnother, imageProvider }: DiscoveryModalProps) {
  return (
    <Dialog
      open={open}
      labelledBy="discovery-title"
      describedBy="discovery-summary"
      onClose={onClose}
      fallbackFocus={() => document.getElementById(REOPEN_DISCOVERY_ID)}
      className="discovery-modal"
    >
      <button type="button" className="discovery-close" onClick={onClose} aria-label="Fechar descoberta">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      </button>

      <div className="discovery-body">
        <div className="discovery-hero">
          <div className="discovery-hero__text">
            <p className="discovery-kicker">Você chegou ao outro lado da Terra</p>
            <h2 id="discovery-title" className="discovery-title">{discovery.title}</h2>
            <p id="discovery-summary" className="discovery-lede">{discoveryNarrative(discovery)}</p>
          </div>
          <DestinationImage discovery={discovery} enabled={open} provider={imageProvider} />
        </div>

        <RouteComparison discovery={discovery} />
        <DestinationFacts discovery={discovery} />
        <CalculationDetails discovery={discovery} />
      </div>

      <footer className="discovery-actions">
        <ShareMenu discovery={discovery} />
        <div className="discovery-actions__secondary">
          <button type="button" className="discovery-button" onClick={onRepeat}>
            Repetir perfuração
          </button>
          <button type="button" className="discovery-button" onClick={onChooseAnother}>
            Escolher outro local
          </button>
          <button type="button" className="discovery-button discovery-button--quiet" onClick={onClose}>
            Ver no globo
          </button>
        </div>
      </footer>
    </Dialog>
  );
}
