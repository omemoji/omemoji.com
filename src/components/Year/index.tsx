export default function Year() {
  "use client";
  return <span className="hidden xs:inline">{new Date().getFullYear()}</span>;
}
