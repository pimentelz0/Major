import type { OSWithDetails, ChecklistItemState, ChecklistPhoto } from '../types';
import { supabase, STORAGE_BUCKET_NAME } from '../lib/supabase';

/**
 * Converts a data URL, Supabase Storage URL, or remote URL to a standard browser File object
 */
export async function urlToFile(url: string, filename: string): Promise<File | null> {
  if (!url) return null;

  // 1. If base64 Data URL
  if (url.startsWith('data:')) {
    try {
      const arr = url.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      return new File([blob], filename, { type: mime });
    } catch (e) {
      console.warn('Failed decoding base64 data URL to File:', e);
    }
  }

  // 2. If Supabase Storage URL (extract path and download via Supabase client SDK)
  if (url.includes('supabase.co') && url.includes(STORAGE_BUCKET_NAME)) {
    try {
      const parts = url.split(`${STORAGE_BUCKET_NAME}/`);
      if (parts.length > 1) {
        const storagePath = parts[1].split('?')[0]; // strip query params
        const { data: blob, error } = await supabase.storage
          .from(STORAGE_BUCKET_NAME)
          .download(storagePath);

        if (!error && blob) {
          const mime = blob.type || 'image/jpeg';
          return new File([blob], filename, { type: mime });
        }
      }
    } catch (e) {
      console.warn('Supabase storage download fallback needed:', e);
    }
  }

  // 3. Remote URL fetch
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      const mime = blob.type || 'image/jpeg';
      return new File([blob], filename, { type: mime });
    }
  } catch (e) {
    console.warn(`Direct fetch failed for ${filename}, attempting canvas fallback:`, e);
  }

  // 4. Canvas fallback for CORS-restricted images
  try {
    return await new Promise<File | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 800;
        canvas.height = img.naturalHeight || 600;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(new File([blob], filename, { type: blob.type || 'image/jpeg' }));
              } else {
                resolve(null);
              }
            },
            'image/jpeg',
            0.92
          );
        } else {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  } catch {
    return null;
  }
}

/**
 * Extracts and prepares all attached photos (entrada e saída) from the OS as File objects
 */
export async function getOSAttachedPhotoFiles(os: OSWithDetails): Promise<File[]> {
  const photos = os.photos || [];
  if (photos.length === 0) return [];

  const shortId = os.id.substring(0, 8).toUpperCase();
  const filePromises = photos.map(async (photo, idx) => {
    const isEntrada = photo.tipo === 'entrada';
    const tipoLabel = isEntrada ? 'Entrada' : 'Saida';
    const filename = `Foto_${tipoLabel}_OS_${shortId}_${idx + 1}.jpg`;
    return urlToFile(photo.url_foto, filename);
  });

  const resolved = await Promise.all(filePromises);
  return resolved.filter((f): f is File => f !== null);
}

/**
 * Formats the full Service Order message including complete checklist test results,
 * attached photos summary, status, client, device, warranty, and observation notes.
 */
