-- Add unique constraints to subcategories and shows tables for upsert support
ALTER TABLE public.subcategories ADD CONSTRAINT subcategories_name_key UNIQUE (name);
ALTER TABLE public.shows ADD CONSTRAINT shows_name_key UNIQUE (name);