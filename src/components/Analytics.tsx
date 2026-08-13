const MEASUREMENT_ID = "G-XXCZ8KW3CC";

const script = `
setTimeout(function () {
  const config = document.createElement("script");
  config.innerHTML =
    'window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","${MEASUREMENT_ID}");';
  document.body.appendChild(config);

  const tag = document.createElement("script");
  tag.src = "https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}";
  document.body.appendChild(tag);
}, 2500);
`;

let enabled = true;

export function setAnalyticsEnabled(value: boolean): void {
  enabled = value;
}

export default function Analytics() {
  return enabled ? <script>{script}</script> : null;
}
