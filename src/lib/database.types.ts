export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          image_url?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sub_categories: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          product_code: string | null;
          short_description: string | null;
          features: string[] | null;
          applications: Json | null;
          is_featured: boolean;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          product_code?: string | null;
          short_description?: string | null;
          features?: string[] | null;
          applications?: Json | null;
          is_featured?: boolean;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          image_url?: string | null;
          product_code?: string | null;
          short_description?: string | null;
          features?: string[] | null;
          applications?: Json | null;
          is_featured?: boolean;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sub_categories_category_id_fkey",
            columns: ["category_id"],
            isOneToOne: false,
            referencedRelation: "categories",
            referencedColumns: ["id"],
          },
        ];
      };
      sub_category_images: {
        Row: {
          id: string;
          sub_category_id: string;
          sub_category_variant_id: string | null;
          image_url: string;
          alt_text: string | null;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          sub_category_id: string;
          sub_category_variant_id?: string | null;
          image_url: string;
          alt_text?: string | null;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          sub_category_id?: string;
          sub_category_variant_id?: string | null;
          image_url?: string;
          alt_text?: string | null;
          display_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sub_category_images_sub_category_id_fkey",
            columns: ["sub_category_id"],
            isOneToOne: false,
            referencedRelation: "sub_categories",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "sub_category_images_sub_category_variant_id_fkey",
            columns: ["sub_category_variant_id"],
            isOneToOne: false,
            referencedRelation: "sub_category_variants",
            referencedColumns: ["id"],
          },
        ];
      };
      sub_category_specifications: {
        Row: {
          id: string;
          sub_category_id: string;
          specification_name: string;
          specification_value: string;
          display_order: number;
        };
        Insert: {
          id?: string;
          sub_category_id: string;
          specification_name: string;
          specification_value: string;
          display_order?: number;
        };
        Update: {
          id?: string;
          sub_category_id?: string;
          specification_name?: string;
          specification_value?: string;
          display_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "sub_category_specifications_sub_category_id_fkey",
            columns: ["sub_category_id"],
            isOneToOne: false,
            referencedRelation: "sub_categories",
            referencedColumns: ["id"],
          },
        ];
      };
      category_variants: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          size: string | null;
          shape: string | null;
          color: string | null;
          capacity: string | null;
          material: string | null;
          price: string | null;
          is_active: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          size?: string | null;
          shape?: string | null;
          color?: string | null;
          capacity?: string | null;
          material?: string | null;
          price?: string | null;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          size?: string | null;
          shape?: string | null;
          color?: string | null;
          capacity?: string | null;
          material?: string | null;
          price?: string | null;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "category_variants_category_id_fkey",
            columns: ["category_id"],
            isOneToOne: false,
            referencedRelation: "categories",
            referencedColumns: ["id"],
          },
        ];
      };
      category_images: {
        Row: {
          id: string;
          category_id: string;
          category_variant_id: string | null;
          image_url: string;
          alt_text: string | null;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          category_variant_id?: string | null;
          image_url: string;
          alt_text?: string | null;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          category_variant_id?: string | null;
          image_url?: string;
          alt_text?: string | null;
          display_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "category_images_category_variant_id_fkey",
            columns: ["category_variant_id"],
            isOneToOne: false,
            referencedRelation: "category_variants",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "category_images_category_id_fkey",
            columns: ["category_id"],
            isOneToOne: false,
            referencedRelation: "categories",
            referencedColumns: ["id"],
          },
        ];
      };
      sub_category_variants: {
        Row: {
          id: string;
          sub_category_id: string;
          name: string;
          size: string | null;
          shape: string | null;
          color: string | null;
          capacity: string | null;
          material: string | null;
          price: string | null;
          is_active: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sub_category_id: string;
          name: string;
          size?: string | null;
          shape?: string | null;
          color?: string | null;
          capacity?: string | null;
          material?: string | null;
          price?: string | null;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sub_category_id?: string;
          name?: string;
          size?: string | null;
          shape?: string | null;
          color?: string | null;
          capacity?: string | null;
          material?: string | null;
          price?: string | null;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sub_category_variants_sub_category_id_fkey",
            columns: ["sub_category_id"],
            isOneToOne: false,
            referencedRelation: "sub_categories",
            referencedColumns: ["id"],
          },
        ];
      };
      industries: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      enquiries: {
        Row: {
          id: string;
          sub_category_id: string | null;
          name: string;
          company: string | null;
          phone: string;
          email: string | null;
          quantity: string | null;
          message: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          sub_category_id?: string | null;
          name: string;
          company?: string | null;
          phone: string;
          email?: string | null;
          quantity?: string | null;
          message?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          sub_category_id?: string | null;
          name?: string;
          company?: string | null;
          phone?: string;
          email?: string | null;
          quantity?: string | null;
          message?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "enquiries_sub_category_id_fkey",
            columns: ["sub_category_id"],
            isOneToOne: false,
            referencedRelation: "sub_categories",
            referencedColumns: ["id"],
          },
        ];
      };
      site_settings: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}