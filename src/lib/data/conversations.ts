import type { Conversation } from "../types";

// Demo (u1) hesabını içeren tohumlanmış sohbetler.
// participantIds: [kiralayan, ilanSahibi]

export const CONVERSATIONS: Conversation[] = [
  {
    id: "c1",
    listingId: "l1",
    participantIds: ["u4", "u1"],
    updatedAt: "2026-06-19T11:05:00Z",
    messages: [
      {
        id: "m1",
        senderId: "u4",
        text: "Merhaba, Caterpillar 320 önümüzdeki hafta müsait mi?",
        createdAt: "2026-06-19T10:30:00Z",
      },
      {
        id: "m2",
        senderId: "u1",
        text: "Merhaba, 25-29 Haziran arası müsait. Operatör dahil kiralıyoruz.",
        createdAt: "2026-06-19T10:50:00Z",
      },
      {
        id: "m3",
        senderId: "u4",
        text: "Harika, nakliye ücreti ne kadar olur Gebze'ye?",
        createdAt: "2026-06-19T11:05:00Z",
      },
    ],
  },
  {
    id: "c2",
    listingId: "l13",
    participantIds: ["u1", "u5"],
    updatedAt: "2026-06-18T12:10:00Z",
    messages: [
      {
        id: "m4",
        senderId: "u1",
        text: "50 ton vinç 28 Haziran için müsait mi? Montaj işi için.",
        createdAt: "2026-06-18T11:45:00Z",
      },
      {
        id: "m5",
        senderId: "u5",
        text: "Müsait. Operatör ve sapancı fiyata dahil. Talebinizi gönderebilirsiniz.",
        createdAt: "2026-06-18T12:10:00Z",
      },
    ],
  },
  {
    id: "c3",
    listingId: "l5",
    participantIds: ["u7", "u1"],
    updatedAt: "2026-06-17T14:20:00Z",
    messages: [
      {
        id: "m6",
        senderId: "u7",
        text: "JCB 3CX iki günlük lazım, nakliye dahil mi?",
        createdAt: "2026-06-17T14:00:00Z",
      },
      {
        id: "m7",
        senderId: "u1",
        text: "Evet, İzmit içi nakliye dahildir. Talebinizi onayladım.",
        createdAt: "2026-06-17T14:20:00Z",
      },
    ],
  },
];
