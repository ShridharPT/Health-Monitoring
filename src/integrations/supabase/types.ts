export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      patients: {
        Row: {
          id: string
          name: string
          age: number
          gender: string
          room_no: string
          weight: number | null
          allergies: string[] | null
          contact: string | null
          admission_date: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          age: number
          gender: string
          room_no: string
          weight?: number | null
          allergies?: string[] | null
          contact?: string | null
          admission_date?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          age?: number
          gender?: string
          room_no?: string
          weight?: number | null
          allergies?: string[] | null
          contact?: string | null
          admission_date?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          id: string
          name: string
          email: string
          password_hash: string
          role: string
          contact: string | null
          department: string | null
          specialization: string | null
          on_duty: boolean
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          password_hash: string
          role: string
          contact?: string | null
          department?: string | null
          specialization?: string | null
          on_duty?: boolean
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          password_hash?: string
          role?: string
          contact?: string | null
          department?: string | null
          specialization?: string | null
          on_duty?: boolean
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      assignments: {
        Row: {
          id: string
          patient_id: string
          doctor_id: string
          nurse_id: string | null
          start_time: string
          end_time: string | null
          status: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          doctor_id: string
          nurse_id?: string | null
          start_time?: string
          end_time?: string | null
          status?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          doctor_id?: string
          nurse_id?: string | null
          start_time?: string
          end_time?: string | null
          status?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      vitals: {
        Row: {
          id: string
          patient_id: string
          heart_rate: number
          spo2: number
          resp_rate: number
          systolic_bp: number
          diastolic_bp: number
          temperature: number
          device_id: string | null
          ecg_waveform_ref: string | null
          timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          heart_rate: number
          spo2: number
          resp_rate: number
          systolic_bp: number
          diastolic_bp: number
          temperature: number
          device_id?: string | null
          ecg_waveform_ref?: string | null
          timestamp?: string
          created_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          heart_rate?: number
          spo2?: number
          resp_rate?: number
          systolic_bp?: number
          diastolic_bp?: number
          temperature?: number
          device_id?: string | null
          ecg_waveform_ref?: string | null
          timestamp?: string
          created_at?: string
        }
        Relationships: []
      }
      predictions: {
        Row: {
          id: string
          patient_id: string
          risk_level: string
          probability: number
          explanation: string
          contributing_factors: Json | null
          model_version: string | null
          timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          risk_level: string
          probability: number
          explanation: string
          contributing_factors?: Json | null
          model_version?: string | null
          timestamp?: string
          created_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          risk_level?: string
          probability?: number
          explanation?: string
          contributing_factors?: Json | null
          model_version?: string | null
          timestamp?: string
          created_at?: string
        }
        Relationships: []
      }
      forecasts: {
        Row: {
          id: string
          patient_id: string
          forecast_json: Json
          horizon_minutes: number
          model_version: string | null
          confidence: number | null
          risk_projection: string | null
          timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          forecast_json: Json
          horizon_minutes?: number
          model_version?: string | null
          confidence?: number | null
          risk_projection?: string | null
          timestamp?: string
          created_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          forecast_json?: Json
          horizon_minutes?: number
          model_version?: string | null
          confidence?: number | null
          risk_projection?: string | null
          timestamp?: string
          created_at?: string
        }
        Relationships: []
      }
      medicines: {
        Row: {
          id: string
          name: string
          generic_name: string | null
          default_dosage: string
          unit: string
          category: string
          route: string
          interactions: Json
          contraindications: string[] | null
          side_effects: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          generic_name?: string | null
          default_dosage: string
          unit: string
          category: string
          route?: string
          interactions?: Json
          contraindications?: string[] | null
          side_effects?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          generic_name?: string | null
          default_dosage?: string
          unit?: string
          category?: string
          route?: string
          interactions?: Json
          contraindications?: string[] | null
          side_effects?: string[] | null
          created_at?: string
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          id: string
          patient_id: string
          doctor_id: string
          nurse_id: string | null
          medicines: Json
          from_voice: boolean
          voice_transcript: string | null
          status: string
          priority: string
          notes: string | null
          created_at: string
          acknowledged_at: string | null
          administered_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          patient_id: string
          doctor_id: string
          nurse_id?: string | null
          medicines?: Json
          from_voice?: boolean
          voice_transcript?: string | null
          status?: string
          priority?: string
          notes?: string | null
          created_at?: string
          acknowledged_at?: string | null
          administered_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          patient_id?: string
          doctor_id?: string
          nurse_id?: string | null
          medicines?: Json
          from_voice?: boolean
          voice_transcript?: string | null
          status?: string
          priority?: string
          notes?: string | null
          created_at?: string
          acknowledged_at?: string | null
          administered_at?: string | null
          completed_at?: string | null
        }
        Relationships: []
      }
      iot_devices: {
        Row: {
          id: string
          device_id: string
          patient_id: string | null
          device_type: string
          manufacturer: string | null
          model: string | null
          status: string
          battery_level: number | null
          firmware_version: string | null
          last_seen: string | null
          config: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          device_id: string
          patient_id?: string | null
          device_type: string
          manufacturer?: string | null
          model?: string | null
          status?: string
          battery_level?: number | null
          firmware_version?: string | null
          last_seen?: string | null
          config?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          device_id?: string
          patient_id?: string | null
          device_type?: string
          manufacturer?: string | null
          model?: string | null
          status?: string
          battery_level?: number | null
          firmware_version?: string | null
          last_seen?: string | null
          config?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          patient_id: string | null
          staff_id: string | null
          sender_id: string | null
          type: string
          priority: string
          title: string
          message: string
          data: Json
          read_status: boolean
          acknowledged: boolean
          acknowledged_at: string | null
          escalated: boolean
          escalated_to: string | null
          timestamp: string
        }
        Insert: {
          id?: string
          patient_id?: string | null
          staff_id?: string | null
          sender_id?: string | null
          type: string
          priority?: string
          title: string
          message: string
          data?: Json
          read_status?: boolean
          acknowledged?: boolean
          acknowledged_at?: string | null
          escalated?: boolean
          escalated_to?: string | null
          timestamp?: string
        }
        Update: {
          id?: string
          patient_id?: string | null
          staff_id?: string | null
          sender_id?: string | null
          type?: string
          priority?: string
          title?: string
          message?: string
          data?: Json
          read_status?: boolean
          acknowledged?: boolean
          acknowledged_at?: string | null
          escalated?: boolean
          escalated_to?: string | null
          timestamp?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          patient_id: string | null
          message: string
          message_type: string
          attachment_url: string | null
          reference_id: string | null
          is_urgent: boolean
          read_at: string | null
          delivered_at: string | null
          timestamp: string
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          patient_id?: string | null
          message: string
          message_type?: string
          attachment_url?: string | null
          reference_id?: string | null
          is_urgent?: boolean
          read_at?: string | null
          delivered_at?: string | null
          timestamp?: string
        }
        Update: {
          id?: string
          sender_id?: string
          receiver_id?: string
          patient_id?: string | null
          message?: string
          message_type?: string
          attachment_url?: string | null
          reference_id?: string | null
          is_urgent?: boolean
          read_at?: string | null
          delivered_at?: string | null
          timestamp?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          id: string
          patient_id: string
          generated_by: string | null
          report_type: string
          file_path: string | null
          file_url: string | null
          content: Json | null
          date_range_start: string | null
          date_range_end: string | null
          generated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          generated_by?: string | null
          report_type: string
          file_path?: string | null
          file_url?: string | null
          content?: Json | null
          date_range_start?: string | null
          date_range_end?: string | null
          generated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          generated_by?: string | null
          report_type?: string
          file_path?: string | null
          file_url?: string | null
          content?: Json | null
          date_range_start?: string | null
          date_range_end?: string | null
          generated_at?: string
        }
        Relationships: []
      }
      risk_events: {
        Row: {
          id: string
          patient_id: string
          event_type: string
          severity: string
          message: string
          vital_id: string | null
          prediction_id: string | null
          acknowledged: boolean
          acknowledged_at: string | null
          timestamp: string
        }
        Insert: {
          id?: string
          patient_id: string
          event_type: string
          severity: string
          message: string
          vital_id?: string | null
          prediction_id?: string | null
          acknowledged?: boolean
          acknowledged_at?: string | null
          timestamp?: string
        }
        Update: {
          id?: string
          patient_id?: string
          event_type?: string
          severity?: string
          message?: string
          vital_id?: string | null
          prediction_id?: string | null
          acknowledged?: boolean
          acknowledged_at?: string | null
          timestamp?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database["public"]

export type Tables<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Update"]