export function formatWhatsAppOSMessage(os: OSWithDetails): string {
  const shortId = os.id.substring(0, 8).toUpperCase();
  const entryDate = os.data_entrada
    ? new Date(os.data_entrada).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

  const statusMap: Record<string, string> = {
    recebido: 'RECEBIDO (Em triagem inicial)',
    em_reparo: 'EM REPARO (Bancada técnica)',
    pronto: 'PRONTO (Aguardando retirada)',
    entregue: 'ENTREGUE (Finalizado)',
  };

  const statusLabel = statusMap[os.status] || os.status.toUpperCase();

  const warrantyText = os.garantia_fim
    ? `Válida até ${new Date(os.garantia_fim + 'T00:00:00').toLocaleDateString('pt-BR')}${
        os.garantia_cobertura ? ` (${os.garantia_cobertura})` : ''
      }`
    : '90 dias para os serviços realizados';

  // Build complete checklist formatted block
  let checklistBlock = '';
  if (os.checklist && typeof os.checklist === 'object') {
    const entries = Object.entries(os.checklist as Record<string, ChecklistItemState>).filter(
      ([_, val]) => val && (val.status || (val.obs && val.obs.trim()))
    );

    if (entries.length > 0) {
      checklistBlock = '\n\n📋 *CHECKLIST DE ENTRADA DO APARELHO:*';
      for (const [item, state] of entries) {
        let icon = '⚪';
        let statusStr = 'Não testado';
        if (state.status === 'ok') {
          icon = '✅';
          statusStr = 'OK';
        } else if (state.status === 'nok') {
          icon = '❌';
          statusStr = 'Defeito';
        }

        const obs = state.obs && state.obs.trim() ? ` — _Obs: ${state.obs.trim()}_` : '';
        checklistBlock += `\n• ${item}: ${icon} ${statusStr}${obs}`;
      }
    }
  }

  // Build attached photos block
  let photosBlock = '';
  const photos = os.photos || [];
  if (photos.length > 0) {
    const entryPhotos = photos.filter((p) => p.tipo === 'entrada');
    const exitPhotos = photos.filter((p) => p.tipo === 'saida');
    photosBlock = '\n\n📸 *FOTOS DO APARELHO ANEXADAS:*';
    if (entryPhotos.length > 0) {
      photosBlock += `\n• Foto(s) de Entrada (${entryPhotos.length} foto(s)):`;
      entryPhotos.forEach((p, i) => {
        if (p.url_foto && p.url_foto.startsWith('http')) {
          photosBlock += `\n  🔗 Foto ${i + 1}: ${p.url_foto}`;
        }
      });
    }
    if (exitPhotos.length > 0) {
      photosBlock += `\n• Foto(s) de Saída/Final (${exitPhotos.length} foto(s)):`;
      exitPhotos.forEach((p, i) => {
        if (p.url_foto && p.url_foto.startsWith('http')) {
          photosBlock += `\n  🔗 Foto ${i + 1}: ${p.url_foto}`;
        }
      });
    }
  }

  const clientName = os.client?.nome || 'Cliente';
  const deviceBrand = os.device?.marca || '';
  const deviceModel = os.device?.modelo || '';
  const imeiText = os.device?.imei ? ` | IMEI: ${os.device.imei}` : '';

  return `*MAJOR ASSISTÊNCIA TÉCNICA* 📱
Olá *${clientName}*, segue a sua *Ordem de Serviço #${shortId}*:

📋 *OS Nº:* #${shortId}
📱 *Aparelho:* ${deviceBrand} ${deviceModel}${imeiText}
⚡ *Status:* ${statusLabel}
🔧 *Serviço / Defeito:* ${os.descricao_servico || 'Manutenção e reparo especializado'}
💰 *Valor:* R$ ${Number(os.valor || 0).toFixed(2)}
📅 *Data de Entrada:* ${entryDate}
🛡️ *Garantia:* ${warrantyText}${checklistBlock}${photosBlock}

Estamos cuidando do seu aparelho com total dedicação e qualidade. Qualquer dúvida estamos à disposição!
*MAJOR - Assistência Técnica para Smartphones*`;
}

/**
 * Formats the complete typed Official Digital Receipt (Comprovante Digital)
 * formatted specifically as a client receipt with full warranty terms, service breakdown,
 * and technician/client identification.
 */
