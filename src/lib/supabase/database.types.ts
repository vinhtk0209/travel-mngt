export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type TripRole = 'owner' | 'editor' | 'viewer'
export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired'
export type ItemStatus = 'todo' | 'completed'
export type AssistantMode = 'basic' | 'gemini'
export type ChatBackground = 'default' | 'sunset' | 'mint' | 'lavender'
export type Locale = 'en' | 'vi'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string
          avatar_url: string | null
          locale: Locale
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string
          display_name?: string
          avatar_url?: string | null
          locale?: Locale
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string
          display_name?: string
          avatar_url?: string | null
          locale?: Locale
          updated_at?: string
        }
        Relationships: []
      }
      trips: {
        Row: {
          id: string
          name: string
          destination: string
          description: string | null
          start_date: string | null
          end_date: string | null
          cover_image: string | null
          owner_id: string
          assistant_mode: AssistantMode
          chat_background: ChatBackground
          chat_background_path: string | null
          share_token: string | null
          share_role: TripRole
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          destination?: string
          description?: string | null
          start_date?: string | null
          end_date?: string | null
          cover_image?: string | null
          owner_id: string
          assistant_mode?: AssistantMode
          chat_background?: ChatBackground
          chat_background_path?: string | null
          share_token?: string | null
          share_role?: TripRole
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          destination?: string
          description?: string | null
          start_date?: string | null
          end_date?: string | null
          cover_image?: string | null
          owner_id?: string
          assistant_mode?: AssistantMode
          chat_background?: ChatBackground
          chat_background_path?: string | null
          share_token?: string | null
          share_role?: TripRole
          updated_at?: string
        }
        Relationships: []
      }
      trip_assistant_preferences: {
        Row: {
          trip_id: string
          user_id: string
          mode: AssistantMode
          updated_at: string
        }
        Insert: {
          trip_id: string
          user_id: string
          mode: AssistantMode
          updated_at?: string
        }
        Update: {
          trip_id?: string
          user_id?: string
          mode?: AssistantMode
          updated_at?: string
        }
        Relationships: []
      }
      trip_members: {
        Row: {
          id: string
          trip_id: string
          user_id: string
          role: TripRole
          joined_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          user_id: string
          role?: TripRole
          joined_at?: string
        }
        Update: {
          role?: TripRole
        }
        Relationships: []
      }
      trip_invitations: {
        Row: {
          id: string
          trip_id: string
          email: string | null
          role: TripRole
          invited_by: string
          token_hash: string
          status: InvitationStatus
          expires_at: string
          created_at: string
          responded_at: string | null
        }
        Insert: {
          id?: string
          trip_id: string
          email?: string | null
          role?: TripRole
          invited_by: string
          token_hash: string
          status?: InvitationStatus
          expires_at?: string
          created_at?: string
          responded_at?: string | null
        }
        Update: {
          role?: TripRole
          status?: InvitationStatus
          expires_at?: string
          responded_at?: string | null
        }
        Relationships: []
      }
      trip_messages: {
        Row: {
          id: string
          trip_id: string
          sender_id: string
          content: string
          edited_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          sender_id: string
          content: string
          edited_at?: string | null
          created_at?: string
        }
        Update: {
          content?: string
          edited_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      trip_chat_reads: {
        Row: { trip_id: string; user_id: string; last_read_at: string; notifications_enabled: boolean }
        Insert: { trip_id: string; user_id: string; last_read_at?: string; notifications_enabled?: boolean }
        Update: { last_read_at?: string; notifications_enabled?: boolean }
        Relationships: []
      }
      trip_message_mentions: {
        Row: { message_id: string; user_id: string }
        Insert: { message_id: string; user_id: string }
        Update: { message_id?: string; user_id?: string }
        Relationships: []
      }
      trip_posts: {
        Row: { id: string; trip_id: string; author_id: string; trip_item_id: string | null; content: string; pinned: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; trip_id: string; author_id: string; trip_item_id?: string | null; content?: string; pinned?: boolean; created_at?: string; updated_at?: string }
        Update: { trip_item_id?: string | null; content?: string; pinned?: boolean; updated_at?: string }
        Relationships: []
      }
      trip_post_images: {
        Row: { id: string; post_id: string; storage_path: string; file_name: string; sort_order: number; created_at: string }
        Insert: { id?: string; post_id: string; storage_path: string; file_name: string; sort_order?: number; created_at?: string }
        Update: { sort_order?: number }
        Relationships: []
      }
      trip_post_reactions: {
        Row: { post_id: string; user_id: string; emoji: string; created_at: string }
        Insert: { post_id: string; user_id: string; emoji: string; created_at?: string }
        Update: { emoji?: string }
        Relationships: []
      }
      trip_post_comments: {
        Row: { id: string; post_id: string; author_id: string; parent_comment_id: string | null; content: string; created_at: string; updated_at: string }
        Insert: { id?: string; post_id: string; author_id: string; parent_comment_id?: string | null; content: string; created_at?: string; updated_at?: string }
        Update: { content?: string; updated_at?: string }
        Relationships: []
      }
      trip_notifications: {
        Row: { id: string; trip_id: string; user_id: string; actor_id: string; source_id: string; kind: 'chat' | 'mention' | 'comment' | 'reaction'; created_at: string; read_at: string | null }
        Insert: { id?: string; trip_id: string; user_id: string; actor_id: string; source_id: string; kind: 'chat' | 'mention' | 'comment' | 'reaction'; created_at?: string; read_at?: string | null }
        Update: { read_at?: string | null }
        Relationships: []
      }
      trip_message_attachments: {
        Row: {
          id: string
          message_id: string
          storage_path: string
          file_name: string
          mime_type: string
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          storage_path: string
          file_name?: string
          mime_type: string
          created_at?: string
        }
        Update: {
          file_name?: string
          mime_type?: string
        }
        Relationships: []
      }
      trip_message_reactions: {
        Row: {
          message_id: string
          user_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          message_id: string
          user_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          emoji?: string
        }
        Relationships: []
      }
      trip_items: {
        Row: {
          id: string
          trip_id: string
          name: string
          address: string | null
          google_maps_url: string | null
          latitude: number | null
          longitude: number | null
          notes: string | null
          status: ItemStatus
          sort_order: number
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          name: string
          address?: string | null
          google_maps_url?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          status?: ItemStatus
          sort_order?: number
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          address?: string | null
          google_maps_url?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          status?: ItemStatus
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          id: string
          trip_id: string
          name: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          name: string
          color?: string
          created_at?: string
        }
        Update: {
          name?: string
          color?: string
        }
        Relationships: []
      }
      trip_item_tags: {
        Row: {
          id: string
          trip_item_id: string
          tag_id: string
        }
        Insert: {
          id?: string
          trip_item_id: string
          tag_id: string
        }
        Update: {
          id?: string
          trip_item_id?: string
          tag_id?: string
        }
        Relationships: []
      }
      trip_item_images: {
        Row: {
          id: string
          trip_item_id: string
          storage_path: string
          file_name: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          trip_item_id: string
          storage_path: string
          file_name: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          sort_order?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      send_trip_message: {
        Args: { p_trip_id: string; p_content: string; p_mentioned_user_ids?: string[] }
        Returns: Database['public']['Tables']['trip_messages']['Row']
      }
      edit_trip_message: {
        Args: { p_message_id: string; p_content: string; p_mentioned_user_ids?: string[] }
        Returns: Database['public']['Tables']['trip_messages']['Row']
      }
      mark_trip_chat_read: {
        Args: { p_trip_id: string; p_at: string }
        Returns: undefined
      }
      set_trip_chat_notifications: {
        Args: { p_trip_id: string; p_enabled: boolean }
        Returns: undefined
      }
      accept_trip_invitation: {
        Args: { p_token: string }
        Returns: string
      }
      accept_trip_invitation_by_id: {
        Args: { p_invitation_id: string }
        Returns: string
      }
      reject_trip_invitation: {
        Args: { p_token: string }
        Returns: undefined
      }
      reject_trip_invitation_by_id: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      list_my_invitations: {
        Args: Record<PropertyKey, never>
        Returns: {
          invitation_id: string
          trip_id: string
          trip_name: string
          trip_destination: string
          inviter_name: string
          role: TripRole
          created_at: string
          expires_at: string
        }[]
      }
      transfer_trip_ownership: {
        Args: { p_trip_id: string; p_new_owner_id: string }
        Returns: undefined
      }
      reorder_trip_items: {
        Args: { p_trip_id: string; p_item_ids: string[] }
        Returns: undefined
      }
      get_or_create_trip_share: {
        Args: { p_trip_id: string; p_role?: TripRole | null }
        Returns: { token: string; role: TripRole }
      }
      set_trip_share_role: {
        Args: { p_trip_id: string; p_role: TripRole }
        Returns: undefined
      }
      regenerate_trip_share_token: {
        Args: { p_trip_id: string }
        Returns: string
      }
      disable_trip_share: {
        Args: { p_trip_id: string }
        Returns: undefined
      }
      resolve_trip_share: {
        Args: { p_token: string }
        Returns: {
          id: string
          name: string
          destination: string
          description: string | null
          start_date: string | null
          end_date: string | null
          share_role: TripRole
          owner_name: string
          member_count: number
          already_member: boolean
        } | null
      }
      join_trip_by_share: {
        Args: { p_token: string }
        Returns: string
      }
      is_trip_member: {
        Args: { p_trip_id: string }
        Returns: boolean
      }
      can_edit_trip: {
        Args: { p_trip_id: string }
        Returns: boolean
      }
      is_trip_owner: {
        Args: { p_trip_id: string }
        Returns: boolean
      }
      trip_role_for: {
        Args: { p_trip_id: string }
        Returns: TripRole | null
      }
      shares_trip_with: {
        Args: { p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      trip_role: TripRole
      invitation_status: InvitationStatus
      item_status: ItemStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
