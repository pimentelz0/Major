export const SUPABASE_SETUP_SQL = `-- ==============================================================================
-- SISTEMA MAJOR - ASSISTÊNCIA TÉCNICA PARA SMARTPHONES
-- SCRIPT COMPLETO DE CONFIGURAÇÃO DO SUPABASE (POSTGRES + RLS + STORAGE)
-- ==============================================================================
-- Execute este script no SQL Editor do seu Dashboard Supabase (https://supabase.com/dashboard)

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de CLIENTES
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL,
    criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    criado_em TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de APARELHOS (DEVICES)
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    imei TEXT,
    criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    criado_em TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de ORDENS DE SERVIÇO (SERVICE_ORDERS)
CREATE TABLE IF NOT EXISTS public.service_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'recebido' CHECK (status IN ('recebido', 'em_reparo', 'pronto', 'entregue')),
    valor NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
    data_entrada TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    data_saida TIMESTAMPTZ,
    descricao_servico TEXT,
    garantia_fim DATE,
    garantia_cobertura TEXT,
    checklist JSONB,
    criado_por UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    criado_em TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garantir colunas essenciais caso as tabelas já existam:
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS checklist JSONB;

-- 5. Tabela de FOTOS DO CHECKLIST (ENTRADA / SAÍDA)
CREATE TABLE IF NOT EXISTS public.checklist_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    categoria TEXT DEFAULT 'geral',
    url_foto TEXT NOT NULL,
    observacao TEXT,
    criado_em TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Índices para performance em buscas e listagens
CREATE INDEX IF NOT EXISTS idx_clients_nome ON public.clients(nome);
CREATE INDEX IF NOT EXISTS idx_clients_telefone ON public.clients(telefone);
CREATE INDEX IF NOT EXISTS idx_devices_client_id ON public.devices(client_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_device_id ON public.service_orders(device_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON public.service_orders(status);
CREATE INDEX IF NOT EXISTS idx_checklist_photos_so_id ON public.checklist_photos(service_order_id);

-- 7. Configuração de RLS (Row Level Security) com isolamento total por usuário
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_photos ENABLE ROW LEVEL SECURITY;

-- Limpeza de políticas antigas
DROP POLICY IF EXISTS "Permitir acesso completo aos clientes para autenticados" ON public.clients;
DROP POLICY IF EXISTS "Permitir acesso completo aos aparelhos para autenticados" ON public.devices;
DROP POLICY IF EXISTS "Permitir acesso completo às OS para autenticados" ON public.service_orders;
DROP POLICY IF EXISTS "Permitir acesso completo às fotos para autenticados" ON public.checklist_photos;
DROP POLICY IF EXISTS "Acesso individual aos clientes" ON public.clients;
DROP POLICY IF EXISTS "Acesso individual aos aparelhos" ON public.devices;
DROP POLICY IF EXISTS "Acesso individual às OS" ON public.service_orders;
DROP POLICY IF EXISTS "Acesso individual às fotos" ON public.checklist_photos;

-- 1. Políticas isoladas para CLIENTES (cada usuário acessa apenas seus próprios clientes cadastrados)
CREATE POLICY "Acesso individual aos clientes"
    ON public.clients FOR ALL
    TO authenticated
    USING (criado_por = auth.uid() OR criado_por IS NULL)
    WITH CHECK (criado_por = auth.uid());

-- 2. Políticas isoladas para APARELHOS (cada usuário acessa apenas seus aparelhos cadastrados)
CREATE POLICY "Acesso individual aos aparelhos"
    ON public.devices FOR ALL
    TO authenticated
    USING (criado_por = auth.uid() OR criado_por IS NULL)
    WITH CHECK (criado_por = auth.uid());

-- 3. Políticas isoladas para ORDENS DE SERVIÇO (cada usuário só vê e gerencia suas próprias OS)
CREATE POLICY "Acesso individual às OS"
    ON public.service_orders FOR ALL
    TO authenticated
    USING (criado_por = auth.uid())
    WITH CHECK (criado_por = auth.uid());

-- 4. Políticas isoladas para FOTOS DE CHECKLIST (apenas fotos pertencentes às OS do usuário)
CREATE POLICY "Acesso individual às fotos"
    ON public.checklist_photos FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.service_orders so
            WHERE so.id = checklist_photos.service_order_id
            AND so.criado_por = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.service_orders so
            WHERE so.id = checklist_photos.service_order_id
            AND so.criado_por = auth.uid()
        )
    );

-- 8. Storage Bucket para fotos do checklist (major-photos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('major-photos', 'major-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas do Storage para o bucket major-photos
DROP POLICY IF EXISTS "Permitir upload de fotos para autenticados" ON storage.objects;
CREATE POLICY "Permitir upload de fotos para autenticados"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'major-photos');

DROP POLICY IF EXISTS "Permitir leitura pública das fotos" ON storage.objects;
CREATE POLICY "Permitir leitura pública das fotos"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'major-photos');

DROP POLICY IF EXISTS "Permitir deletar fotos para autenticados" ON storage.objects;
CREATE POLICY "Permitir deletar fotos para autenticados"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'major-photos');
`;
