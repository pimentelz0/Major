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
 * Helper to clean and sanitize birth dates for PostgreSQL DATE column
 */
export function cleanBirthDate(val?: string | null): string | null {
  if (!val) return null;
  const trimmed = String(val).trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;
  // Match YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  // Match DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const parts = trimmed.split('/');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return trimmed;
}

// Local storage backup for birth dates to guarantee zero data loss
const BIRTHDAY_STORAGE_KEY = 'major_clients_birthdays';

export function getStoredLocalBirthdays(): Record<string, string> {
  try {
    const raw = localStorage.getItem(BIRTHDAY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStoredLocalBirthday(clientIdOrPhone: string, birthDate: string | null | undefined): void {
  if (!clientIdOrPhone) return;
  try {
    const clean = cleanBirthDate(birthDate);
    const map = getStoredLocalBirthdays();
    if (clean) {
      map[clientIdOrPhone] = clean;
    } else {
      delete map[clientIdOrPhone];
    }
    localStorage.setItem(BIRTHDAY_STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('Error saving local birthday cache:', e);
  }
}

/**
 * Fetch all Service Orders for the current authenticated user with their associated Client, Device, and Photos
 */
export async function fetchServiceOrders(userId?: string): Promise<{
  data: OSWithDetails[];
  error: Error | null;
}> {
  try {
    let currentUserId = userId;
    if (!currentUserId) {
      const { data: authData } = await supabase.auth.getUser();
      currentUserId = authData?.user?.id;
    }

    // If there is no authenticated user, return empty list to protect data privacy
    if (!currentUserId) {
      return { data: [], error: null };
    }

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
      .eq('criado_por', currentUserId)
      .order('criado_em', { ascending: false });

    if (ordersError) {
      console.error('Supabase query error:', ordersError);
      return { data: [], error: new Error(ordersError.message) };
    }

    const localBirthdays = getStoredLocalBirthdays();

    const formatted: OSWithDetails[] = (orders || []).map((so: any) => {
      const client = so.device?.client;
      if (client) {
        const cleanPhone = (client.telefone || '').replace(/\D/g, '');
        const resolvedBday =
          cleanBirthDate(client.data_nascimento) ||
          localBirthdays[client.id] ||
          localBirthdays[cleanPhone] ||
          null;
        client.data_nascimento = resolvedBday;

        if (resolvedBday) {
          saveStoredLocalBirthday(client.id, resolvedBday);
          if (cleanPhone) saveStoredLocalBirthday(cleanPhone, resolvedBday);
        }
      }

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
        checklist: so.checklist || null,
        criado_por: so.criado_por,
        criado_em: so.criado_em,
        device: so.device,
        client: client,
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
    let currentUserId = userId;
    if (!currentUserId) {
      const { data: authData } = await supabase.auth.getUser();
      currentUserId = authData?.user?.id;
    }

    // 1. Resolve or Insert Client (scoped to user)
    let clientData: any = null;
    let clientError: any = null;
    const sanitizedBday = cleanBirthDate(payload.clienteDataNascimento);
    const cleanPhone = payload.clienteTelefone.replace(/\D/g, '');

    if (payload.clienteId) {
      // Re-use selected existing client
      const { data: existingClient, error: existErr } = await supabase
        .from('clients')
        .select('*')
        .eq('id', payload.clienteId)
        .maybeSingle();

      if (existingClient) {
        clientData = existingClient;
        // Sync birth date if provided
        if (sanitizedBday) {
          saveStoredLocalBirthday(existingClient.id, sanitizedBday);
          saveStoredLocalBirthday(cleanPhone, sanitizedBday);

          if (existingClient.data_nascimento !== sanitizedBday) {
            try {
              await supabase
                .from('clients')
                .update({ data_nascimento: sanitizedBday })
                .eq('id', existingClient.id);
            } catch (e) {
              console.warn('Silent update birthday notice:', e);
            }
          }
        }
      } else if (existErr) {
        console.warn('Could not fetch existing client by id:', existErr.message);
      }
    }

    // If client wasn't found or wasn't provided, insert new client
    if (!clientData) {
      const clientPayload: any = {
        nome: payload.clienteNome.trim(),
        telefone: cleanPhone,
      };
      if (sanitizedBday) {
        clientPayload.data_nascimento = sanitizedBday;
      }
      if (currentUserId) {
        clientPayload.criado_por = currentUserId;
      }

      const clientRes = await supabase
        .from('clients')
        .insert([clientPayload])
        .select()
        .single();

      if (clientRes.error) {
        // Retry without extra columns if column doesn't exist on older schema
        if (clientPayload.data_nascimento && clientRes.error.message.includes('data_nascimento')) {
          delete clientPayload.data_nascimento;
        }
        if (clientPayload.criado_por && clientRes.error.message.includes('criado_por')) {
          delete clientPayload.criado_por;
        }
        const retryClientRes = await supabase
          .from('clients')
          .insert([clientPayload])
          .select()
          .single();
        clientData = retryClientRes.data;
        clientError = retryClientRes.error;
      } else {
        clientData = clientRes.data;
        clientError = clientRes.error;
      }

      if (clientData && sanitizedBday) {
        saveStoredLocalBirthday(clientData.id, sanitizedBday);
        saveStoredLocalBirthday(cleanPhone, sanitizedBday);
      }
    }

    if (clientError || !clientData) {
      throw new Error(`Erro ao salvar cliente: ${clientError?.message}`);
    }

    // 2. Resolve or Insert Device (scoped to user)
    let deviceData: any = null;
    let deviceError: any = null;

    if (payload.aparelhoId) {
      const { data: existingDev } = await supabase
        .from('devices')
        .select('*')
        .eq('id', payload.aparelhoId)
        .maybeSingle();
      if (existingDev) {
        deviceData = existingDev;
      }
    }

    if (!deviceData) {
      const devicePayload: any = {
        client_id: clientData.id,
        marca: payload.aparelhoMarca.trim(),
        modelo: payload.aparelhoModelo.trim(),
        imei: payload.aparelhoImei?.trim() || null,
      };
      if (currentUserId) {
        devicePayload.criado_por = currentUserId;
      }

      const deviceRes = await supabase
        .from('devices')
        .insert([devicePayload])
        .select()
        .single();

      if (deviceRes.error && devicePayload.criado_por && deviceRes.error.message.includes('criado_por')) {
        delete devicePayload.criado_por;
        const retryDeviceRes = await supabase
          .from('devices')
          .insert([devicePayload])
          .select()
          .single();
        deviceData = retryDeviceRes.data;
        deviceError = retryDeviceRes.error;
      } else {
        deviceData = deviceRes.data;
        deviceError = deviceRes.error;
      }
    }

    if (deviceError || !deviceData) {
      throw new Error(`Erro ao salvar aparelho: ${deviceError?.message}`);
    }

    // 3. Insert Service Order (strictly assigned to current authenticated user)
    const orderPayload: any = {
      device_id: deviceData.id,
      status: 'recebido',
      valor: payload.valor || 0,
      descricao_servico: payload.descricaoServico?.trim() || null,
      criado_por: currentUserId || null,
    };
    if (payload.checklist) {
      orderPayload.checklist = payload.checklist;
    }

    let orderData: any = null;
    let orderError: any = null;

    const res = await supabase
      .from('service_orders')
      .insert([orderPayload])
      .select()
      .single();

    if (res.error && payload.checklist && res.error.message.includes('checklist')) {
      // Fallback in case table doesn't have checklist column yet
      delete orderPayload.checklist;
      const retryRes = await supabase
        .from('service_orders')
        .insert([orderPayload])
        .select()
        .single();
      orderData = retryRes.data;
      orderError = retryRes.error;
    } else {
      orderData = res.data;
      orderError = res.error;
    }

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
    checklist?: any;
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
    clienteDataNascimento?: string | null;
    aparelhoMarca?: string;
    aparelhoModelo?: string;
    aparelhoImei?: string;
    status?: OSStatus;
    descricaoServico?: string;
    valor?: number;
    garantiaFim?: string | null;
    garantiaCobertura?: string | null;
    checklist?: any;
    clientId?: string;
    deviceId?: string;
  }
): Promise<{ error: Error | null }> {
  try {
    // 1. Update Client if ID exists
    if (payload.clientId && (payload.clienteNome || payload.clienteTelefone || payload.clienteDataNascimento !== undefined)) {
      const clientUpdates: any = {};
      if (payload.clienteNome) clientUpdates.nome = payload.clienteNome.trim();
      if (payload.clienteTelefone) clientUpdates.telefone = payload.clienteTelefone.replace(/\D/g, '');
      if (payload.clienteDataNascimento !== undefined) {
        const cleanBday = cleanBirthDate(payload.clienteDataNascimento);
        clientUpdates.data_nascimento = cleanBday;
        saveStoredLocalBirthday(payload.clientId, cleanBday);
        if (payload.clienteTelefone) {
          saveStoredLocalBirthday(payload.clienteTelefone.replace(/\D/g, ''), cleanBday);
        }
      }
      
      let { error: clientErr } = await supabase.from('clients').update(clientUpdates).eq('id', payload.clientId);
      if (clientErr && clientUpdates.data_nascimento && clientErr.message.includes('data_nascimento')) {
        delete clientUpdates.data_nascimento;
        await supabase.from('clients').update(clientUpdates).eq('id', payload.clientId);
      }
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
    if (payload.checklist !== undefined) osUpdates.checklist = payload.checklist;

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
 * Add a checklist photo to an existing OS (e.g. entry or exit photo)
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

/**
 * Delete a specific checklist photo
 */
export async function deleteChecklistPhoto(photoId: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.from('checklist_photos').delete().eq('id', photoId);
    if (error) {
      return { error: new Error(error.message) };
    }
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}

/**
 * Update a checklist photo's metadata or type
 */
export async function updateChecklistPhoto(
  photoId: string,
  updates: {
    tipo?: 'entrada' | 'saida';
    categoria?: string;
    observacao?: string;
    url_foto?: string;
  }
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.from('checklist_photos').update(updates).eq('id', photoId);
    if (error) {
      return { error: new Error(error.message) };
    }
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}

/**
 * Fetch all Clients with their associated Devices, Service Orders and statistics for the current user
 */
export async function fetchClients(userId?: string): Promise<{
  data: import('../types').ClientWithDetails[];
  error: Error | null;
}> {
  try {
    let currentUserId = userId;
    if (!currentUserId) {
      const { data: authData } = await supabase.auth.getUser();
      currentUserId = authData?.user?.id;
    }

    // If there is no authenticated user, strictly return empty list
    if (!currentUserId) {
      return { data: [], error: null };
    }

    // 1. Fetch all service orders for this user (strictly isolated to currentUserId)
    const { data: orders, error: ordersError } = await fetchServiceOrders(currentUserId);
    if (ordersError) {
      console.warn('Orders query in fetchClients warning:', ordersError);
    }

    // 2. Fetch clients strictly created by this user
    let rawClients: any[] = [];
    const { data: userClients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .eq('criado_por', currentUserId)
      .order('criado_em', { ascending: false });

    if (!clientsError && Array.isArray(userClients)) {
      rawClients = userClients;
    } else if (clientsError) {
      console.warn('Clients query with criado_por filter warning:', clientsError.message);
    }

    // 3. Map clients (starting strictly with clients created by this user)
    const clientMap = new Map<string, import('../types').ClientWithDetails>();
    const localBirthdays = getStoredLocalBirthdays();

    rawClients.forEach((c: any) => {
      const cleanPhone = (c.telefone || '').replace(/\D/g, '');
      const resolvedBday =
        cleanBirthDate(c.data_nascimento) ||
        localBirthdays[c.id] ||
        localBirthdays[cleanPhone] ||
        null;

      if (resolvedBday) {
        saveStoredLocalBirthday(c.id, resolvedBday);
        if (cleanPhone) saveStoredLocalBirthday(cleanPhone, resolvedBday);
      }

      clientMap.set(c.id, {
        id: c.id,
        nome: c.nome,
        telefone: c.telefone,
        data_nascimento: resolvedBday,
        criado_em: c.criado_em,
        devices: [],
        service_orders: [],
        total_spent: 0,
        active_os_count: 0,
        total_os_count: 0,
        last_service_date: null,
      });
    });

    // 4. Also include any clients linked to this user's service orders
    (orders || []).forEach((os) => {
      const c = os.client;
      if (c && c.id) {
        const cleanPhone = (c.telefone || '').replace(/\D/g, '');
        const resolvedBday =
          cleanBirthDate(c.data_nascimento) ||
          localBirthdays[c.id] ||
          localBirthdays[cleanPhone] ||
          null;

        if (resolvedBday) {
          saveStoredLocalBirthday(c.id, resolvedBday);
          if (cleanPhone) saveStoredLocalBirthday(cleanPhone, resolvedBday);
        }

        if (!clientMap.has(c.id)) {
          clientMap.set(c.id, {
            id: c.id,
            nome: c.nome,
            telefone: c.telefone,
            data_nascimento: resolvedBday,
            criado_em: c.criado_em,
            devices: [],
            service_orders: [],
            total_spent: 0,
            active_os_count: 0,
            total_os_count: 0,
            last_service_date: null,
          });
        } else {
          const existing = clientMap.get(c.id)!;
          if (!existing.data_nascimento && resolvedBday) {
            existing.data_nascimento = resolvedBday;
          }
        }
      }
    });

    // 5. Populate client statistics from orders
    (orders || []).forEach((os) => {
      const clientId = os.client?.id;
      if (clientId && clientMap.has(clientId)) {
        const client = clientMap.get(clientId)!;
        client.service_orders = client.service_orders || [];
        client.service_orders.push(os);
        client.total_os_count = (client.total_os_count || 0) + 1;
        client.total_spent = (client.total_spent || 0) + Number(os.valor || 0);

        if (os.status === 'recebido' || os.status === 'em_reparo' || os.status === 'pronto') {
          client.active_os_count = (client.active_os_count || 0) + 1;
        }

        if (os.data_entrada) {
          if (!client.last_service_date || new Date(os.data_entrada) > new Date(client.last_service_date)) {
            client.last_service_date = os.data_entrada;
          }
        }

        if (os.device) {
          client.devices = client.devices || [];
          if (!client.devices.some((d) => d.id === os.device!.id)) {
            client.devices.push(os.device);
          }
        }
      }
    });

    const result = Array.from(clientMap.values());
    return { data: result, error: null };
  } catch (err: any) {
    console.error('Fetch clients error:', err);
    return { data: [], error: err };
  }
}

/**
 * Create a new Client directly
 */
export async function createDirectClient(
  nome: string,
  telefone: string,
  dataNascimento?: string,
  userId?: string
): Promise<{ data: import('../types').Client | null; error: Error | null }> {
  try {
    let currentUserId = userId;
    if (!currentUserId) {
      const { data: authData } = await supabase.auth.getUser();
      currentUserId = authData?.user?.id;
    }

    const cleanPhone = telefone.replace(/\D/g, '');
    const cleanBday = cleanBirthDate(dataNascimento);

    const payload: any = {
      nome: nome.trim(),
      telefone: cleanPhone,
    };
    if (cleanBday) {
      payload.data_nascimento = cleanBday;
    }
    if (currentUserId) {
      payload.criado_por = currentUserId;
    }

    let { data, error } = await supabase.from('clients').insert([payload]).select().single();
    if (error) {
      if (payload.data_nascimento && error.message.includes('data_nascimento')) {
        delete payload.data_nascimento;
      }
      if (payload.criado_por && error.message.includes('criado_por')) {
        delete payload.criado_por;
      }
      const retry = await supabase.from('clients').insert([payload]).select().single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    if (data) {
      if (cleanBday) {
        saveStoredLocalBirthday(data.id, cleanBday);
        if (cleanPhone) saveStoredLocalBirthday(cleanPhone, cleanBday);
        data.data_nascimento = cleanBday;
      }
    }

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Update an existing Client
 */
export async function updateDirectClient(
  clientId: string,
  updates: { nome?: string; telefone?: string; data_nascimento?: string | null }
): Promise<{ error: Error | null }> {
  try {
    const payload: any = {};
    const cleanPhone = updates.telefone !== undefined ? updates.telefone.replace(/\D/g, '') : undefined;
    const cleanBday = updates.data_nascimento !== undefined ? cleanBirthDate(updates.data_nascimento) : undefined;

    if (updates.nome !== undefined) payload.nome = updates.nome.trim();
    if (cleanPhone !== undefined) payload.telefone = cleanPhone;
    if (cleanBday !== undefined) payload.data_nascimento = cleanBday;

    if (cleanBday !== undefined) {
      saveStoredLocalBirthday(clientId, cleanBday);
      if (cleanPhone) saveStoredLocalBirthday(cleanPhone, cleanBday);
    }

    let { error } = await supabase.from('clients').update(payload).eq('id', clientId);
    if (error && payload.data_nascimento && error.message.includes('data_nascimento')) {
      delete payload.data_nascimento;
      const retry = await supabase.from('clients').update(payload).eq('id', clientId);
      error = retry.error;
    }

    if (error) {
      return { error: new Error(error.message) };
    }
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}

/**
 * Delete a Client
 */
export async function deleteDirectClient(clientId: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    if (error) {
      return { error: new Error(error.message) };
    }
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}


