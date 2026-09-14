import { Dialog } from "../../components/Dialog";
import { formatCoordinatePair, formatKilometers } from "../location/formatLocation";
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

/** Avoids "Oceano · OCEANO" when the API only knows the destination type. */
function isGenericTitle(discovery: Discovery): boolean {
  const title = discovery.title.toLocaleLowerCase("pt-BR");
  return discovery.kind === "ocean" ? title === "oceano" : title === "terra firme";
}

function Fact({ label, place, fallback }: { label: string; place: DiscoveryPlace | null; fallback: string }) {
  return (
    <div className="discovery-fact">
      <dt>{label}</dt>
      <dd>
        {place ? (
          <>
            <strong>{place.name}</strong>
            {place.detail && <span>{place.detail}</span>}
            {place.coordinates && <span className="mono">{formatCoordinatePair(place.coordinates)}</span>}
            {place.distanceKm != null && (
              <span>
                {formatKilometers(place.distanceKm)} {place.distanceReference === "costa" ? "da costa mais próxima" : "do antípoda"}
              </span>
            )}
          </>
        ) : (
          <span className="discovery-fact__empty">{fallback}</span>
        )}
      </dd>
    </div>
  );
}

function SimpleFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="discovery-fact">
      <dt>{label}</dt>
      <dd>
        <strong>{value}</strong>
      </dd>
    </div>
  );
}

function RouteComparison({ discovery }: { discovery: Discovery }) {
  const destinationSubtitle =
    discovery.kind === "land"
      ? discovery.locale
      : discovery.nearestLand?.distanceKm != null
        ? `${formatKilometers(discovery.nearestLand.distanceKm)} da terra firme`
        : null;
  return (
    <section className="discovery-route" aria-label="Origem e antípoda">
      <div className="discovery-route__end discovery-route__end--origin">
        <span className="discovery-route__label">Origem</span>
        <strong>{discovery.origin.title}</strong>
        {discovery.origin.subtitle && <span>{discovery.origin.subtitle}</span>}
        <span className="mono">{formatCoordinatePair(discovery.origin.coordinates)}</span>
      </div>
      <div className="discovery-route__line">
        <span className="discovery-route__distance">{formatKilometers(discovery.throughEarthKm)}</span>
        <span className="discovery-route__caption">através da Terra</span>
      </div>
      <div className="discovery-route__end discovery-route__end--antipode">
        <span className="discovery-route__label">Antípoda</span>
        <strong>{discovery.title}</strong>
        {destinationSubtitle && <span>{destinationSubtitle}</span>}
        <span className="mono">{formatCoordinatePair(discovery.antipode)}</span>
      </div>
    </section>
  );
}

function DestinationFacts({ discovery }: { discovery: Discovery }) {
  if (discovery.kind === "ocean") {
    return (
      <dl className="discovery-facts discovery-facts--ocean">
        <div className="discovery-fact">
          <dt>Destino direto</dt>
          <dd>
            <strong>{discovery.title}</strong>
            <span className="mono">{formatCoordinatePair(discovery.antipode)}</span>
          </dd>
        </div>
        <Fact label="Terra firme mais próxima" place={discovery.nearestLand} fallback="Não identificada nesta consulta" />
        <Fact label="Localidade habitada próxima" place={discovery.nearestSettlement} fallback="Nenhuma localidade registrada por perto" />
      </dl>
    );
  }
  return (
    <dl className="discovery-facts">
      {discovery.country && <SimpleFact label="País" value={discovery.country} />}
      {discovery.state && <SimpleFact label="Estado / província" value={discovery.state} />}
      {discovery.nearestPlace && <Fact label="Localidade próxima" place={discovery.nearestPlace} fallback="" />}
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
            <p id="discovery-summary" className="discovery-subtitle">
              <span className="mono">{formatCoordinatePair(discovery.antipode)}</span>
              {!isGenericTitle(discovery) && (
                <span className={discovery.kind === "ocean" ? "discovery-kind discovery-kind--ocean" : "discovery-kind discovery-kind--land"}>
                  {discovery.kind === "ocean" ? "Oceano" : "Terra firme"}
                </span>
              )}
            </p>
            {discovery.kind === "land" && discovery.locale && <p className="discovery-locale">{discovery.locale}</p>}
            <div className="discovery-distance">
              <span>Distância através da Terra</span>
              <strong>≈ {formatKilometers(discovery.throughEarthKm)}</strong>
            </div>
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
