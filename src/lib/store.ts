export const STORE = {
  name: "Sabor da Ilha Delivery",
  tagline: "Comida caseira com sabor de verdade.",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "5598992019061",
  instagram: "https://www.instagram.com/sabordailhad/",
  deliveryFeeCents: 500,
  pickupAddress:
    process.env.NEXT_PUBLIC_PICKUP_ADDRESS ??
    "Rua 3, Qua 2, Blo 10, Ap. 202, Cond. Ipem Angelim, Bairro: Angelim",
  pixCopyCode:
    process.env.NEXT_PUBLIC_PIX_COPY_CODE ?? "989992019061",
  /** Horário exibido no cardápio (ajuste conforme sua operação) */
  hours: "Seg–Sex, 10:30h às 14h",
  city: "São Luís — MA",
  desenvolvedor: "Ilha 3D Studio",
} as const;
