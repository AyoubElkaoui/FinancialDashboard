"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FaqItem {
  question: string;
  answer: string[];
}

interface FaqSection {
  title: string;
  items: FaqItem[];
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
      },
      {
        question: "Hoe werkt de formule-laag?",
        answer: [
          "Gemachtigde gebruikers kunnen gevoelige berekeningsformules (zoals brutomarge-componenten) zelf beheren.",
          "De formules worden versleuteld opgeslagen — de ontwikkelaar ziet de inhoud nooit.",
          "U kunt formules instellen via het beheervenster (alleen voor beheerders).",
        ],
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
      },
      {
        question: "Waar vind ik het auditlog?",
        answer: [
          "Ga naar Beheer → Auditlog.",
          "Hier ziet u alle acties: logins, exports, wijzigingen in gebruikersbeheer, database-wissels.",
          "Het auditlog is alleen zichtbaar voor beheerders.",
        ],
      },
    ],
  },
];

// ─── Accordion item ───────────────────────────────────────────────────────────

function FaqItemRow({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="font-medium text-sm text-foreground">{item.question}</span>
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
  const half = Math.ceil(FAQ_SECTIONS.length / 2);
  const left  = FAQ_SECTIONS.slice(0, half);
  const right = FAQ_SECTIONS.slice(half);

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
                  <FaqItemRow key={item.question} item={item} />
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
                  <FaqItemRow key={item.question} item={item} />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
