// src/types/database.types.ts
// Complete Supabase TypeScript Database Schema Definitions

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TripRole = 'owner' | 'editor' | 'contributor' | 'viewer' | 'plan_only';

export interface Database {
  public: {
    Tables: {
      trips: {
        Row: {
          id: string;
          created_by: string;
          name: string;
          title?: string | null;
          country?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          currency: string;
          total_budget: number;
          budget?: number | null;
          created_at: string;
          updated_at?: string | null;
        };
        Insert: {
          id?: string;
          created_by: string;
          name: string;
          title?: string | null;
          country?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          currency?: string;
          total_budget?: number;
          budget?: number | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          created_by?: string;
          name?: string;
          title?: string | null;
          country?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          currency?: string;
          total_budget?: number;
          budget?: number | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "trips_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          avatar_id?: string | null;
          role?: string | null;
          is_super_admin?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          avatar_id?: string | null;
          role?: string | null;
          is_super_admin?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          avatar_id?: string | null;
          role?: string | null;
          is_super_admin?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      trip_members: {
        Row: {
          id: string;
          trip_id: string;
          user_id: string;
          role: TripRole;
          created_at?: string | null;
        };
        Insert: {
          id?: string;
          trip_id: string;
          user_id: string;
          role?: TripRole;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          trip_id?: string;
          user_id?: string;
          role?: TripRole;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "trip_members_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trip_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trip_members_profile_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      itinerary_items: {
        Row: {
          id: string;
          trip_id: string;
          date_label: string;
          time_slot?: string | null;
          city?: string | null;
          main_place?: string | null;
          main_place_links?: string[] | null;
          food_recommendation?: string | null;
          food_links?: string[] | null;
          transport_info?: string | null;
          backup_plan?: string | null;
          backup_links?: string[] | null;
          sort_order: number;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Insert: {
          id?: string;
          trip_id: string;
          date_label: string;
          time_slot?: string | null;
          city?: string | null;
          main_place?: string | null;
          main_place_links?: string[] | null;
          food_recommendation?: string | null;
          food_links?: string[] | null;
          transport_info?: string | null;
          backup_plan?: string | null;
          backup_links?: string[] | null;
          sort_order?: number;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          trip_id?: string;
          date_label?: string;
          time_slot?: string | null;
          city?: string | null;
          main_place?: string | null;
          main_place_links?: string[] | null;
          food_recommendation?: string | null;
          food_links?: string[] | null;
          transport_info?: string | null;
          backup_plan?: string | null;
          backup_links?: string[] | null;
          sort_order?: number;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "itinerary_items_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          }
        ];
      };
      expenses: {
        Row: {
          id: string;
          trip_id: string;
          title: string;
          amount: number;
          currency: string;
          category: string;
          receipt_url?: string | null;
          spent_at: string;
          payer_id?: string | null;
          payer_name?: string | null;
          payer_avatar?: string | null;
          payment_method?: string | null;
          split_mode?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Insert: {
          id?: string;
          trip_id: string;
          title: string;
          amount: number;
          currency: string;
          category?: string;
          receipt_url?: string | null;
          spent_at?: string;
          payer_id?: string | null;
          payer_name?: string | null;
          payer_avatar?: string | null;
          payment_method?: string | null;
          split_mode?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          trip_id?: string;
          title?: string;
          amount?: number;
          currency?: string;
          category?: string;
          receipt_url?: string | null;
          spent_at?: string;
          payer_id?: string | null;
          payer_name?: string | null;
          payer_avatar?: string | null;
          payment_method?: string | null;
          split_mode?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          }
        ];
      };
      user_devices: {
        Row: {
          id: string;
          user_id: string;
          device_id: string;
          device_name: string;
          browser?: string | null;
          os?: string | null;
          device_type?: string | null;
          ip_address?: string | null;
          last_active_at?: string | null;
          created_at?: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          device_id: string;
          device_name: string;
          browser?: string | null;
          os?: string | null;
          device_type?: string | null;
          ip_address?: string | null;
          last_active_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          device_id?: string;
          device_name?: string;
          browser?: string | null;
          os?: string | null;
          device_type?: string | null;
          ip_address?: string | null;
          last_active_at?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_devices_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      trip_role: TripRole;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Convenient Model Type Aliases
export type TripRow = Database['public']['Tables']['trips']['Row'];
export type TripInsert = Database['public']['Tables']['trips']['Insert'];
export type TripUpdate = Database['public']['Tables']['trips']['Update'];

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type TripMemberRow = Database['public']['Tables']['trip_members']['Row'];
export type TripMemberInsert = Database['public']['Tables']['trip_members']['Insert'];
export type TripMemberUpdate = Database['public']['Tables']['trip_members']['Update'];

export interface TripMemberWithProfile extends TripMemberRow {
  profiles?: ProfileRow | null;
}

export type ItineraryItemRow = Database['public']['Tables']['itinerary_items']['Row'];
export type ItineraryItemInsert = Database['public']['Tables']['itinerary_items']['Insert'];
export type ItineraryItemUpdate = Database['public']['Tables']['itinerary_items']['Update'];

export type ExpenseRow = Database['public']['Tables']['expenses']['Row'];
export type ExpenseInsert = Database['public']['Tables']['expenses']['Insert'];
export type ExpenseUpdate = Database['public']['Tables']['expenses']['Update'];

export type UserDeviceRow = Database['public']['Tables']['user_devices']['Row'];
export type UserDeviceInsert = Database['public']['Tables']['user_devices']['Insert'];
export type UserDeviceUpdate = Database['public']['Tables']['user_devices']['Update'];