export function formatWhatsAppReceiptMessage(os: OSWithDetails): string {
  const shortId = os.id.substring(0, 8).toUpperCase();
  const entryDate = os.data_entrada
    ? new Date(os.data_entrada).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

  const exitDate = os.data_saida
    ? new Date(os.data_saida).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null;

  const warrantyEndDate = os.garantia_fim
    ? new Date(os.garantia_fim + 'T00:00:00').toLocaleDateString('pt-BR')
    : null;

  const warrantyDetail = warrantyEndDate
    ? `Válida até *${warrantyEndDate}*. Cobertura: ${os.garantia_cobertura || 'Peça substituída e mão de obra técnica executada.'}`
    : 'Garantia legal de 90 dias referente às peças substituídas e serviço realizado. Não cobre danos por queda, contato com líquidos ou mau uso.';

  // Build checklist list
  let checklistBlock = '';
  if (os.checklist && typeof os.checklist === 'object') {
    const entries = Object.entries(os.checklist as Record<string, ChecklistItemState>).filter(
      ([_, val]) => val && (val.status || (val.obs && val.obs.trim()))
    );

    if (entries.length > 0) {
      checklistBlock = '\n\n🔍 *CHECKLIST DE ENTRADA DO APARELHO:*';
      for (const [item, state] of entries) {
        let icon = '⚪';
        let statusStr = 'Não testado';
        if (state.status === 'ok') {
          icon = '✅';
          statusStr = 'OK';
        } else if (state.status === 'nok') {
          icon = '❌';
          statusStr = 'Defeito / Não funcional';
        }

        const obs = state.obs && state.obs.trim() ? ` (_${state.obs.trim()}_)` : '';
        checklistBlock += `\n• *${item}:* ${icon} ${statusStr}${obs}`;
      }
    }
  }

  // Build attached photos block
  let photosBlock = '';
  const photos = os.photos || [];
  if (photos.length > 0) {
    const entryPhotos = photos.filter((p) => p.tipo === 'entrada');
    const exitPhotos = photos.filter((p) => p.tipo === 'saida');
    photosBlock = '\n\n📸 *FOTOS DO APARELHO ANEXADAS:*';
    if (entryPhotos.length > 0) {
      photosBlock += `\n• Foto(s) de Entrada (${entryPhotos.length} foto(s)):`;
      entryPhotos.forEach((p, i) => {
        if (p.url_foto && p.url_foto.startsWith('http')) {
          photosBlock += `\n  🔗 Foto ${i + 1}: ${p.url_foto}`;
        }
      });
    }
    if (exitPhotos.length > 0) {
      photosBlock += `\n• Foto(s) de Saída/Final (${exitPhotos.length} foto(s)):`;
      exitPhotos.forEach((p, i) => {
        if (p.url_foto && p.url_foto.startsWith('http')) {
          photosBlock += `\n  🔗 Foto ${i + 1}: ${p.url_foto}`;
        }
      });
    }
  }

  const clientName = os.client?.nome || 'Cliente';
  const clientPhone = os.client?.telefone || '';
  const deviceBrand = os.device?.marca || '';
  const deviceModel = os.device?.modelo || '';
  const imeiText = os.device?.imei ? `\n🔢 *IMEI:* ${os.device.imei}` : '';

  return `🧾 *COMPROVANTE DIGITAL DE ORDEM DE SERVIÇO*
━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 *MAJOR ASSISTÊNCIA TÉCNICA*
_Assistência Técnica Especializada para Smartphones_
━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 *ORDEM DE SERVIÇO Nº:* #${shortId}

👤 *DADOS DO CLIENTE:*
• *Nome:* ${clientName}${clientPhone ? `\n• *Telefone:* ${clientPhone}` : ''}

📱 *DADOS DO APARELHO:*
• *Modelo:* ${deviceBrand} ${deviceModel}${imeiText}
• *Data de Entrada:* ${entryDate}${exitDate ? `\n• *Data de Saída / Conclusão:* ${exitDate}` : ''}
• *Status Atual:* ${os.status.toUpperCase()}

🛠️ *SERVIÇO REALIZADO / LAUDO TÉCNICO:*
${os.descricao_servico || 'Manutenção e reparo especializado em smartphone.'}${checklistBlock}${photosBlock}

━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *VALOR TOTAL:* *R$ ${Number(os.valor || 0).toFixed(2)}*
━━━━━━━━━━━━━━━━━━━━━━━━━━

🛡️ *TERMO DE GARANTIA:*
${warrantyDetail}

✍️ *Assinatura do Técnico:* MAJOR Assistência
✍️ *Assinatura do Cliente:* ${clientName}

Agradecemos pela confiança e preferência! 🤝
*MAJOR ASSISTÊNCIA TÉCNICA ESPECIALIZADA*`;
}

/**
 * Directly opens WhatsApp Web / Mobile with the pre-filled complete OS message
 */
