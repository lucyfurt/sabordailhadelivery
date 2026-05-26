export const STORE = {
  name: "Sabor da Ilha Delivery",
  tagline: "Comida caseira com sabor de verdade.",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "5598992019061",
  instagram: "https://www.instagram.com/sabordailhad/",
  deliveryFeeCents: 500,
  /** Horário exibido no cardápio (ajuste conforme sua operação) */
  hours: "Seg–Sáb, 10h às 14h",
  city: "São Luís — MA",
} as const;
