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
      products: {
        Row: {
          id: string;
          sub_category_id: string;
          name: string;
          slug: string;
          product_code: string | null;
          short_description: string | null;
          description: string | null;
          features: string[] | null;
          applications: Json | null;
          is_featured: boolean;
          is_active: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sub_category_id: string;
          name: string;
          slug: string;
          product_code?: string | null;
          short_description?: string | null;
          description?: string | null;
          features?: string[] | null;
          applications?: Json | null;
          is_featured?: boolean;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sub_category_id?: string;
          name?: string;
          slug?: string;
          product_code?: string | null;
          short_description?: string | null;
          description?: string | null;
          features?: string[] | null;
          applications?: Json | null;
          is_featured?: boolean;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_sub_category_id_fkey",
            columns: ["sub_category_id"],
            isOneToOne: false,
            referencedRelation: "sub_categories",
            referencedColumns: ["id"],
          },
        ];
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          image_url: string;
          alt_text: string | null;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          image_url: string;
          alt_text?: string | null;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          image_url?: string;
          alt_text?: string | null;
          display_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey",
            columns: ["product_id"],
            isOneToOne: false,
            referencedRelation: "products",
            referencedColumns: ["id"],
          },
        ];
      };
      product_specifications: {
        Row: {
          id: string;
          product_id: string;
          specification_name: string;
          specification_value: string;
          display_order: number;
        };
        Insert: {
          id?: string;
          product_id: string;
          specification_name: string;
          specification_value: string;
          display_order?: number;
        };
        Update: {
          id?: string;
          product_id?: string;
          specification_name?: string;
          specification_value?: string;
          display_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "product_specifications_product_id_fkey",
            columns: ["product_id"],
            isOneToOne: false,
            referencedRelation: "products",
            referencedColumns: ["id"],
          },
        ];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          name: string;
          size: string | null;
          shape: string | null;
          color: string | null;
          weight: string | null;
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
          product_id: string;
          name: string;
          size?: string | null;
          shape?: string | null;
          color?: string | null;
          weight?: string | null;
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
          product_id?: string;
          name?: string;
          size?: string | null;
          shape?: string | null;
          color?: string | null;
          weight?: string | null;
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
            foreignKeyName: "product_variants_product_id_fkey",
            columns: ["product_id"],
            isOneToOne: false,
            referencedRelation: "products",
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
      product_industries: {
        Row: {
          product_id: string;
          industry_id: string;
        };
        Insert: {
          product_id: string;
          industry_id: string;
        };
        Update: {
          product_id?: string;
          industry_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_industries_product_id_fkey",
            columns: ["product_id"],
            isOneToOne: false,
            referencedRelation: "products",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "product_industries_industry_id_fkey",
            columns: ["industry_id"],
            isOneToOne: false,
            referencedRelation: "industries",
            referencedColumns: ["id"],
          },
        ];
      };
      enquiries: {
        Row: {
          id: string;
          product_id: string | null;
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
          product_id?: string | null;
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
          product_id?: string | null;
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
            foreignKeyName: "enquiries_product_id_fkey",
            columns: ["product_id"],
            isOneToOne: false,
            referencedRelation: "products",
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
