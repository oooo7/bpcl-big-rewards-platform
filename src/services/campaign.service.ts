import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';

export class CampaignService {
  static async getActiveCampaignBySlug(slug: string) {
    const campaign = await db.campaign.findUnique({
      where: { slug },
      include: {
        rewards: true,
        draws: true,
      },
    });

    if (!campaign || !campaign.isActive) {
      throw new AppError('Campaign not found or inactive', 404, 'CAMPAIGN_NOT_FOUND');
    }

    return campaign;
  }

  static async getCampaignStats(campaignId: string) {
    const totalRegistrations = await db.registration.count({ where: { campaignId } });
    const validBills = await db.bill.count({
      where: {
        registration: { campaignId },
        validationStatus: { in: ['AUTO_VALIDATED', 'MANUALLY_APPROVED'] },
      },
    });
    const rewardsIssued = await db.rewardTransaction.count({
      where: { registration: { campaignId } },
    });

    return {
      totalRegistrations,
      validBills,
      rewardsIssued,
    };
  }
}
