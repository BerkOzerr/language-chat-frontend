export type AccountType = "guest" | "registered";
export interface User {
  id: string;
  username: string;
  email?: string | null;
  account_type?: AccountType;
  email_verified_at?: string | null;
  native_language?: LanguageCode | null;
  learning_language?: LanguageCode | null;
  language_level?: LanguageLevel | null;
}
// Backend oturum süresini camelCase (expiresAt) döndürür.
export interface Session { id: string; expiresAt: string }
export interface AuthResponse {
  user: User;
  session: Session;
  token: string;
  tokenType: "Bearer";
}
export interface Room {
  id: string;
  name: string;
  description: string | null;
  language_code: LanguageCode;
  language_level: LanguageLevel | null;
  max_members: number;
  // Oluşturan kullanıcı silinirse backend bu alanı boşaltır.
  created_by: string | null;
  is_active: boolean;
  created_at: string;
  member_count: number;
}
// POST /rooms yanıtında member_count yoktur, yalnızca GET /rooms listesinde gelir.
export type CreatedRoom = Omit<Room, "member_count"> & { member_count?: number };
export interface MessagesPage {
  messages: Message[]; // en yeniden eskiye doğru
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
}
export interface Message {
  id: string;
  room_id: string;
  user_id: string;
  username: string;
  content: string;
  created_at: string;
}
export type LanguageCode = "tr" | "en" | "de" | "fr" | "es" | "it" | "pt" | "ru" | "ja" | "ko" | "zh" | "ar";
export type LanguageLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export interface ApiErrorBody { error?: string; message?: string; [key: string]: unknown }
export interface ApiErrorShape { status: number; code?: string; message: string; body?: ApiErrorBody }
export const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: "tr", label: "Türkçe" }, { code: "en", label: "İngilizce" },
  { code: "de", label: "Almanca" }, { code: "fr", label: "Fransızca" },
  { code: "es", label: "İspanyolca" }, { code: "it", label: "İtalyanca" },
  { code: "pt", label: "Portekizce" }, { code: "ru", label: "Rusça" },
  { code: "ja", label: "Japonca" }, { code: "ko", label: "Korece" },
  { code: "zh", label: "Çince" }, { code: "ar", label: "Arapça" }
];
export const LEVELS: LanguageLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];