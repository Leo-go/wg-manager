export type LegalSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type LegalDocument = {
  title: string;
  updatedAt: string;
  intro: string[];
  sections: LegalSection[];
};

export function getSupportEmail(): string {
  return (
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@wg-manager.ru"
  );
}
