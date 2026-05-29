"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Shield } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FaqItem {
  question: string;
  answer: string[];
  adminOnly?: boolean;
}

interface FaqSection {
  title: string;
  items: FaqItem[];
}

interface CurrentUser {
  role: "ADMIN" | "VIEWER";
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const FAQ_SECTIONS: FaqSection[] = [
  {
    title: "Inloggen en beveiliging",
    items: [
      {
        question: "Hoe werkt de login?",
        answer: [
          "U logt in met uw e-mailadres en wachtwoord.",
          "Vervolgens voert u een 6-cijferige code in uit uw authenticator-app (Google Authenticator, Authy, etc.).",
          "Bij eerste gebruik wordt u doorgestuurd naar /2fa-setup om de QR-code te scannen.",
          "Sessies verlopen automatisch na 8 uur — daarna dient u opnieuw in te loggen.",
        ],
      },
      {
        question: "Is de data beveiligd?",
        answer: [
          "Alle data wordt verstuurd via HTTPS.",
          "Wachtwoorden worden opgeslagen met argon2id (sterke hashing).",
          "2FA is verplicht voor alle gebruikers.",
          "Sessies verlopen automatisch na 8 uur.",
          "Syntess databases worden uitsluitend via een beveiligde tunnel benaderd — nooit direct via internet.",
          "Formules en gevoelige berekeningen worden versleuteld opgeslagen (AES-256-GCM).",
        ],
      },
    ],
  },
  {
    title: "Databases en navigatie",
    items: [
      {
        question: "Welke databases zijn beschikbaar?",
        answer: [
          "De applicatie is gekoppeld aan vier Syntess Firebird databases: Services, Maintenance, International en Keyser.",
          "U ziet alleen de databases waarvoor uw beheerder toegang heeft verleend.",
          "Wissel van database via het selector-menu rechtsboven in de navigatiebalk.",
          "Alle data (projecten, facturen, kosten) is strikt gescheiden per database.",
        ],
      },
      {
        question: "Waarom zie ik project X niet?",
        answer: [
          "U ziet alleen projecten uit de actief geselecteerde database.",
          "Controleer rechtsboven welke database geselecteerd is (bijv. Services of International).",
          "Als het project in een andere database staat, wissel dan naar die database via de selector.",
          "Heeft u geen toegang tot de betreffende database? Neem dan contact op met uw beheerder.",
        ],
      },
      {
        question: "Hoe vaak wordt de data bijgewerkt?",
        answer: [
          "De pagina ververst automatisch elke 30 seconden terwijl u ingelogd bent.",
          "U kunt ook handmatig vernieuwen via het vernieuw-icoontje (↻) rechtsboven.",
          "De synchronisatie met de Syntess-database vindt periodiek plaats — de exacte intervallen worden ingesteld door de beheerder.",
        ],
      },
      {
        question: "Ik zie andere cijfers dan mijn collega",
        answer: [
          "U staat waarschijnlijk op een andere database dan uw collega.",
          "Controleer de actief geselecteerde database rechtsboven (bijv. Services vs. International).",
          "Wissel naar dezelfde database als uw collega om dezelfde data te zien.",
          "Ziet u dan nog steeds afwijkingen? Neem contact op met de beheerder.",
        ],
      },
    ],
  },
  {
    title: "Projecten en rapportages",
    items: [
      {
        question: "Hoe werkt het projectrapport?",
        answer: [
          "Klik op een project in de lijst om het volledig financieel rapport te zien.",
          "Het rapport toont: aanneemsom + meerwerk, termijnplan, gefactureerd bedrag, betaalstatus per factuur, directe en indirecte kosten, brutomarge.",
          "Directe kosten en facturatiedata komen rechtstreeks uit Syntess.",
          "Indirecte kosten = uren × tarief (door de administratie in te voeren per project).",
          "De brutomarge = gefactureerd − totale kosten.",
        ],
      },
      {
        question: "Hoe exporteer ik data?",
        answer: [
          "Via de Rapportages-pagina kunt u data exporteren naar Excel.",
          "Elke export wordt geregistreerd in het auditlog.",
          "PDF-export per project volgt in een volgende versie.",
        ],
      },
    ],
  },
  {
    title: "Kosten en formules",
    items: [
      {
        question: "Wat zijn indirecte kosten en hoe voer ik ze in?",
        answer: [
          "Indirecte kosten zijn de kosten voor uren die niet direct aan materialen te koppelen zijn (uitvoerder, projectleiding, etc.).",
          "U voert eenmalig per project het aantal uren en het uurtarief in.",
          "De app berekent automatisch: indirect = uren × tarief.",
          "Deze invoer blijft bewaard en kan op elk moment worden bijgewerkt.",
        ],
        adminOnly: true,
      },
      {
        question: "Hoe werkt de formule-laag?",
        answer: [
          "Gemachtigde gebruikers kunnen gevoelige berekeningsformules (zoals brutomarge-componenten) zelf beheren.",
          "De formules worden versleuteld opgeslagen — de ontwikkelaar ziet de inhoud nooit.",
          "U kunt formules instellen via het beheervenster (alleen voor beheerders).",
        ],
        adminOnly: true,
      },
    ],
  },
  {
    title: "Gebruikersbeheer en auditlog",
    items: [
      {
        question: "Hoe voeg ik een nieuwe gebruiker toe?",
        answer: [
          "Ga als beheerder naar Beheer → Gebruikers.",
          "Klik op 'Gebruiker toevoegen', vul het e-mailadres, tijdelijk wachtwoord en databaserechten in.",
          "De nieuwe gebruiker ontvangt het tijdelijk wachtwoord en moet bij eerste login 2FA instellen via /2fa-setup.",
          "U kunt per gebruiker aangeven welke databases hij/zij mag inzien.",
        ],
        adminOnly: true,
      },
      {
        question: "Waar vind ik het auditlog?",
        answer: [
          "Ga naar Beheer → Auditlog.",
          "Hier ziet u alle acties: logins, exports, wijzigingen in gebruikersbeheer, database-wissels.",
          "Het auditlog is alleen zichtbaar voor beheerders.",
        ],
        adminOnly: true,
      },
    ],
  },
];

// ─── Accordion item ───────────────────────────────────────────────────────────

function FaqItemRow({ item, showAdminBadge }: { item: FaqItem; showAdminBadge: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="flex items-center gap-2 font-medium text-sm text-foreground">
          {item.question}
          {showAdminBadge && item.adminOnly && (
            <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Shield className="h-2.5 w-2.5" /> Beheerder
            </span>
          )}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5">
          <ul className="space-y-1.5">
            {item.answer.map((line, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FaqPage() {
  const { data: user } = useQuery<CurrentUser>({
    queryKey: ["current-user"],
    queryFn: () => fetch("/api/auth/me").then((r) => r.json()),
    staleTime: 60_000,
  });

  const isAdmin = user?.role === "ADMIN";
  // While loading (user undefined), show all items to avoid layout flash
  const userLoaded = user !== undefined;

  const visibleSections = FAQ_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !userLoaded || isAdmin || !item.adminOnly),
    }))
    .filter((section) => section.items.length > 0);

  const half  = Math.ceil(visibleSections.length / 2);
  const left  = visibleSections.slice(0, half);
  const right = visibleSections.slice(half);

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Veelgestelde vragen</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Antwoorden op de meest gestelde vragen over het gebruik van dit platform.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-4">
          {left.map((section) => (
            <Card key={section.title}>
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-sm font-semibold">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {section.items.map((item) => (
                  <FaqItemRow key={item.question} item={item} showAdminBadge={isAdmin} />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {right.map((section) => (
            <Card key={section.title}>
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-sm font-semibold">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {section.items.map((item) => (
                  <FaqItemRow key={item.question} item={item} showAdminBadge={isAdmin} />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
