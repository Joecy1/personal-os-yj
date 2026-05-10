export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_type: string
          created_at: string | null
          date: string
          duration_minutes: number | null
          id: string
          intensity: number | null
          notes: string | null
          tags: string[] | null
          time: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          date: string
          duration_minutes?: number | null
          id?: string
          intensity?: number | null
          notes?: string | null
          tags?: string[] | null
          time?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          date?: string
          duration_minutes?: number | null
          id?: string
          intensity?: number | null
          notes?: string | null
          tags?: string[] | null
          time?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      activity_context: {
        Row: {
          activity_id: string
          context_data: Json | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          activity_id: string
          context_data?: Json | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          activity_id?: string
          context_data?: Json | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_context_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          capital_targets: Json
          completed_at: string | null
          created_at: string
          frameworks_used: string[]
          id: string
          milestones: Json
          status: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
          win_condition: string | null
          xp_value: number
        }
        Insert: {
          capital_targets?: Json
          completed_at?: string | null
          created_at?: string
          frameworks_used?: string[]
          id?: string
          milestones?: Json
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
          win_condition?: string | null
          xp_value?: number
        }
        Update: {
          capital_targets?: Json
          completed_at?: string | null
          created_at?: string
          frameworks_used?: string[]
          id?: string
          milestones?: Json
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
          win_condition?: string | null
          xp_value?: number
        }
        Relationships: []
      }
      daily_context: {
        Row: {
          created_at: string | null
          date: string
          energy_level: number | null
          finances_sentiment: string | null
          id: string
          location: string | null
          notes: string | null
          sleep_hours: number | null
          sleep_quality: number | null
          stress_level: number | null
          updated_at: string | null
          user_id: string
          weather: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          energy_level?: number | null
          finances_sentiment?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          stress_level?: number | null
          updated_at?: string | null
          user_id: string
          weather?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          energy_level?: number | null
          finances_sentiment?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          stress_level?: number | null
          updated_at?: string | null
          user_id?: string
          weather?: string | null
        }
        Relationships: []
      }
      daily_reviews: {
        Row: {
          carry_forward: string | null
          created_at: string
          date: string
          focus_intention: string | null
          framework_used_today: string | null
          id: string
          updated_at: string
          user_id: string
          went_well: string | null
        }
        Insert: {
          carry_forward?: string | null
          created_at?: string
          date?: string
          focus_intention?: string | null
          framework_used_today?: string | null
          id?: string
          updated_at?: string
          user_id: string
          went_well?: string | null
        }
        Update: {
          carry_forward?: string | null
          created_at?: string
          date?: string
          focus_intention?: string | null
          framework_used_today?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          went_well?: string | null
        }
        Relationships: []
      }
      desire_cycles: {
        Row: {
          adjustment_direction: string | null
          ambition_size: string | null
          buyer: string | null
          constraint_type: string | null
          consume_what: string | null
          created_at: string
          current_phase: number
          decompose_framework: string | null
          desire: string | null
          desire_type: string | null
          diagnosis: string | null
          enforcement: string | null
          expansion_notes: string | null
          feedback_notes: string | null
          feedback_satisfaction: string | null
          id: string
          idol_name: string | null
          idol_traits: string | null
          idol_why: string | null
          intensity: number | null
          is_self_idol: boolean
          lacking: string | null
          loop_input: string | null
          loop_output: string | null
          loop_process: string | null
          loop_value: string | null
          model_change: string | null
          new_desires_triggered: string | null
          produce_what: string | null
          production_output: string | null
          quota: string | null
          resource_access: string | null
          resource_money: string | null
          resource_network: string | null
          resource_skill: string | null
          resource_time: string | null
          reward: string | null
          scope_leveraged: string | null
          scope_shared: string | null
          scope_solo: string | null
          status: string
          target_note: string | null
          time_horizon: string | null
          trigger: string | null
          updated_at: string
          user_id: string
          worth_it: string | null
        }
        Insert: {
          adjustment_direction?: string | null
          ambition_size?: string | null
          buyer?: string | null
          constraint_type?: string | null
          consume_what?: string | null
          created_at?: string
          current_phase?: number
          decompose_framework?: string | null
          desire?: string | null
          desire_type?: string | null
          diagnosis?: string | null
          enforcement?: string | null
          expansion_notes?: string | null
          feedback_notes?: string | null
          feedback_satisfaction?: string | null
          id?: string
          idol_name?: string | null
          idol_traits?: string | null
          idol_why?: string | null
          intensity?: number | null
          is_self_idol?: boolean
          lacking?: string | null
          loop_input?: string | null
          loop_output?: string | null
          loop_process?: string | null
          loop_value?: string | null
          model_change?: string | null
          new_desires_triggered?: string | null
          produce_what?: string | null
          production_output?: string | null
          quota?: string | null
          resource_access?: string | null
          resource_money?: string | null
          resource_network?: string | null
          resource_skill?: string | null
          resource_time?: string | null
          reward?: string | null
          scope_leveraged?: string | null
          scope_shared?: string | null
          scope_solo?: string | null
          status?: string
          target_note?: string | null
          time_horizon?: string | null
          trigger?: string | null
          updated_at?: string
          user_id: string
          worth_it?: string | null
        }
        Update: {
          adjustment_direction?: string | null
          ambition_size?: string | null
          buyer?: string | null
          constraint_type?: string | null
          consume_what?: string | null
          created_at?: string
          current_phase?: number
          decompose_framework?: string | null
          desire?: string | null
          desire_type?: string | null
          diagnosis?: string | null
          enforcement?: string | null
          expansion_notes?: string | null
          feedback_notes?: string | null
          feedback_satisfaction?: string | null
          id?: string
          idol_name?: string | null
          idol_traits?: string | null
          idol_why?: string | null
          intensity?: number | null
          is_self_idol?: boolean
          lacking?: string | null
          loop_input?: string | null
          loop_output?: string | null
          loop_process?: string | null
          loop_value?: string | null
          model_change?: string | null
          new_desires_triggered?: string | null
          produce_what?: string | null
          production_output?: string | null
          quota?: string | null
          resource_access?: string | null
          resource_money?: string | null
          resource_network?: string | null
          resource_skill?: string | null
          resource_time?: string | null
          reward?: string | null
          scope_leveraged?: string | null
          scope_shared?: string | null
          scope_solo?: string | null
          status?: string
          target_note?: string | null
          time_horizon?: string | null
          trigger?: string | null
          updated_at?: string
          user_id?: string
          worth_it?: string | null
        }
        Relationships: []
      }
      ecosystem_entries: {
        Row: {
          created_at: string
          encountered_at: string
          entry_type: string
          excerpt: string | null
          id: string
          image_url: string | null
          source_url: string | null
          tags: string[]
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encountered_at?: string
          entry_type?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          source_url?: string | null
          tags?: string[]
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          encountered_at?: string
          entry_type?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          source_url?: string | null
          tags?: string[]
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      esm_entries: {
        Row: {
          arousal: number
          captured_at: string
          context: string
          created_at: string
          id: string
          note: string
          primary_emotion: string
          tags: string[]
          trigger: string
          user_id: string
          valence: number
        }
        Insert: {
          arousal?: number
          captured_at?: string
          context?: string
          created_at?: string
          id?: string
          note?: string
          primary_emotion?: string
          tags?: string[]
          trigger?: string
          user_id: string
          valence?: number
        }
        Update: {
          arousal?: number
          captured_at?: string
          context?: string
          created_at?: string
          id?: string
          note?: string
          primary_emotion?: string
          tags?: string[]
          trigger?: string
          user_id?: string
          valence?: number
        }
        Relationships: []
      }
      feedback_items: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          module_key: string
          route: string
          severity: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          module_key?: string
          route?: string
          severity?: string
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          module_key?: string
          route?: string
          severity?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_frameworks: {
        Row: {
          author: string
          core_concepts: Json
          created_at: string
          description: string
          difficulty: string
          domain: string
          how_to_apply: Json
          id: string
          slug: string
          source_title: string
          source_year: number | null
          test_questions: Json
          title: string
          what_its_for: string
          when_it_fails: string
        }
        Insert: {
          author: string
          core_concepts?: Json
          created_at?: string
          description?: string
          difficulty?: string
          domain: string
          how_to_apply?: Json
          id?: string
          slug: string
          source_title: string
          source_year?: number | null
          test_questions?: Json
          title: string
          what_its_for?: string
          when_it_fails?: string
        }
        Update: {
          author?: string
          core_concepts?: Json
          created_at?: string
          description?: string
          difficulty?: string
          domain?: string
          how_to_apply?: Json
          id?: string
          slug?: string
          source_title?: string
          source_year?: number | null
          test_questions?: Json
          title?: string
          what_its_for?: string
          when_it_fails?: string
        }
        Relationships: []
      }
      motivation_entries: {
        Row: {
          actions: Json
          catalyst: string
          created_at: string
          desire: string
          emotion: string
          id: string
          raw_text: string
          reality_check: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actions?: Json
          catalyst?: string
          created_at?: string
          desire?: string
          emotion?: string
          id?: string
          raw_text?: string
          reality_check?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actions?: Json
          catalyst?: string
          created_at?: string
          desire?: string
          emotion?: string
          id?: string
          raw_text?: string
          reality_check?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      perma_aggregates: {
        Row: {
          achievement_avg: number | null
          achievement_trend: number | null
          achievement_volatility: number | null
          created_at: string | null
          date: string
          economic_security_avg: number | null
          economic_security_trend: number | null
          economic_security_volatility: number | null
          engagement_avg: number | null
          engagement_trend: number | null
          engagement_volatility: number | null
          environment_avg: number | null
          environment_trend: number | null
          environment_volatility: number | null
          id: string
          meaning_avg: number | null
          meaning_trend: number | null
          meaning_volatility: number | null
          physical_health_avg: number | null
          physical_health_trend: number | null
          physical_health_volatility: number | null
          positive_emotion_avg: number | null
          positive_emotion_trend: number | null
          positive_emotion_volatility: number | null
          positive_mindset_avg: number | null
          positive_mindset_trend: number | null
          positive_mindset_volatility: number | null
          relationships_avg: number | null
          relationships_trend: number | null
          relationships_volatility: number | null
          updated_at: string | null
          user_id: string
          window_type: string
        }
        Insert: {
          achievement_avg?: number | null
          achievement_trend?: number | null
          achievement_volatility?: number | null
          created_at?: string | null
          date: string
          economic_security_avg?: number | null
          economic_security_trend?: number | null
          economic_security_volatility?: number | null
          engagement_avg?: number | null
          engagement_trend?: number | null
          engagement_volatility?: number | null
          environment_avg?: number | null
          environment_trend?: number | null
          environment_volatility?: number | null
          id?: string
          meaning_avg?: number | null
          meaning_trend?: number | null
          meaning_volatility?: number | null
          physical_health_avg?: number | null
          physical_health_trend?: number | null
          physical_health_volatility?: number | null
          positive_emotion_avg?: number | null
          positive_emotion_trend?: number | null
          positive_emotion_volatility?: number | null
          positive_mindset_avg?: number | null
          positive_mindset_trend?: number | null
          positive_mindset_volatility?: number | null
          relationships_avg?: number | null
          relationships_trend?: number | null
          relationships_volatility?: number | null
          updated_at?: string | null
          user_id: string
          window_type: string
        }
        Update: {
          achievement_avg?: number | null
          achievement_trend?: number | null
          achievement_volatility?: number | null
          created_at?: string | null
          date?: string
          economic_security_avg?: number | null
          economic_security_trend?: number | null
          economic_security_volatility?: number | null
          engagement_avg?: number | null
          engagement_trend?: number | null
          engagement_volatility?: number | null
          environment_avg?: number | null
          environment_trend?: number | null
          environment_volatility?: number | null
          id?: string
          meaning_avg?: number | null
          meaning_trend?: number | null
          meaning_volatility?: number | null
          physical_health_avg?: number | null
          physical_health_trend?: number | null
          physical_health_volatility?: number | null
          positive_emotion_avg?: number | null
          positive_emotion_trend?: number | null
          positive_emotion_volatility?: number | null
          positive_mindset_avg?: number | null
          positive_mindset_trend?: number | null
          positive_mindset_volatility?: number | null
          relationships_avg?: number | null
          relationships_trend?: number | null
          relationships_volatility?: number | null
          updated_at?: string | null
          user_id?: string
          window_type?: string
        }
        Relationships: []
      }
      perma_entries: {
        Row: {
          achievement: number
          created_at: string
          date: string
          economic_security: number
          engagement: number
          environment: number
          id: string
          meaning: number
          physical_health: number
          positive_emotion: number
          positive_mindset: number
          reflection_id: string | null
          relationships: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achievement?: number
          created_at?: string
          date?: string
          economic_security?: number
          engagement?: number
          environment?: number
          id?: string
          meaning?: number
          physical_health?: number
          positive_emotion?: number
          positive_mindset?: number
          reflection_id?: string | null
          relationships?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achievement?: number
          created_at?: string
          date?: string
          economic_security?: number
          engagement?: number
          environment?: number
          id?: string
          meaning?: number
          physical_health?: number
          positive_emotion?: number
          positive_mindset?: number
          reflection_id?: string | null
          relationships?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      personal_map: {
        Row: {
          defend_engines: Json
          destroy_engines: Json
          free_nodes: Json
          inner_citadel: Json
          motto: string
          outputs: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          defend_engines?: Json
          destroy_engines?: Json
          free_nodes?: Json
          inner_citadel?: Json
          motto?: string
          outputs?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          defend_engines?: Json
          destroy_engines?: Json
          free_nodes?: Json
          inner_citadel?: Json
          motto?: string
          outputs?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_map_paths: {
        Row: {
          description: string | null
          id: string
          metrics: Json
          path_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          description?: string | null
          id?: string
          metrics?: Json
          path_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          description?: string | null
          id?: string
          metrics?: Json
          path_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      philosophy_entries: {
        Row: {
          content: string
          created_at: string
          id: string
          index: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          index: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          index?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      player_stats: {
        Row: {
          capital_financial: number
          capital_health: number
          capital_human: number
          capital_psychological: number
          capital_social: number
          capital_symbolic: number
          capital_time_autonomy: number
          id: string
          last_completion_date: string | null
          level: number
          streak_best: number
          streak_current: number
          updated_at: string
          user_id: string
          xp_to_next: number
          xp_total: number
        }
        Insert: {
          capital_financial?: number
          capital_health?: number
          capital_human?: number
          capital_psychological?: number
          capital_social?: number
          capital_symbolic?: number
          capital_time_autonomy?: number
          id?: string
          last_completion_date?: string | null
          level?: number
          streak_best?: number
          streak_current?: number
          updated_at?: string
          user_id: string
          xp_to_next?: number
          xp_total?: number
        }
        Update: {
          capital_financial?: number
          capital_health?: number
          capital_human?: number
          capital_psychological?: number
          capital_social?: number
          capital_symbolic?: number
          capital_time_autonomy?: number
          id?: string
          last_completion_date?: string | null
          level?: number
          streak_best?: number
          streak_current?: number
          updated_at?: string
          user_id?: string
          xp_to_next?: number
          xp_total?: number
        }
        Relationships: []
      }
      pomodoro_sessions: {
        Row: {
          break_min: number
          campaign_id: string | null
          completed: boolean
          created_at: string
          duration_min: number
          ended_at: string | null
          id: string
          log: string
          quest_id: string | null
          started_at: string
          user_id: string
        }
        Insert: {
          break_min?: number
          campaign_id?: string | null
          completed?: boolean
          created_at?: string
          duration_min?: number
          ended_at?: string | null
          id?: string
          log?: string
          quest_id?: string | null
          started_at?: string
          user_id: string
        }
        Update: {
          break_min?: number
          campaign_id?: string | null
          completed?: boolean
          created_at?: string
          duration_min?: number
          ended_at?: string | null
          id?: string
          log?: string
          quest_id?: string | null
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prd_documents: {
        Row: {
          created_at: string
          features: Json
          id: string
          module_key: string
          non_goals: string
          notes: string
          principles: string
          problem: string
          scope: string
          status: string
          success_metrics: string
          title: string
          updated_at: string
          user_id: string
          users: string
        }
        Insert: {
          created_at?: string
          features?: Json
          id?: string
          module_key?: string
          non_goals?: string
          notes?: string
          principles?: string
          problem?: string
          scope?: string
          status?: string
          success_metrics?: string
          title?: string
          updated_at?: string
          user_id: string
          users?: string
        }
        Update: {
          created_at?: string
          features?: Json
          id?: string
          module_key?: string
          non_goals?: string
          notes?: string
          principles?: string
          problem?: string
          scope?: string
          status?: string
          success_metrics?: string
          title?: string
          updated_at?: string
          user_id?: string
          users?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string | null
          onboarded: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name?: string | null
          onboarded?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          onboarded?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      quest_completions: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          quest_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          quest_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          quest_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_completions_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quests: {
        Row: {
          archived: boolean
          campaign_id: string | null
          created_at: string
          id: string
          recurrence: string
          title: string
          type: string
          user_id: string
          xp_value: number
        }
        Insert: {
          archived?: boolean
          campaign_id?: string | null
          created_at?: string
          id?: string
          recurrence?: string
          title: string
          type?: string
          user_id: string
          xp_value?: number
        }
        Update: {
          archived?: boolean
          campaign_id?: string | null
          created_at?: string
          id?: string
          recurrence?: string
          title?: string
          type?: string
          user_id?: string
          xp_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "quests_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      relation_interactions: {
        Row: {
          created_at: string
          how_i_felt: string
          id: string
          interaction_date: string
          person_id: string
          tags: string[]
          updated_at: string
          user_id: string
          valence: string
          want_to_say: string | null
          what_happened: string
        }
        Insert: {
          created_at?: string
          how_i_felt?: string
          id?: string
          interaction_date?: string
          person_id: string
          tags?: string[]
          updated_at?: string
          user_id: string
          valence?: string
          want_to_say?: string | null
          what_happened?: string
        }
        Update: {
          created_at?: string
          how_i_felt?: string
          id?: string
          interaction_date?: string
          person_id?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
          valence?: string
          want_to_say?: string | null
          what_happened?: string
        }
        Relationships: [
          {
            foreignKeyName: "relation_interactions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "relation_people"
            referencedColumns: ["id"]
          },
        ]
      }
      relation_people: {
        Row: {
          avatar_label: string | null
          context: string | null
          created_at: string
          id: string
          name: string
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_label?: string | null
          context?: string | null
          created_at?: string
          id?: string
          name: string
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_label?: string | null
          context?: string | null
          created_at?: string
          id?: string
          name?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_custom_frameworks: {
        Row: {
          author: string | null
          core_concepts: Json
          created_at: string
          description: string
          domain: string
          id: string
          personal_notes: string | null
          source_title: string | null
          title: string
          updated_at: string
          user_id: string
          when_to_use: string
        }
        Insert: {
          author?: string | null
          core_concepts?: Json
          created_at?: string
          description?: string
          domain?: string
          id?: string
          personal_notes?: string | null
          source_title?: string | null
          title: string
          updated_at?: string
          user_id: string
          when_to_use?: string
        }
        Update: {
          author?: string | null
          core_concepts?: Json
          created_at?: string
          description?: string
          domain?: string
          id?: string
          personal_notes?: string | null
          source_title?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          when_to_use?: string
        }
        Relationships: []
      }
      user_frameworks: {
        Row: {
          created_at: string
          framework_id: string
          id: string
          notes: string | null
          status: string
          test_attempts: number
          test_score: number | null
          unlocked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          framework_id: string
          id?: string
          notes?: string | null
          status?: string
          test_attempts?: number
          test_score?: number | null
          unlocked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          framework_id?: string
          id?: string
          notes?: string | null
          status?: string
          test_attempts?: number
          test_score?: number | null
          unlocked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_frameworks_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "knowledge_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      world_map_comparisons: {
        Row: {
          comparison_data: Json | null
          created_at: string
          id: string
          initiator_id: string
          partner_id: string
          partner_label: string
          user_id: string
        }
        Insert: {
          comparison_data?: Json | null
          created_at?: string
          id?: string
          initiator_id: string
          partner_id: string
          partner_label: string
          user_id: string
        }
        Update: {
          comparison_data?: Json | null
          created_at?: string
          id?: string
          initiator_id?: string
          partner_id?: string
          partner_label?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "world_map_comparisons_initiator_id_fkey"
            columns: ["initiator_id"]
            isOneToOne: false
            referencedRelation: "world_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_map_comparisons_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "world_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      world_maps: {
        Row: {
          created_at: string
          frameworks_used: string[]
          id: string
          map_data: Json | null
          raw_text: string
          status: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          frameworks_used?: string[]
          id?: string
          map_data?: Json | null
          raw_text?: string
          status?: string
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          frameworks_used?: string[]
          id?: string
          map_data?: Json | null
          raw_text?: string
          status?: string
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_momentum: {
        Args: {
          p_dimension: string
          p_target_date?: string
          p_user_id: string
          p_window_days?: number
        }
        Returns: number
      }
      calculate_rolling_average: {
        Args: {
          p_dimension: string
          p_target_date?: string
          p_user_id: string
          p_window_days: number
        }
        Returns: number
      }
      calculate_trend_direction: {
        Args: {
          p_dimension: string
          p_prior_days?: number
          p_recent_days?: number
          p_target_date?: string
          p_user_id: string
        }
        Returns: number
      }
      calculate_volatility: {
        Args: {
          p_dimension: string
          p_target_date?: string
          p_user_id: string
          p_window_days?: number
        }
        Returns: number
      }
      correlate_activity_and_wellbeing: {
        Args: {
          p_activity_type: string
          p_dimension: string
          p_lag_days?: number
          p_user_id: string
          p_window_days?: number
        }
        Returns: number
      }
      refresh_perma_aggregates: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id: string }
        Returns: {
          aggregates_created: number
          aggregates_updated: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
