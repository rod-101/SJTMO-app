import L from "leaflet";

const iconColors = {
  "No Helmet": "green",
  "Illegal Parking": "blue",
  "No License": "red",
  "Reckless Driving": "orange",
  "Beating Red Light": "yellow",
  Obstruction: "violet",
  default: "grey",
};

export const getIcon = (type) => {
  // Support comma-separated multiselect values — use the first type for the pin color
  const firstType = type ? type.split(",")[0].trim() : "";
  const color = iconColors[firstType] || iconColors.default;
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
};

export const iconColors_export = iconColors;
