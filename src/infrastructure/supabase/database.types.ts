export type BreathingSettingsRow = {
  user_id: string;
  inhale_seconds: number;
  hold_seconds: number;
  exhale_seconds: number;
  created_at: string;
  updated_at: string;
};

export type BreathingSessionRow = {
  id: string;
  user_id: string;
  cycle_count: number;
  elapsed_seconds: number | string;
  inhale_seconds: number;
  hold_seconds: number;
  exhale_seconds: number;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      breathing_settings: {
        Row: BreathingSettingsRow;
        Insert: {
          user_id: string;
          inhale_seconds: number;
          hold_seconds: number;
          exhale_seconds: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          inhale_seconds?: number;
          hold_seconds?: number;
          exhale_seconds?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      breathing_sessions: {
        Row: BreathingSessionRow;
        Insert: {
          id: string;
          user_id: string;
          cycle_count: number;
          elapsed_seconds: number;
          inhale_seconds: number;
          hold_seconds: number;
          exhale_seconds: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          cycle_count?: number;
          elapsed_seconds?: number;
          inhale_seconds?: number;
          hold_seconds?: number;
          exhale_seconds?: number;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
