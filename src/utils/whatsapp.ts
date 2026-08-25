import type { OSWithDetails, ChecklistItemState } from '../types';

/**
 * Formats the full Service Order message including complete checklist test results,
 * status, client, device, warranty, and observation notes.
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
🛡️ *Garantia:* ${warrantyText}${checklistBlock}

Estamos cuidando do seu aparelho com total dedicação e qualidade. Qualquer dúvida estamos à disposição!
*MAJOR - Assistência Técnica para Smartphones*`;
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
