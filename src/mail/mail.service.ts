import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  // ─── KYC / Organizer ─────────────────────────────────────────────────────

  /**
   * Gửi email xác nhận đã nhận hồ sơ KYC
   */
  async sendKycSubmitted(payload: {
    to: string;
    organizerName: string;
  }): Promise<void> {
    await this.mailerService.sendMail({
      to: payload.to,
      subject: '[HighShow] Đã nhận hồ sơ đăng ký Organizer',
      template: 'kyc-submitted',
      context: {
        organizerName: payload.organizerName,
        slaText: '2 ngày làm việc',
        supportEmail: process.env.MAIL_FROM,
        year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Gửi email thông báo KYC được duyệt
   */
  async sendKycApproved(payload: {
    to: string;
    organizerName: string;
  }): Promise<void> {
    await this.mailerService.sendMail({
      to: payload.to,
      subject: '🎉 [HighShow] Hồ sơ Organizer đã được phê duyệt!',
      template: 'kyc-approved',
      context: {
        organizerName: payload.organizerName,
        createEventUrl: `${process.env.CLIENT_URL}/create-event`,
        dashboardUrl: `${process.env.CLIENT_URL}/organizer/dashboard`,
        year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Gửi email thông báo KYC bị từ chối
   */
  async sendKycRejected(payload: {
    to: string;
    organizerName: string;
    reason: string;
    resubmitDeadlineDays?: number;
  }): Promise<void> {
    await this.mailerService.sendMail({
      to: payload.to,
      subject: '[HighShow] Hồ sơ Organizer cần bổ sung thông tin',
      template: 'kyc-rejected',
      context: {
        organizerName: payload.organizerName,
        reason: payload.reason,
        resubmitDeadlineDays: payload.resubmitDeadlineDays ?? 7,
        resubmitUrl: `${process.env.CLIENT_URL}/register-organizer`,
        supportEmail: process.env.MAIL_FROM,
        year: new Date().getFullYear(),
      },
    });
  }

  // ─── Booking / Tickets ───────────────────────────────────────────────────

  /**
   * Gửi email xác nhận đặt vé thành công
   */
  async sendBookingSuccess(payload: {
    to: string;
    userName: string;
    eventName: string;
    eventDate: string;
    venue: string;
    ticketType: string;
    quantity: number;
    totalPrice: number;
    bookingCode: string;
    ticketsUrl: string;
  }): Promise<void> {
    await this.mailerService.sendMail({
      to: payload.to,
      subject: `🎟️ [HighShow] Đặt vé thành công — ${payload.eventName}`,
      template: 'booking-success',
      context: {
        ...payload,
        totalPriceFormatted: payload.totalPrice.toLocaleString('vi-VN') + 'đ',
        year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Gửi email xác nhận đã nhận yêu cầu huỷ vé
   */
  async sendCancellationReceived(payload: {
    to: string;
    userName: string;
    eventName: string;
    ticketType: string;
  }): Promise<void> {
    await this.mailerService.sendMail({
      to: payload.to,
      subject: `[HighShow] Đã nhận yêu cầu huỷ vé — ${payload.eventName}`,
      template: 'cancellation-received',
      context: {
        ...payload,
        slaText: '1 ngày làm việc',
        year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Gửi email xác nhận hoàn tiền
   */
  async sendRefundConfirmed(payload: {
    to: string;
    userName: string;
    eventName: string;
    amount: number;
    estimatedDays?: number;
  }): Promise<void> {
    await this.mailerService.sendMail({
      to: payload.to,
      subject: `[HighShow] Xác nhận hoàn tiền — ${payload.eventName}`,
      template: 'refund-confirmed',
      context: {
        ...payload,
        amountFormatted: payload.amount.toLocaleString('vi-VN') + 'đ',
        estimatedDays: payload.estimatedDays ?? 7,
        year: new Date().getFullYear(),
      },
    });
  }

  // ─── Event ───────────────────────────────────────────────────────────────

  /**
   * Gửi email thông báo sự kiện bị huỷ (tới toàn bộ user đã mua vé)
   */
  async sendEventCancelled(payload: {
    to: string;
    userName: string;
    eventName: string;
    eventDate: string;
    reason?: string;
  }): Promise<void> {
    await this.mailerService.sendMail({
      to: payload.to,
      subject: `[HighShow] Thông báo: Sự kiện "${payload.eventName}" đã bị huỷ`,
      template: 'event-cancelled',
      context: {
        ...payload,
        supportEmail: process.env.MAIL_FROM,
        year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Gửi email thông báo sự kiện được duyệt (tới Organizer)
   */
  async sendEventApproved(payload: {
    to: string;
    organizerName: string;
    eventName: string;
    eventUrl: string;
    platformFeePercent: number;
  }): Promise<void> {
    await this.mailerService.sendMail({
      to: payload.to,
      subject: `✅ [HighShow] Sự kiện "${payload.eventName}" đã được phê duyệt`,
      template: 'event-approved',
      context: {
        ...payload,
        year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Gửi email xác nhận đã nhận sự kiện để xét duyệt (tới Organizer)
   */
  async sendEventSubmitted(payload: {
    to: string;
    organizerName: string;
    eventName: string;
  }): Promise<void> {
    await this.mailerService.sendMail({
      to: payload.to,
      subject: `[HighShow] Đã nhận sự kiện "${payload.eventName}" — Đang xem xét`,
      template: 'event-submitted',
      context: {
        ...payload,
        slaText: '2 ngày làm việc',
        supportEmail: process.env.MAIL_FROM,
        year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Gửi email thông báo sự kiện cần chỉnh sửa (tới Organizer)
   */
  async sendEventNeedsRevision(payload: {
    to: string;
    organizerName: string;
    eventName: string;
    notes: string;
    deadlineDays?: number;
    editUrl: string;
  }): Promise<void> {
    await this.mailerService.sendMail({
      to: payload.to,
      subject: `[HighShow] Sự kiện "${payload.eventName}" cần bổ sung thông tin`,
      template: 'event-needs-revision',
      context: {
        ...payload,
        deadlineDays: payload.deadlineDays ?? 5,
        year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Gửi email thông báo sự kiện bị từ chối vĩnh viễn (tới Organizer)
   */
  async sendEventRejected(payload: {
    to: string;
    organizerName: string;
    eventName: string;
    reason: string;
  }): Promise<void> {
    await this.mailerService.sendMail({
      to: payload.to,
      subject: `[HighShow] Sự kiện "${payload.eventName}" không được phê duyệt`,
      template: 'event-rejected',
      context: {
        ...payload,
        supportEmail: process.env.MAIL_FROM,
        year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Gửi email cho Organizer khi Admin duyệt yêu cầu huỷ sự kiện
   */
  async sendCancelRequestApproved(payload: {
    to: string;
    organizerName: string;
    eventName: string;
  }): Promise<void> {
    await this.mailerService.sendMail({
      to: payload.to,
      subject: `[HighShow] Yêu cầu huỷ sự kiện "${payload.eventName}" đã được chấp thuận`,
      template: 'cancel-request-approved',
      context: {
        ...payload,
        supportEmail: process.env.MAIL_FROM,
        year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Gửi email cho Organizer khi Admin từ chối yêu cầu huỷ sự kiện
   */
  async sendCancelRequestRejected(payload: {
    to: string;
    organizerName: string;
    eventName: string;
    reason: string;
  }): Promise<void> {
    await this.mailerService.sendMail({
      to: payload.to,
      subject: `[HighShow] Yêu cầu huỷ sự kiện "${payload.eventName}" bị từ chối`,
      template: 'cancel-request-rejected',
      context: {
        ...payload,
        supportEmail: process.env.MAIL_FROM,
        year: new Date().getFullYear(),
      },
    });
  }

  // ─── Collaborator (CTV) ──────────────────────────────────────────────────

  /**
   * Gửi email mời CTV — kèm thông tin đăng nhập nếu tạo tài khoản mới
   */
  async sendCollaboratorInvitation(payload: {
    to: string;
    collaboratorName: string;
    organizerName: string;
    eventNames: string[];
    loginEmail: string;
    tempPassword?: string;
  }): Promise<void> {
    await this.mailerService.sendMail({
      to: payload.to,
      subject: `[HighShow] Bạn được mời làm CTV cho sự kiện của ${payload.organizerName}`,
      template: 'collaborator-invited',
      context: {
        ...payload,
        loginUrl: `${process.env.CLIENT_URL}/login`,
        year: new Date().getFullYear(),
      },
    });
  }
}
