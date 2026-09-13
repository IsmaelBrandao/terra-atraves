import { formatKilometers } from "../location/formatLocation";
import type { Discovery } from "./discoveryContent";

const decimal = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const signed = (value: number) => `${value < 0 ? "−" : ""}${decimal.format(Math.abs(value))}°`;

/** Educational walkthrough. Values come from the API result; only the intermediate sum is shown here. */
export function CalculationDetails({ discovery }: { discovery: Discovery }) {
  const { origin, antipode } = discovery;
  const rawLongitude = origin.coordinates.longitude + 180;
  const needsWrap = Math.abs(rawLongitude - antipode.longitude) > 1e-6;

  return (
    <details className="calculation">
      <summary className="calculation__summary">
        <span>Como calculamos?</span>
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </summary>
      <ol className="calculation__steps">
        <li>
          <span className="calculation__label">Coordenada de origem</span>
          <span className="calculation__value">{signed(origin.coordinates.latitude)}, {signed(origin.coordinates.longitude)}</span>
        </li>
        <li>
          <span className="calculation__label">Latitude invertida</span>
          <span className="calculation__value">
            {signed(origin.coordinates.latitude)} → {signed(antipode.latitude)}
          </span>
          <span className="calculation__note">O hemisfério troca: norte vira sul e vice-versa.</span>
        </li>
        <li>
          <span className="calculation__label">Longitude deslocada em 180°</span>
          <span className="calculation__value">
            {signed(origin.coordinates.longitude)} + 180° = {signed(rawLongitude)}
            {needsWrap && <> → {signed(antipode.longitude)}</>}
          </span>
          <span className="calculation__note">
            {needsWrap
              ? "Como passou de 180°, o valor é normalizado para o intervalo de −180° a 180°."
              : "O valor já está no intervalo de −180° a 180°."}
          </span>
        </li>
        <li>
          <span className="calculation__label">Antípoda</span>
          <span className="calculation__value">{signed(antipode.latitude)}, {signed(antipode.longitude)}</span>
        </li>
        <li>
          <span className="calculation__label">Terra ou oceano</span>
          <span className="calculation__note">
            O ponto foi comparado, no PostGIS, com os contornos de terra firme do Natural Earth (escala 1:10m):
            {discovery.kind === "ocean" ? " ele caiu no oceano." : " ele caiu em terra firme."}
          </span>
        </li>
        {discovery.kind === "ocean" && discovery.nearestLand?.distanceKm != null && (
          <li>
            <span className="calculation__label">Terra firme mais próxima</span>
            <span className="calculation__note">
              Uma busca espacial encontrou o litoral mais próximo e mediu a distância sobre a superfície da Terra:{" "}
              {formatKilometers(discovery.nearestLand.distanceKm)}.
            </span>
          </li>
        )}
        {discovery.kind === "land" && (discovery.country || discovery.state) && (
          <li>
            <span className="calculation__label">Região</span>
            <span className="calculation__note">País e estado vêm do cruzamento do ponto com os limites administrativos do Natural Earth.</span>
          </li>
        )}
        <li>
          <span className="calculation__label">Através da Terra</span>
          <span className="calculation__note">
            A linha reta entre dois pontos opostos passa pelo centro do planeta: é o diâmetro médio, cerca de{" "}
            {formatKilometers(discovery.throughEarthKm)}.
          </span>
        </li>
      </ol>
    </details>
  );
}
