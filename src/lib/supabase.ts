import { createClient } from '@supabase/supabase-js';
import type { OSStatus, OSWithDetails, CreateOSPayload } from '../types';

// Supabase project credentials provided by the user
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://zchqmfalscdakqdwknwl.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_Dw1ynQIFzZBtBycGgt_X4g_Y4qNB17r';

// Initialize Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const STORAGE_BUCKET_NAME = 'major-photos';

/**
 * Upload a photo file (from camera or file picker) to Supabase Storage
 */
export async function uploadChecklistPhoto(
  file: File,
  serviceOrderId: string,
  prefix: 'entrada' | 'saida' = 'entrada'
): Promise<string> {
  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `${serviceOrderId}/${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.warn('Storage bucket upload warning:', uploadError.message);
      // Fallback: convert to base64 Data URL if storage bucket is not created yet
      return await fileToDataUrl(file);
    }

    const { data } = supabase.storage
      .from(STORAGE_BUCKET_NAME)
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (err) {
    console.error('Error uploading photo:', err);
    return await fileToDataUrl(file);
  }
}

/**
 * Utility helper to convert File to Data URL as resilient fallback
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Fetch all Service Orders with their associated Client, Device, and Photos directly from Supabase
 */
export async function fetchServiceOrders(): Promise<{
  data: OSWithDetails[];
  error: Error | null;
}> {
  try {
    const { data: orders, error: ordersError } = await supabase
      .from('service_orders')
      .select(
        `
        *,
        device:devices (
          *,
          client:clients (*)
        ),
        photos:checklist_photos (*)
      `
      )
      .order('criado_em', { ascending: false });

    if (ordersError) {
      console.error('Supabase query error:', ordersError);
      return { data: [], error: new Error(ordersError.message) };
    }

    const formatted: OSWithDetails[] = (orders || []).map((so: any) => {
      return {
        id: so.id,
        device_id: so.device_id,
        status: so.status as OSStatus,
        valor: Number(so.valor || 0),
        data_entrada: so.data_entrada,
        data_saida: so.data_saida,
        descricao_servico: so.descricao_servico,
        garantia_fim: so.garantia_fim,
        garantia_cobertura: so.garantia_cobertura,
        criado_por: so.criado_por,
        criado_em: so.criado_em,
        device: so.device,
        client: so.device?.client,
        photos: so.photos || [],
      };
    });

    return { data: formatted, error: null };
  } catch (err: any) {
    console.error('Fetch error:', err);
    return { data: [], error: err };
  }
}

/**
 * Create a new complete Service Order (Client + Device + ServiceOrder + ChecklistPhotos)
 */
export async function createServiceOrder(
  payload: CreateOSPayload,
  userId?: string
): Promise<{ data: OSWithDetails | null; error: Error | null }> {
  try {
    // 1. Insert Client
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .insert([
        {
          nome: payload.clienteNome.trim(),
          telefone: payload.clienteTelefone.replace(/\D/g, ''),
        },
      ])
      .select()
      .single();

    if (clientError || !clientData) {
      throw new Error(`Erro ao salvar cliente: ${clientError?.message}`);
    }

    // 2. Insert Device
    const { data: deviceData, error: deviceError } = await supabase
      .from('devices')
      .insert([
        {
          client_id: clientData.id,
          marca: payload.aparelhoMarca.trim(),
          modelo: payload.aparelhoModelo.trim(),
          imei: payload.aparelhoImei?.trim() || null,
        },
      ])
      .select()
      .single();

    if (deviceError || !deviceData) {
      throw new Error(`Erro ao salvar aparelho: ${deviceError?.message}`);
    }

    // 3. Insert Service Order
    const { data: orderData, error: orderError } = await supabase
      .from('service_orders')
      .insert([
        {
          device_id: deviceData.id,
          status: 'recebido',
          valor: payload.valor || 0,
          descricao_servico: payload.descricaoServico?.trim() || null,
          criado_por: userId || null,
        },
      ])
      .select()
      .single();

    if (orderError || !orderData) {
      throw new Error(`Erro ao criar OS: ${orderError?.message}`);
    }

    // 4. Insert Entry Photos if any
    if (payload.fotosEntrada && payload.fotosEntrada.length > 0) {
      const photoRows = payload.fotosEntrada.map((f) => ({
        service_order_id: orderData.id,
        tipo: 'entrada',
        categoria: f.categoria || 'geral',
        url_foto: f.url,
        observacao: f.observacao || null,
      }));

      const { error: photoError } = await supabase
        .from('checklist_photos')
        .insert(photoRows);

      if (photoError) {
        console.warn('Erro ao salvar fotos de entrada:', photoError.message);
      }
    }

    // Return the created OS structure
    const fullOS: OSWithDetails = {
      ...orderData,
      client: clientData,
      device: deviceData,
      photos: payload.fotosEntrada.map((f, idx) => ({
        id: `temp-${idx}`,
        service_order_id: orderData.id,
        tipo: 'entrada',
        categoria: f.categoria,
        url_foto: f.url,
        observacao: f.observacao,
        criado_em: new Date().toISOString(),
      })),
    };

    return { data: fullOS, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Update Service Order status and details
 */
export async function updateServiceOrderStatus(
  orderId: string,
  updates: {
    status?: OSStatus;
    descricao_servico?: string;
    valor?: number;
    data_saida?: string | null;
    garantia_fim?: string | null;
    garantia_cobertura?: string | null;
  }
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('service_orders')
      .update(updates)
      .eq('id', orderId);

    if (error) {
      return { error: new Error(error.message) };
    }
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}

/**
 * Delete a Service Order and its photos
 */
export async function deleteServiceOrder(orderId: string): Promise<{ error: Error | null }> {
  try {
    // 1. Delete checklist photos associated with this OS
    await supabase.from('checklist_photos').delete().eq('service_order_id', orderId);

    // 2. Delete the service order
    const { error } = await supabase.from('service_orders').delete().eq('id', orderId);

    if (error) {
      return { error: new Error(error.message) };
    }
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}

/**
 * Update complete Service Order including client and device info
 */
export async function updateFullServiceOrder(
  orderId: string,
  payload: {
    clienteNome?: string;
    clienteTelefone?: string;
    aparelhoMarca?: string;
    aparelhoModelo?: string;
    aparelhoImei?: string;
    status?: OSStatus;
    descricaoServico?: string;
    valor?: number;
    garantiaFim?: string | null;
    garantiaCobertura?: string | null;
    clientId?: string;
    deviceId?: string;
  }
): Promise<{ error: Error | null }> {
  try {
    // 1. Update Client if ID exists
    if (payload.clientId && (payload.clienteNome || payload.clienteTelefone)) {
      const clientUpdates: any = {};
      if (payload.clienteNome) clientUpdates.nome = payload.clienteNome.trim();
      if (payload.clienteTelefone) clientUpdates.telefone = payload.clienteTelefone.replace(/\D/g, '');
      await supabase.from('clients').update(clientUpdates).eq('id', payload.clientId);
    }

    // 2. Update Device if ID exists
    if (payload.deviceId && (payload.aparelhoMarca || payload.aparelhoModelo || payload.aparelhoImei !== undefined)) {
      const deviceUpdates: any = {};
      if (payload.aparelhoMarca) deviceUpdates.marca = payload.aparelhoMarca.trim();
      if (payload.aparelhoModelo) deviceUpdates.modelo = payload.aparelhoModelo.trim();
      if (payload.aparelhoImei !== undefined) deviceUpdates.imei = payload.aparelhoImei?.trim() || null;
      await supabase.from('devices').update(deviceUpdates).eq('id', payload.deviceId);
    }

    // 3. Update Service Order
    const osUpdates: any = {};
    if (payload.status) osUpdates.status = payload.status;
    if (payload.descricaoServico !== undefined) osUpdates.descricao_servico = payload.descricaoServico;
    if (payload.valor !== undefined) osUpdates.valor = payload.valor;
    if (payload.garantiaFim !== undefined) osUpdates.garantia_fim = payload.garantiaFim;
    if (payload.garantiaCobertura !== undefined) osUpdates.garantia_cobertura = payload.garantiaCobertura;

    if (Object.keys(osUpdates).length > 0) {
      const { error } = await supabase.from('service_orders').update(osUpdates).eq('id', orderId);
      if (error) throw new Error(error.message);
    }

    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}

/**
 * Add a checklist photo to an existing OS (e.g. exit photo)
 */
export async function addChecklistPhoto(photoData: {
  service_order_id: string;
  tipo: 'entrada' | 'saida';
  categoria?: string;
  url_foto: string;
  observacao?: string;
}): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.from('checklist_photos').insert([photoData]);
    if (error) {
      return { error: new Error(error.message) };
    }
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}

