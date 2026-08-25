export type OSStatus = 'recebido' | 'em_reparo' | 'pronto' | 'entregue';

export interface ChecklistItemState {
  status?: 'ok' | 'nok' | null;
  obs?: string;
}

export type DeviceChecklist = Record<string, ChecklistItemState>;

export const DEFAULT_CHECKLIST_ITEMS = [
  'Tela',
  'Botões',
  'Carga',
  'Bateria',
  'Tampa traseira',
  'Câmera frontal',
  'Câmera traseira',
  'Flash',
  'Faceid/biometria',
  'Auricular',
  'Alto-falante',
  'Vibracall',
  'Área',
  'Wi-Fi',
  'Bluetooth',
  'NFC',
  'AirDrop',
] as const;

export interface Client {
  id: string;
  nome: string;
  telefone: string;
  criado_em: string;
}

export interface Device {
  id: string;
  client_id: string;
  marca: string;
  modelo: string;
  imei?: string | null;
  criado_em: string;
}

export interface ServiceOrder {
  id: string;
  device_id: string;
  status: OSStatus;
  valor: number;
  data_entrada: string;
  data_saida?: string | null;
  descricao_servico?: string | null;
  garantia_fim?: string | null;
  garantia_cobertura?: string | null;
  checklist?: DeviceChecklist | null;
  criado_por?: string | null;
  criado_em: string;
}

export interface ChecklistPhoto {
  id: string;
  service_order_id: string;
  tipo: 'entrada' | 'saida';
  categoria?: 'tela' | 'carcaca' | 'funcionamento' | 'geral' | 'saida' | string;
  url_foto: string;
  observacao?: string | null;
  criado_em: string;
}

export interface OSWithDetails extends ServiceOrder {
  device?: Device;
  client?: Client;
  photos?: ChecklistPhoto[];
}

export interface CreateOSPayload {
  clienteNome: string;
  clienteTelefone: string;
  aparelhoMarca: string;
  aparelhoModelo: string;
  aparelhoImei?: string;
  valor: number;
  descricaoServico?: string;
  checklist?: DeviceChecklist;
  fotosEntrada: Array<{
    url: string;
    categoria: string;
    observacao?: string;
  }>;
}

