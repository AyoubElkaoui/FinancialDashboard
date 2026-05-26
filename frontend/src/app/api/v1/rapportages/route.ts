export async function GET() {
  return Response.json([
    { id: "omzet-project",          title: "Omzet per project" },
    { id: "openstaande-debiteuren", title: "Openstaande debiteuren" },
    { id: "marge-projectleider",    title: "Marge per projectleider" },
    { id: "inkoop-kostensoort",     title: "Inkoop per kostensoort" },
  ]);
}