export function sendWhatsAppOS(os: OSWithDetails): void {
  const phone = os.client?.telefone;
  if (!phone) return;

  const cleanPhone = phone.replace(/\D/g, '');
  const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

  const message = formatWhatsAppOSMessage(os);
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${phoneWithCountry}?text=${encoded}`, '_blank');
}

/**
 * Sends OS to WhatsApp together with all attached photos (entrada e saída) via Web Share API or direct wa.me fallback
 */
export async function sendWhatsAppOSWithPhotos(os: OSWithDetails): Promise<{ sharedViaNative: boolean }> {
  const shortId = os.id.substring(0, 8).toUpperCase();
  const phone = os.client?.telefone;
  const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
  const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  const message = formatWhatsAppOSMessage(os);

  const photoFiles = await getOSAttachedPhotoFiles(os);

  if (photoFiles.length > 0 && navigator.canShare && navigator.canShare({ files: photoFiles })) {
    try {
      await navigator.share({
        files: photoFiles,
        title: `OS #${shortId} - MAJOR Assistência`,
        text: message,
      });
      return { sharedViaNative: true };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { sharedViaNative: false };
      }
      console.warn('Native share failed or dismissed, falling back:', err);
    }
  }

  // Fallback for browsers without native share: download attached photos so technician can easily attach them in WhatsApp Web
  if (photoFiles.length > 0 && (!navigator.canShare || !navigator.canShare({ files: photoFiles }))) {
    photoFiles.forEach((file, index) => {
      setTimeout(() => {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }, index * 200);
    });
  }

  if (phoneWithCountry) {
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${phoneWithCountry}?text=${encoded}`, '_blank');
  }

  return { sharedViaNative: false };
}

/**
 * Directly opens WhatsApp Web / Mobile with the formatted Digital Receipt text
 */
export function sendWhatsAppReceipt(os: OSWithDetails): void {
  const phone = os.client?.telefone;
  if (!phone) return;

  const cleanPhone = phone.replace(/\D/g, '');
  const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

  const message = formatWhatsAppReceiptMessage(os);
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${phoneWithCountry}?text=${encoded}`, '_blank');
}

/**
 * Sends a specific single attached photo directly to WhatsApp (as an actual file on mobile or with link)
 */
export async function shareSinglePhotoToWhatsApp(
  photo: ChecklistPhoto,
  os: OSWithDetails
): Promise<{ success: boolean }> {
  const shortId = os.id.substring(0, 8).toUpperCase();
  const tipoLabel = photo.tipo === 'saida' ? 'Saída' : 'Entrada';
  const fileName = `Foto_${tipoLabel}_OS_${shortId}.jpg`;
  const file = await urlToFile(photo.url_foto, fileName);

  const phone = os.client?.telefone;
  const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
  const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

  const caption = `📸 *Foto de ${tipoLabel} do Aparelho* - OS #${shortId}
📱 *Aparelho:* ${os.device?.marca || ''} ${os.device?.modelo || ''}
👤 *Cliente:* ${os.client?.nome || 'Cliente'}${photo.observacao ? `\n📝 *Obs:* ${photo.observacao}` : ''}
*MAJOR - Assistência Técnica*`;

  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Foto ${tipoLabel} - OS #${shortId}`,
        text: caption,
      });
      return { success: true };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { success: false };
      }
      console.warn('Native single photo share failed:', err);
    }
  }

  // Fallback: download the photo so technician can paste/attach it, and open WhatsApp
  if (file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  if (phoneWithCountry) {
    const directLink = photo.url_foto.startsWith('http') ? `\n🔗 Link da foto: ${photo.url_foto}` : '';
    const encoded = encodeURIComponent(`${caption}${directLink}`);
    window.open(`https://wa.me/${phoneWithCountry}?text=${encoded}`, '_blank');
  }

  return { success: true };
}

/**
 * Sends a personalized and warm birthday greeting message to the client on WhatsApp
 */
export function sendWhatsAppBirthdayGreeting(client: { nome: string; telefone: string }): void {
  const phone = client.telefone;
  if (!phone) return;

  const cleanPhone = phone.replace(/\D/g, '');
  const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

  const firstName = client.nome.trim().split(' ')[0];

  const message = `🎉 *Feliz Aniversário, ${firstName}!* 🎂✨

A equipe da *MAJOR - Assistência Técnica* deseja a você um dia incrível, repleto de saúde, paz, alegria e muitas realizações! 🎈

É uma alegria imensa ter você como nosso cliente e parceiro. Conte sempre com a gente para cuidar com excelência de todos os seus aparelhos e dispositivos.

Aproveite muito o seu dia especial! 🥳🎁`;

  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${phoneWithCountry}?text=${encoded}`, '_blank');
}

