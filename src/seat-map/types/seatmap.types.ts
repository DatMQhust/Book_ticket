/**
 * Hình vẽ sân khấu — chỉ hiển thị, không gắn vé
 */
export interface StageElement {
  id: string;
  shapeType: 'rect' | 'circle' | 'polygon';
  x: number; // tỷ lệ % (0.0–1.0)
  y: number;
  width?: number; // tỷ lệ % — dùng cho rect
  height?: number; // tỷ lệ % — dùng cho rect
  radius?: number; // tỷ lệ % — dùng cho circle
  points?: number[]; // polygon vertices (cặp x,y %, VD: [0.1, 0.2, 0.3, 0.4, ...])
  rotation?: number; // độ (0–360)
  fill: string; // hex color, VD: '#333333'
  label: string; // VD: 'SÂN KHẤU'
}

/**
 * Zone gắn với một ticket type — click zone = chọn loại vé
 */
export interface ZoneItem {
  id: string;
  ticketTypeId: string; // ref tới ticket_types.id
  shapeType: 'rect' | 'circle' | 'polygon';
  x: number; // tỷ lệ % (0.0–1.0)
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: number[];
  rotation?: number;
  fill: string; // hex color — MÀU DO ORGANIZER CHỌN
  opacity: number; // 0.0–1.0
  label: string; // VD: 'Khu VIP A'
}
